#!/usr/bin/env python3
"""
詳細なレンダリングテストスクリプト
各機能を個別にテストします
"""

import os
import sys
import json
from modules.video_processor import VideoProcessor


def test_text_clip_rendering():
    """テキストクリップのレンダリングテスト"""
    print("\n" + "=" * 60)
    print("テスト1: テキストクリップのレンダリング")
    print("=" * 60)

    timeline = {
        "fps": 30,
        "totalFrames": 90,  # 3秒
        "layers": {
            "V1": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Hello, Clip Composer!",
                        "fontSize": 64,
                        "color": "white",
                        "resolution": (1280, 720),
                        "startFrame": 0,
                        "endFrame": 90,
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

    processor = VideoProcessor()
    output_path = os.path.join(os.path.dirname(__file__), "test_text.mp4")

    print(f"出力先: {output_path}")
    success = processor.render(
        timeline_data=timeline,
        output_path=output_path,
        options={'resolution': (1280, 720)}
    )

    if success and os.path.exists(output_path):
        print(f"成功: ファイルサイズ {os.path.getsize(output_path) / 1024:.2f} KB")
        return True
    else:
        print("失敗")
        return False


def test_multiple_text_clips():
    """複数のテキストクリップのレンダリングテスト"""
    print("\n" + "=" * 60)
    print("テスト2: 複数のテキストクリップ（連続）")
    print("=" * 60)

    timeline = {
        "fps": 30,
        "totalFrames": 180,  # 6秒
        "layers": {
            "V1": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Part 1: Introduction",
                        "fontSize": 48,
                        "color": "white",
                        "resolution": (1280, 720),
                        "startFrame": 0,
                        "endFrame": 60,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.0,
                        "opacity": 1.0
                    },
                    {
                        "type": "text",
                        "text": "Part 2: Main Content",
                        "fontSize": 48,
                        "color": "blue",
                        "resolution": (1280, 720),
                        "startFrame": 60,
                        "endFrame": 120,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.0,
                        "opacity": 1.0
                    },
                    {
                        "type": "text",
                        "text": "Part 3: Conclusion",
                        "fontSize": 48,
                        "color": "green",
                        "resolution": (1280, 720),
                        "startFrame": 120,
                        "endFrame": 180,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.0,
                        "opacity": 1.0
                    }
                ]
            }
        },
        "layerOrder": ["V1"]
    }

    processor = VideoProcessor()
    output_path = os.path.join(os.path.dirname(__file__), "test_multiple_text.mp4")

    print(f"出力先: {output_path}")
    success = processor.render(
        timeline_data=timeline,
        output_path=output_path,
        options={'resolution': (1280, 720)}
    )

    if success and os.path.exists(output_path):
        print(f"成功: ファイルサイズ {os.path.getsize(output_path) / 1024:.2f} KB")
        return True
    else:
        print("失敗")
        return False


def test_layered_text_clips():
    """レイヤー重ね合わせテスト"""
    print("\n" + "=" * 60)
    print("テスト3: レイヤー重ね合わせ（V2 on V1）")
    print("=" * 60)

    timeline = {
        "fps": 30,
        "totalFrames": 120,  # 4秒
        "layers": {
            "V1": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Background Layer",
                        "fontSize": 72,
                        "color": "red",
                        "resolution": (1280, 720),
                        "startFrame": 0,
                        "endFrame": 120,
                        "positionX": 0,
                        "positionY": 100,
                        "scale": 1.0,
                        "opacity": 0.5
                    }
                ]
            },
            "V2": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Foreground Layer",
                        "fontSize": 48,
                        "color": "white",
                        "resolution": (1280, 720),
                        "startFrame": 30,
                        "endFrame": 90,
                        "positionX": 0,
                        "positionY": -100,
                        "scale": 1.0,
                        "opacity": 1.0
                    }
                ]
            }
        },
        "layerOrder": ["V2", "V1"]
    }

    processor = VideoProcessor()
    output_path = os.path.join(os.path.dirname(__file__), "test_layered.mp4")

    print(f"出力先: {output_path}")
    success = processor.render(
        timeline_data=timeline,
        output_path=output_path,
        options={'resolution': (1280, 720)}
    )

    if success and os.path.exists(output_path):
        print(f"成功: ファイルサイズ {os.path.getsize(output_path) / 1024:.2f} KB")
        return True
    else:
        print("失敗")
        return False


def test_progress_callback():
    """進捗コールバックのテスト"""
    print("\n" + "=" * 60)
    print("テスト4: 進捗コールバック機能")
    print("=" * 60)

    timeline = {
        "fps": 30,
        "totalFrames": 150,  # 5秒
        "layers": {
            "V1": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Progress Test",
                        "fontSize": 64,
                        "color": "white",
                        "resolution": (1280, 720),
                        "startFrame": 0,
                        "endFrame": 150,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.0,
                        "opacity": 1.0
                    }
                ]
            }
        },
        "layerOrder": ["V1"]
    }

    progress_updates = []

    def progress_callback(progress):
        percentage = progress.get('percentage', 0)
        status = progress.get('status', 'unknown')
        progress_updates.append({
            'percentage': percentage,
            'status': status
        })
        # 10%ごとに表示
        if len(progress_updates) % 10 == 0 or status == 'completed':
            print(f"  進捗: {percentage:.1f}% - {status}")

    processor = VideoProcessor()
    output_path = os.path.join(os.path.dirname(__file__), "test_progress.mp4")

    print(f"出力先: {output_path}")
    success = processor.render(
        timeline_data=timeline,
        output_path=output_path,
        options={'resolution': (1280, 720)},
        progress_callback=progress_callback
    )

    if success and os.path.exists(output_path):
        print(f"成功: {len(progress_updates)} 回の進捗更新を受信")
        print(f"ファイルサイズ {os.path.getsize(output_path) / 1024:.2f} KB")
        return True
    else:
        print("失敗")
        return False


