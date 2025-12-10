"""
IPC Handler - Electron-Python間の通信を処理
stdin/stdoutでJSON形式のメッセージをやり取り
"""
import sys
import json
import traceback
from typing import Callable, Optional, Any


class IPCHandler:
    """Electron-Python IPC通信ハンドラー"""

    def __init__(self):
        self.handlers = {}
        self.current_request_id = None

    def register(self, command: str, handler: Callable):
        """コマンドハンドラーを登録"""
        self.handlers[command] = handler

    def send_response(self, request_id: str, status: str, data: Any):
        """レスポンスを送信"""
        response = {
            "id": request_id,
            "status": status,
            "data": data
        }
        print(json.dumps(response, ensure_ascii=False), flush=True)

    def send_progress(self, progress: float, message: str = "", extra: dict = None):
        """進捗を送信（現在のリクエストに対して）"""
        if self.current_request_id:
            data = {
                "progress": progress,
                "message": message,
            }
            if extra:
                data.update(extra)

            response = {
                "id": self.current_request_id,
                "status": "progress",
                "data": data
            }
            print(json.dumps(response, ensure_ascii=False), flush=True)

    def handle_request(self, request: dict):
        """リクエストを処理"""
        request_id = request.get("id")
        command = request.get("command")
        params = request.get("params", {})

        self.current_request_id = request_id

        try:
            if command not in self.handlers:
                self.send_response(request_id, "error", {
                    "message": f"Unknown command: {command}"
                })
                return

            handler = self.handlers[command]
            result = handler(params, self)

            self.send_response(request_id, "success", result)

        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            self.send_response(request_id, "error", {
                "message": str(e),
                "traceback": traceback.format_exc()
            })

        finally:
            self.current_request_id = None

    def run(self):
        """メインループ - stdinからリクエストを読み取り処理"""
        # 起動完了を通知
        sys.stderr.write("IPC Handler started\n")
        sys.stderr.flush()

        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue

            try:
                request = json.loads(line)
                self.handle_request(request)
            except json.JSONDecodeError as e:
                sys.stderr.write(f"Invalid JSON: {line}\n")
                sys.stderr.flush()
            except Exception as e:
                sys.stderr.write(f"Error handling request: {e}\n")
                traceback.print_exc(file=sys.stderr)
                sys.stderr.flush()


# グローバルインスタンス
ipc = IPCHandler()


def register_handler(command: str):
    """デコレーターでハンドラーを登録"""
    def decorator(func):
        ipc.register(command, func)
        return func
    return decorator


# ========== ハンドラー登録 ==========

@register_handler("ping")
def handle_ping(params: dict, handler: IPCHandler):
    """接続テスト"""
    return {"message": "pong"}


@register_handler("get_info")
def handle_get_info(params: dict, handler: IPCHandler):
    """動画情報取得"""
    file_path = params.get("filePath")

    if not file_path:
        raise ValueError("filePath is required")

    # MoviePyで動画情報を取得
    try:
        from moviepy.editor import VideoFileClip
        clip = VideoFileClip(file_path)
        info = {
            "duration": clip.duration,
            "fps": clip.fps,
            "size": clip.size,
            "filename": file_path
        }
        clip.close()
        return info
    except Exception as e:
        raise ValueError(f"Failed to get video info: {e}")


@register_handler("render")
def handle_render(params: dict, handler: IPCHandler):
    """動画レンダリング"""
    timeline_data = params.get("timelineData")
    output_path = params.get("outputPath")
    options = params.get("options", {})

    if not timeline_data:
        raise ValueError("timelineData is required")
    if not output_path:
        raise ValueError("outputPath is required")

    # VideoProcessorでレンダリング
    from modules.video_processor import VideoProcessor

    processor = VideoProcessor()

    # 進捗コールバック（video_processorからの辞書形式を処理）
    def progress_callback(progress_data):
        if isinstance(progress_data, dict):
            percentage = progress_data.get('percentage', 0)
            status = progress_data.get('status', 'rendering')
            message = progress_data.get('message', f'レンダリング中... {percentage:.1f}%')
            handler.send_progress(percentage, message, progress_data)
        else:
            # 後方互換: 数値のみの場合
            handler.send_progress(progress_data, 'レンダリング中...')

    result = processor.render(
        timeline_data=timeline_data,
        output_path=output_path,
        options=options,
        progress_callback=progress_callback
    )

    return result


@register_handler("cancel")
def handle_cancel(params: dict, handler: IPCHandler):
    """レンダリングキャンセル"""
    from modules.video_processor import VideoProcessor

    # グローバルなキャンセルフラグを設定
    VideoProcessor.cancel_requested = True

    return {"message": "Cancel requested"}


@register_handler("render_batch")
def handle_render_batch(params: dict, handler: IPCHandler):
    """CSV一括動画レンダリング"""
    csv_path = params.get("csvPath")
    timeline_data = params.get("timelineData")
    output_dir = params.get("outputDir")
    options = params.get("options", {})

    # 並列処理オプション
    parallel = params.get("parallel", False)
    max_workers = params.get("maxWorkers")  # None の場合は自動設定

    if not csv_path:
        raise ValueError("csvPath is required")
    if not timeline_data:
        raise ValueError("timelineData is required")
    if not output_dir:
        raise ValueError("outputDir is required")

    # CSVハンドラーで一括処理
    from modules.csv_handler import CSVHandler

    csv_handler = CSVHandler()

    # CSVファイルを読み込み
    if not csv_handler.load_csv(csv_path):
        raise ValueError("Failed to load CSV file")

    # 全体進捗コールバック
    def progress_callback(current: int, total: int, message: str):
        percentage = (current / total * 100) if total > 0 else 0
        handler.send_progress(percentage, message, {
            'current': current,
            'total': total,
            'parallel': parallel
        })

    # 行単位コールバック（各動画の成功/失敗を通知）
    def row_callback(row_number: int, row_data: dict, success: bool, error_message: str):
        video_name = row_data.get('動画名', f'Row{row_number}')
        status = 'success' if success else 'error'

        # 個別の行結果を進捗として送信
        handler.send_progress(
            -1,  # 特殊な値: 行単位の結果
            f"{video_name}: {status}",
            {
                'type': 'row_result',
                'row_number': row_number,
                'video_name': video_name,
                'success': success,
                'error': error_message
            }
        )

    # バッチ処理実行
    result = csv_handler.process_batch(
        timeline_data=timeline_data,
        output_dir=output_dir,
        options=options,
        progress_callback=progress_callback,
        row_callback=row_callback,
        parallel=parallel,
        max_workers=max_workers
    )

    return result


if __name__ == "__main__":
    ipc.run()
