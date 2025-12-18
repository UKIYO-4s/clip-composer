"""
font_utils.py - 日本語対応フォントユーティリティ

このモジュールは他のモジュールから独立しており、
フォント関連の処理を一元管理します。

fontToolsによるメタデータベースのフォント解決と
TTCフェースインデックス選択をサポート。
"""

import os
import re
import sys
import glob
import struct
import platform
import unicodedata
from PIL import ImageFont
from functools import lru_cache

# ログ出力ヘルパー（JSON互換性のためstderrに出力）
def _log(msg: str):
    """stderrにログ出力（stdoutのJSONを壊さないため）"""
    print(msg, file=sys.stderr)

# fontToolsのインポート（オプション）
try:
    from fontTools.ttLib import TTFont
    FONTTOOLS_AVAILABLE = True
except ImportError:
    FONTTOOLS_AVAILABLE = False
    _log("[font_utils] 警告: fontToolsが利用できません。ファイル名ベースのフォント検索のみ使用します。")


# 日本語対応フォントのパス（優先順位順）
# 明朝系を先頭に配置してデフォルトで明朝が選ばれるようにする
JAPANESE_FONT_PATHS = {
    'Darwin': [  # macOS - 明朝系を優先
        '/System/Library/Fonts/ヒラギノ明朝 ProN.ttc',  # W3/W6含む
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

# フォント検索ディレクトリ（OS別）
FONT_SEARCH_DIRS = {
    'Darwin': [
        '/System/Library/Fonts',
        '/Library/Fonts',
        os.path.expanduser('~/Library/Fonts'),
    ],
    'Linux': [
        '/usr/share/fonts',
        '/usr/local/share/fonts',
        os.path.expanduser('~/.fonts'),
        os.path.expanduser('~/.local/share/fonts'),
    ],
    'Windows': [
        'C:/Windows/Fonts',
    ],
}

# フォントメタデータキャッシュ: {path: [(face_index, family, subfamily, full_name), ...]}
_font_metadata_cache = {}


def _normalize_for_compare(s: str) -> str:
    """
    文字列を正規化して比較用に変換
    - Unicode NFC正規化
    - 小文字化
    - 空白・ハイフン・アンダースコア・全角スペースを除去
    - 全角英数を半角に変換
    """
    if not s:
        return ""
    # NFC正規化
    s = unicodedata.normalize('NFC', s)
    # 全角英数を半角に
    s = unicodedata.normalize('NFKC', s)
    # 小文字化
    s = s.lower()
    # 空白類・ハイフン・アンダースコアを除去
    s = re.sub(r'[\s\-_　]+', '', s)
    return s


def _get_ttc_font_count(path: str) -> int:
    """TTCファイル内のフォント数を取得"""
    try:
        with open(path, 'rb') as f:
            tag = f.read(4)
            if tag == b'ttcf':
                f.read(4)  # version
                return struct.unpack('>I', f.read(4))[0]
    except:
        pass
    return 1


def _get_font_faces_from_file(font_path: str) -> list:
    """
    フォントファイルから全フェースのメタデータを取得

    Returns:
        [(face_index, family, subfamily, full_name), ...] のリスト
    """
    if not FONTTOOLS_AVAILABLE:
        return [(0, '', '', '')]

    # キャッシュチェック
    if font_path in _font_metadata_cache:
        return _font_metadata_cache[font_path]

    faces = []
    try:
        is_ttc = font_path.lower().endswith('.ttc')
        font_count = _get_ttc_font_count(font_path) if is_ttc else 1

        for i in range(min(font_count, 20)):  # 最大20フォントまで
            try:
                tt = TTFont(font_path, fontNumber=i)
                name_table = tt['name']

                family = ''
                subfamily = ''
                full_name = ''

                for record in name_table.names:
                    try:
                        s = record.toUnicode()
                        if not s:
                            continue
                        if record.nameID == 1 and not family:
                            family = s
                        elif record.nameID == 2 and not subfamily:
                            subfamily = s
                        elif record.nameID == 4 and not full_name:
                            full_name = s
                    except:
                        continue

                faces.append((i, family, subfamily, full_name))
                tt.close()
            except:
                break

    except Exception as e:
        _log(f"[font_utils] フォント読み込みエラー: {font_path} - {e}")

    if not faces:
        faces = [(0, '', '', '')]

    _font_metadata_cache[font_path] = faces
    return faces


def _match_font_face(search_family: str, faces: list) -> tuple:
    """
    検索ファミリ名に最もマッチするフェースを選択

    Args:
        search_family: 検索するフォントファミリ名
        faces: [(face_index, family, subfamily, full_name), ...]

    Returns:
        (font_path, face_index) または (None, 0)
    """
    if not search_family or not faces:
        return (None, 0)

    search_normalized = _normalize_for_compare(search_family)

    # W3/W6などのウェイト指定を抽出
    weight_match = re.search(r'w(\d+)', search_normalized)
    target_weight = weight_match.group(1) if weight_match else None

    # ウェイトを除去した検索名
    search_base = re.sub(r'w\d+', '', search_normalized)

    best_match = None
    best_score = 0

    for face_index, family, subfamily, full_name in faces:
        family_norm = _normalize_for_compare(family)
        subfamily_norm = _normalize_for_compare(subfamily)
        full_name_norm = _normalize_for_compare(full_name)

        score = 0

        # フルネームで完全一致
        if search_normalized == full_name_norm:
            score = 100

        # ファミリ名 + サブファミリで一致
        elif search_normalized == family_norm + subfamily_norm:
            score = 95

        # ベース名がファミリ名と一致し、ウェイトがサブファミリと一致
        elif search_base == family_norm:
            score = 80
            if target_weight and target_weight in subfamily_norm:
                score = 90

        # ファミリ名に含まれる
        elif search_base in family_norm or family_norm in search_base:
            score = 60
            if target_weight and target_weight in subfamily_norm:
                score = 70

        # フルネームに含まれる
        elif search_base in full_name_norm or full_name_norm in search_base:
            score = 50
            if target_weight and target_weight in full_name_norm:
                score = 65

        if score > best_score:
            best_score = score
            best_match = (face_index, family, subfamily, full_name)

    if best_match:
        return best_match

    # マッチしない場合は最初のフェースを返す
    return faces[0] if faces else (0, '', '', '')


def find_font_by_family(font_family: str) -> tuple:
    """
    フォントファミリー名からフォントファイルパスとフェースインデックスを検索

    Args:
        font_family: フォントファミリー名（例: "Hiragino Mincho ProN W6", "ヒラギノ明朝"）

    Returns:
        (font_path, face_index) タプル。見つからない場合は (None, 0)
    """
    if not font_family:
        _log("[FONT] warning: font_family is empty")
        return (None, 0)

    _log(f"[FONT] searching: '{font_family}'")

    system = platform.system()
    search_dirs = FONT_SEARCH_DIRS.get(system, [])

    # 検索パターンを構築（日本語・英語両方）
    search_variants = [
        font_family,
        # 日本語変換
        font_family.replace('Hiragino Mincho ProN', 'ヒラギノ明朝 ProN'),
        font_family.replace('Hiragino Mincho Pro', 'ヒラギノ明朝 Pro'),
        font_family.replace('Hiragino Sans', 'ヒラギノ角ゴシック'),
        font_family.replace('Hiragino Maru Gothic', 'ヒラギノ丸ゴ'),
        # 逆変換
        font_family.replace('ヒラギノ明朝', 'Hiragino Mincho'),
        font_family.replace('ヒラギノ角ゴシック', 'Hiragino Sans'),
    ]

    # フォント検索
    extensions = ['*.ttc', '*.ttf', '*.otf', '*.TTC', '*.TTF', '*.OTF']

    for search_dir in search_dirs:
        if not os.path.exists(search_dir):
            continue

        for ext in extensions:
            pattern = os.path.join(search_dir, '**', ext)
            for font_path in glob.glob(pattern, recursive=True):
                # ファイル名をNFC正規化
                font_name = unicodedata.normalize('NFC', os.path.basename(font_path))

                # フェースメタデータを取得
                faces = _get_font_faces_from_file(font_path)

                for search_variant in search_variants:
                    face_info = _match_font_face(search_variant, faces)
                    face_index, family, subfamily, full_name = face_info

                    if family or full_name:  # メタデータでマッチ
                        search_norm = _normalize_for_compare(search_variant)
                        family_norm = _normalize_for_compare(family)
                        full_name_norm = _normalize_for_compare(full_name)

                        # スコアが十分高い場合のみマッチとみなす
                        if (search_norm in family_norm or family_norm in search_norm or
                            search_norm in full_name_norm or full_name_norm in search_norm):
                            _log(f"[FONT] found (metadata): '{font_family}' -> {font_path} (face={face_index})")
                            _log(f"[FONT]   Family='{family}', Subfamily='{subfamily}', Full='{full_name}'")
                            return (font_path, face_index)

                # ファイル名ベースのマッチ（フォールバック）
                font_name_norm = _normalize_for_compare(font_name)
                for search_variant in search_variants:
                    search_norm = _normalize_for_compare(search_variant)
                    # ベース名（ウェイトなし）でも検索
                    search_base = re.sub(r'w\d+', '', search_norm)

                    if search_norm in font_name_norm or search_base in font_name_norm:
                        # ファイル名マッチの場合、ウェイトに応じたフェースを選択
                        face_info = _match_font_face(font_family, faces)
                        face_index = face_info[0]
                        _log(f"[FONT] found (filename): '{font_family}' -> {font_path} (face={face_index})")
                        return (font_path, face_index)

    _log(f"[FONT] not found: '{font_family}'")
    return (None, 0)


@lru_cache(maxsize=64)
def get_font(font_size: int, font_family: str = None) -> ImageFont.FreeTypeFont:
    """
    フォントを取得する

    Args:
        font_size: フォントサイズ
        font_family: フォントファミリー名またはファイルパス（オプション）

    Returns:
        PIL ImageFont オブジェクト
    """
    system = platform.system()

    _log(f"[FONT] get_font called: size={font_size}, family='{font_family}'")

    # 1. font_familyが指定されている場合
    if font_family:
        # ファイルパスとして直接指定されている場合
        if os.path.exists(font_family):
            try:
                font = ImageFont.truetype(font_family, font_size)
                _log(f"[FONT] resolved '{font_family}' -> {font_family} (direct path)")
                return font
            except Exception as e:
                _log(f"[FONT] error loading direct path '{font_family}': {e}")

        # ファミリー名から検索
        font_path, face_index = find_font_by_family(font_family)
        if font_path:
            try:
                # TTCの場合はフェースインデックスを指定
                font = ImageFont.truetype(font_path, font_size, index=face_index)
                _log(f"[FONT] resolved '{font_family}' -> {font_path} (index={face_index})")
                return font
            except Exception as e:
                _log(f"[FONT] error loading '{font_path}' with index={face_index}: {e}")
                # フェースインデックスなしでリトライ
                try:
                    font = ImageFont.truetype(font_path, font_size)
                    _log(f"[FONT] resolved '{font_family}' -> {font_path} (index=0, retry)")
                    return font
                except:
                    pass

        _log(f"[FONT] not found '{font_family}', fallback")

    # 2. 日本語フォントを優先して試行
    font_paths = JAPANESE_FONT_PATHS.get(system, [])

    for font_path in font_paths:
        # macOSのNFD問題に対応
        font_path_nfd = unicodedata.normalize('NFD', font_path)
        for path_variant in [font_path, font_path_nfd]:
            if os.path.exists(path_variant):
                try:
                    font = ImageFont.truetype(path_variant, font_size)
                    _log(f"[FONT] fallback -> {path_variant}")
                    return font
                except Exception as e:
                    continue

    # 3. フォールバック: 英語フォント
    fallback_paths = FALLBACK_FONT_PATHS.get(system, [])

    for font_path in fallback_paths:
        if os.path.exists(font_path):
            try:
                font = ImageFont.truetype(font_path, font_size)
                _log(f"[FONT] fallback (English) -> {font_path}")
                return font
            except Exception:
                continue

    # 4. 最終フォールバック: PILのデフォルトフォント
    _log("[FONT] fallback -> PIL default (no fonts available)")
    return ImageFont.load_default()


def clear_font_cache():
    """フォントキャッシュをクリアする"""
    get_font.cache_clear()
    _font_metadata_cache.clear()
    _log("[font_utils] フォントキャッシュをクリアしました")
