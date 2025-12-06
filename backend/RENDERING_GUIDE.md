# 動画書き出し機能（レンダリング）ガイド

## 概要

このドキュメントでは、Clip Composerの動画レンダリング機能について説明します。

## 実装ファイル

### /Users/shoeigoto/Desktop/clip-composer/backend/modules/video_processor.py

VideoProcessorクラスの主要メソッド:

#### 1. `render(timeline_data, output_path, options, progress_callback)`

タイムラインデータから動画を生成するメインメソッド

**パラメータ:**
- `timeline_data` (dict): タイムラインデータ
- `output_path` (str): 出力ファイルパス
- `options` (dict, optional): レンダリングオプション
- `progress_callback` (callable, optional): 進捗コールバック関数

**タイムラインデータ形式:**
```json
{
  "fps": 30,
  "totalFrames": 900,
  "layers": {
    "V2": { "clips": [...] },
    "V1": { "clips": [...] },
    "S2": { "clips": [...] },
    "S1": { "clips": [...] }
  },
  "layerOrder": ["V2", "V1", "S2", "S1"]
}
```

**クリップデータ形式:**

```json
{
  "type": "video|image|text",
  "filePath": "/path/to/file",
  "startFrame": 0,
  "endFrame": 100,
  "inPoint": 0,
  "outPoint": 100,
  "positionX": 0,
  "positionY": 0,
  "scale": 1.0,
  "rotation": 0,
  "opacity": 1.0
}
```

**テキストクリップ:**
```json
{
  "type": "text",
  "text": "Sample Text",
  "fontSize": 48,
  "color": "white",
  "resolution": [1920, 1080],
  "startFrame": 0,
  "endFrame": 100,
  "positionX": 0,
  "positionY": 0,
  "scale": 1.0,
  "rotation": 0,
  "opacity": 1.0
}
```

**オーディオクリップ:**
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

**レンダリングオプション:**
```python
{
  'codec': 'libx264',      # 動画コーデック
  'audio_codec': 'aac',    # 音声コーデック
  'preset': 'medium',      # エンコードプリセット (ultrafast, fast, medium, slow)
  'fps': 30,               # フレームレート
  'threads': 4,            # スレッド数
  'bitrate': '5000k',      # ビットレート
  'resolution': (1920, 1080)  # 解像度
}
```

#### 2. `cancel()`

レンダリングを中断します。

#### 3. `get_progress()`

現在の進捗状態を取得します。

**戻り値:**
```python
{
  'current_frame': 100,
  'total_frames': 900,
  'percentage': 11.11,
  'status': 'rendering'  # idle, rendering, completed, cancelled, error
}
```

## 対応クリップタイプ

### 1. ビデオクリップ (type: "video")
- VideoFileClipで読み込み
- イン点・アウト点の処理
- 位置、スケール、回転、不透明度の適用

### 2. 画像クリップ (type: "image")
- ImageClipで読み込み
- 指定期間表示
- 位置、スケール、回転、不透明度の適用

### 3. テキストクリップ (type: "text")
- PIL/Pillowでテキスト画像を生成
- ImageMagick不要
- システムフォント使用（macOS: Helvetica, Linux: DejaVu Sans）
- カラー対応: white, black, red, green, blue

### 4. オーディオクリップ (type: "audio")
- AudioFileClipで読み込み
- ボリューム調整
- フェードイン/アウト

## レイヤー合成

- ビデオレイヤー（V1, V2, ...）: CompositeVideoClipで重ね合わせ
- layerOrderの順序: 最初の要素が最前面（V2が前面、V1が背面）
- オーディオレイヤー（S1, S2, ...）: CompositeAudioClipで合成

## 使用方法

### 基本的な使い方

```python
from modules.video_processor import VideoProcessor

# タイムラインデータの準備
timeline_data = {
    "fps": 30,
    "totalFrames": 150,
    "layers": {
        "V1": {
            "clips": [
                {
                    "type": "text",
                    "text": "Hello World",
                    "fontSize": 64,
                    "color": "white",
                    "resolution": (1920, 1080),
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

# 進捗コールバック
def on_progress(progress):
    print(f"進捗: {progress['percentage']:.1f}%")

# レンダリング実行
processor = VideoProcessor()
success = processor.render(
    timeline_data=timeline_data,
    output_path="/path/to/output.mp4",
    options={'resolution': (1920, 1080)},
    progress_callback=on_progress
)

if success:
    print("レンダリング完了")
```

