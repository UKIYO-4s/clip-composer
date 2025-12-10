"""
ClipEffects - クリップエフェクトモジュール
各クリップに個別エフェクトを適用する機能を提供
"""

from typing import Dict, Any, List, Optional, Callable
import warnings

try:
    from moviepy.editor import VideoClip, vfx
    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False
    VideoClip = Any

from .easing import get_easing
from .utils import (
    interpolate_value,
    interpolate_position,
    interpolate_scale,
    calculate_timing_progress,
    get_direction_offset,
    clamp
)


# エフェクト適用順序（デフォルト）
EFFECT_ORDER = {
    'slide': 10,
    'zoom': 20,
    'rotate': 30,
    'blur': 40,
    'color': 50,
    'vignette': 60
}

# ブラー強度の上限
MAX_BLUR_AMOUNT = 20


def apply_slide(
    clip: VideoClip,
    timing: Dict[str, Any],
    params: Dict[str, Any],
    fps: float
) -> VideoClip:
    """
    スライドイン/アウトエフェクト

    Args:
        clip: 対象クリップ
        timing: タイミング設定 {position, duration_frames}
        params: パラメータ {direction, easing, distance}
        fps: フレームレート

    Returns:
        エフェクト適用後のクリップ
    """
    if not MOVIEPY_AVAILABLE or clip is None:
        return clip

    direction = params.get('direction', 'top')
    easing_name = params.get('easing', 'ease-out')
    distance = params.get('distance')  # None の場合は画面サイズ

    position = timing.get('position', 'in')
    duration_frames = timing.get('duration_frames', 20)

    if duration_frames <= 0:
        return clip

    duration_sec = duration_frames / fps
    clip_duration = getattr(clip, 'duration', 0)
    clip_size = getattr(clip, 'size', (1920, 1080))

    # オフセット計算
    offset = get_direction_offset(direction, clip_size, distance)
    easing_func = get_easing(easing_name)

    # 元の位置を取得
    original_pos = getattr(clip, 'pos', None)
    if callable(original_pos):
        # 既に関数の場合は (0, 0) を初期値とする
        base_pos = (0, 0)
    elif original_pos:
        base_pos = original_pos
    else:
        base_pos = (0, 0)

    def position_func(t):
        """時間に応じた位置を返す"""
        if position == 'in':
            # 入り: オフセット位置 → 元の位置
            if t < duration_sec:
                progress = easing_func(t / duration_sec)
                dx = offset[0] * (1.0 - progress)
                dy = offset[1] * (1.0 - progress)
                return (base_pos[0] + dx, base_pos[1] + dy)
            return base_pos

        elif position == 'out':
            # 出: 元の位置 → オフセット位置
            fade_start = max(0.0, clip_duration - duration_sec)
            if t >= fade_start:
                progress = easing_func((t - fade_start) / duration_sec)
                dx = offset[0] * progress
                dy = offset[1] * progress
                return (base_pos[0] + dx, base_pos[1] + dy)
            return base_pos

        return base_pos

    try:
        return clip.set_position(position_func)
    except Exception as e:
        warnings.warn(f"Slide effect failed: {e}")
        return clip


