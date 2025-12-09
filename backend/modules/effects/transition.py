"""
Transition - トランジション効果モジュール
クリップ間のフェード・ワイプなどのトランジションを適用
"""

from typing import Optional, Any
import warnings

try:
    from moviepy.editor import VideoClip, CompositeVideoClip, ColorClip
    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False
    VideoClip = Any

from .easing import get_easing


class TransitionHandler:
    """トランジション効果を適用するクラス"""

    # サポートするトランジションタイプ
    SUPPORTED_TYPES = ['crossfade', 'fade_black', 'fade_white']

    def __init__(self):
        """初期化"""
        pass

    def apply_crossfade(
        self,
        clip: VideoClip,
        duration_frames: int,
        fps: float,
        position: str = 'both',
        easing: str = 'linear'
    ) -> VideoClip:
        """
        クロスフェードを適用

        Args:
            clip: 対象のVideoClip
            duration_frames: トランジション時間（フレーム数）
            fps: フレームレート
            position: 適用位置 ('in', 'out', 'both')
            easing: イージング関数名

        Returns:
            トランジション適用後のVideoClip
        """
        if not MOVIEPY_AVAILABLE:
            warnings.warn("MoviePy is not available. Transition not applied.")
            return clip

        if duration_frames <= 0:
            return clip

        duration_sec = duration_frames / fps
        clip_duration = getattr(clip, "duration", None)
        easing_func = get_easing(easing)

        def opacity_func(t: float) -> float:
            """イージングを用いたフェードイン/アウトの不透明度を返す"""
            value = 1.0

            if position in ('in', 'both') and t < duration_sec:
                ratio = max(0.0, min(1.0, t / duration_sec))
                value *= easing_func(ratio)

            if position in ('out', 'both') and clip_duration:
                fade_start = max(0.0, clip_duration - duration_sec)
                if t >= fade_start:
                    ratio = max(0.0, min(1.0, (clip_duration - t) / duration_sec))
                    value *= easing_func(ratio)

            return max(0.0, min(1.0, value))

        try:
            return clip.set_opacity(opacity_func)

        except Exception as e:
            warnings.warn(f"Crossfade application failed: {e}")
            return clip

    def apply_fade_black(
        self,
        clip: VideoClip,
        duration_frames: int,
        fps: float,
        position: str = 'in',
        easing: str = 'linear'
    ) -> VideoClip:
        """
        黒へ/からフェード

        Args:
            clip: 対象のVideoClip
            duration_frames: トランジション時間（フレーム数）
            fps: フレームレート
            position: 適用位置 ('in' = 黒から開始, 'out' = 黒へ終了)
            easing: イージング関数名

        Returns:
            トランジション適用後のVideoClip
        """
        if not MOVIEPY_AVAILABLE:
            warnings.warn("MoviePy is not available. Transition not applied.")
            return clip

        if duration_frames <= 0:
            return clip

        duration_sec = duration_frames / fps
        clip_duration = getattr(clip, "duration", None)
        easing_func = get_easing(easing)

        def opacity_func(t: float) -> float:
            """黒背景へのフェードイン/アウトをイージングで制御"""
            value = 1.0

            if position == 'in' and t < duration_sec:
                ratio = max(0.0, min(1.0, t / duration_sec))
                value = easing_func(ratio)
            elif position == 'out' and clip_duration:
                fade_start = max(0.0, clip_duration - duration_sec)
                if t >= fade_start:
                    ratio = max(0.0, min(1.0, (clip_duration - t) / duration_sec))
                    value = easing_func(ratio)

            return max(0.0, min(1.0, value))

        try:
            return clip.set_opacity(opacity_func)

        except Exception as e:
            warnings.warn(f"Fade black application failed: {e}")
            return clip

    def apply_fade_white(
        self,
        clip: VideoClip,
        duration_frames: int,
        fps: float,
        position: str = 'in',
        easing: str = 'linear'
    ) -> VideoClip:
        """
        白へ/からフェード

        Args:
            clip: 対象のVideoClip
            duration_frames: トランジション時間（フレーム数）
            fps: フレームレート
            position: 適用位置 ('in' = 白から開始, 'out' = 白へ終了)
            easing: イージング関数名

        Returns:
            トランジション適用後のVideoClip
        """
        if not MOVIEPY_AVAILABLE:
            warnings.warn("MoviePy is not available. Transition not applied.")
            return clip

        if duration_frames <= 0:
            return clip

        duration_sec = duration_frames / fps
        clip_duration = clip.duration
        clip_size = clip.size
        easing_func = get_easing(easing)

        try:
            # 白いクリップを作成
            white_clip = ColorClip(size=clip_size, color=(255, 255, 255))

            if position == 'in':
                # 白から徐々に元のクリップへ
                white_clip = white_clip.set_duration(duration_sec)
                white_clip = white_clip.set_start(0)
                white_clip = white_clip.set_opacity(
                    lambda t: 1.0 - easing_func(max(0.0, min(1.0, t / duration_sec)))
                )

                # 合成（白クリップを上に重ねる）
                clip = CompositeVideoClip([clip, white_clip], size=clip_size)
                clip = clip.set_duration(clip_duration)

            elif position == 'out':
                # 徐々に白へ
                white_clip = white_clip.set_duration(duration_sec)
                white_clip = white_clip.set_start(clip_duration - duration_sec)
                white_clip = white_clip.set_opacity(
                    lambda t: easing_func(max(0.0, min(1.0, t / duration_sec)))
                )

                # 合成
                clip = CompositeVideoClip([clip, white_clip], size=clip_size)
                clip = clip.set_duration(clip_duration)

            return clip

        except Exception as e:
            warnings.warn(f"Fade white application failed: {e}")
            return clip

    def apply_transition(
        self,
        clip: VideoClip,
        transition_type: str,
        duration_frames: int,
        fps: float,
        position: str = 'in',
        easing: str = 'linear'
    ) -> VideoClip:
        """
        汎用トランジション適用メソッド

        Args:
            clip: 対象のVideoClip
            transition_type: トランジションタイプ ('crossfade', 'fade_black', 'fade_white')
            duration_frames: トランジション時間（フレーム数）
            fps: フレームレート
            position: 適用位置 ('in', 'out', 'both')
            easing: イージング関数名

        Returns:
            トランジション適用後のVideoClip
        """
        if not MOVIEPY_AVAILABLE:
            warnings.warn("MoviePy is not available. Transition not applied.")
            return clip

        if not transition_type or transition_type not in self.SUPPORTED_TYPES:
            if transition_type:
                warnings.warn(f"Unknown transition type: {transition_type}. Ignoring.")
            return clip

        if transition_type == 'crossfade':
            return self.apply_crossfade(clip, duration_frames, fps, position, easing)
        elif transition_type == 'fade_black':
            return self.apply_fade_black(clip, duration_frames, fps, position, easing)
        elif transition_type == 'fade_white':
            return self.apply_fade_white(clip, duration_frames, fps, position, easing)
        else:
            return clip


# シングルトンインスタンス
_handler_instance: Optional[TransitionHandler] = None


def get_handler() -> TransitionHandler:
    """ハンドラーのシングルトンインスタンスを取得"""
    global _handler_instance
    if _handler_instance is None:
        _handler_instance = TransitionHandler()
    return _handler_instance
