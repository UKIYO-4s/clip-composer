#!/usr/bin/env python3
"""
Clip Composer - Backend Main Entry Point
動画処理エンジンのメインモジュール
"""

import argparse
import sys
from datetime import datetime

# PyInstaller用: モジュールをトップレベルでインポートして依存関係を確実に含める
# これらのインポートはPyInstallerが依存関係を検出するために必要
from moviepy.editor import (
    VideoFileClip,
    ImageClip,
    AudioFileClip,
    CompositeVideoClip,
    CompositeAudioClip,
    ColorClip,
    concatenate_videoclips
)
import imageio
import imageio_ffmpeg


def setup_logger():
    """ロガーのセットアップ"""
    def log(message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
    return log


def run_test(logger):
    """テスト実行"""
    logger("=" * 50)
    logger("Clip Composer - テストモード開始")
    logger("=" * 50)

    # Pythonバージョン確認
    logger(f"Python version: {sys.version}")

    # ライブラリのインポートテスト
    try:
        import moviepy
        logger(f"moviepy: {moviepy.__version__}")
    except ImportError as e:
        logger(f"moviepy: インポートエラー - {e}", "ERROR")

    try:
        import pandas
        logger(f"pandas: {pandas.__version__}")
    except ImportError as e:
        logger(f"pandas: インポートエラー - {e}", "ERROR")

    try:
        import cv2
        logger(f"opencv-python: {cv2.__version__}")
    except ImportError as e:
        logger(f"opencv-python: インポートエラー - {e}", "ERROR")

    try:
        import PIL
        logger(f"Pillow: {PIL.__version__}")
    except ImportError as e:
        logger(f"Pillow: インポートエラー - {e}", "ERROR")

    try:
        import numpy
        logger(f"numpy: {numpy.__version__}")
    except ImportError as e:
        logger(f"numpy: インポートエラー - {e}", "ERROR")

    # VideoProcessorのインポートテスト
    try:
        from modules.video_processor import VideoProcessor
        logger("VideoProcessor: インポート成功")

        # VideoProcessorのインスタンス化テスト
        processor = VideoProcessor()
        logger("VideoProcessor: インスタンス化成功")
    except ImportError as e:
        logger(f"VideoProcessor: インポートエラー - {e}", "ERROR")
    except Exception as e:
        logger(f"VideoProcessor: エラー - {e}", "ERROR")

    logger("=" * 50)
    logger("テスト完了")
    logger("=" * 50)


def run_ipc_mode():
    """IPCモードで実行（Electronからの呼び出し用）"""
    from ipc_handler import ipc
    ipc.run()


def run_test_render(logger):
    """レンダリングテスト実行"""
    logger("=" * 50)
    logger("Clip Composer - レンダリングテストモード")
    logger("=" * 50)

    try:
        from modules.video_processor import VideoProcessor
        import json
        import os

        # サンプルタイムラインデータ
        sample_timeline = {
            "fps": 30,
            "totalFrames": 150,  # 5秒の動画
            "layers": {
                "V1": {
                    "clips": [
                        {
                            "type": "text",
                            "text": "Clip Composer",
                            "fontSize": 72,
                            "color": "white",
                            "resolution": (1920, 1080),
                            "startFrame": 0,
                            "endFrame": 90,
                            "positionX": 0,
                            "positionY": 0,
                            "scale": 1.0,
                            "rotation": 0,
                            "opacity": 1.0
                        },
                        {
                            "type": "text",
                            "text": "Video Rendering Test",
                            "fontSize": 48,
                            "color": "blue",
                            "resolution": (1920, 1080),
                            "startFrame": 90,
                            "endFrame": 150,
                            "positionX": 0,
                            "positionY": 0,
                            "scale": 1.0,
                            "rotation": 0,
                            "opacity": 1.0
                        }
                    ]
                }
            },
            "layerOrder": ["V1"]
        }

        logger("サンプルタイムラインデータ:")
        logger(json.dumps(sample_timeline, indent=2, ensure_ascii=False))

        # 出力パス
        output_path = os.path.join(os.path.dirname(__file__), "test_output.mp4")
        logger(f"出力ファイル: {output_path}")

        # 進捗コールバック
        def progress_callback(progress):
            percentage = progress.get('percentage', 0)
            status = progress.get('status', 'unknown')
            logger(f"進捗: {percentage:.1f}% - {status}")

        # VideoProcessorでレンダリング
        processor = VideoProcessor()
        logger("レンダリング開始...")

        success = processor.render(
            timeline_data=sample_timeline,
            output_path=output_path,
            options={
                'codec': 'libx264',
                'preset': 'medium',
                'resolution': (1920, 1080)
            },
            progress_callback=progress_callback
        )

        if success:
            logger("レンダリング成功!", "SUCCESS")
            logger(f"ファイルが生成されました: {output_path}")

            # ファイルサイズを確認
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path)
                logger(f"ファイルサイズ: {file_size / 1024:.2f} KB")
        else:
            logger("レンダリング失敗", "ERROR")

    except Exception as e:
        logger(f"レンダリングテストエラー: {e}", "ERROR")
        import traceback
        logger(traceback.format_exc(), "ERROR")

    logger("=" * 50)
    logger("レンダリングテスト完了")
    logger("=" * 50)


def main():
    """メイン関数"""
    logger = setup_logger()

    # コマンドライン引数のパース
    parser = argparse.ArgumentParser(
        description="Clip Composer - 動画処理エンジン"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="テストモードで実行"
    )
    parser.add_argument(
        "--test-render",
        action="store_true",
        help="レンダリングテストモードで実行"
    )
    parser.add_argument(
        "--input",
        type=str,
        help="入力動画ファイルパス"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="出力動画ファイルパス"
    )
    parser.add_argument(
        "--ipc",
        action="store_true",
        help="IPCモードで実行（Electronからの呼び出し用）"
    )

    args = parser.parse_args()

    # IPCモード
    if args.ipc:
        run_ipc_mode()
        return

    # テストモード
    if args.test:
        run_test(logger)
        return

    # レンダリングテストモード
    if args.test_render:
        run_test_render(logger)
        return

    # 通常起動時のメッセージ
    logger("Clip Composer - 起動")
    logger("ヒント: python main.py --test でテスト実行")
    logger("ヒント: python main.py --test-render でレンダリングテスト実行")
    logger("ヒント: python main.py --ipc でIPCモード（Electron連携）")
    logger("詳細: python main.py --help")


if __name__ == "__main__":
    # 並列処理時にPyInstaller配布版でも安定するように初期化
    try:
        import multiprocessing

        multiprocessing.freeze_support()
        multiprocessing.set_start_method("spawn", force=True)
    except Exception:
        # 既に設定済みなどの理由で失敗した場合でも処理は継続
        pass

    main()
