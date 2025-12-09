"""
RandomLayerHandler - ランダムレイヤー処理モジュール
フォルダからメディアファイル（動画・画像）をランダムに選択する機能を提供
"""

import os
import random
from typing import List, Optional, Dict, Any


# =============================================================================
# 拡張子定義
# =============================================================================

VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
GIF_EXTENSIONS = ['.gif']  # 別扱い（重い場合あり）


def get_extensions_for_media_type(media_type: str, include_gif: bool = False) -> List[str]:
    """
    media_typeに応じた拡張子リストを返す

    Args:
        media_type: 'video_only' | 'image_only' | 'both'
        include_gif: GIFを含めるか

    Returns:
        拡張子リスト
    """
    if media_type == 'video_only':
        return VIDEO_EXTENSIONS.copy()
    elif media_type == 'image_only':
        exts = IMAGE_EXTENSIONS.copy()
        if include_gif:
            exts.extend(GIF_EXTENSIONS)
        return exts
    elif media_type == 'both':
        exts = VIDEO_EXTENSIONS.copy() + IMAGE_EXTENSIONS.copy()
        if include_gif:
            exts.extend(GIF_EXTENSIONS)
        return exts
    else:
        # デフォルト: 動画のみ（後方互換性）
        return VIDEO_EXTENSIONS.copy()


def is_video_file(file_path: str) -> bool:
    """
    ファイルが動画かどうかを判定

    Args:
        file_path: ファイルパス

    Returns:
        動画ファイルならTrue
    """
    ext = os.path.splitext(file_path)[1].lower()
    return ext in VIDEO_EXTENSIONS


def is_image_file(file_path: str) -> bool:
    """
    ファイルが画像かどうかを判定

    Args:
        file_path: ファイルパス

    Returns:
        画像ファイルならTrue
    """
    ext = os.path.splitext(file_path)[1].lower()
    return ext in IMAGE_EXTENSIONS or ext in GIF_EXTENSIONS


def is_gif_file(file_path: str) -> bool:
    """
    ファイルがGIFかどうかを判定

    Args:
        file_path: ファイルパス

    Returns:
        GIFファイルならTrue
    """
    ext = os.path.splitext(file_path)[1].lower()
    return ext in GIF_EXTENSIONS


