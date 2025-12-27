"""
Easing - イージング関数群
アニメーション・トランジションに使用する補間関数
"""

from typing import Callable
import math


# =============================================================================
# 基本イージング関数
# =============================================================================

def linear(t: float) -> float:
    """
    線形補間（イージングなし）

    Args:
        t: 進行度 (0.0 ~ 1.0)

    Returns:
        補間値 (0.0 ~ 1.0)
    """
    return max(0.0, min(1.0, t))


def ease_in(t: float) -> float:
    """
    Ease-In (Quadratic) - 緩やかに開始

    Args:
        t: 進行度 (0.0 ~ 1.0)

    Returns:
        補間値 (0.0 ~ 1.0)
    """
    t = max(0.0, min(1.0, t))
    return t * t


def ease_out(t: float) -> float:
    """
    Ease-Out (Quadratic) - 緩やかに終了

    Args:
        t: 進行度 (0.0 ~ 1.0)

    Returns:
        補間値 (0.0 ~ 1.0)
    """
    t = max(0.0, min(1.0, t))
    return 1.0 - (1.0 - t) * (1.0 - t)


def ease_in_out(t: float) -> float:
    """
    Ease-In-Out (Quadratic) - 緩やかに開始・終了

    Args:
        t: 進行度 (0.0 ~ 1.0)

    Returns:
        補間値 (0.0 ~ 1.0)
    """
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        return 2.0 * t * t
    else:
        return 1.0 - pow(-2.0 * t + 2.0, 2) / 2.0


# =============================================================================
# Cubic イージング関数
# =============================================================================

def ease_in_cubic(t: float) -> float:
    """
    Ease-In (Cubic) - より強い加速

    Args:
        t: 進行度 (0.0 ~ 1.0)

    Returns:
        補間値 (0.0 ~ 1.0)
    """
    t = max(0.0, min(1.0, t))
    return t * t * t


def ease_out_cubic(t: float) -> float:
    """
    Ease-Out (Cubic) - より強い減速

    Args:
        t: 進行度 (0.0 ~ 1.0)

    Returns:
        補間値 (0.0 ~ 1.0)
    """
    t = max(0.0, min(1.0, t))
    return 1.0 - pow(1.0 - t, 3)


def ease_in_out_cubic(t: float) -> float:
    """
    Ease-In-Out (Cubic)

    Args:
        t: 進行度 (0.0 ~ 1.0)

    Returns:
        補間値 (0.0 ~ 1.0)
    """
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        return 4.0 * t * t * t
    else:
        return 1.0 - pow(-2.0 * t + 2.0, 3) / 2.0


# =============================================================================
# 特殊イージング関数
# =============================================================================

def ease_out_back(t: float) -> float:
    """
    Ease-Out-Back - オーバーシュート付き（行き過ぎて戻る）

    Args:
        t: 進行度 (0.0 ~ 1.0)

    Returns:
        補間値 (0.0 ~ 1.0, 途中で1.0を超える場合あり)
    """
    t = max(0.0, min(1.0, t))
    c1 = 1.70158
    c3 = c1 + 1.0
    return 1.0 + c3 * pow(t - 1.0, 3) + c1 * pow(t - 1.0, 2)


def ease_in_back(t: float) -> float:
    """
    Ease-In-Back - 引き戻し付き

    Args:
        t: 進行度 (0.0 ~ 1.0)

    Returns:
        補間値 (負の値から始まる場合あり)
    """
    t = max(0.0, min(1.0, t))
    c1 = 1.70158
    c3 = c1 + 1.0
    return c3 * t * t * t - c1 * t * t


def ease_out_elastic(t: float) -> float:
    """
    Ease-Out-Elastic - 弾性（バウンス）

    Args:
        t: 進行度 (0.0 ~ 1.0)

    Returns:
        補間値 (0.0 ~ 1.0, 途中で1.0を超える場合あり)
    """
    t = max(0.0, min(1.0, t))
    if t == 0.0:
        return 0.0
    if t == 1.0:
        return 1.0

    c4 = (2.0 * math.pi) / 3.0
    return pow(2.0, -10.0 * t) * math.sin((t * 10.0 - 0.75) * c4) + 1.0


# =============================================================================
# カスタムベジエ曲線
# =============================================================================

