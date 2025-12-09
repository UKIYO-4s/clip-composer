"""
Presets module - プリセット定義
"""

import json
import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# プリセットファイルのパス
PRESETS_DIR = os.path.dirname(os.path.abspath(__file__))
ADJUSTMENT_PRESETS_PATH = os.path.join(PRESETS_DIR, 'adjustment_presets.json')

_adjustment_presets_cache: Optional[Dict[str, Any]] = None


def load_adjustment_presets() -> Dict[str, Any]:
    """
    調整レイヤープリセットを読み込む

    Returns:
        プリセット辞書
    """
    global _adjustment_presets_cache

    if _adjustment_presets_cache is not None:
        return _adjustment_presets_cache

    try:
        with open(ADJUSTMENT_PRESETS_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            _adjustment_presets_cache = data.get('presets', {})
            return _adjustment_presets_cache
    except FileNotFoundError:
        logger.warning(f"Presets file not found: {ADJUSTMENT_PRESETS_PATH}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse presets file: {e}")
        return {}
    except Exception as e:
        logger.error(f"Unexpected error loading presets: {e}")
        return {}


def get_adjustment_preset(name: str) -> Optional[Dict[str, Any]]:
    """
    指定した名前の調整レイヤープリセットを取得

    Args:
        name: プリセット名

    Returns:
        プリセット設定（見つからない場合はNone）
    """
    presets = load_adjustment_presets()
    return presets.get(name)


def list_adjustment_presets() -> list:
    """
    利用可能な調整レイヤープリセット一覧を取得

    Returns:
        プリセット名のリスト
    """
    presets = load_adjustment_presets()
    return list(presets.keys())


__all__ = [
    'load_adjustment_presets',
    'get_adjustment_preset',
    'list_adjustment_presets'
]
