"""
FFmpegFilters - FFmpegフィルターモジュール
MoviePyのフレーム処理ではなく、FFmpegフィルターを使用してエフェクトを適用

対応エフェクト:
- brightness: 明るさ調整 (eq)
- contrast: コントラスト調整 (eq)
- saturation: 彩度調整 (eq)
- blur: ぼかし (boxblur/gblur)
- temperature: 色温度 (colorbalance)
- vignette: ビネット (vignette)
"""

from typing import Dict, Any, List, Optional
import subprocess
import os
import tempfile


def build_eq_filter(brightness: float = 1.0, contrast: float = 1.0, saturation: float = 1.0) -> str:
    """
    eq (equalizer) フィルターを構築

    Args:
        brightness: 明るさ (-1.0 to 1.0, 0がデフォルト) - 入力は0-200で100がデフォルト
        contrast: コントラスト (0.0 to 2.0, 1.0がデフォルト) - 入力は0-200で100がデフォルト
        saturation: 彩度 (0.0 to 3.0, 1.0がデフォルト) - 入力は0-200で100がデフォルト

    Returns:
        FFmpegフィルター文字列
    """
    # 入力値を FFmpeg の eq フィルターの範囲に変換
    # brightness: 100 -> 0, 0 -> -1, 200 -> 1
    ffmpeg_brightness = (brightness - 1.0)  # 既に0-2の範囲に正規化済み

    # saturation と contrast はそのまま使用可能

    return f"eq=brightness={ffmpeg_brightness:.3f}:contrast={contrast:.3f}:saturation={saturation:.3f}"


def build_blur_filter(amount: float = 5) -> str:
    """
    boxblur フィルターを構築

    Args:
        amount: ぼかしの強さ (0-20)

    Returns:
        FFmpegフィルター文字列
    """
    if amount <= 0:
        return ""

    # boxblur は luma_radius:luma_power:chroma_radius:chroma_power
    radius = min(amount, 20)
    return f"boxblur={radius}:{radius // 2 + 1}"


def build_gblur_filter(sigma: float = 5) -> str:
    """
    gblur (Gaussian blur) フィルターを構築

    Args:
        sigma: ぼかしの標準偏差 (0-20)

    Returns:
        FFmpegフィルター文字列
    """
    if sigma <= 0:
        return ""

    return f"gblur=sigma={sigma:.1f}"


def build_colorbalance_filter(temperature: float = 0) -> str:
    """
    colorbalance フィルターで色温度を調整

    Args:
        temperature: 色温度 (-100 to 100, 0がデフォルト)
                     正: 暖色（赤/黄を増加）
                     負: 寒色（青を増加）

    Returns:
        FFmpegフィルター文字列
    """
    if temperature == 0:
        return ""

    # -100 to 100 を -1.0 to 1.0 に変換
    factor = temperature / 100.0

    # 暖色: 赤を増加、青を減少
    # 寒色: 青を増加、赤を減少
    if factor > 0:
        # 暖色化
        rs = factor * 0.3
        gs = factor * 0.1
        bs = -factor * 0.3
    else:
        # 寒色化
        rs = factor * 0.3
        gs = factor * 0.1
        bs = -factor * 0.3

    return f"colorbalance=rs={rs:.3f}:gs={gs:.3f}:bs={bs:.3f}"


def build_vignette_filter(strength: float = 0) -> str:
    """
    vignette フィルターを構築

    Args:
        strength: ビネットの強さ (0-100, 0がデフォルト)

    Returns:
        FFmpegフィルター文字列
    """
    if strength <= 0:
        return ""

    # strength を angle に変換（0-100 -> PI/5 to PI/2）
    # 大きい angle = より強いビネット
    import math
    angle = (math.pi / 5) + (strength / 100.0) * (math.pi / 2 - math.pi / 5)

    return f"vignette=angle={angle:.3f}"


def build_filter_chain(adjustments: Dict[str, Any]) -> str:
    """
    調整データからFFmpegフィルターチェーンを構築

    Args:
        adjustments: 調整パラメータ
            - brightness: 明るさ (0-200, 100がデフォルト)
            - contrast: コントラスト (0-200, 100がデフォルト)
            - saturation: 彩度 (0-200, 100がデフォルト)
            - blur: ブラー (0-20, 0がデフォルト)
            - temperature: 色温度 (-100 to 100, 0がデフォルト)
            - vignette: ビネット (0-100, 0がデフォルト)

    Returns:
        FFmpegフィルターチェーン文字列
    """
    filters = []

    brightness = adjustments.get('brightness', 100) / 100.0
    contrast = adjustments.get('contrast', 100) / 100.0
    saturation = adjustments.get('saturation', 100) / 100.0

    # eq フィルター（明るさ、コントラスト、彩度）
    if brightness != 1.0 or contrast != 1.0 or saturation != 1.0:
        filters.append(build_eq_filter(brightness, contrast, saturation))

    # ブラーフィルター
    blur = adjustments.get('blur', 0)
    if blur > 0:
        filters.append(build_gblur_filter(blur))

    # 色温度フィルター
    temperature = adjustments.get('temperature', 0)
    if temperature != 0:
        filters.append(build_colorbalance_filter(temperature))

    # ビネットフィルター
    vignette = adjustments.get('vignette', 0)
    if vignette > 0:
        filters.append(build_vignette_filter(vignette))

    # フィルターがなければ空文字列
    if not filters:
        return ""

    # フィルターチェーンを構築
    return ",".join(filters)


