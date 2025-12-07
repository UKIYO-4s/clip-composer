"""
AdjustmentLayerHandler - 調整レイヤー処理モジュール
不透明度、明るさ、彩度、ブラーなどのエフェクトを適用
"""

from typing import Dict, Any, Optional, Callable
import numpy as np

try:
    from moviepy.editor import VideoClip, ColorClip
    from PIL import Image, ImageEnhance, ImageFilter
    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False
    print("Warning: MoviePy/PIL not available for adjustment layer.")


class AdjustmentLayerHandler:
    """調整レイヤーを処理するクラス"""

    def __init__(self):
        """初期化"""
        pass

    def apply_adjustments(
        self,
        clip,
        clip_data: Dict[str, Any]
    ):
        """
        調整レイヤーのエフェクトをクリップに適用

        Args:
            clip: MoviePy VideoClip オブジェクト
            clip_data: 調整レイヤーのデータ
                - brightness: 明るさ (0-200, 100がデフォルト)
                - contrast: コントラスト (0-200, 100がデフォルト)
                - saturation: 彩度 (0-200, 100がデフォルト)
                - blur: ブラー (0-20, 0がデフォルト)
                - temperature: 色温度 (-100 to 100, 0がデフォルト)
                - vignette: ビネット (0-100, 0がデフォルト)

        Returns:
            調整後のクリップ
        """
        if not MOVIEPY_AVAILABLE:
            print("警告: MoviePy/PILが利用できないため調整を適用できません")
            return clip

        brightness = clip_data.get('brightness', 100) / 100.0
        contrast = clip_data.get('contrast', 100) / 100.0
        saturation = clip_data.get('saturation', 100) / 100.0
        blur = clip_data.get('blur', 0)
        temperature = clip_data.get('temperature', 0)
        vignette = clip_data.get('vignette', 0)

        # エフェクトが全てデフォルトなら何もしない
        if (brightness == 1.0 and contrast == 1.0 and saturation == 1.0 and
                blur == 0 and temperature == 0 and vignette == 0):
            return clip

        def apply_frame_adjustments(get_frame):
            """フレームごとの調整を適用するラッパー"""
            def adjusted_frame(t):
                frame = get_frame(t)

                # NumPy配列からPIL Imageに変換
                img = Image.fromarray(frame.astype('uint8'))

                # 明るさの調整
                if brightness != 1.0:
                    enhancer = ImageEnhance.Brightness(img)
                    img = enhancer.enhance(brightness)

                # コントラストの調整
                if contrast != 1.0:
                    enhancer = ImageEnhance.Contrast(img)
                    img = enhancer.enhance(contrast)

                # 彩度の調整
                if saturation != 1.0:
                    enhancer = ImageEnhance.Color(img)
                    img = enhancer.enhance(saturation)

                # ブラーの適用
                if blur > 0:
                    img = img.filter(ImageFilter.GaussianBlur(radius=blur))

                # 色温度の調整
                if temperature != 0:
                    img = self._apply_temperature(img, temperature)

                # ビネットの適用
                if vignette > 0:
                    img = self._apply_vignette(img, vignette / 100.0)

                # PIL ImageからNumPy配列に戻す
                return np.array(img)

            return adjusted_frame

        # クリップにエフェクトを適用
        adjusted_clip = clip.fl(lambda gf, t: apply_frame_adjustments(gf)(t))

        return adjusted_clip

    def _apply_temperature(self, img: 'Image.Image', temperature: float) -> 'Image.Image':
        """
        色温度を調整

        Args:
            img: PIL Image
            temperature: 色温度 (-100 to 100)

        Returns:
            調整後のPIL Image
        """
        # RGBチャンネルを分離
        r, g, b = img.split()

        # 温度に応じてRとBを調整
        # 正の値は暖色（赤を増加、青を減少）
        # 負の値は寒色（赤を減少、青を増加）
        factor = temperature / 100.0

        if factor > 0:
            # 暖色化
            r = r.point(lambda x: min(255, int(x * (1 + factor * 0.3))))
            b = b.point(lambda x: max(0, int(x * (1 - factor * 0.3))))
        else:
            # 寒色化
            r = r.point(lambda x: max(0, int(x * (1 + factor * 0.3))))
            b = b.point(lambda x: min(255, int(x * (1 - factor * 0.3))))

        return Image.merge('RGB', (r, g, b))

    def _apply_vignette(self, img: 'Image.Image', strength: float) -> 'Image.Image':
        """
        ビネット効果を適用

        Args:
            img: PIL Image
            strength: ビネットの強さ (0.0 to 1.0)

        Returns:
            ビネット適用後のPIL Image
        """
        width, height = img.size
        center_x, center_y = width // 2, height // 2

        # ビネットマスクを作成
        Y, X = np.ogrid[:height, :width]
        distance = np.sqrt((X - center_x) ** 2 + (Y - center_y) ** 2)

        # 最大距離（コーナーまでの距離）
        max_distance = np.sqrt(center_x ** 2 + center_y ** 2)

        # 正規化して反転（中心が1、エッジが0に近づく）
        vignette_mask = 1 - (distance / max_distance) * strength
        vignette_mask = np.clip(vignette_mask, 0, 1)

        # 画像に適用
        img_array = np.array(img).astype(np.float32)

        # 各チャンネルにマスクを適用
        for i in range(3):
            img_array[:, :, i] *= vignette_mask

        return Image.fromarray(img_array.astype('uint8'))

    def create_adjustment_layer(
        self,
        clip_data: Dict[str, Any],
        duration: float,
        resolution: tuple = (1920, 1080),
        fps: float = 30
    ):
        """
        調整レイヤークリップを作成

        Args:
            clip_data: 調整レイヤーのデータ
            duration: クリップの長さ（秒）
            resolution: 解像度
            fps: フレームレート

        Returns:
            調整レイヤーのクリップ
        """
        if not MOVIEPY_AVAILABLE:
            print("警告: MoviePyが利用できないため調整レイヤーを作成できません")
            return None

        # 透明なクリップを作成
        color_clip = ColorClip(size=resolution, color=(0, 0, 0), duration=duration)
        color_clip = color_clip.set_opacity(0)  # 完全に透明

        return color_clip

    def get_effect_description(self, clip_data: Dict[str, Any]) -> str:
        """
        適用されているエフェクトの説明を取得

        Args:
            clip_data: 調整レイヤーのデータ

        Returns:
            エフェクトの説明文字列
        """
        effects = []

        brightness = clip_data.get('brightness', 100)
        if brightness != 100:
            effects.append(f"明るさ: {brightness}%")

        contrast = clip_data.get('contrast', 100)
        if contrast != 100:
            effects.append(f"コントラスト: {contrast}%")

        saturation = clip_data.get('saturation', 100)
        if saturation != 100:
            effects.append(f"彩度: {saturation}%")

        blur = clip_data.get('blur', 0)
        if blur > 0:
            effects.append(f"ブラー: {blur}px")

        temperature = clip_data.get('temperature', 0)
        if temperature != 0:
            temp_desc = "暖色" if temperature > 0 else "寒色"
            effects.append(f"色温度: {temp_desc} ({abs(temperature)})")

        vignette = clip_data.get('vignette', 0)
        if vignette > 0:
            effects.append(f"ビネット: {vignette}%")

        if not effects:
            return "エフェクトなし"

        return ", ".join(effects)


# シングルトンインスタンス
_handler_instance: Optional[AdjustmentLayerHandler] = None


def get_handler() -> AdjustmentLayerHandler:
    """ハンドラーのシングルトンインスタンスを取得"""
    global _handler_instance
    if _handler_instance is None:
        _handler_instance = AdjustmentLayerHandler()
    return _handler_instance
