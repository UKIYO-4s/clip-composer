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
            # 動画名の確認（必須カラム）
            video_name = row_data.get('動画名', '').strip()
            if not video_name:
                return False, "動画名が空です"

            # フォルダパスの確認（値がフォルダパスっぽい場合は存在確認）
            for key, value in row_data.items():
                if not value:
                    continue
                value = value.strip()
                # パス区切り文字を含む場合はフォルダパスとして検証
                if ('/' in value or '\\' in value) and not value.startswith('#'):
                    if os.path.exists(value) and not os.path.isdir(value) and not os.path.isfile(value):
                        # 存在しないパス
                        return False, f"{key}のパスが存在しません: {value}"

            return True, None

        except Exception as e:
            return False, f"バリデーションエラー: {str(e)}"

    def parse_row_to_overrides(self, row_data: Dict[str, str]) -> Dict[str, Any]:
        """
        CSV行データをそのままオーバーライドデータとして返す
        （カラム名をキーとして使用）

        Args:
            row_data: CSVの行データ

        Returns:
            dict: CSVカラム名をキーとしたデータ
        """
        # CSVの全カラムをそのままオーバーライドデータとして使用
        overrides = {}
        for key, value in row_data.items():
            if value:
                overrides[key] = value.strip()
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
            overrides: CSVカラム名をキーとした上書きデータ

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

                # CSVテキストプレースホルダー: csvColumnNameでCSVカラムを参照
                if clip_type == 'csv_text_placeholder':
                    csv_column = clip.get('csvColumnName', '')
                    if csv_column and csv_column in overrides:
                        # CSVのテキスト値を設定
                        clip['text'] = overrides[csv_column]
                        clip['csvResolvedText'] = overrides[csv_column]
                        print(f"CSVテキスト適用: {csv_column} = {overrides[csv_column]}")

                # 可変テキスト: テンプレート内の変数をCSVから置換
                elif clip_type == 'variable_text':
                    template = clip.get('template', '')
                    variable_values = clip.get('variableValues', {}).copy()

                    # CSVからの値で変数を上書き
                    variables = clip.get('variables', [])
                    for var_name in variables:
                        if var_name in overrides:
                            variable_values[var_name] = overrides[var_name]
                            print(f"可変テキスト変数置換: {var_name} = {overrides[var_name]}")

                    clip['variableValues'] = variable_values

                # ランダムレイヤー: randomColumnNameでCSVフォルダパスを参照
                elif clip_type == 'random_layer':
                    random_column = clip.get('randomColumnName', '')
                    if random_column and random_column in overrides:
                        folder_path = overrides[random_column]
                        if os.path.isdir(folder_path):
                            # フォルダからランダムにファイルを選択
                            selected_file = self._select_random_file(folder_path, 'image')
                            if selected_file:
                                clip['selectedFilePath'] = selected_file
                                print(f"ランダムレイヤー適用: {random_column} = {selected_file}")

                # 通常のビデオ/画像: folderColumnNameがあればフォルダパスを参照
                elif clip_type in ['video', 'image']:
                    folder_column = clip.get('folderColumnName', '')
                    if folder_column and folder_column in overrides:
                        folder_path = overrides[folder_column]
                        if os.path.isdir(folder_path):
                            selected_file = self._select_random_file(folder_path, clip_type)
                            if selected_file:
                                clip['filePath'] = selected_file
                                print(f"メディア適用: {folder_column} = {selected_file}")

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
