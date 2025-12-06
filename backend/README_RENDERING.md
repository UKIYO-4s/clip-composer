# 動画レンダリング機能 - クイックスタートガイド

## 概要

タスク4-2「動画書き出し機能（Python側）」の実装が完了しました。
このガイドでは、実装内容と動作確認方法を簡潔に説明します。

## 実装ファイル

### メインファイル

1. **backend/modules/video_processor.py** (615行)
   - VideoProcessorクラスの完全実装
   - render(), cancel(), get_progress() メソッド
   - video/image/text/audio クリップ対応

2. **backend/main.py** (更新)
   - --test-render オプション追加
   - サンプルレンダリングテスト

### テスト・サンプル

3. **backend/test_render_detailed.py** (500行)
   - 6種類の詳細テスト
   - 自動生成された動画で確認可能

4. **backend/example_render.py** (400行)
   - 5つの実用例
   - インタラクティブに選択可能

5. **backend/verify_implementation.py** (300行)
   - 実装の正しさを検証
   - 5段階のチェック

### ドキュメント

6. **backend/RENDERING_GUIDE.md**
   - 詳細な実装ガイド
   - API仕様とサンプルコード

7. **backend/TASK_4-2_SUMMARY.md**
   - タスク完了報告書
   - 実装詳細とチェックリスト

8. **backend/README_RENDERING.md** (このファイル)
   - クイックスタートガイド

## 動作確認（3つの方法）

### 方法1: 簡易テスト（推奨）

```bash
cd /Users/shoeigoto/Desktop/clip-composer/backend
source venv/bin/activate
python main.py --test-render
```

**出力:**
- test_output.mp4 (5秒、2つのテキストクリップ)

**確認内容:**
- タイムラインデータ解析
- テキストクリップ生成
- レイヤー合成
- 進捗表示

### 方法2: 詳細テスト

```bash
cd /Users/shoeigoto/Desktop/clip-composer/backend
source venv/bin/activate
python test_render_detailed.py
```

**6つのテスト:**
1. テキストクリップ (test_text.mp4)
2. 複数クリップ連続 (test_multiple_text.mp4)
3. レイヤー重ね合わせ (test_layered.mp4)
4. 進捗コールバック (test_progress.mp4)
5. get_progress()メソッド
6. プロパティ適用 (test_properties.mp4)

### 方法3: 実装検証

```bash
cd /Users/shoeigoto/Desktop/clip-composer/backend
source venv/bin/activate
python verify_implementation.py
```

**5段階チェック:**
1. インポート確認
2. クラス構造確認
3. メソッドシグネチャ確認
4. 初期状態確認
5. コンテキストマネージャー確認

## 主要機能

### 1. render() - 動画生成

```python
from modules.video_processor import VideoProcessor

timeline = {
    "fps": 30,
    "totalFrames": 90,
    "layers": {
        "V1": {
            "clips": [{
                "type": "text",
                "text": "Hello World",
                "fontSize": 64,
                "color": "white",
                "resolution": (1280, 720),
                "startFrame": 0,
                "endFrame": 90
            }]
        }
    },
    "layerOrder": ["V1"]
}

processor = VideoProcessor()
processor.render(timeline, "output.mp4")
```

### 2. cancel() - キャンセル

```python
processor = VideoProcessor()
# 別スレッドでレンダリング中...
processor.cancel()  # 中断
```

### 3. get_progress() - 進捗取得

```python
progress = processor.get_progress()
# {
#   'current_frame': 100,
#   'total_frames': 900,
#   'percentage': 11.11,
#   'status': 'rendering'
# }
```

## 対応クリップタイプ

### Video
```json
{
  "type": "video",
  "filePath": "/path/to/video.mp4",
  "startFrame": 0,
  "endFrame": 100,
  "inPoint": 0,
  "outPoint": 100
}
```

### Image
```json
{
  "type": "image",
  "filePath": "/path/to/image.jpg",
  "startFrame": 0,
  "endFrame": 100
}
```

### Text (PIL/Pillow - ImageMagick不要)
```json
{
  "type": "text",
  "text": "Sample Text",
  "fontSize": 48,
  "color": "white",
  "resolution": [1920, 1080],
  "startFrame": 0,
  "endFrame": 100
}
```

