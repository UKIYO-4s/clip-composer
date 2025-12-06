#!/usr/bin/env python3
"""
動画レンダリングの使用例
シンプルな例からより複雑な例まで
"""

import os
from modules.video_processor import VideoProcessor


def example_1_simple_text():
    """例1: シンプルなテキスト動画"""
    print("\n例1: シンプルなテキスト動画")
    print("-" * 40)

    timeline = {
        "fps": 30,
        "totalFrames": 90,  # 3秒
        "layers": {
            "V1": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Hello, World!",
                        "fontSize": 64,
                        "color": "white",
                        "resolution": (1280, 720),
                        "startFrame": 0,
                        "endFrame": 90,
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
    output = os.path.join(os.path.dirname(__file__), "example_1.mp4")

    print(f"レンダリング中... 出力: {output}")
    success = processor.render(timeline, output)

    if success:
        print(f"完了! {output}")
    return success


def example_2_multiple_scenes():
    """例2: 複数のシーン"""
    print("\n例2: 複数のシーン")
    print("-" * 40)

    timeline = {
        "fps": 30,
        "totalFrames": 180,  # 6秒
        "layers": {
            "V1": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Scene 1",
                        "fontSize": 72,
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
                        "text": "Scene 2",
                        "fontSize": 72,
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
                        "text": "Scene 3",
                        "fontSize": 72,
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
    output = os.path.join(os.path.dirname(__file__), "example_2.mp4")

    print(f"レンダリング中... 出力: {output}")
    success = processor.render(timeline, output)

    if success:
        print(f"完了! {output}")
    return success


def example_3_layered_composition():
    """例3: レイヤー合成"""
    print("\n例3: レイヤー合成")
    print("-" * 40)

    timeline = {
        "fps": 30,
        "totalFrames": 120,  # 4秒
        "layers": {
            "V1": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Background",
                        "fontSize": 96,
                        "color": "red",
                        "resolution": (1280, 720),
                        "startFrame": 0,
                        "endFrame": 120,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.0,
                        "opacity": 0.3  # 半透明
                    }
                ]
            },
            "V2": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Foreground",
                        "fontSize": 64,
                        "color": "white",
                        "resolution": (1280, 720),
                        "startFrame": 0,
                        "endFrame": 120,
                        "positionX": 0,
                        "positionY": -150,
                        "scale": 1.0,
                        "opacity": 1.0
                    }
                ]
            }
        },
        "layerOrder": ["V2", "V1"]  # V2が前面
    }

    processor = VideoProcessor()
    output = os.path.join(os.path.dirname(__file__), "example_3.mp4")

    print(f"レンダリング中... 出力: {output}")
    success = processor.render(timeline, output)

    if success:
        print(f"完了! {output}")
    return success


def example_4_with_progress():
    """例4: 進捗表示付き"""
    print("\n例4: 進捗表示付き")
    print("-" * 40)

    timeline = {
        "fps": 30,
        "totalFrames": 150,  # 5秒
        "layers": {
            "V1": {
                "clips": [
                    {
                        "type": "text",
                        "text": "Progress Example",
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

    def on_progress(progress):
        """進捗コールバック"""
        percentage = progress.get('percentage', 0)
        status = progress.get('status', '')
        current = progress.get('current_frame', 0)
        total = progress.get('total_frames', 0)

        print(f"  [{status}] {percentage:.1f}% ({current}/{total} フレーム)")

    processor = VideoProcessor()
    output = os.path.join(os.path.dirname(__file__), "example_4.mp4")

    print(f"レンダリング中... 出力: {output}")
    success = processor.render(
        timeline,
        output,
        progress_callback=on_progress
    )

    if success:
        print(f"完了! {output}")
    return success


def example_5_transformations():
    """例5: トランスフォーメーション（スケール、回転、不透明度）"""
    print("\n例5: トランスフォーメーション")
    print("-" * 40)

    timeline = {
        "fps": 30,
        "totalFrames": 240,  # 8秒
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
                        "endFrame": 60,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.0,
                        "rotation": 0,
                        "opacity": 1.0
                    },
                    {
                        "type": "text",
                        "text": "Scaled 1.5x",
                        "fontSize": 48,
                        "color": "blue",
                        "resolution": (1280, 720),
                        "startFrame": 60,
                        "endFrame": 120,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.5,
                        "rotation": 0,
                        "opacity": 1.0
                    },
                    {
                        "type": "text",
                        "text": "Rotated 30°",
                        "fontSize": 48,
                        "color": "green",
                        "resolution": (1280, 720),
                        "startFrame": 120,
                        "endFrame": 180,
                        "positionX": 0,
                        "positionY": 0,
                        "scale": 1.0,
                        "rotation": 30,
                        "opacity": 1.0
                    },
                    {
                        "type": "text",
                        "text": "50% Opacity",
                        "fontSize": 48,
                        "color": "red",
                        "resolution": (1280, 720),
                        "startFrame": 180,
                        "endFrame": 240,
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
    output = os.path.join(os.path.dirname(__file__), "example_5.mp4")

    print(f"レンダリング中... 出力: {output}")
    success = processor.render(timeline, output)

    if success:
        print(f"完了! {output}")
    return success


def main():
    """メイン関数"""
    print("=" * 50)
    print("動画レンダリング - 使用例")
    print("=" * 50)

    examples = [
        ("シンプルなテキスト", example_1_simple_text),
        ("複数のシーン", example_2_multiple_scenes),
        ("レイヤー合成", example_3_layered_composition),
        ("進捗表示", example_4_with_progress),
        ("トランスフォーメーション", example_5_transformations),
    ]

    print("\n実行する例を選択してください:")
    for i, (name, _) in enumerate(examples, 1):
        print(f"  {i}. {name}")
    print(f"  0. すべて実行")

    try:
        choice = input("\n選択 (0-5): ").strip()

        if choice == "0":
            # すべて実行
            results = []
            for name, func in examples:
                try:
                    result = func()
                    results.append((name, result))
                except Exception as e:
                    print(f"エラー: {e}")
                    results.append((name, False))

            print("\n" + "=" * 50)
            print("結果:")
            for name, result in results:
                status = "成功" if result else "失敗"
                print(f"  [{status}] {name}")
            print("=" * 50)

        elif choice.isdigit() and 1 <= int(choice) <= len(examples):
            # 個別実行
            name, func = examples[int(choice) - 1]
            func()

        else:
            print("無効な選択です")

    except KeyboardInterrupt:
        print("\n\nキャンセルされました")
    except Exception as e:
        print(f"\nエラー: {e}")


if __name__ == "__main__":
    main()