class RandomLayerHandler:
    """ランダムレイヤーを処理するクラス"""

    # サポートする動画拡張子（後方互換性）
    DEFAULT_EXTENSIONS = VIDEO_EXTENSIONS

    def __init__(self):
        """初期化"""
        self._file_cache: Dict[str, List[str]] = {}
        self._shuffle_indices: Dict[str, int] = {}
        self._sequential_indices: Dict[str, int] = {}

    def get_media_files(
        self,
        folder_path: str,
        extensions: Optional[List[str]] = None,
        file_limit: int = 0
    ) -> List[str]:
        """
        フォルダ内のメディアファイル一覧を取得

        Args:
            folder_path: メディアフォルダのパス
            extensions: 対象とする拡張子リスト（Noneの場合はデフォルト）
            file_limit: ファイル数制限（0=制限なし）

        Returns:
            メディアファイルパスのリスト
        """
        if not os.path.exists(folder_path):
            print(f"警告: フォルダが存在しません: {folder_path}")
            return []

        if not os.path.isdir(folder_path):
            print(f"警告: パスがディレクトリではありません: {folder_path}")
            return []

        # 拡張子リストの準備
        if extensions is None:
            extensions = self.DEFAULT_EXTENSIONS
        extensions = [ext.lower() for ext in extensions]

        # キャッシュキーの生成
        cache_key = f"{folder_path}:{','.join(extensions)}"

        # キャッシュから取得
        if cache_key in self._file_cache:
            files = self._file_cache[cache_key]
        else:
            # フォルダ内のファイルをスキャン
            files = []
            for filename in os.listdir(folder_path):
                file_ext = os.path.splitext(filename)[1].lower()
                if file_ext in extensions:
                    files.append(os.path.join(folder_path, filename))

            # ファイル名でソート（一貫した順序のため）
            files.sort()

            # キャッシュに保存
            self._file_cache[cache_key] = files

        # ファイル数制限
        if file_limit > 0 and len(files) > file_limit:
            files = files[:file_limit]

        return files

    # 後方互換性のためのエイリアス
    def get_video_files(
        self,
        folder_path: str,
        extensions: Optional[List[str]] = None,
        file_limit: int = 0
    ) -> List[str]:
        """
        フォルダ内の動画ファイル一覧を取得（後方互換性のため残存）

        Note:
            このメソッドは後方互換性のために残されています。
            新しいコードでは get_media_files() を使用してください。
        """
        return self.get_media_files(folder_path, extensions, file_limit)

    def select_random(
        self,
        folder_path: str,
        extensions: Optional[List[str]] = None,
        file_limit: int = 0
    ) -> Optional[str]:
        """
        ランダムモード: フォルダから動画をランダムに1つ選択

        Args:
            folder_path: 動画フォルダのパス
            extensions: 対象とする拡張子リスト
            file_limit: ファイル数制限

        Returns:
            選択された動画ファイルパス（ファイルがない場合はNone）
        """
        files = self.get_media_files(folder_path, extensions, file_limit)

        if not files:
            return None

        return random.choice(files)

    def select_sequential(
        self,
        folder_path: str,
        extensions: Optional[List[str]] = None,
        file_limit: int = 0
    ) -> Optional[str]:
        """
        順番モード: フォルダから動画を順番に選択

        Args:
            folder_path: 動画フォルダのパス
            extensions: 対象とする拡張子リスト
            file_limit: ファイル数制限

        Returns:
            選択された動画ファイルパス（ファイルがない場合はNone）
        """
        files = self.get_media_files(folder_path, extensions, file_limit)

        if not files:
            return None

        # インデックス管理（拡張子を含めてキャッシュキーを生成）
        cache_key = f"seq:{folder_path}:{','.join(extensions or [])}"
        current_idx = self._sequential_indices.get(cache_key, 0)

        # ファイル数を超えたらリセット
        if current_idx >= len(files):
            current_idx = 0

        selected = files[current_idx]

        # インデックスを進める
        self._sequential_indices[cache_key] = current_idx + 1

        return selected

    def select_shuffle(
        self,
        folder_path: str,
        extensions: Optional[List[str]] = None,
        file_limit: int = 0
    ) -> Optional[str]:
        """
        シャッフルモード: フォルダの動画をシャッフルして順番に選択
        （全ファイルを1回ずつ使い切ってから再シャッフル）

        Args:
            folder_path: 動画フォルダのパス
            extensions: 対象とする拡張子リスト
            file_limit: ファイル数制限

        Returns:
            選択された動画ファイルパス（ファイルがない場合はNone）
        """
        files = self.get_media_files(folder_path, extensions, file_limit)

        if not files:
            return None

        # シャッフルリストのキャッシュキー（拡張子を含める）
        ext_key = ','.join(extensions or [])
        cache_key = f"shuffle:{folder_path}:{ext_key}"
        shuffled_key = f"shuffled_list:{folder_path}:{ext_key}"

        # シャッフルリストを管理
        if shuffled_key not in self._file_cache:
            shuffled = files.copy()
            random.shuffle(shuffled)
            self._file_cache[shuffled_key] = shuffled
            self._shuffle_indices[cache_key] = 0

        current_idx = self._shuffle_indices.get(cache_key, 0)
        shuffled_list = self._file_cache[shuffled_key]

        # 全ファイルを使い切ったら再シャッフル
        if current_idx >= len(shuffled_list):
            shuffled = files.copy()
            random.shuffle(shuffled)
            self._file_cache[shuffled_key] = shuffled
            shuffled_list = shuffled
            current_idx = 0

        selected = shuffled_list[current_idx]

        # インデックスを進める
        self._shuffle_indices[cache_key] = current_idx + 1

        return selected

    def select_media(
        self,
        clip_data: Dict[str, Any]
    ) -> Optional[str]:
        """
        クリップデータに基づいてメディアファイルを選択

        Args:
            clip_data: ランダムレイヤークリップのデータ
                - folderPath: フォルダパス
                - selectionMode: 選択モード ('random', 'sequential', 'shuffle')
                - extensions: 拡張子フィルター文字列 (例: '.mp4,.mov')
                - fileLimit: ファイル数制限
                - mediaType: メディアタイプ ('video_only', 'image_only', 'both')
                - includeGif: GIFを含めるか

        Returns:
            選択されたメディアファイルパス
        """
        folder_path = clip_data.get('folderPath', '')
        selection_mode = clip_data.get('selectionMode', 'random')
        extensions_str = clip_data.get('extensions', '')
        file_limit = clip_data.get('fileLimit', 0)

        # 新規: mediaType対応（後方互換: 未指定はvideo_only）
        media_type = clip_data.get('mediaType', 'video_only')
        include_gif = clip_data.get('includeGif', False)

        # 拡張子の決定
        if extensions_str:
            # 明示的に指定されている場合はそれを使用
            extensions = [ext.strip() for ext in extensions_str.split(',') if ext.strip()]
        else:
            # mediaTypeに基づいて拡張子を決定
            extensions = get_extensions_for_media_type(media_type, include_gif)

        # 選択モードに応じて処理
        if selection_mode == 'sequential':
            return self.select_sequential(folder_path, extensions, file_limit)
        elif selection_mode == 'shuffle':
            return self.select_shuffle(folder_path, extensions, file_limit)
        else:
            return self.select_random(folder_path, extensions, file_limit)

    # 後方互換性のためのエイリアス
    def select_video(
        self,
        clip_data: Dict[str, Any]
    ) -> Optional[str]:
        """
        クリップデータに基づいてメディアファイルを選択（後方互換性のため残存）

        Note:
            このメソッドは後方互換性のために残されています。
            新しいコードでは select_media() を使用してください。
        """
        return self.select_media(clip_data)

    def clear_cache(self):
        """キャッシュをクリア"""
        self._file_cache.clear()
        self._shuffle_indices.clear()
        self._sequential_indices.clear()

    def reset_indices(self):
        """インデックスのみをリセット（キャッシュは保持）"""
        self._shuffle_indices.clear()
        self._sequential_indices.clear()


# シングルトンインスタンス
_handler_instance: Optional[RandomLayerHandler] = None


def get_handler() -> RandomLayerHandler:
    """ハンドラーのシングルトンインスタンスを取得"""
    global _handler_instance
    if _handler_instance is None:
        _handler_instance = RandomLayerHandler()
    return _handler_instance
