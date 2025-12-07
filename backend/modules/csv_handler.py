"""
CSVHandler - CSV一括動画生成用のハンドラー
CSVファイルを読み込み、各行のデータをバリデーションして動画を生成
"""

import csv
import os
from typing import List, Dict, Any, Callable, Optional


class CSVHandler:
    """CSV一括動画生成ハンドラー"""

    def __init__(self):
        """初期化"""
        self.csv_data = []
        self.csv_path = None
        self.errors = []

    def load_csv(self, csv_path: str) -> bool:
        """
        CSVファイルを読み込む

        Args:
            csv_path (str): CSVファイルパス

        Returns:
            bool: 成功時True、失敗時False
        """
        try:
            if not os.path.exists(csv_path):
                raise FileNotFoundError(f"CSVファイルが見つかりません: {csv_path}")

            self.csv_path = csv_path
            self.csv_data = []
            self.errors = []

            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)

                # ヘッダーの確認
                required_headers = ['動画名']
                fieldnames = reader.fieldnames

                if not fieldnames:
                    raise ValueError("CSVファイルにヘッダーがありません")

                missing_headers = [h for h in required_headers if h not in fieldnames]
                if missing_headers:
                    raise ValueError(f"必須ヘッダーが不足しています: {', '.join(missing_headers)}")

                # データ行を読み込み
                for row_num, row in enumerate(reader, start=2):  # 2から開始（1行目はヘッダー）
                    self.csv_data.append({
                        'row_number': row_num,
                        'data': row
                    })

            print(f"CSV読み込み成功: {csv_path}")
            print(f"  行数: {len(self.csv_data)}")

            return True

        except Exception as e:
            print(f"CSV読み込みエラー: {e}")
            self.errors.append({
                'row': 0,
                'error': str(e)
            })
            return False

    def validate_row(self, row_data: Dict[str, str]) -> tuple[bool, Optional[str]]:
        """
        CSVの1行をバリデーション

        Args:
            row_data: CSVの行データ

        Returns:
            tuple: (成功/失敗, エラーメッセージ)
        """
        try:
            # 動画名の確認
            video_name = row_data.get('動画名', '').strip()
            if not video_name:
                return False, "動画名が空です"

            # ランダムフォルダパスの確認（存在する場合のみ）
            for i in range(1, 4):  # ランダム1〜3
                folder_key = f'ランダム{i}'
                folder_path = row_data.get(folder_key, '').strip()

                if folder_path:
                    # パスが指定されている場合は存在確認
                    if not os.path.exists(folder_path):
                        return False, f"{folder_key}のパスが存在しません: {folder_path}"

                    if not os.path.isdir(folder_path):
                        return False, f"{folder_key}がフォルダではありません: {folder_path}"

            # カラーコードの確認（指定されている場合のみ）
            for i in range(1, 10):  # 可変テキスト1〜9
                color_key = f'可変テキスト{i}カラー'
                color = row_data.get(color_key, '').strip()

                if color:
                    # #で始まる6桁の16進数かチェック
                    if not (color.startswith('#') and len(color) == 7):
                        # 色名のチェック（基本的な色名を許可）
                        valid_colors = ['white', 'black', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta']
                        if color.lower() not in valid_colors:
                            return False, f"{color_key}の形式が不正です: {color}（#RRGGBB形式または色名を使用）"

            return True, None

        except Exception as e:
            return False, f"バリデーションエラー: {str(e)}"

    def parse_row_to_overrides(self, row_data: Dict[str, str]) -> Dict[str, Any]:
        """
        CSV行データをタイムライン上書き用データに変換

        Args:
            row_data: CSVの行データ

        Returns:
            dict: タイムライン上書き用データ
        """
        overrides = {}

        # ランダムフォルダパス（ランダム1〜3）
        for i in range(1, 4):
            folder_key = f'ランダム{i}'
            folder_path = row_data.get(folder_key, '').strip()
            if folder_path:
                overrides[f'random_folder_{i}'] = folder_path

        # 可変テキスト（可変テキスト1〜9）
        for i in range(1, 10):
            content_key = f'可変テキスト{i}内容'
            font_key = f'可変テキスト{i}フォント'
            color_key = f'可変テキスト{i}カラー'

            content = row_data.get(content_key, '').strip()
            font = row_data.get(font_key, '').strip()
            color = row_data.get(color_key, '').strip()

            if content or font or color:
                text_override = {}
                if content:
                    text_override['text'] = content
                if font:
                    text_override['font'] = font
                if color:
                    text_override['color'] = color

                overrides[f'variable_text_{i}'] = text_override

        return overrides

    def get_total_rows(self) -> int:
        """
        読み込んだCSVの総行数を取得

        Returns:
            int: 総行数
        """
        return len(self.csv_data)

    def get_row_data(self, index: int) -> Optional[Dict[str, Any]]:
        """
        指定インデックスの行データを取得

        Args:
            index: 行インデックス（0始まり）

        Returns:
            dict: 行データ、存在しない場合はNone
        """
        if 0 <= index < len(self.csv_data):
            return self.csv_data[index]
        return None

    def process_batch(
        self,
        timeline_data: Dict[str, Any],
        output_dir: str,
        options: Optional[Dict[str, Any]] = None,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
        row_callback: Optional[Callable[[int, Dict[str, Any], bool, Optional[str]], None]] = None
    ) -> Dict[str, Any]:
        """
        CSV全行を一括処理して動画を生成

        Args:
            timeline_data: ベースとなるタイムラインデータ
            output_dir: 出力先ディレクトリ
            options: レンダリングオプション
            progress_callback: 全体進捗コールバック(current, total, message)
            row_callback: 行単位コールバック(row_number, row_data, success, error_message)

        Returns:
            dict: 処理結果 {'success_count': int, 'error_count': int, 'errors': list}
        """
        from modules.video_processor import VideoProcessor

        if not self.csv_data:
            raise ValueError("CSVデータが読み込まれていません")

        # 出力ディレクトリの作成
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        total_rows = len(self.csv_data)
        success_count = 0
        error_count = 0
        errors = []

        processor = VideoProcessor()

        for index, row_info in enumerate(self.csv_data):
            row_number = row_info['row_number']
            row_data = row_info['data']
            video_name = row_data.get('動画名', '').strip()

            # 全体進捗通知
            if progress_callback:
                progress_callback(
                    index + 1,
                    total_rows,
                    f"{video_name}を処理中... ({index + 1}/{total_rows})"
                )

            # バリデーション
            is_valid, error_message = self.validate_row(row_data)
            if not is_valid:
                error_count += 1
                error_info = {
                    'row': row_number,
                    'video_name': video_name,
                    'error': error_message
                }
                errors.append(error_info)

                if row_callback:
                    row_callback(row_number, row_data, False, error_message)

                print(f"行{row_number}をスキップ: {error_message}")
                continue

            try:
                # 上書きデータの生成
                overrides = self.parse_row_to_overrides(row_data)

                # タイムラインデータのコピーと上書き
                modified_timeline = self._apply_overrides(timeline_data.copy(), overrides)

                # 出力パスの生成
                output_path = os.path.join(output_dir, f"{video_name}.mp4")

                # 個別動画の進捗コールバック
                def video_progress_callback(progress_data: Dict[str, Any]):
                    if progress_callback:
                        percentage = progress_data.get('percentage', 0)
                        progress_callback(
                            index + 1,
                            total_rows,
                            f"{video_name}をレンダリング中... {percentage:.1f}%"
                        )

                # 動画生成
                result = processor.render(
                    timeline_data=modified_timeline,
                    output_path=output_path,
                    options=options,
                    progress_callback=video_progress_callback
                )

                if result:
                    success_count += 1
                    if row_callback:
                        row_callback(row_number, row_data, True, None)
                    print(f"行{row_number}の動画生成成功: {output_path}")
                else:
                    raise Exception("レンダリングが失敗しました")

            except Exception as e:
                error_count += 1
                error_info = {
                    'row': row_number,
                    'video_name': video_name,
                    'error': str(e)
                }
                errors.append(error_info)

                if row_callback:
                    row_callback(row_number, row_data, False, str(e))

                print(f"行{row_number}の動画生成エラー: {e}")

        # 結果サマリー
        result_summary = {
            'success_count': success_count,
            'error_count': error_count,
            'total_count': total_rows,
            'errors': errors
        }

        print(f"\nCSV一括処理完了:")
        print(f"  成功: {success_count}/{total_rows}")
        print(f"  失敗: {error_count}/{total_rows}")

        return result_summary

    def _apply_overrides(
        self,
        timeline_data: Dict[str, Any],
        overrides: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        タイムラインデータにCSVの上書きデータを適用

        Args:
            timeline_data: ベースとなるタイムラインデータ
            overrides: 上書きデータ

        Returns:
            dict: 上書き後のタイムラインデータ
        """
        # ディープコピーを作成（元データを変更しない）
        import copy
        modified_timeline = copy.deepcopy(timeline_data)

        layers = modified_timeline.get('layers', {})

        # 各レイヤーのクリップを処理
        for layer_name, layer in layers.items():
            clips = layer.get('clips', [])

            for clip in clips:
                clip_type = clip.get('type')

                # ランダムフォルダの適用（videoまたはimageタイプ）
                if clip_type in ['video', 'image']:
                    # クリップにランダム識別子があれば対応するフォルダから選択
                    random_id = clip.get('randomId')  # 例: 'random_1', 'random_2', etc
                    if random_id and random_id in overrides:
                        folder_path = overrides[random_id]
                        # フォルダからランダムにファイルを選択
                        selected_file = self._select_random_file(folder_path, clip_type)
                        if selected_file:
                            clip['filePath'] = selected_file

                # 可変テキストの適用（textタイプ）
                if clip_type == 'text':
                    # クリップに可変テキスト識別子があれば対応するテキストを適用
                    variable_id = clip.get('variableId')  # 例: 'variable_text_1', 'variable_text_2', etc
                    if variable_id and variable_id in overrides:
                        text_data = overrides[variable_id]

                        if 'text' in text_data:
                            clip['text'] = text_data['text']
                        if 'font' in text_data:
                            clip['font'] = text_data['font']
                        if 'color' in text_data:
                            clip['color'] = text_data['color']

        return modified_timeline

    def _select_random_file(self, folder_path: str, clip_type: str) -> Optional[str]:
        """
        フォルダからランダムにファイルを選択

        Args:
            folder_path: フォルダパス
            clip_type: クリップタイプ（'video' または 'image'）

        Returns:
            str: 選択されたファイルパス、見つからない場合はNone
        """
        import random

        try:
            # ファイルタイプに応じた拡張子
            if clip_type == 'video':
                valid_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
            elif clip_type == 'image':
                valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
            else:
                return None

            # フォルダ内のファイル一覧を取得
            files = []
            for filename in os.listdir(folder_path):
                file_path = os.path.join(folder_path, filename)
                if os.path.isfile(file_path):
                    _, ext = os.path.splitext(filename)
                    if ext.lower() in valid_extensions:
                        files.append(file_path)

            if not files:
                print(f"警告: {folder_path} に有効なファイルが見つかりません")
                return None

            # ランダムに選択
            selected = random.choice(files)
            print(f"ランダム選択: {selected}")
            return selected

        except Exception as e:
            print(f"ランダムファイル選択エラー: {e}")
            return None

    def get_errors(self) -> List[Dict[str, Any]]:
        """
        エラーリストを取得

        Returns:
            list: エラー情報のリスト
        """
        return self.errors