def apply_zoom(
    clip: VideoClip,
    timing: Dict[str, Any],
    params: Dict[str, Any],
    fps: float
) -> VideoClip:
    """
    ズーム（Ken Burns）エフェクト

    Args:
        clip: 対象クリップ
        timing: タイミング設定 {position, duration_frames}
        params: パラメータ {start_scale, end_scale, center_x, center_y, easing}
        fps: フレームレート

    Returns:
        エフェクト適用後のクリップ
    """
    if not MOVIEPY_AVAILABLE or clip is None:
        return clip

    start_scale = params.get('start_scale', 1.0)
    end_scale = params.get('end_scale', 1.2)
    center_x = params.get('center_x', 0.5)  # 0.0 ~ 1.0
    center_y = params.get('center_y', 0.5)  # 0.0 ~ 1.0
    easing_name = params.get('easing', 'linear')

    position = timing.get('position', 'full')
    duration_frames = timing.get('duration_frames', 0)

    clip_duration = getattr(clip, 'duration', 0)
    clip_size = getattr(clip, 'size', (1920, 1080))
    easing_func = get_easing(easing_name)

    # duration_frames = 0 は全体に適用
    if duration_frames <= 0:
        duration_sec = clip_duration
    else:
        duration_sec = duration_frames / fps

    def resize_func(t):
        """時間に応じたスケールを返す"""
        # 進行度の計算
        if position == 'full' or duration_frames <= 0:
            progress = t / clip_duration if clip_duration > 0 else 0.0
        elif position == 'in':
            if t < duration_sec:
                progress = t / duration_sec
            else:
                progress = 1.0
        elif position == 'out':
            fade_start = max(0.0, clip_duration - duration_sec)
            if t >= fade_start:
                progress = (t - fade_start) / duration_sec
            else:
                progress = 0.0
        else:
            progress = t / clip_duration if clip_duration > 0 else 0.0

        progress = clamp(progress, 0.0, 1.0)
        eased_progress = easing_func(progress)

        # スケール補間
        scale = start_scale + (end_scale - start_scale) * eased_progress
        return scale

    try:
        # MoviePyのresizeにラムダを渡す
        return clip.resize(resize_func)
    except Exception as e:
        warnings.warn(f"Zoom effect failed: {e}")
        return clip


def apply_blur(
    clip: VideoClip,
    timing: Dict[str, Any],
    params: Dict[str, Any],
    fps: float
) -> VideoClip:
    """
    ブラーエフェクト（PILを使用したフレーム単位処理）

    Args:
        clip: 対象クリップ
        timing: タイミング設定 {position, duration_frames}
        params: パラメータ {amount, easing}
        fps: フレームレート

    Returns:
        エフェクト適用後のクリップ

    Note:
        PILのGaussianBlurを使用してフレーム単位でブラーを適用します。
        処理負荷が高いため、大きなブラー値は推奨しません。
    """
    if not MOVIEPY_AVAILABLE or clip is None:
        return clip

    try:
        from PIL import Image, ImageFilter
        import numpy as np
    except ImportError:
        warnings.warn("PIL not available for blur effect")
        return clip

    amount = params.get('amount', 5)

    # ブラー強度の上限を適用
    amount = clamp(amount, 0, MAX_BLUR_AMOUNT)

    if amount <= 0:
        return clip

    position = timing.get('position', 'full')
    duration_frames = timing.get('duration_frames', 0)
    easing_name = params.get('easing', 'linear')

    clip_duration = getattr(clip, 'duration', 0)
    easing_func = get_easing(easing_name)

    if duration_frames <= 0:
        duration_sec = clip_duration
    else:
        duration_sec = duration_frames / fps

    def apply_frame_blur(get_frame):
        """フレームごとのブラー処理"""
        def make_frame(t):
            frame = get_frame(t)

            # 進行度の計算
            if position == 'full' or duration_frames <= 0:
                progress = 1.0  # 全体に一定
                blur_amount = amount
            elif position == 'in':
                if t < duration_sec:
                    progress = easing_func(t / duration_sec)
                    # インの場合: ブラーから通常へ
                    blur_amount = amount * (1.0 - progress)
                else:
                    blur_amount = 0
            elif position == 'out':
                fade_start = max(0.0, clip_duration - duration_sec)
                if t >= fade_start:
                    progress = easing_func((t - fade_start) / duration_sec)
                    # アウトの場合: 通常からブラーへ
                    blur_amount = amount * progress
                else:
                    blur_amount = 0
            else:
                blur_amount = amount

            if blur_amount <= 0:
                return frame

            # NumPy配列からPIL Imageに変換
            img = Image.fromarray(frame.astype('uint8'))

            # Gaussian Blur適用
            img = img.filter(ImageFilter.GaussianBlur(radius=blur_amount))

            # NumPy配列に戻す
            return np.array(img)

        return make_frame

    try:
        return clip.fl(lambda gf, t: apply_frame_blur(gf)(t))
    except Exception as e:
        warnings.warn(f"Blur effect failed: {e}")
        return clip


