#!/usr/bin/env python3
"""
実装検証スクリプト
VideoProcessorの実装が正しく完了しているか確認
"""

import sys
import inspect


def check_imports():
    """必要なモジュールがインポート可能か確認"""
    print("=" * 60)
    print("1. インポートチェック")
    print("=" * 60)

    checks = []

    # MoviePy
    try:
        import moviepy
        print(f"[OK] moviepy: {moviepy.__version__}")
        checks.append(True)
    except ImportError as e:
        print(f"[NG] moviepy: インポート失敗 - {e}")
        checks.append(False)

    # Pillow
    try:
        import PIL
        print(f"[OK] Pillow: {PIL.__version__}")
        checks.append(True)
    except ImportError as e:
        print(f"[NG] Pillow: インポート失敗 - {e}")
        checks.append(False)

    # numpy
    try:
        import numpy
        print(f"[OK] numpy: {numpy.__version__}")
        checks.append(True)
    except ImportError as e:
        print(f"[NG] numpy: インポート失敗 - {e}")
        checks.append(False)

    # VideoProcessor
    try:
        from modules.video_processor import VideoProcessor
        print(f"[OK] VideoProcessor: インポート成功")
        checks.append(True)
    except ImportError as e:
        print(f"[NG] VideoProcessor: インポート失敗 - {e}")
        checks.append(False)

    return all(checks)


def check_class_structure():
    """VideoProcessorクラスの構造を確認"""
    print("\n" + "=" * 60)
    print("2. VideoProcessorクラス構造チェック")
    print("=" * 60)

    try:
        from modules.video_processor import VideoProcessor
    except ImportError:
        print("[NG] VideoProcessorをインポートできません")
        return False

    processor = VideoProcessor()

    # 必須メソッドのリスト
    required_methods = {
        'render': '動画レンダリング',
        'cancel': 'レンダリングキャンセル',
        'get_progress': '進捗取得',
        'load_video': '動画読み込み',
        'export_video': '動画書き出し',
        'close': 'リソース解放',
        '__enter__': 'コンテキストマネージャー開始',
        '__exit__': 'コンテキストマネージャー終了',
    }

    # 内部メソッド
    internal_methods = {
        '_create_video_clip': 'ビデオクリップ作成',
        '_create_audio_clip': 'オーディオクリップ作成',
        '_apply_clip_properties': 'プロパティ適用',
        '_create_text_image': 'テキスト画像生成',
    }

    all_methods = {**required_methods, **internal_methods}

    checks = []

    print("\n必須メソッド:")
    for method_name, description in required_methods.items():
        if hasattr(processor, method_name):
            method = getattr(processor, method_name)
            if callable(method):
                sig = inspect.signature(method) if method_name not in ['__enter__', '__exit__'] else None
                print(f"  [OK] {method_name}() - {description}")
                checks.append(True)
            else:
                print(f"  [NG] {method_name} は呼び出し可能ではありません")
                checks.append(False)
        else:
            print(f"  [NG] {method_name} が存在しません")
            checks.append(False)

    print("\n内部メソッド:")
    for method_name, description in internal_methods.items():
        if hasattr(processor, method_name):
            method = getattr(processor, method_name)
            if callable(method):
                print(f"  [OK] {method_name}() - {description}")
                checks.append(True)
            else:
                print(f"  [NG] {method_name} は呼び出し可能ではありません")
                checks.append(False)
        else:
            print(f"  [NG] {method_name} が存在しません")
            checks.append(False)

    return all(checks)