def test_get_progress():
    """get_progress() メソッドのテスト"""
    print("\n" + "=" * 60)
    print("テスト5: get_progress() メソッド")
    print("=" * 60)

    processor = VideoProcessor()

    # 初期状態
    progress = processor.get_progress()
    print(f"初期状態: {json.dumps(progress, indent=2)}")

    assert progress['status'] == 'idle', "初期状態は idle であるべき"
    assert progress['current_frame'] == 0, "初期フレームは 0 であるべき"

    print("get_progress() テスト: 成功")
    return True


def test_properties():
    """プロパティ適用テスト"""
    print("\n" + "=" * 60)
    print("テスト6: クリップのプロパティ適用（スケール、回転、不透明度）")
    print("=" * 60)

    timeline = {
        "fps": 30,
        "totalFrames": 120,  # 4秒
        "layers": {
            "V1": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Normal",
                        "fontSize": 48,
                        "color": "white",
                        "resolution": (1280, 720),
                        "startFrame": 0,
                        "endFrame": 30,
                        "positionX": -300,
                        "positionY": 0,
                        "scale": 1.0,
                        "rotation": 0,
                        "opacity": 1.0
                    },
                    {
                        "type": "text",
                        "text": "Scaled",
                        "fontSize": 48,
                        "color": "blue",
                        "resolution": (1280, 720),
                        "startFrame": 30,
                        "endFrame": 60,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.5,
                        "rotation": 0,
                        "opacity": 1.0
                    },
                    {
                        "type": "text",
                        "text": "Rotated",
                        "fontSize": 48,
                        "color": "green",
                        "resolution": (1280, 720),
                        "startFrame": 60,
                        "endFrame": 90,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.0,
                        "rotation": 15,
                        "opacity": 1.0
                    },
                    {
                        "type": "text",
                        "text": "Transparent",
                        "fontSize": 48,
                        "color": "red",
                        "resolution": (1280, 720),
                        "startFrame": 90,
                        "endFrame": 120,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.0,
                        "rotation": 0,
                        "opacity": 0.5
                    }
                ]
            }
        },
        "layerOrder": ["V1"]
    }

    processor = VideoProcessor()
    output_path = os.path.join(os.path.dirname(__file__), "test_properties.mp4")

    print(f"出力先: {output_path}")
    success = processor.render(
        timeline_data=timeline,
        output_path=output_path,
        options={'resolution': (1280, 720)}
    )

    if success and os.path.exists(output_path):
        print(f"成功: ファイルサイズ {os.path.getsize(output_path) / 1024:.2f} KB")
        return True
    else:
        print("失敗")
        return False


def main():
    """メイン関数"""
    print("=" * 60)
    print("Clip Composer - 詳細レンダリングテスト")
    print("=" * 60)

    # 依存関係の確認
    try:
        from moviepy.editor import VideoFileClip
        print("MoviePy: インストール済み")
    except ImportError:
        print("エラー: MoviePy がインストールされていません")
        print("インストール: pip install moviepy")
        sys.exit(1)

    try:
        from PIL import Image
        print("Pillow: インストール済み")
    except ImportError:
        print("エラー: Pillow がインストールされていません")
        print("インストール: pip install Pillow")
        sys.exit(1)

    # テスト実行
    tests = [
        ("テキストクリップ", test_text_clip_rendering),
        ("複数テキストクリップ", test_multiple_text_clips),
        ("レイヤー重ね合わせ", test_layered_text_clips),
        ("進捗コールバック", test_progress_callback),
        ("get_progress()メソッド", test_get_progress),
        ("プロパティ適用", test_properties),
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"テストエラー ({test_name}): {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))

    # 結果サマリー
    print("\n" + "=" * 60)
    print("テスト結果サマリー")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"  [{status}] {test_name}")

    print(f"\n合計: {passed}/{total} テスト成功")

    # 生成されたファイルのリスト
    print("\n生成されたファイル:")
    test_files = [
        "test_text.mp4",
        "test_multiple_text.mp4",
        "test_layered.mp4",
        "test_progress.mp4",
        "test_properties.mp4"
    ]

    for filename in test_files:
        filepath = os.path.join(os.path.dirname(__file__), filename)
        if os.path.exists(filepath):
            size = os.path.getsize(filepath) / 1024
            print(f"  - {filename} ({size:.2f} KB)")

    print("\n=" * 60)
    print("テスト完了")
    print("=" * 60)


if __name__ == "__main__":
    main()