def apply_ffmpeg_filters(
    input_path: str,
    output_path: str,
    filter_chain: str,
    codec: str = "libx264",
    audio_codec: str = "aac",
    preset: str = "medium",
    bitrate: str = "5000k",
    fps: Optional[int] = None,
    progress_callback: Optional[callable] = None
) -> bool:
    """
    FFmpegを使用してフィルターを適用

    Args:
        input_path: 入力ファイルパス
        output_path: 出力ファイルパス
        filter_chain: FFmpegフィルターチェーン
        codec: ビデオコーデック
        audio_codec: オーディオコーデック
        preset: エンコードプリセット
        bitrate: ビットレート
        fps: フレームレート（Noneの場合は入力と同じ）
        progress_callback: 進捗コールバック

    Returns:
        成功時True、失敗時False
    """
    try:
        cmd = ["ffmpeg", "-y", "-i", input_path]

        # フィルターチェーンの適用
        if filter_chain:
            cmd.extend(["-vf", filter_chain])

        # コーデック設定
        cmd.extend(["-c:v", codec])
        cmd.extend(["-c:a", audio_codec])
        cmd.extend(["-preset", preset])
        cmd.extend(["-b:v", bitrate])

        # FPS設定
        if fps:
            cmd.extend(["-r", str(fps)])

        cmd.append(output_path)

        # FFmpegを実行
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )

        stdout, stderr = process.communicate()

        if process.returncode != 0:
            print(f"FFmpegエラー: {stderr}")
            return False

        return True

    except Exception as e:
        print(f"FFmpegフィルター適用エラー: {e}")
        return False


def get_ffmpeg_filter_params(adjustments: Dict[str, Any]) -> List[str]:
    """
    MoviePyのwrite_videofileに渡すffmpeg_paramsを生成

    Args:
        adjustments: 調整パラメータ

    Returns:
        ffmpeg_paramsリスト
    """
    filter_chain = build_filter_chain(adjustments)

    if not filter_chain:
        return []

    return ["-vf", filter_chain]


def build_filter_chain_with_enable(adjustments: Dict[str, Any], start_time: float, end_time: float) -> str:
    """
    時間範囲付きFFmpegフィルターチェーンを構築

    Args:
        adjustments: 調整パラメータ
        start_time: 開始時間（秒）
        end_time: 終了時間（秒）

    Returns:
        enable付きFFmpegフィルターチェーン文字列
    """
    filters = []

    brightness = adjustments.get('brightness', 100) / 100.0
    contrast = adjustments.get('contrast', 100) / 100.0
    saturation = adjustments.get('saturation', 100) / 100.0

    # eq フィルター（明るさ、コントラスト、彩度）
    if brightness != 1.0 or contrast != 1.0 or saturation != 1.0:
        ffmpeg_brightness = brightness - 1.0
        eq_filter = f"eq=brightness={ffmpeg_brightness:.3f}:contrast={contrast:.3f}:saturation={saturation:.3f}"
        eq_filter += f":enable='between(t,{start_time:.3f},{end_time:.3f})'"
        filters.append(eq_filter)

    # ブラーフィルター
    blur = adjustments.get('blur', 0)
    if blur > 0:
        blur_filter = f"gblur=sigma={blur:.1f}"
        blur_filter += f":enable='between(t,{start_time:.3f},{end_time:.3f})'"
        filters.append(blur_filter)

    # 色温度フィルター
    temperature = adjustments.get('temperature', 0)
    if temperature != 0:
        factor = temperature / 100.0
        rs = factor * 0.3
        gs = factor * 0.1
        bs = -factor * 0.3
        temp_filter = f"colorbalance=rs={rs:.3f}:gs={gs:.3f}:bs={bs:.3f}"
        temp_filter += f":enable='between(t,{start_time:.3f},{end_time:.3f})'"
        filters.append(temp_filter)

    # ビネットフィルター
    vignette_val = adjustments.get('vignette', 0)
    if vignette_val > 0:
        import math
        angle = (math.pi / 5) + (vignette_val / 100.0) * (math.pi / 2 - math.pi / 5)
        vig_filter = f"vignette=angle={angle:.3f}"
        vig_filter += f":enable='between(t,{start_time:.3f},{end_time:.3f})'"
        filters.append(vig_filter)

    return ",".join(filters) if filters else ""