def check_method_signatures():
    """メソッドのシグネチャを確認"""
    print("\n" + "=" * 60)
    print("3. メソッドシグネチャチェック")
    print("=" * 60)

    try:
        from modules.video_processor import VideoProcessor
    except ImportError:
        print("[NG] VideoProcessorをインポートできません")
        return False

    processor = VideoProcessor()
    checks = []

    # render() のシグネチャ
    try:
        render_method = getattr(processor, 'render')
        sig = inspect.signature(render_method)
        params = list(sig.parameters.keys())

        expected_params = ['timeline_data', 'output_path', 'options', 'progress_callback']
        params_match = all(p in params for p in expected_params)

        if params_match:
            print(f"[OK] render() のパラメータ: {', '.join(params)}")
            checks.append(True)
        else:
            print(f"[NG] render() のパラメータが不正: {', '.join(params)}")
            print(f"     期待: {', '.join(expected_params)}")
            checks.append(False)
    except Exception as e:
        print(f"[NG] render() のシグネチャ確認失敗: {e}")
        checks.append(False)

    # cancel() のシグネチャ
    try:
        cancel_method = getattr(processor, 'cancel')
        sig = inspect.signature(cancel_method)
        params = list(sig.parameters.keys())

        if len(params) == 0:
            print(f"[OK] cancel() のパラメータ: なし")
            checks.append(True)
        else:
            print(f"[NG] cancel() はパラメータを持つべきではありません: {', '.join(params)}")
            checks.append(False)
    except Exception as e:
        print(f"[NG] cancel() のシグネチャ確認失敗: {e}")
        checks.append(False)

    # get_progress() のシグネチャ
    try:
        get_progress_method = getattr(processor, 'get_progress')
        sig = inspect.signature(get_progress_method)
        params = list(sig.parameters.keys())

        if len(params) == 0:
            print(f"[OK] get_progress() のパラメータ: なし")
            checks.append(True)
        else:
            print(f"[NG] get_progress() はパラメータを持つべきではありません: {', '.join(params)}")
            checks.append(False)
    except Exception as e:
        print(f"[NG] get_progress() のシグネチャ確認失敗: {e}")
        checks.append(False)

    return all(checks)


def check_initial_state():
    """初期状態を確認"""
    print("\n" + "=" * 60)
    print("4. 初期状態チェック")
    print("=" * 60)

    try:
        from modules.video_processor import VideoProcessor
    except ImportError:
        print("[NG] VideoProcessorをインポートできません")
        return False

    processor = VideoProcessor()
    checks = []

    # 進捗状態の確認
    progress = processor.get_progress()

    if isinstance(progress, dict):
        print(f"[OK] get_progress() は辞書を返します")
        checks.append(True)

        required_keys = ['current_frame', 'total_frames', 'percentage', 'status']
        for key in required_keys:
            if key in progress:
                print(f"  [OK] progress['{key}'] = {progress[key]}")
                checks.append(True)
            else:
                print(f"  [NG] progress['{key}'] が存在しません")
                checks.append(False)

        # 初期値の確認
        if progress.get('status') == 'idle':
            print(f"[OK] 初期状態は 'idle'")
            checks.append(True)
        else:
            print(f"[NG] 初期状態が 'idle' ではありません: {progress.get('status')}")
            checks.append(False)

    else:
        print(f"[NG] get_progress() は辞書ではありません: {type(progress)}")
        checks.append(False)

    return all(checks)


def check_context_manager():
    """コンテキストマネージャーをテスト"""
    print("\n" + "=" * 60)
    print("5. コンテキストマネージャーチェック")
    print("=" * 60)

    try:
        from modules.video_processor import VideoProcessor
    except ImportError:
        print("[NG] VideoProcessorをインポートできません")
        return False

    try:
        with VideoProcessor() as processor:
            print("[OK] with文で使用可能")
            print(f"[OK] インスタンス: {processor}")
        print("[OK] リソース解放成功")
        return True
    except Exception as e:
        print(f"[NG] コンテキストマネージャーエラー: {e}")
        return False


def main():
    """メイン関数"""
    print("=" * 60)
    print("VideoProcessor 実装検証")
    print("=" * 60)

    results = []

    # 各チェックを実行
    results.append(("インポート", check_imports()))
    results.append(("クラス構造", check_class_structure()))
    results.append(("メソッドシグネチャ", check_method_signatures()))
    results.append(("初期状態", check_initial_state()))
    results.append(("コンテキストマネージャー", check_context_manager()))

    # 結果サマリー
    print("\n" + "=" * 60)
    print("検証結果サマリー")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for check_name, result in results:
        status = "合格" if result else "不合格"
        symbol = "✓" if result else "✗"
        print(f"  [{symbol}] {check_name}: {status}")

    print(f"\n合計: {passed}/{total} チェック合格")

    if passed == total:
        print("\n全てのチェックに合格しました!")
        print("VideoProcessorの実装は正常です。")
        return 0
    else:
        print("\nいくつかのチェックに失敗しました。")
        print("上記のエラーを確認してください。")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
