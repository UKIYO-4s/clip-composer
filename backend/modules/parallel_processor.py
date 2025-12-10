"""
ParallelProcessor - 並列動画生成モジュール
ProcessPoolExecutorを使用してCSVの各行を並列に処理
"""

import os
import copy
from typing import Dict, Any, Optional, List, Callable, Tuple
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing


def render_single_video(args: Tuple) -> Dict[str, Any]:
    """
    単一の動画をレンダリング（プロセス間で呼び出される関数）

    Args:
        args: (row_number, row_data, timeline_data, output_path, options, overrides)

    Returns:
        dict: レンダリング結果
    """
    row_number, row_data, timeline_data, output_path, options, overrides = args

    try:
        # 各プロセスでVideoProcessorをインポート
        from modules.video_processor import VideoProcessor
        from modules.csv_handler import CSVHandler

        # CSVハンドラーのインスタンスを作成
        csv_handler = CSVHandler()

        # タイムラインデータにオーバーライドを適用
        modified_timeline = csv_handler._apply_overrides(copy.deepcopy(timeline_data), overrides)

        # 動画生成
        processor = VideoProcessor()
        result = processor.render(
            timeline_data=modified_timeline,
            output_path=output_path,
            options=options
        )

        if result:
            return {
                'success': True,
                'row_number': row_number,
                'video_name': row_data.get('動画名', ''),
                'output_path': output_path,
                'error': None
            }
        else:
            raise Exception("レンダリングが失敗しました")

    except Exception as e:
        return {
            'success': False,
            'row_number': row_number,
            'video_name': row_data.get('動画名', ''),
            'output_path': output_path,
            'error': str(e)
        }


class ParallelProcessor:
    """並列動画生成プロセッサー"""

    def __init__(self, max_workers: Optional[int] = None):
        """
        初期化

        Args:
            max_workers: 最大ワーカー数（Noneの場合はCPUコア数-1）
        """
        if max_workers is None:
            # CPUコア数 - 1（最低1）
            max_workers = max(1, multiprocessing.cpu_count() - 1)

        self.max_workers = max_workers
        self._cancel_requested = False

    def process_batch_parallel(
        self,
        csv_data: List[Dict[str, Any]],
        timeline_data: Dict[str, Any],
        output_dir: str,
        options: Optional[Dict[str, Any]] = None,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
        row_callback: Optional[Callable[[int, Dict[str, Any], bool, Optional[str]], None]] = None,
        parse_row_to_overrides: Optional[Callable[[Dict[str, str]], Dict[str, Any]]] = None,
        validate_row: Optional[Callable[[Dict[str, str]], Tuple[bool, Optional[str]]]] = None
    ) -> Dict[str, Any]:
        """
        CSV全行を並列処理して動画を生成

        Args:
            csv_data: CSVデータのリスト
            timeline_data: ベースとなるタイムラインデータ
            output_dir: 出力先ディレクトリ
            options: レンダリングオプション
            progress_callback: 全体進捗コールバック(current, total, message)
            row_callback: 行単位コールバック(row_number, row_data, success, error_message)
            parse_row_to_overrides: 行データをオーバーライドに変換する関数
            validate_row: 行データをバリデーションする関数

        Returns:
            dict: 処理結果 {'success_count': int, 'error_count': int, 'errors': list}
        """
        self._cancel_requested = False

        # 出力ディレクトリの作成
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        total_rows = len(csv_data)
        success_count = 0
        error_count = 0
        errors = []
        completed_count = 0

        # バリデーション済みのジョブリストを作成
        jobs = []
        for row_info in csv_data:
            row_number = row_info['row_number']
            row_data = row_info['data']
            video_name = row_data.get('動画名', '').strip()

            # バリデーション
            if validate_row:
                is_valid, error_message = validate_row(row_data)
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

            # オーバーライドデータの生成
            if parse_row_to_overrides:
                overrides = parse_row_to_overrides(row_data)
            else:
                overrides = {k: v.strip() for k, v in row_data.items() if v}

            # 出力パスの生成
            output_path = os.path.join(output_dir, f"{video_name}.mp4")

            # ジョブを追加
            jobs.append((row_number, row_data, timeline_data, output_path, options, overrides))

        if not jobs:
            return {
                'success_count': success_count,
                'error_count': error_count,
                'total_count': total_rows,
                'errors': errors
            }

        # 進捗通知
        if progress_callback:
            progress_callback(0, total_rows, f"並列処理開始 (ワーカー数: {self.max_workers})")

        print(f"並列処理開始: {len(jobs)}件のジョブ (ワーカー数: {self.max_workers})")

        # ProcessPoolExecutorで並列処理
        with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            # 全ジョブを投入
            future_to_job = {executor.submit(render_single_video, job): job for job in jobs}

            # 完了したジョブを順次処理
            for future in as_completed(future_to_job):
                if self._cancel_requested:
                    executor.shutdown(wait=False, cancel_futures=True)
                    break

                job = future_to_job[future]
                row_number = job[0]
                row_data = job[1]
                video_name = row_data.get('動画名', '')

                try:
                    result = future.result()
                    completed_count += 1

                    if result['success']:
                        success_count += 1
                        if row_callback:
                            row_callback(row_number, row_data, True, None)
                        print(f"[{completed_count}/{len(jobs)}] 行{row_number}の動画生成成功: {result['output_path']}")
                    else:
                        error_count += 1
                        error_info = {
                            'row': row_number,
                            'video_name': video_name,
                            'error': result['error']
                        }
                        errors.append(error_info)

                        if row_callback:
                            row_callback(row_number, row_data, False, result['error'])
                        print(f"[{completed_count}/{len(jobs)}] 行{row_number}の動画生成エラー: {result['error']}")

                except Exception as e:
                    completed_count += 1
                    error_count += 1
                    error_info = {
                        'row': row_number,
                        'video_name': video_name,
                        'error': str(e)
                    }
                    errors.append(error_info)

                    if row_callback:
                        row_callback(row_number, row_data, False, str(e))
                    print(f"[{completed_count}/{len(jobs)}] 行{row_number}の動画生成エラー: {e}")

                # 進捗通知
                if progress_callback:
                    percentage = (completed_count / len(jobs) * 100) if len(jobs) > 0 else 0
                    progress_callback(
                        completed_count,
                        len(jobs),
                        f"処理中... {completed_count}/{len(jobs)} ({percentage:.1f}%)"
                    )

        # 結果サマリー
        result_summary = {
            'success_count': success_count,
            'error_count': error_count,
            'total_count': total_rows,
            'errors': errors,
            'parallel': True,
            'workers': self.max_workers
        }

        print(f"\n並列処理完了:")
        print(f"  成功: {success_count}/{total_rows}")
        print(f"  失敗: {error_count}/{total_rows}")
        print(f"  ワーカー数: {self.max_workers}")

        return result_summary

    def cancel(self):
        """処理をキャンセル"""
        self._cancel_requested = True
        print("並列処理のキャンセルが要求されました")


# シングルトンインスタンス
_processor_instance: Optional[ParallelProcessor] = None


def get_processor(max_workers: Optional[int] = None) -> ParallelProcessor:
    """ParallelProcessorのシングルトンインスタンスを取得"""
    global _processor_instance
    if _processor_instance is None or (max_workers is not None):
        _processor_instance = ParallelProcessor(max_workers)
    return _processor_instance


__all__ = [
    'ParallelProcessor',
    'get_processor',
    'render_single_video'
]