### キャンセル処理

```python
import threading

processor = VideoProcessor()

# 別スレッドでレンダリング
def render_thread():
    processor.render(timeline_data, output_path)

thread = threading.Thread(target=render_thread)
thread.start()

# 途中でキャンセル
processor.cancel()
```

## テスト実行

### 1. 簡易テスト（main.pyから）

```bash
cd /Users/shoeigoto/Desktop/clip-composer/backend
python main.py --test-render
```

このコマンドは:
- サンプルタイムラインデータでレンダリング
- test_output.mp4を生成
- 進捗を表示

### 2. 詳細テスト（test_render_detailed.py）

```bash
cd /Users/shoeigoto/Desktop/clip-composer/backend
python test_render_detailed.py
```

このスクリプトは以下をテスト:
1. テキストクリップのレンダリング
2. 複数テキストクリップの連続レンダリング
3. レイヤー重ね合わせ
4. 進捗コールバック機能
5. get_progress()メソッド
6. プロパティ適用（スケール、回転、不透明度）

### 3. 仮想環境のアクティベート

```bash
# 仮想環境をアクティベート
cd /Users/shoeigoto/Desktop/clip-composer/backend
source venv/bin/activate

# 依存パッケージのインストール確認
pip list | grep -E "(moviepy|Pillow|numpy)"

# テスト実行
python main.py --test-render
```

## 依存関係

必要なパッケージ:
- moviepy: 動画処理
- Pillow: テキスト画像生成
- numpy: 画像配列処理

インストール:
```bash
pip install moviepy Pillow numpy
```

## 注意事項

### 1. ImageMagickについて
- テキストクリップ生成にImageMagickは不要
- PIL/Pillowで代替実装済み

### 2. フォントについて
- macOS: `/System/Library/Fonts/Helvetica.ttc`
- Linux: `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`
- フォントが見つからない場合はデフォルトフォント使用

### 3. 進捗報告
- コールバック関数経由で進捗を報告
- 後でIPC連携で使用可能
- フレーム単位で進捗更新

### 4. キャンセル機能
- フラグベースで実装
- レンダリング中にcancel()を呼び出し
- スレッドセーフ

### 5. パフォーマンス
- preset: 'ultrafast' (高速、低品質) ～ 'slow' (低速、高品質)
- threads: CPU数に応じて調整
- bitrate: 品質に応じて調整

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
- デフォルトフォントにフォールバック

### メモリ不足
- 解像度を下げる
- クリップ数を減らす
- threads数を減らす

## 実装詳細

### クリップ生成フロー
1. タイムラインデータを解析
2. レイヤーごとにクリップを生成
3. ビデオクリップ: _create_video_clip()
4. オーディオクリップ: _create_audio_clip()
5. プロパティ適用: _apply_clip_properties()
6. レイヤー合成: CompositeVideoClip
7. 動画書き出し: write_videofile()

### プロパティ適用順序
1. 位置 (positionX, positionY)
2. スケール (scale)
3. 回転 (rotation)
4. 不透明度 (opacity)
5. 開始時間 (start_time)

### リソース管理
- with文でコンテキストマネージャー使用可能
- close()で明示的にリソース解放
- レンダリング完了後は自動的にクリップをクローズ

## 今後の拡張予定

1. エフェクト機能
   - フェードイン/アウト
   - トランジション
   - カラーグレーディング

2. 高度なテキスト機能
   - カスタムフォント
   - テキストアニメーション
   - 縁取り、影

3. パフォーマンス最適化
   - プレビュー用低解像度レンダリング
   - チャンクレンダリング
   - GPU加速

4. 追加コーデック
   - H.265 (HEVC)
   - VP9
   - ProRes

## ライセンス

このプロジェクトはMITライセンスのもとで公開されています。