class FFmpegFilterApplier:
    """
    FFmpegフィルターを適用するクラス（MoviePy統合用）

    調整レイヤーの適用ルール:
    - 時間範囲が重なる場合、上位レイヤー（後から追加されたもの）が優先
    - 同一時間帯では最上位レイヤーのみ適用（後勝ち）
    """

    def __init__(self, fps: float = 30.0, total_duration: float = None):
        self.adjustment_layers: List[Dict[str, Any]] = []
        self.fps = fps
        self.total_duration = total_duration  # 総時間（秒）
        self._layer_index = 0

    def set_fps(self, fps: float):
        """FPSを設定"""
        self.fps = fps

    def set_total_duration(self, duration: float):
        """総時間を設定"""
        self.total_duration = duration

    def add_adjustment_layer(self, clip_data: Dict[str, Any], start_frame: int, end_frame: int):
        """
        調整レイヤーを追加

        Args:
            clip_data: 調整レイヤーのデータ
            start_frame: 開始フレーム
            end_frame: 終了フレーム
        """
        start_time = start_frame / self.fps
        end_time = end_frame / self.fps

        # 総時間でクランプ（境界を超えないように）
        if self.total_duration is not None:
            end_time = min(end_time, self.total_duration)
            start_time = min(start_time, self.total_duration)

        # 有効な範囲のみ追加
        if start_time < end_time:
            self.adjustment_layers.append({
                'data': clip_data,
                'start_frame': start_frame,
                'end_frame': end_frame,
                'start_time': start_time,
                'end_time': end_time,
                'layer_index': self._layer_index
            })
            self._layer_index += 1

    def _get_time_segments(self) -> List[tuple]:
        """
        全調整レイヤーの境界を元に時間区間を分割

        Returns:
            [(start_time, end_time), ...] のリスト
        """
        # 全ての境界時刻を収集
        boundaries = set()
        for layer in self.adjustment_layers:
            boundaries.add(layer['start_time'])
            boundaries.add(layer['end_time'])

        # ソートしてペアにする
        sorted_boundaries = sorted(boundaries)
        segments = []
        for i in range(len(sorted_boundaries) - 1):
            segments.append((sorted_boundaries[i], sorted_boundaries[i + 1]))

        return segments

    def _get_winning_layer_for_segment(self, seg_start: float, seg_end: float) -> Optional[Dict[str, Any]]:
        """
        指定区間で最も優先度の高いレイヤーを取得

        Args:
            seg_start: 区間開始時間
            seg_end: 区間終了時間

        Returns:
            最優先レイヤー、該当なしはNone
        """
        candidates = []
        for layer in self.adjustment_layers:
            # この区間と重なるか確認
            if layer['start_time'] <= seg_start and layer['end_time'] >= seg_end:
                candidates.append(layer)

        if not candidates:
            return None

        # layer_indexが最大のものを返す（後勝ち）
        return max(candidates, key=lambda x: x['layer_index'])

    def get_ffmpeg_params(self) -> List[str]:
        """
        MoviePyのwrite_videofileに渡すffmpeg_paramsを取得
        時間区間ごとに最上位レイヤーのみを適用（後勝ち）

        Returns:
            ffmpeg_paramsリスト
        """
        if not self.adjustment_layers:
            return []

        # 時間区間に分割
        segments = self._get_time_segments()
        if not segments:
            return []

        all_filters = []

        for seg_start, seg_end in segments:
            # この区間で最優先のレイヤーを取得
            winning_layer = self._get_winning_layer_for_segment(seg_start, seg_end)
            if not winning_layer:
                continue

            data = winning_layer['data']
            adjustments = {
                'brightness': data.get('brightness', 100),
                'contrast': data.get('contrast', 100),
                'saturation': data.get('saturation', 100),
                'blur': data.get('blur', 0),
                'temperature': data.get('temperature', 0),
                'vignette': data.get('vignette', 0)
            }

            # デフォルト値と異なる場合のみフィルターを生成
            has_effect = (
                adjustments['brightness'] != 100 or
                adjustments['contrast'] != 100 or
                adjustments['saturation'] != 100 or
                adjustments['blur'] > 0 or
                adjustments['temperature'] != 0 or
                adjustments['vignette'] > 0
            )

            if has_effect:
                filter_chain = build_filter_chain_with_enable(adjustments, seg_start, seg_end)
                if filter_chain:
                    all_filters.append(filter_chain)

        if not all_filters:
            return []

        # すべてのフィルターを結合
        combined_filter = ",".join(all_filters)
        return ["-vf", combined_filter]

    def clear(self):
        """調整レイヤーをクリア"""
        self.adjustment_layers = []
        self._layer_index = 0


# シングルトンインスタンス
_applier_instance: Optional[FFmpegFilterApplier] = None


def get_applier() -> FFmpegFilterApplier:
    """FFmpegFilterApplierのシングルトンインスタンスを取得"""
    global _applier_instance
    if _applier_instance is None:
        _applier_instance = FFmpegFilterApplier()
    return _applier_instance


__all__ = [
    'build_filter_chain',
    'build_filter_chain_with_enable',
    'build_eq_filter',
    'build_blur_filter',
    'build_gblur_filter',
    'build_colorbalance_filter',
    'build_vignette_filter',
    'apply_ffmpeg_filters',
    'get_ffmpeg_filter_params',
    'FFmpegFilterApplier',
    'get_applier'
]