def apply_rotate(
    clip: VideoClip,
    timing: Dict[str, Any],
    params: Dict[str, Any],
    fps: float
) -> VideoClip:
    """
    回転エフェクト

    Args:
        clip: 対象クリップ
        timing: タイミング設定 {position, duration_frames}
        params: パラメータ {start_angle, end_angle, easing}
        fps: フレームレート

    Returns:
        エフェクト適用後のクリップ
    """
    if not MOVIEPY_AVAILABLE or clip is None:
        return clip

    start_angle = params.get('start_angle', 0)
    end_angle = params.get('end_angle', 360)
    easing_name = params.get('easing', 'linear')

    position = timing.get('position', 'full')
    duration_frames = timing.get('duration_frames', 0)

    clip_duration = getattr(clip, 'duration', 0)
    easing_func = get_easing(easing_name)

    if duration_frames <= 0:
        duration_sec = clip_duration
    else:
        duration_sec = duration_frames / fps

    def rotate_func(t):
        """時間に応じた回転角度を返す"""
        if position == 'full' or duration_frames <= 0:
            progress = t / clip_duration if clip_duration > 0 else 0.0
        elif position == 'in':
            if t < duration_sec:
                progress = t / duration_sec
            else:
                progress = 1.0
        elif position == 'out':
            fade_start = max(0.0, clip_duration - duration_sec)
            if t >= fade_start:
                progress = (t - fade_start) / duration_sec
            else:
                progress = 0.0
        else:
            progress = t / clip_duration if clip_duration > 0 else 0.0

        progress = clamp(progress, 0.0, 1.0)
        eased_progress = easing_func(progress)

        angle = start_angle + (end_angle - start_angle) * eased_progress
        return angle

    try:
        return clip.rotate(rotate_func)
    except Exception as e:
        warnings.warn(f"Rotate effect failed: {e}")
        return clip


# =============================================================================
# エフェクトレジストリ
# =============================================================================

EFFECT_REGISTRY: Dict[str, Callable] = {
    'slide': apply_slide,
    'zoom': apply_zoom,
    'blur': apply_blur,
    'rotate': apply_rotate,
}


def apply_effects(
    clip: VideoClip,
    effects: List[Dict[str, Any]],
    fps: float
) -> VideoClip:
    """
    複数エフェクトを順序通りに適用

    Args:
        clip: 対象クリップ
        effects: エフェクトリスト
        fps: フレームレート

    Returns:
        エフェクト適用後のクリップ
    """
    if clip is None or not effects:
        return clip

    # orderでソート（なければデフォルト順）
    sorted_effects = sorted(
        effects,
        key=lambda e: e.get('order', EFFECT_ORDER.get(e.get('type'), 100))
    )

    for effect in sorted_effects:
        effect_type = effect.get('type')

        if not effect_type:
            continue

        if effect_type not in EFFECT_REGISTRY:
            warnings.warn(f"Unknown effect type: {effect_type}")
            continue

        timing = effect.get('timing', {})
        params = effect.get('params', {})

        try:
            clip = EFFECT_REGISTRY[effect_type](clip, timing, params, fps)
        except Exception as e:
            warnings.warn(f"Effect {effect_type} failed: {e}")

    return clip


def get_supported_effects() -> List[str]:
    """
    サポートされているエフェクトタイプの一覧を取得

    Returns:
        エフェクトタイプ名のリスト
    """
    return list(EFFECT_REGISTRY.keys())


__all__ = [
    'apply_effects',
    'apply_slide',
    'apply_zoom',
    'apply_blur',
    'apply_rotate',
    'get_supported_effects',
    'EFFECT_REGISTRY',
    'EFFECT_ORDER',
    'MAX_BLUR_AMOUNT'
]