### Audio
```json
{
  "type": "audio",
  "filePath": "/path/to/audio.mp3",
  "startFrame": 0,
  "endFrame": 100,
  "volume": 1.0,
  "fadeIn": 0,
  "fadeOut": 0
}
```

## プロパティ

すべてのビデオクリップで使用可能:

- **positionX, positionY**: 位置
- **scale**: スケール (0.5 = 50%, 2.0 = 200%)
- **rotation**: 回転 (度数)
- **opacity**: 不透明度 (0.0 ~ 1.0)

## レンダリングオプション

```python
options = {
    'codec': 'libx264',      # 動画コーデック
    'audio_codec': 'aac',    # 音声コーデック
    'preset': 'medium',      # ultrafast, fast, medium, slow
    'fps': 30,               # フレームレート
    'threads': 4,            # スレッド数
    'bitrate': '5000k',      # ビットレート
    'resolution': (1920, 1080)  # 解像度
}

processor.render(timeline, output, options=options)
```

## 進捗コールバック

```python
def on_progress(progress):
    print(f"{progress['percentage']:.1f}% - {progress['status']}")

processor.render(
    timeline,
    output,
    progress_callback=on_progress
)
```

## 依存パッケージ

```bash
# インストール
pip install moviepy Pillow numpy

# システム要件 (macOS)
brew install ffmpeg

# 確認
pip list | grep -E "(moviepy|Pillow|numpy)"
```

## トラブルシューティング

### MoviePyがインストールできない
```bash
pip install --upgrade pip
pip install moviepy
```

### ffmpegが見つからない
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg
```

### テキストが表示されない
- フォントパスを確認
- システムフォントが使用されます（macOS: Helvetica, Linux: DejaVu Sans）

### メモリ不足
- 解像度を下げる: (1280, 720) など
- threads数を減らす: threads=2
- preset='ultrafast' で高速化

## ディレクトリ構造

```
backend/
├── modules/
│   ├── __init__.py
│   └── video_processor.py          # メイン実装
├── main.py                          # --test-render オプション
├── test_render_detailed.py         # 詳細テスト
├── example_render.py               # 使用例
├── verify_implementation.py        # 実装検証
├── RENDERING_GUIDE.md              # 詳細ガイド
├── TASK_4-2_SUMMARY.md             # 完了報告
└── README_RENDERING.md             # このファイル
```

## 実装済み機能チェックリスト

- [x] VideoProcessor.render() - タイムライン→動画
- [x] VideoProcessor.cancel() - レンダリング中断
- [x] VideoProcessor.get_progress() - 進捗取得
- [x] video クリップ対応 (VideoFileClip)
- [x] image クリップ対応 (ImageClip)
- [x] text クリップ対応 (PIL/Pillow)
- [x] audio クリップ対応 (AudioFileClip)
- [x] レイヤー合成 (CompositeVideoClip)
- [x] プロパティ適用 (位置、スケール、回転、不透明度)
- [x] 進捗コールバック (フレーム単位)
- [x] キャンセル機能 (フラグベース)
- [x] エラーハンドリング
- [x] リソース管理 (コンテキストマネージャー)
- [x] テストコード (6種類)
- [x] ドキュメント

## 次のステップ

タスク4-3: IPC連携
- ElectronからのレンダリングAPI呼び出し
- 進捗のリアルタイム送信
- キャンセル要求の受信

## 参考資料

### MoviePy公式ドキュメント
- https://zulko.github.io/moviepy/

### サンプルコード
- example_render.py - 5つの実用例
- test_render_detailed.py - 6つのテスト

### 詳細ドキュメント
- RENDERING_GUIDE.md - 完全な実装ガイド
- TASK_4-2_SUMMARY.md - タスク完了報告

## よくある質問

### Q1: ImageMagickは必要ですか？
A: いいえ、PIL/Pillowで代替実装しているため不要です。

### Q2: どのフォーマットに対応していますか？
A: MoviePyがサポートする全形式（mp4, avi, mov, mkv等）に対応。

### Q3: 高解像度動画のレンダリングは？
A: 4K (3840x2160) まで対応可能ですが、メモリに注意してください。

### Q4: レンダリング速度を上げるには？
A: preset='ultrafast' を使用。品質は低下します。

### Q5: 音声のみの出力は？
A: オーディオクリップのみでレンダリング可能です。

## ライセンス

MIT License

## 連絡先

Clip Composer開発チーム

---

最終更新: 2025-12-07
バージョン: 1.0.0
