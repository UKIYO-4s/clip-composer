"""
RandomLayerHandler - ランダムレイヤー処理モジュール
フォルダから動画ファイルをランダムに選択する機能を提供
"""

import os
import random
from typing import List, Optional, Dict, Any


class RandomLayerHandler:
    """ランダムレイヤーを処理するクラス"""

    # サポートする動画拡張子
    DEFAULT_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']

    def __init__(self):
        """初期化"""
        self._file_cache: Dict[str, List[str]] = {}
        self._shuffle_indices: Dict[str, int] = {}
        self._sequential_indices: Dict[str, int] = {}

    def get_video_files(
        self,
        folder_path: str,
        extensions: Optional[List[str]] = None,
        file_limit: int = 0
    ) -> List[str]:
        """
        フォルダ内の動画ファイル一覧を取得

        Args:
            folder_path: 動画フォルダのパス
            extensions: 対象とする拡張子リスト（Noneの場合はデフォルト）
            file_limit: ファイル数制限（0=制限なし）

        Returns:
            動画ファイルパスのリスト
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
        files = self.get_video_files(folder_path, extensions, file_limit)

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
        files = self.get_video_files(folder_path, extensions, file_limit)

        if not files:
            return None

        # インデックス管理
        cache_key = f"seq:{folder_path}"
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
        files = self.get_video_files(folder_path, extensions, file_limit)

        if not files:
            return None

        # シャッフルリストのキャッシュキー
        cache_key = f"shuffle:{folder_path}"
        shuffled_key = f"shuffled_list:{folder_path}"

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

    def select_video(
        self,
        clip_data: Dict[str, Any]
    ) -> Optional[str]:
        """
        クリップデータに基づいて動画を選択

        Args:
            clip_data: ランダムレイヤークリップのデータ
                - folderPath: フォルダパス
                - selectionMode: 選択モード ('random', 'sequential', 'shuffle')
                - extensions: 拡張子フィルター文字列 (例: '.mp4,.mov')
                - fileLimit: ファイル数制限

        Returns:
            選択された動画ファイルパス
        """
        folder_path = clip_data.get('folderPath', '')
        selection_mode = clip_data.get('selectionMode', 'random')
        extensions_str = clip_data.get('extensions', '')
        file_limit = clip_data.get('fileLimit', 0)

        # 拡張子文字列をリストに変換
        if extensions_str:
            extensions = [ext.strip() for ext in extensions_str.split(',') if ext.strip()]
        else:
            extensions = None

        # 選択モードに応じて処理
        if selection_mode == 'sequential':
            return self.select_sequential(folder_path, extensions, file_limit)
        elif selection_mode == 'shuffle':
            return self.select_shuffle(folder_path, extensions, file_limit)
        else:
            return self.select_random(folder_path, extensions, file_limit)

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
