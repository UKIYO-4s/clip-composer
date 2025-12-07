"""
VariableTextHandler - 可変テキストレイヤー処理モジュール
CSVから動的にテキストを差し替える機能を提供
"""

import csv
import os
from typing import List, Optional, Dict, Any


class VariableTextHandler:
    """可変テキストを処理するクラス"""

    def __init__(self):
        """初期化"""
        self._csv_cache: Dict[str, List[Dict[str, str]]] = {}
        self._current_row_index: Dict[str, int] = {}

    def load_csv(self, csv_path: str) -> bool:
        """
        CSVファイルを読み込みキャッシュ

        Args:
            csv_path: CSVファイルのパス

        Returns:
            成功時True、失敗時False
        """
        try:
            if not os.path.exists(csv_path):
                print(f"警告: CSVファイルが存在しません: {csv_path}")
                return False

            if csv_path in self._csv_cache:
                return True  # 既にキャッシュ済み

            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                rows = list(reader)

            if not rows:
                print(f"警告: CSVファイルが空です: {csv_path}")
                return False

            self._csv_cache[csv_path] = rows
            self._current_row_index[csv_path] = 0

            print(f"CSV読み込み成功: {csv_path} ({len(rows)}行)")
            return True

        except Exception as e:
            print(f"CSV読み込みエラー: {e}")
            return False

    def get_text(
        self,
        csv_path: str,
        column_name: str,
        row_index: Optional[int] = None
    ) -> Optional[str]:
        """
        CSVから指定列のテキストを取得

        Args:
            csv_path: CSVファイルのパス
            column_name: 取得する列名
            row_index: 行インデックス（Noneの場合は現在の行）

        Returns:
            テキスト、取得できない場合はNone
        """
        # CSVが未読み込みなら読み込み
        if csv_path not in self._csv_cache:
            if not self.load_csv(csv_path):
                return None

        rows = self._csv_cache.get(csv_path, [])
        if not rows:
            return None

        # 行インデックスの決定
        if row_index is None:
            row_index = self._current_row_index.get(csv_path, 0)

        # 範囲チェック
        if row_index < 0 or row_index >= len(rows):
            print(f"警告: 行インデックスが範囲外です: {row_index} (最大: {len(rows) - 1})")
            row_index = row_index % len(rows)  # ループ

        row = rows[row_index]

        # 列名の取得（大文字小文字を無視して検索）
        text = row.get(column_name)
        if text is None:
            # 大文字小文字を無視して検索
            for key, value in row.items():
                if key.lower() == column_name.lower():
                    text = value
                    break

        if text is None:
            print(f"警告: 列 '{column_name}' が見つかりません")
            available_columns = list(row.keys())
            print(f"  利用可能な列: {available_columns}")

        return text

    def get_text_from_clip(
        self,
        clip_data: Dict[str, Any],
        row_index: Optional[int] = None
    ) -> Optional[str]:
        """
        クリップデータに基づいてテキストを取得

        Args:
            clip_data: 可変テキストクリップのデータ
                - csvPath: CSVファイルパス
                - columnName: 取得する列名
            row_index: 行インデックス（Noneの場合は現在の行）

        Returns:
            テキスト
        """
        csv_path = clip_data.get('csvPath', '')
        column_name = clip_data.get('columnName', 'text')

        if not csv_path:
            print("警告: CSVパスが指定されていません")
            return None

        return self.get_text(csv_path, column_name, row_index)

    def set_row_index(self, csv_path: str, index: int):
        """
        現在の行インデックスを設定

        Args:
            csv_path: CSVファイルのパス
            index: 設定するインデックス
        """
        if csv_path in self._csv_cache:
            max_index = len(self._csv_cache[csv_path]) - 1
            self._current_row_index[csv_path] = min(max(0, index), max_index)

    def next_row(self, csv_path: str) -> int:
        """
        次の行に進む

        Args:
            csv_path: CSVファイルのパス

        Returns:
            新しい行インデックス
        """
        if csv_path not in self._csv_cache:
            return 0

        current = self._current_row_index.get(csv_path, 0)
        max_index = len(self._csv_cache[csv_path]) - 1

        new_index = current + 1
        if new_index > max_index:
            new_index = 0  # ループ

        self._current_row_index[csv_path] = new_index
        return new_index

    def reset_row_index(self, csv_path: Optional[str] = None):
        """
        行インデックスをリセット

        Args:
            csv_path: 特定のCSVのみリセットする場合に指定
        """
        if csv_path:
            if csv_path in self._current_row_index:
                self._current_row_index[csv_path] = 0
        else:
            for key in self._current_row_index:
                self._current_row_index[key] = 0

    def get_column_names(self, csv_path: str) -> List[str]:
        """
        CSVの列名一覧を取得

        Args:
            csv_path: CSVファイルのパス

        Returns:
            列名のリスト
        """
        if csv_path not in self._csv_cache:
            if not self.load_csv(csv_path):
                return []

        rows = self._csv_cache.get(csv_path, [])
        if not rows:
            return []

        return list(rows[0].keys())

    def get_row_count(self, csv_path: str) -> int:
        """
        CSVの行数を取得

        Args:
            csv_path: CSVファイルのパス

        Returns:
            行数
        """
        if csv_path not in self._csv_cache:
            if not self.load_csv(csv_path):
                return 0

        return len(self._csv_cache.get(csv_path, []))

    def clear_cache(self):
        """キャッシュをクリア"""
        self._csv_cache.clear()
        self._current_row_index.clear()


# シングルトンインスタンス
_handler_instance: Optional[VariableTextHandler] = None


def get_handler() -> VariableTextHandler:
    """ハンドラーのシングルトンインスタンスを取得"""
    global _handler_instance
    if _handler_instance is None:
        _handler_instance = VariableTextHandler()
    return _handler_instance
