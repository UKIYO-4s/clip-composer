"""
font_utils.py - 日本語対応フォントユーティリティ

このモジュールは他のモジュールから独立しており、
フォント関連の処理を一元管理します。
"""

import os
import platform
from PIL import ImageFont
from functools import lru_cache


# 日本語対応フォントのパス（優先順位順）
JAPANESE_FONT_PATHS = {
    'Darwin': [  # macOS
        '/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc',
        '/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc',
        '/System/Library/Fonts/Hiragino Sans GB.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
        '/System/Library/Fonts/AppleSDGothicNeo.ttc',
    ],
    'Linux': [
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc',
    ],
    'Windows': [
        'C:/Windows/Fonts/msgothic.ttc',
        'C:/Windows/Fonts/meiryo.ttc',
        'C:/Windows/Fonts/YuGothM.ttc',
    ],
}

# フォールバック用の英語フォント
FALLBACK_FONT_PATHS = {
    'Darwin': [
        '/System/Library/Fonts/Helvetica.ttc',
    ],
    'Linux': [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ],
    'Windows': [
        'C:/Windows/Fonts/arial.ttf',
    ],
}


@lru_cache(maxsize=32)
def get_font(font_size: int, font_family: str = None) -> ImageFont.FreeTypeFont:
    """
    日本語対応フォントを取得する

    Args:
        font_size: フォントサイズ
        font_family: フォントファミリー名（オプション、将来的な拡張用）

    Returns:
        PIL ImageFont オブジェクト
    """
    system = platform.system()

    # 日本語フォントを優先して試行
    font_paths = JAPANESE_FONT_PATHS.get(system, [])

    for font_path in font_paths:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, font_size)
            except Exception:
                continue

    # フォールバック: 英語フォント
    fallback_paths = FALLBACK_FONT_PATHS.get(system, [])

    for font_path in fallback_paths:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, font_size)
            except Exception:
                continue

    # 最終フォールバック: PILのデフォルトフォント
    return ImageFont.load_default()


def clear_font_cache():
    """フォントキャッシュをクリアする"""
    get_font.cache_clear()