def cubic_bezier(t: float, p1: float, p2: float, p3: float, p4: float) -> float:
    """
    カスタムキュービックベジエ曲線

    CSS cubic-bezier(p1, p2, p3, p4) と同等
    ただし簡略化実装（Y軸の値を直接計算）

    Args:
        t: 進行度 (0.0 ~ 1.0)
        p1: 制御点1 X (通常 0.0 ~ 1.0)
        p2: 制御点1 Y
        p3: 制御点2 X (通常 0.0 ~ 1.0)
        p4: 制御点2 Y

    Returns:
        補間値
    """
    t = max(0.0, min(1.0, t))

    # 簡略化: Y値のみベジエ計算
    # P0 = (0, 0), P1 = (p1, p2), P2 = (p3, p4), P3 = (1, 1)
    u = 1.0 - t
    tt = t * t
    uu = u * u
    uuu = uu * u
    ttt = tt * t

    # Y座標の計算
    y = uuu * 0.0  # P0.y = 0
    y += 3.0 * uu * t * p2  # P1.y
    y += 3.0 * u * tt * p4  # P2.y
    y += ttt * 1.0  # P3.y = 1

    return y


def create_cubic_bezier(p1: float, p2: float, p3: float, p4: float) -> Callable[[float], float]:
    """
    カスタムベジエイージング関数を生成

    Args:
        p1, p2, p3, p4: ベジエ制御点

    Returns:
        イージング関数
    """
    def bezier_easing(t: float) -> float:
        return cubic_bezier(t, p1, p2, p3, p4)
    return bezier_easing


# =============================================================================
# プリセット辞書
# =============================================================================

EASING_PRESETS: dict[str, Callable[[float], float]] = {
    'linear': linear,
    'ease-in': ease_in,
    'ease-out': ease_out,
    'ease-in-out': ease_in_out,
    'ease-in-cubic': ease_in_cubic,
    'ease-out-cubic': ease_out_cubic,
    'ease-in-out-cubic': ease_in_out_cubic,
    'ease-out-back': ease_out_back,
    'ease-in-back': ease_in_back,
    'ease-out-elastic': ease_out_elastic,
}


def _parse_cubic_bezier(name: str) -> tuple[float, float, float, float] | None:
    """
    cubic-bezier(x1, y1, x2, y2) 文字列をパース
    """
    if not name:
        return None
    prefix = "cubic-bezier("
    if not name.startswith(prefix) or not name.endswith(")"):
        return None
    content = name[len(prefix):-1]
    parts = [p.strip() for p in content.split(",")]
    if len(parts) != 4:
        return None
    try:
        return (float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]))
    except ValueError:
        return None


def get_easing(name: str, bezier: list[float] | tuple[float, float, float, float] | None = None) -> Callable[[float], float]:
    """
    名前からイージング関数を取得

    Args:
        name: イージング名 (例: 'ease-in', 'ease-out', 'linear')
        bezier: cubic-bezier 用の制御点 (x1, y1, x2, y2)

    Returns:
        イージング関数（見つからない場合はlinear）
    """
    if not name:
        return linear

    normalized = name.replace("_", "-")

    if normalized == "cubic-bezier":
        if bezier and len(bezier) == 4:
            return create_cubic_bezier(bezier[0], bezier[1], bezier[2], bezier[3])
        return linear

    parsed = _parse_cubic_bezier(normalized)
    if parsed:
        return create_cubic_bezier(parsed[0], parsed[1], parsed[2], parsed[3])

    return EASING_PRESETS.get(normalized, linear)


# =============================================================================
# テスト用関数
# =============================================================================

def _test_easing_functions():
    """
    イージング関数の基本テスト
    各関数が t=0 → 0, t=1 → 1 を満たすか確認
    """
    print("Testing easing functions...")

    for name, func in EASING_PRESETS.items():
        result_0 = func(0.0)
        result_1 = func(1.0)

        # t=0 で 0.0 に近いか
        ok_0 = abs(result_0) < 0.001
        # t=1 で 1.0 に近いか
        ok_1 = abs(result_1 - 1.0) < 0.001

        status = "OK" if (ok_0 and ok_1) else "WARN"
        print(f"  {name}: t=0 -> {result_0:.4f}, t=1 -> {result_1:.4f} [{status}]")

    print("Done.")


if __name__ == "__main__":
    _test_easing_functions()
