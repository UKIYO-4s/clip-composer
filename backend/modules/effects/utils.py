"""
Utils - エフェクト共通ユーティリティ
補間、座標計算などの共通関数
"""

from typing import Tuple, Callable, Optional, Dict, Any
from .easing import get_easing


def interpolate_value(
    start: float,
    end: float,
    t: float,
    easing: str = 'linear'
) -> float:
    """
    2つの値を補間

    Args:
        start: 開始値
        end: 終了値
        t: 進行度 (0.0 ~ 1.0)
        easing: イージング関数名

    Returns:
        補間された値
    """
    t = max(0.0, min(1.0, t))
    easing_func = get_easing(easing)
    eased_t = easing_func(t)
    return start + (end - start) * eased_t


def interpolate_position(
    start_pos: Tuple[float, float],
    end_pos: Tuple[float, float],
    t: float,
    easing: str = 'linear'
) -> Tuple[float, float]:
    """
    2つの位置を補間

    Args:
        start_pos: 開始位置 (x, y)
        end_pos: 終了位置 (x, y)
        t: 進行度 (0.0 ~ 1.0)
        easing: イージング関数名

    Returns:
        補間された位置 (x, y)
    """
    x = interpolate_value(start_pos[0], end_pos[0], t, easing)
    y = interpolate_value(start_pos[1], end_pos[1], t, easing)
    return (x, y)


def interpolate_scale(
    start_scale: float,
    end_scale: float,
    t: float,
    easing: str = 'linear'
) -> float:
    """
    スケールを補間

    Args:
        start_scale: 開始スケール
        end_scale: 終了スケール
        t: 進行度 (0.0 ~ 1.0)
        easing: イージング関数名

    Returns:
        補間されたスケール
    """
    return interpolate_value(start_scale, end_scale, t, easing)


def calculate_timing_progress(
    t: float,
    clip_duration: float,
    timing: Dict[str, Any],
    fps: float
) -> Optional[float]:
    """
    タイミング設定に基づいて進行度を計算

    Args:
        t: 現在の時間（秒）
        clip_duration: クリップの総時間（秒）
        timing: タイミング設定 {position, duration_frames}
        fps: フレームレート

    Returns:
        進行度 (0.0 ~ 1.0) または None（範囲外の場合）
    """
    position = timing.get('position', 'in')
    duration_frames = timing.get('duration_frames', 0)

    if duration_frames <= 0:
        # duration_frames が 0 の場合は "full" として扱う
        if position == 'full':
            return t / clip_duration if clip_duration > 0 else 0.0
        return None

    duration_sec = duration_frames / fps

    if position == 'in':
        # 入り: 0 ~ duration_sec
        if t < duration_sec:
            return t / duration_sec
        return None

    elif position == 'out':
        # 出: (clip_duration - duration_sec) ~ clip_duration
        fade_start = max(0.0, clip_duration - duration_sec)
        if t >= fade_start:
            return (t - fade_start) / duration_sec
        return None

    elif position == 'both':
        # 入りと出の両方
        if t < duration_sec:
            return t / duration_sec
        fade_start = max(0.0, clip_duration - duration_sec)
        if t >= fade_start:
            # 出は逆方向（1.0 → 0.0）
            return 1.0 - (t - fade_start) / duration_sec
        return None

    elif position == 'full':
        # 全体に適用
        return t / clip_duration if clip_duration > 0 else 0.0

    return None


def get_direction_offset(
    direction: str,
    clip_size: Tuple[int, int],
    distance: Optional[float] = None
) -> Tuple[float, float]:
    """
    方向に基づいてオフセットを計算

    Args:
        direction: 方向 ('top', 'bottom', 'left', 'right')
        clip_size: クリップサイズ (width, height)
        distance: 移動距離（省略時は画面サイズ）

    Returns:
        オフセット (dx, dy)
    """
    width, height = clip_size

    if direction == 'top':
        return (0.0, -(distance if distance else height))
    elif direction == 'bottom':
        return (0.0, distance if distance else height)
    elif direction == 'left':
        return (-(distance if distance else width), 0.0)
    elif direction == 'right':
        return (distance if distance else width, 0.0)
    else:
        return (0.0, 0.0)


def clamp(value: float, min_val: float, max_val: float) -> float:
    """
    値を範囲内に制限

    Args:
        value: 入力値
        min_val: 最小値
        max_val: 最大値

    Returns:
        制限された値
    """
    return max(min_val, min(max_val, value))


__all__ = [
    'interpolate_value',
    'interpolate_position',
    'interpolate_scale',
    'calculate_timing_progress',
    'get_direction_offset',
    'clamp'
]
