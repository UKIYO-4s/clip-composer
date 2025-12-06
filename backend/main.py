#!/usr/bin/env python3
"""
Clip Composer - á¤óŸLÕ¡¤ë
Õ;èÆĞÃ¯¨óÉn¨óÈêüİ¤óÈ
"""

import argparse
import sys
from datetime import datetime


def setup_logger():
    """í¬ün»ÃÈ¢Ã×"""
    def log(message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
    return log


def run_test(logger):
    """Æ¹ÈŸL"""
    logger("=" * 50)
    logger("Clip Composer - Æ¹ÈâüÉwÕ")
    logger("=" * 50)

    # Python°ƒÅ1
    logger(f"Python version: {sys.version}")

    # â¸åüën¤óİüÈÆ¹È
    try:
        import moviepy
        logger(f"moviepy: {moviepy.__version__}")
    except ImportError as e:
        logger(f"moviepy: ¤óİüÈ¨éü - {e}", "ERROR")

    try:
        import pandas
        logger(f"pandas: {pandas.__version__}")
    except ImportError as e:
        logger(f"pandas: ¤óİüÈ¨éü - {e}", "ERROR")

    try:
        import cv2
        logger(f"opencv-python: {cv2.__version__}")
    except ImportError as e:
        logger(f"opencv-python: ¤óİüÈ¨éü - {e}", "ERROR")

    try:
        import PIL
        logger(f"Pillow: {PIL.__version__}")
    except ImportError as e:
        logger(f"Pillow: ¤óİüÈ¨éü - {e}", "ERROR")

    try:
        import numpy
        logger(f"numpy: {numpy.__version__}")
    except ImportError as e:
        logger(f"numpy: ¤óİüÈ¨éü - {e}", "ERROR")

    # video_processorâ¸åüën¤óİüÈÆ¹È
    try:
        from modules.video_processor import VideoProcessor
        logger("VideoProcessor: ¤óİüÈŸ")

        # VideoProcessornÆ¹È
        processor = VideoProcessor()
        logger("VideoProcessor: ¤ó¹¿ó¹Ÿ")
    except ImportError as e:
        logger(f"VideoProcessor: ¤óİüÈ¨éü - {e}", "ERROR")
    except Exception as e:
        logger(f"VideoProcessor: ¨éü - {e}", "ERROR")

    logger("=" * 50)
    logger("Æ¹ÈŒ†")
    logger("=" * 50)


def main():
    """á¤óæ"""
    logger = setup_logger()

    # ³ŞóÉé¤ópnÑü¹
    parser = argparse.ArgumentParser(
        description="Clip Composer - Õ;èÆĞÃ¯¨óÉ"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Æ¹ÈâüÉgŸL"
    )
    parser.add_argument(
        "--input",
        type=str,
        help="e›Õ;Õ¡¤ëÑ¹"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="ú›Õ;Õ¡¤ëÑ¹"
    )

    args = parser.parse_args()

    # Æ¹ÈâüÉ
    if args.test:
        run_test(logger)
        return

    # 8âüÉÊŒŸÅˆš	
    logger("Clip Composer - 8âüÉ")
    logger("D¹: python main.py --test gÆ¹ÈŸL")
    logger("s0: python main.py --help")


if __name__ == "__main__":
    main()
