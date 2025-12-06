#!/usr/bin/env python3
"""
Clip Composer - Backend Main Entry Point
動画処理エンジンのメインモジュール
"""

import argparse
import sys
from datetime import datetime


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
        "--input",
        type=str,
        help="入力動画ファイルパス"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="出力動画ファイルパス"
    )

    args = parser.parse_args()

    # テストモード
    if args.test:
        run_test(logger)
        return

    # 通常起動時のメッセージ
    logger("Clip Composer - 起動")
    logger("ヒント: python main.py --test でテスト実行")
    logger("詳細: python main.py --help")


if __name__ == "__main__":
    main()
