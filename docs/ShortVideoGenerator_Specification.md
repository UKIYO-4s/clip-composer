# ShortVideo Generator - 完全仕様書

## 📋 プロジェクト概要

### プロジェクト名
**ShortVideo Generator** (略称: SVG)

### 目的
Instagram Reels、TikTok、YouTube Shorts向けのショート動画を、タイムラインベースの編集とCSV一括生成により効率的に大量生成するデスクトップアプリケーション。

### ターゲットプラットフォーム
- **対応OS**: macOS 11.0 (Big Sur) 以降
- **配布形式**: DMG (将来的にApple公証対応)

---

## 🎯 コアコンセプト

1. **テンプレート作成**: タイムラインUIで動画のテンプレートを作成
2. **CSV制御**: 可変要素（素材、テキスト）をCSVで一括管理
3. **大量生成**: 1つのテンプレートから数十〜数百本の動画を自動生成

---

## 🏗️ 技術スタック

### フロントエンド（UI）
```json
{
  "framework": "Electron 28.x",
  "ui_library": "React 18.x",
  "state_management": "Redux Toolkit",
  "styling": "Tailwind CSS",
  "timeline": "React DnD (ドラッグ&ドロップ)"
}
```

### バックエンド（動画処理）
```json
{
  "language": "Python 3.11+",
  "video_processing": "MoviePy 1.0.3",
  "video_engine": "FFmpeg 6.0",
  "csv_handling": "pandas 2.x",
  "ipc": "Electron IPC + Python subprocess"
}
```

### 開発ツール
```json
{
  "version_control": "Git",
  "package_manager_js": "npm",
  "package_manager_py": "pip / venv",
  "build_tool": "electron-builder",
  "code_quality": "ESLint, Prettier, Black (Python)"
}
```

---

## 📂 プロジェクト構造

```
shortvideo-generator/
├── .git/                           # Gitバージョン管理
├── .gitignore
├── README.md
├── package.json                    # Electron/Node.js依存関係
├── electron.config.js              # Electron設定
│
├── frontend/                       # Electronフロントエンド
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── main.js                # Electronメインプロセス
│   │   ├── preload.js             # IPC通信設定
│   │   ├── renderer/              # Reactレンダラープロセス
│   │   │   ├── App.jsx
│   │   │   ├── components/        # UIコンポーネント
│   │   │   │   ├── Timeline/      # タイムライン関連
│   │   │   │   │   ├── Timeline.jsx
│   │   │   │   │   ├── Layer.jsx
│   │   │   │   │   ├── Clip.jsx
│   │   │   │   │   └── PlayHead.jsx
│   │   │   │   ├── PropertyPanel/ # プロパティパネル
│   │   │   │   │   ├── PropertyPanel.jsx
│   │   │   │   │   ├── SliderControl.jsx
│   │   │   │   │   └── ColorPicker.jsx
│   │   │   │   ├── Toolbar/       # ツールバー
│   │   │   │   ├── ProjectSettings/
│   │   │   │   └── ExportDialog/
│   │   │   ├── store/             # Redux状態管理
│   │   │   │   ├── store.js
│   │   │   │   ├── timelineSlice.js
│   │   │   │   ├── projectSlice.js
│   │   │   │   └── exportSlice.js
│   │   │   ├── utils/             # ユーティリティ
│   │   │   └── styles/            # CSS/Tailwind
│   │   └── index.jsx
│   └── package.json
│
├── backend/                        # Python動画処理エンジン
│   ├── requirements.txt            # Python依存関係
│   ├── main.py                     # エントリーポイント
│   ├── modules/
│   │   ├── video_processor.py     # 動画処理コア
│   │   ├── random_layer.py        # ランダムレイヤー処理
│   │   ├── text_layer.py          # テキストレイヤー処理
│   │   ├── audio_processor.py     # 音声処理
│   │   ├── adjustment_layer.py    # 調整レイヤー（エフェクト）
│   │   ├── csv_handler.py         # CSV読み込み・バリデーション
│   │   └── exporter.py            # 動画書き出し
│   ├── utils/
│   │   ├── ffmpeg_utils.py        # FFmpegラッパー
│   │   ├── file_utils.py          # ファイル操作
│   │   └── validation.py          # バリデーション
│   └── tests/                      # ユニットテスト
│
├── assets/                         # アプリアセット
│   ├── icons/                      # アプリアイコン
│   ├── templates/                  # デフォルトテンプレート
│   └── fonts/                      # 組み込みフォント
│
├── build/                          # ビルド出力（.gitignore）
├── dist/                           # 配布パッケージ（.gitignore）
│
└── docs/                           # ドキュメント
    ├── architecture.md             # アーキテクチャ設計
    ├── api.md                      # IPC API仕様
    └── user_guide.md               # ユーザーガイド
```

---

## 🎨 UI/UX設計

### メインウィンドウ構成

```
┌─────────────────────────────────────────────────────────────┐
│  ShortVideo Generator                        ─  □  ×         │
├─────────────────────────────────────────────────────────────┤
│  File  Edit  Project  Export  Help                          │
├─────────────────────────────────────────────────────────────┤
│ ┌─ Toolbar ─────────────────────────────────────────────┐  │
│ │ [新規] [開く] [保存] | [再生] [停止] | [C:カット]     │  │
│ └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ ┌─ Timeline ──────────────────┐ ┌─ Property Panel ──────┐ │
│ │                              │ │                        │ │
│ │ ⏱️ [00:00:05:15] ←クリック │ │  選択中のクリップ:     │ │
│ │                              │ │  ランダムレイヤー1     │ │
│ │ V2 │[Random1][Text]         │ │                        │ │
│ │ V1 │[Random2][VarText1]     │ │  フォルダパス:         │ │
│ │ ─────────────────────────── │ │  [参照...]             │ │
│ │ S2 │[BGM ～～～～～～～～]  │ │                        │ │
│ │ S1 │[SE ♪]                  │ │  取得位置:             │ │
│ │                              │ │  ○ 冒頭  ○ ランダム   │ │
│ │                              │ │                        │ │
│ │                              │ │  フレーム/カット: [2]  │ │
│ │                              │ │  カット数: [10]        │ │
│ │                              │ │                        │ │
│ └──────────────────────────────┘ └────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### カラースキーム
```css
/* ダークテーマ（デフォルト） */
--bg-primary: #1e1e1e
--bg-secondary: #2d2d2d
--bg-timeline: #252525
--text-primary: #e0e0e0
--text-secondary: #a0a0a0
--accent-blue: #007acc
--accent-green: #4ec9b0
--border-color: #3e3e3e
```

---

## 📐 機能仕様

### 1. プロジェクト設定

#### 1.1 新規プロジェクト作成
**入力項目:**
```json
{
  "project_name": "String (必須)",
  "aspect_ratio": "Enum ['9:16', '16:9', '1:1']",
  "frame_rate": "Enum [24, 30, 60]",
  "resolution": "Enum ['1080x1920', '1080x1080', 'custom']",
  "custom_width": "Integer (custom時)",
  "custom_height": "Integer (custom時)",
  "codec": "String (default: 'H.264')",
  "output_folder": "Path (必須)"
}
```

**バリデーション:**
- プロジェクト名: 1〜100文字、特殊文字不可
- カスタム解像度: 64〜4096の範囲

**データ保存:**
- 形式: JSON (`.svgproj`)
- 自動保存: 5分ごと

---

### 2. タイムライン機能

#### 2.1 レイヤー構造

**ビジュアルレイヤー (V1, V2):**
```javascript
{
  layer_id: 'v1' | 'v2',
  clips: [
    {
      clip_id: 'uuid',
      type: 'random_layer' | 'video' | 'text' | 'variable_text' | 'adjustment',
      start_frame: Integer,
      duration_frames: Integer,
      properties: Object // タイプごとに異なる
    }
  ]
}
```

**サウンドレイヤー (S1, S2):**
```javascript
{
  layer_id: 's1' | 's2',
  clips: [
    {
      clip_id: 'uuid',
      type: 'bgm' | 'se' | 'video_audio',
      start_frame: Integer,
      duration_frames: Integer,
      properties: {
        file_path: String,
        volume: Float (0.0 - 1.0),
        fade_in: { enabled: Boolean, duration_sec: Float },
        fade_out: { enabled: Boolean, duration_sec: Float }
      }
    }
  ]
}
```

#### 2.2 タイムコード機能
- 形式: `HH:MM:SS:FF` (時:分:秒:フレーム)
- クリック→入力ダイアログ表示
- 入力後、再生ヘッドがジャンプ

#### 2.3 操作方法

**ドラッグ&ドロップ:**
```javascript
// 素材パネル → タイムラインへドロップ
onDrop(file, layer, position) {
  // クリップオブジェクト生成
  // タイムラインに追加
  // Redux stateを更新
}
```

**カット機能 (Cキー):**
```javascript
// 再生ヘッド位置で選択中のクリップを分割
onCutClip(clip_id, frame_position) {
  // クリップを2つに分割
  // 新しいクリップIDを生成
  // タイムライン更新
}
```

**クリップ移動:**
- ドラッグで左右に移動
- スナップ機能（他のクリップ端にスナップ）
- レイヤー間の移動も可能（V1 ↔ V2）

---

### 3. レイヤータイプ別仕様

#### 3.1 ランダムレイヤー (Random Layer 1, 2, 3)

**プロパティ:**
```python
{
    "layer_number": 1 | 2 | 3,
    "folder_path": "/path/to/video/folder",
    "extraction_mode": "start" | "random",
    "frames_per_cut": 2,  # 各カットから取得するフレーム数
    "num_cuts": 10,       # タイムライン上のカット数
    "selected_videos": [] # 生成時に選択された動画リスト（重複なし）
}
```

**動作ロジック:**
```python
def generate_random_layer(timeline_data, random_layer_num, csv_folder_path):
    """
    タイムライン全体から該当ランダムレイヤーのカット数を集計
    """
    # 1. タイムライン走査
    total_cuts = 0
    clips = []
    for clip in timeline.clips:
        if clip.type == f'random_layer_{random_layer_num}':
            total_cuts += clip.properties.num_cuts
            clips.append(clip)
    
    # 2. フォルダから動画選択（重複なし）
    all_videos = list_videos_in_folder(csv_folder_path)
    if len(all_videos) < total_cuts:
        raise ValueError(f"フォルダ内の動画数が不足: {len(all_videos)}本 < {total_cuts}カット必要")
    
    selected = random.sample(all_videos, total_cuts)
    
    # 3. 各クリップに動画を割り当て
    video_index = 0
    for clip in clips:
        clip_videos = selected[video_index:video_index + clip.properties.num_cuts]
        clip.assigned_videos = clip_videos
        video_index += clip.properties.num_cuts
    
    return clips
```

**フレーム抽出:**
```python
def extract_frames(video_path, extraction_mode, frames_per_cut):
    """
    指定モードでフレームを抽出
    """
    video = VideoFileClip(video_path)
    
    if extraction_mode == "start":
        # 冒頭から取得
        start_time = 0
    elif extraction_mode == "random":
        # ランダム位置から取得
        max_start = video.duration - (frames_per_cut / fps)
        start_time = random.uniform(0, max_start)
    
    end_time = start_time + (frames_per_cut / fps)
    subclip = video.subclip(start_time, end_time)
    
    return subclip
```

#### 3.2 動画レイヤー (Video Layer)

**プロパティ:**
```python
{
    "file_path": "/path/to/video.mp4",
    "start_frame": 0,      # 動画内の開始フレーム
    "duration_frames": 90,  # 使用する長さ
    "volume": 1.0,         # 音声ボリューム（0.0-1.0）
    "mute": False          # ミュート
}
```

#### 3.3 テキストレイヤー (Text Layer)

**プロパティ:**
```python
{
    "text": "チャンネル登録お願いします",
    "font": "Arial",
    "font_size": 48,
    "color": "#FFFFFF",
    "position": {"x": 540, "y": 100},  # 中心座標
    "alignment": "center",
    "stroke_color": "#000000",
    "stroke_width": 2,
    "animation": {
        "type": "fade_in" | "slide_in" | "none",
        "duration_frames": 15
    }
}
```

**レンダリング (MoviePy):**
```python
from moviepy.editor import TextClip

def create_text_clip(properties, video_size, duration):
    txt_clip = TextClip(
        properties['text'],
        fontsize=properties['font_size'],
        font=properties['font'],
        color=properties['color'],
        stroke_color=properties['stroke_color'],
        stroke_width=properties['stroke_width'],
        size=video_size,
        method='caption'
    ).set_duration(duration).set_position(
        (properties['position']['x'], properties['position']['y'])
    )
    
    # アニメーション適用
    if properties['animation']['type'] == 'fade_in':
        txt_clip = txt_clip.crossfadein(properties['animation']['duration_frames'] / fps)
    
    return txt_clip
```

#### 3.4 可変テキストレイヤー (Variable Text Layer)

**タイムライン設定:**
```python
{
    "variable_slot": 1 | 2 | 3,  # 可変テキスト枠番号
    "default_font": "Arial",
    "default_font_size": 48,
    "default_color": "#FFFFFF",
    "position": {"x": 540, "y": 300},
    "alignment": "center",
    # CSVで上書き可能な項目
    "csv_overridable": ["text", "font", "font_size", "color"]
}
```

**CSV連携:**
```csv
動画名,可変テキスト1内容,可変テキスト1フォント,可変テキスト1カラー
video_001,商品A,Arial,#FF0000
```

**生成時の処理:**
```python
def apply_variable_text(clip, csv_row):
    properties = clip.properties.copy()
    
    # CSV値で上書き
    properties['text'] = csv_row.get('可変テキスト1内容', '')
    properties['font'] = csv_row.get('可変テキスト1フォント', properties['default_font'])
    properties['color'] = csv_row.get('可変テキスト1カラー', properties['default_color'])
    
    return create_text_clip(properties, ...)
```

#### 3.5 調整レイヤー (Adjustment Layer)

**プロパティ:**
```python
{
    "opacity": 0.75,              # 不透明度 (0.0-1.0)
    "brightness": 1.1,            # 明るさ (0.0-2.0)
    "color_temperature": 0,       # 色温度 (-100 ~ 100)
    "saturation": 1.0,            # 彩度 (0.0-2.0)
    "blur_radius": 0,             # ブラー (0-50 px)
    "black_video": False          # ブラックビデオ
}
```

**FFmpegフィルター生成:**
```python
def generate_ffmpeg_filters(properties):
    filters = []
    
    # 明るさ・彩度
    if properties['brightness'] != 1.0 or properties['saturation'] != 1.0:
        filters.append(f"eq=brightness={properties['brightness']-1.0}:saturation={properties['saturation']}")
    
    # 色温度
    if properties['color_temperature'] != 0:
        # 色温度はカラーバランスで実装
        r_adjust = properties['color_temperature'] / 100.0
        filters.append(f"colorbalance=rs={r_adjust}:gs=0:bs={-r_adjust}")
    
    # ブラー
    if properties['blur_radius'] > 0:
        filters.append(f"boxblur={properties['blur_radius']}")
    
    # 不透明度
    if properties['opacity'] < 1.0:
        filters.append(f"format=rgba,colorchannelmixer=aa={properties['opacity']}")
    
    return ','.join(filters)
```

#### 3.6 サウンドレイヤー

**BGM/SE共通プロパティ:**
```python
{
    "file_path": "/path/to/audio.mp3",
    "volume": 0.8,
    "fade_in": {
        "enabled": True,
        "duration_sec": 2.0
    },
    "fade_out": {
        "enabled": True,
        "duration_sec": 2.0
    },
    "loop": True  # BGMのみ
}
```

**音声処理:**
```python
from moviepy.editor import AudioFileClip

def process_audio(properties, video_duration):
    audio = AudioFileClip(properties['file_path'])
    
    # ボリューム調整
    audio = audio.volumex(properties['volume'])
    
    # ループ
    if properties.get('loop', False) and audio.duration < video_duration:
        audio = afx.audio_loop(audio, duration=video_duration)
    
    # フェード
    if properties['fade_in']['enabled']:
        audio = audio.audio_fadein(properties['fade_in']['duration_sec'])
    if properties['fade_out']['enabled']:
        audio = audio.audio_fadeout(properties['fade_out']['duration_sec'])
    
    return audio
```

---

### 4. 一括配置機能

#### 4.1 UI仕様

```
┌─ ランダムレイヤー一括配置 ─────────────┐
│                                        │
│  配置モード:                           │
│  ● フレーム数指定                      │
│    [2] フレーム × [15] カット         │
│    → 合計 30フレーム (1.0秒 @ 30fps)  │
│                                        │
│  ○ 秒数指定                            │
│    [3.0] 秒 ÷ [10] カット            │
│    → 9フレーム/カット                  │
│                                        │
│  配置先レイヤー: [V1 ▼]                │
│  配置開始位置: [00:00:00:00]           │
│                                        │
│  [配置] [キャンセル]                    │
└────────────────────────────────────────┘
```

#### 4.2 ロジック

```python
def bulk_place_random_layer(mode, params, layer_id, start_frame):
    """
    一括配置実行
    """
    if mode == "frame_count":
        frames_per_cut = params['frames_per_cut']
        num_cuts = params['num_cuts']
    elif mode == "duration":
        total_frames = params['duration_sec'] * fps
        num_cuts = params['num_cuts']
        frames_per_cut = total_frames // num_cuts
    
    # クリップを連続配置
    current_frame = start_frame
    for i in range(num_cuts):
        clip = {
            'clip_id': generate_uuid(),
            'type': 'random_layer_1',
            'start_frame': current_frame,
            'duration_frames': frames_per_cut,
            'properties': {...}
        }
        add_clip_to_layer(layer_id, clip)
        current_frame += frames_per_cut
```

---

### 5. CSV仕様とバリデーション

#### 5.1 CSV形式

**列定義:**
```csv
動画名,ランダム1,ランダム2,ランダム3,可変テキスト1内容,可変テキスト1フォント,可変テキスト1カラー,可変テキスト2内容,可変テキスト2フォント,可変テキスト2カラー,可変テキスト3内容,可変テキスト3フォント,可変テキスト3カラー
video_001,/Users/name/素材A,/Users/name/素材B,,商品A,Arial,#FF0000,¥1980,Helvetica,#000000,,,
video_002,/Users/name/素材A,,,商品B,Hiragino Sans,#0000FF,¥2980,Helvetica,#000000,在庫あり,Arial,#00FF00
```

**ルール:**
- 1行目: ヘッダー（必須）
- 2行目以降: 動画データ
- 空欄OK（デフォルト値を使用）
- エンコード: UTF-8

#### 5.2 バリデーション

```python
import pandas as pd
import os

def validate_csv(csv_path, timeline_data):
    """
    CSV読み込み前のバリデーション
    """
    errors = []
    
    # 1. CSVファイル存在確認
    if not os.path.exists(csv_path):
        return ["エラー: CSVファイルが存在しません"]
    
    # 2. CSV読み込み
    try:
        df = pd.read_csv(csv_path, encoding='utf-8')
    except Exception as e:
        return [f"エラー: CSVの読み込みに失敗しました - {str(e)}"]
    
    # 3. 必須列の確認
    required_cols = ['動画名']
    for col in required_cols:
        if col not in df.columns:
            errors.append(f"エラー: 必須列'{col}'がありません")
    
    # 4. 各行のバリデーション
    for idx, row in df.iterrows():
        row_num = idx + 2  # ヘッダー分+1
        
        # フォルダパスの確認
        for i in [1, 2, 3]:
            folder_col = f'ランダム{i}'
            if folder_col in df.columns and pd.notna(row[folder_col]):
                folder_path = row[folder_col]
                
                if not os.path.exists(folder_path):
                    errors.append(f"エラー: {row_num}行目の{folder_col}のパスが存在しません: {folder_path}")
                    continue
                
                # 動画数の確認
                required_count = calculate_required_videos(timeline_data, i)
                video_files = [f for f in os.listdir(folder_path) 
                              if f.lower().endswith(('.mp4', '.mov', '.avi'))]
                
                if len(video_files) < required_count:
                    errors.append(
                        f"エラー: {row_num}行目の{folder_col}のフォルダに動画が"
                        f"{len(video_files)}本しかありませんが、{required_count}カット必要です"
                    )
        
        # 可変テキストの確認
        for i in [1, 2, 3]:
            text_col = f'可変テキスト{i}内容'
            if text_col in df.columns and pd.isna(row[text_col]):
                # 可変テキストレイヤーがタイムラインに存在する場合は警告
                if has_variable_text_layer(timeline_data, i):
                    errors.append(f"警告: {row_num}行目の{text_col}が空欄です")
    
    return errors

def calculate_required_videos(timeline_data, layer_num):
    """
    タイムライン内の特定ランダムレイヤーに必要な動画数を計算
    """
    total_cuts = 0
    for layer in timeline_data['layers']:
        for clip in layer['clips']:
            if clip['type'] == f'random_layer_{layer_num}':
                total_cuts += clip['properties']['num_cuts']
    return total_cuts
```

#### 5.3 エラー表示

```javascript
// React側でのエラー表示
function CSVValidationDialog({ errors }) {
  return (
    <Dialog open={errors.length > 0}>
      <DialogTitle>CSV読み込みエラー</DialogTitle>
      <DialogContent>
        <Alert severity="error">
          以下のエラーを修正してください:
        </Alert>
        <List>
          {errors.map((error, idx) => (
            <ListItem key={idx}>
              <ListItemText primary={error} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

### 6. プロジェクト保存/読み込み

#### 6.1 プロジェクトファイル形式 (`.svgproj`)

```json
{
  "version": "1.0.0",
  "project_info": {
    "name": "商品紹介テンプレート",
    "created_at": "2024-12-06T10:30:00Z",
    "modified_at": "2024-12-06T15:45:00Z"
  },
  "settings": {
    "aspect_ratio": "9:16",
    "frame_rate": 30,
    "resolution": {
      "width": 1080,
      "height": 1920
    },
    "codec": "H.264",
    "output_folder": "/Users/name/outputs"
  },
  "timeline": {
    "duration_frames": 900,
    "layers": {
      "V2": {
        "clips": [
          {
            "clip_id": "uuid-1234",
            "type": "random_layer_1",
            "start_frame": 0,
            "duration_frames": 30,
            "properties": {
              "layer_number": 1,
              "folder_path": "",
              "extraction_mode": "random",
              "frames_per_cut": 2,
              "num_cuts": 15
            }
          }
        ]
      },
      "V1": {...},
      "S2": {...},
      "S1": {...}
    }
  }
}
```

#### 6.2 自動保存

```javascript
// Redux middleware for auto-save
const autoSaveMiddleware = store => next => action => {
  const result = next(action);
  
  // タイムライン変更を検知
  if (action.type.startsWith('timeline/')) {
    debounce(() => {
      const state = store.getState();
      saveProject(state.project.currentPath, state);
    }, 5000); // 5秒後に保存
  }
  
  return result;
};
```

---

### 7. 動画生成・書き出し

#### 7.1 生成フロー

```
[ユーザー] 
   ↓ 
[書き出しボタンクリック]
   ↓
[CSV選択]
   ↓
[バリデーション実行]
   ↓ (エラーがあれば中断)
[生成確認ダイアログ]
   ↓
[Python処理開始]
   ↓
[CSV各行をループ]
   ├─ ランダムレイヤー: 動画選択・フレーム抽出
   ├─ テキストレイヤー: テキスト生成
   ├─ 可変テキスト: CSV値で生成
   ├─ 調整レイヤー: エフェクト適用
   ├─ 音声: BGM/SE合成
   └─ 最終合成・エンコード
   ↓
[進捗をElectronに通知]
   ↓
[完了通知]
```

#### 7.2 Python生成エンジン

```python
# backend/modules/exporter.py

from moviepy.editor import *
import pandas as pd
import json

class VideoExporter:
    def __init__(self, timeline_data, settings):
        self.timeline = timeline_data
        self.settings = settings
        self.fps = settings['frame_rate']
        self.size = (settings['resolution']['width'], 
                     settings['resolution']['height'])
    
    def export_batch(self, csv_path, output_folder, progress_callback):
        """
        CSV一括生成
        """
        df = pd.read_csv(csv_path, encoding='utf-8')
        total = len(df)
        
        for idx, row in df.iterrows():
            try:
                # 進捗通知
                progress_callback({
                    'current': idx + 1,
                    'total': total,
                    'status': f"生成中: {row['動画名']}"
                })
                
                # 1本生成
                output_path = os.path.join(output_folder, f"{row['動画名']}.mp4")
                self.export_single(row, output_path)
                
            except Exception as e:
                progress_callback({
                    'current': idx + 1,
                    'total': total,
                    'status': f"エラー: {row['動画名']} - {str(e)}",
                    'error': True
                })
        
        progress_callback({
            'current': total,
            'total': total,
            'status': '完了',
            'completed': True
        })
    
    def export_single(self, csv_row, output_path):
        """
        1本の動画を生成
        """
        clips = []
        
        # 1. ビジュアルレイヤー処理
        for layer_id in ['V1', 'V2']:
            layer_clips = self.process_visual_layer(
                self.timeline['layers'][layer_id],
                csv_row
            )
            clips.extend(layer_clips)
        
        # 2. 合成
        if clips:
            final_video = CompositeVideoClip(clips, size=self.size)
        else:
            # 空の動画
            final_video = ColorClip(size=self.size, color=(0,0,0))
        
        final_video = final_video.set_duration(
            self.timeline['duration_frames'] / self.fps
        )
        
        # 3. 音声処理
        audio_clips = []
        for layer_id in ['S1', 'S2']:
            layer_audio = self.process_audio_layer(
                self.timeline['layers'][layer_id],
                csv_row
            )
            audio_clips.extend(layer_audio)
        
        if audio_clips:
            final_audio = CompositeAudioClip(audio_clips)
            final_video = final_video.set_audio(final_audio)
        
        # 4. 書き出し
        final_video.write_videofile(
            output_path,
            fps=self.fps,
            codec='libx264',
            audio_codec='aac',
            preset='medium',
            threads=4
        )
        
        # クリーンアップ
        final_video.close()
    
    def process_visual_layer(self, layer_data, csv_row):
        """
        ビジュアルレイヤーの処理
        """
        clips = []
        
        for clip_data in layer_data['clips']:
            if clip_data['type'].startswith('random_layer'):
                # ランダムレイヤー処理
                subclips = self.process_random_layer(clip_data, csv_row)
                clips.extend(subclips)
            
            elif clip_data['type'] == 'video':
                # 動画レイヤー
                video_clip = self.process_video_layer(clip_data)
                clips.append(video_clip)
            
            elif clip_data['type'] == 'text':
                # テキストレイヤー
                text_clip = self.process_text_layer(clip_data)
                clips.append(text_clip)
            
            elif clip_data['type'] == 'variable_text':
                # 可変テキストレイヤー
                var_text_clip = self.process_variable_text(clip_data, csv_row)
                clips.append(var_text_clip)
            
            elif clip_data['type'] == 'adjustment':
                # 調整レイヤー（最後に全体に適用）
                pass  # 後で処理
        
        return clips
    
    def process_random_layer(self, clip_data, csv_row):
        """
        ランダムレイヤーの処理
        """
        props = clip_data['properties']
        layer_num = props['layer_number']
        
        # CSVからフォルダパス取得
        folder_path = csv_row.get(f'ランダム{layer_num}', '')
        if not folder_path:
            return []
        
        # 動画をランダム選択
        videos = self.select_random_videos(folder_path, props['num_cuts'])
        
        # フレーム抽出
        subclips = []
        start_time = clip_data['start_frame'] / self.fps
        
        for video_path in videos:
            subclip = self.extract_frames(
                video_path,
                props['extraction_mode'],
                props['frames_per_cut']
            )
            subclip = subclip.set_start(start_time)
            subclips.append(subclip)
            
            start_time += (props['frames_per_cut'] / self.fps)
        
        return subclips
    
    # ... 他のprocess_XXX_layerメソッド
```

#### 7.3 進捗通知 (IPC)

**Python → Electron:**
```python
# backend/main.py
import sys
import json

def send_progress(data):
    """
    Electronに進捗を送信
    """
    print(json.dumps(data))
    sys.stdout.flush()

# 使用例
send_progress({
    'type': 'progress',
    'current': 5,
    'total': 32,
    'status': '生成中: video_005.mp4'
})
```

**Electron側の受信:**
```javascript
// frontend/src/main.js
const { spawn } = require('child_process');

function startExport(timelineData, csvPath, outputFolder) {
  const pythonProcess = spawn('python3', [
    'backend/main.py',
    '--export',
    '--timeline', JSON.stringify(timelineData),
    '--csv', csvPath,
    '--output', outputFolder
  ]);
  
  pythonProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const progress = JSON.parse(line);
          // Reactに進捗を送信
          mainWindow.webContents.send('export-progress', progress);
        } catch (e) {
          console.error('JSON parse error:', e);
        }
      }
    });
  });
  
  pythonProcess.on('close', (code) => {
    mainWindow.webContents.send('export-complete', { code });
  });
}
```

---

## 🔧 開発体制・ワークフロー

### チーム構成（Claude Code使用）

```
PM: Shoei
  │
  ├─ ターミナル1: コーダー（実装担当）
  │   役割: コード実装、Git操作
  │   責任範囲: 実装のみ（設計判断はしない）
  │
  ├─ ターミナル2: ディレクター（プロジェクト管理）
  │   役割: タスク分解、進行管理、コーダーへの指示
  │   責任範囲: 実装計画、進捗管理、課題整理
  │
  └─ ターミナル3: デザイナー兼コードレビュアー
      役割: UI/UX設計、コードレビュー、品質管理
      責任範囲: デザイン、コード品質
```

### コミュニケーションルール

1. **コーダー → ディレクター**
   - 作業完了報告
   - 技術的な懸念事項の報告
   - 見積もり時間の報告

2. **ディレクター → コーダー**
   - 具体的な実装指示
   - 優先順位の指定
   - 並列作業の指示

3. **ディレクター → PM (Shoei)**
   - 重要な設計判断
   - 仕様の不明点
   - 進捗報告

4. **デザイナー → 全員**
   - UIフィードバック
   - コードレビュー結果
   - 改善提案

---

## 🔀 Git運用ルール

### ブランチ戦略

```
main (本番)
  ↑
develop (開発)
  ↑
  ├─ feature/timeline-ui
  ├─ feature/random-layer
  ├─ feature/csv-handler
  └─ feature/export-engine
```

### コミットメッセージ規約

```
種類: 概要

詳細説明（必要に応じて）

例:
feat: タイムラインUIの基本実装
- レイヤー表示機能
- クリップドラッグ&ドロップ
- タイムコード表示

fix: ランダムレイヤーの重複バグ修正

refactor: 動画処理モジュールをクラス化
```

**種類:**
- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `docs`: ドキュメント
- `style`: コードスタイル
- `test`: テスト
- `chore`: ビルド・設定

### 作業フロー

```bash
# 1. feature ブランチ作成
git checkout -b feature/timeline-ui develop

# 2. 実装・コミット
git add .
git commit -m "feat: タイムライン基本UI実装"

# 3. developにマージ
git checkout develop
git merge feature/timeline-ui

# 4. ブランチ削除
git branch -d feature/timeline-ui
```

---

## 🚀 開発フェーズ

### Phase 1: 基盤構築（Week 1-2）

**ディレクターの指示例:**
```
【タスク1-1】プロジェクト初期化
コーダー1: Electronプロジェクトのセットアップ
- npm init
- Electron、React、Tailwindのインストール
- 基本フォルダ構造作成

サブエージェント（並列）: Pythonバックエンド初期化
- venv作成
- requirements.txt作成（MoviePy, pandas, FFmpeg）
- 基本モジュール構造作成

期待成果: 開発環境が整い、Hello Worldが動く状態
```

**成果物:**
- [ ] プロジェクト構造
- [ ] Electron起動確認
- [ ] Python-Electron IPC通信確認
- [ ] Git初期化・初回コミット

### Phase 2: タイムラインUI（Week 3-4）

**タスク分解:**
```
【並列作業可能】

コーダー1:
- タイムライン基本レイアウト
- レイヤー表示コンポーネント
- タイムコード表示

サブエージェント:
- クリップコンポーネント
- ドラッグ&ドロップ機能
- Redux state設計
```

**成果物:**
- [ ] タイムライン表示
- [ ] レイヤー（V1, V2, S1, S2）
- [ ] タイムコード
- [ ] 基本的なドラッグ&ドロップ

### Phase 3: ランダムレイヤー（Week 5-6）

**タスク分解:**
```
コーダー1: フロントエンド
- ランダムレイヤークリップUI
- プロパティパネル
- フォルダ選択ダイアログ

サブエージェント: バックエンド
- 動画リスト取得機能
- ランダム選択ロジック
- フレーム抽出機能（MoviePy）
```

**成果物:**
- [ ] ランダムレイヤー1, 2, 3
- [ ] フォルダ連携
- [ ] 重複なし選択機能
- [ ] ランダム/冒頭選択

### Phase 4: テキストレイヤー（Week 7）

**成果物:**
- [ ] 固定テキストレイヤー
- [ ] 可変テキストレイヤー（3枠）
- [ ] フォント・カラー設定
- [ ] プロパティパネル統合

### Phase 5: CSV連携（Week 8-9）

**成果物:**
- [ ] CSV読み込み機能
- [ ] バリデーション（日本語エラー）
- [ ] CSV-タイムライン連携
- [ ] テスト用CSVサンプル

### Phase 6: 動画生成エンジン（Week 10-12）

**タスク分解:**
```
コーダー1:
- 書き出しダイアログUI
- 進捗バー表示
- IPC通信（進捗受信）

サブエージェント:
- Python生成エンジン
- MoviePy統合
- FFmpegエンコード最適化
```

**成果物:**
- [ ] 1本生成機能
- [ ] CSV一括生成
- [ ] 進捗表示
- [ ] エラーハンドリング

### Phase 7: 音声・調整レイヤー（Week 13-14）

**成果物:**
- [ ] BGM/SEレイヤー
- [ ] 音量調整
- [ ] フェードイン/アウト
- [ ] 調整レイヤー（エフェクト）

### Phase 8: プロジェクト管理（Week 15）

**成果物:**
- [ ] 保存/読み込み
- [ ] 自動保存
- [ ] テンプレート機能

### Phase 9: ビルド・配布（Week 16-17）

**成果物:**
- [ ] electron-builderセットアップ
- [ ] DMGファイル生成
- [ ] アイコン・リソース統合
- [ ] 配布用パッケージ

### Phase 10: テスト・最適化（Week 18-20）

**成果物:**
- [ ] 統合テスト
- [ ] パフォーマンス最適化
- [ ] バグフィックス
- [ ] ドキュメント整備

---

## 📦 ビルド・配布

### electron-builder設定

```javascript
// electron-builder.json
{
  "appId": "com.shortvideo.generator",
  "productName": "ShortVideo Generator",
  "directories": {
    "output": "dist"
  },
  "files": [
    "frontend/build/**/*",
    "backend/**/*",
    "assets/**/*"
  ],
  "mac": {
    "category": "public.app-category.video",
    "icon": "assets/icons/icon.icns",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ],
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "entitlements.mac.plist"
  },
  "dmg": {
    "contents": [
      {
        "x": 130,
        "y": 220
      },
      {
        "x": 410,
        "y": 220,
        "type": "link",
        "path": "/Applications"
      }
    ],
    "window": {
      "width": 540,
      "height": 380
    }
  }
}
```

### ビルドコマンド

```bash
# 開発ビルド
npm run build:dev

# 本番ビルド（DMG生成）
npm run build:prod

# クリーン＆ビルド
npm run clean && npm run build:prod
```

### 公証（Notarization）準備

**必要な手順:**
1. Apple Developer Programに登録（¥13,000/年）
2. Developer ID Application証明書を取得
3. `notarytool`で公証申請
4. Staple（公証情報をDMGに埋め込み）

```bash
# 公証申請
xcrun notarytool submit ShortVideoGenerator.dmg \
  --apple-id "your@email.com" \
  --team-id "TEAM_ID" \
  --password "app-specific-password" \
  --wait

# Staple
xcrun stapler staple ShortVideoGenerator.dmg
```

---

## 🧪 テスト戦略

### 単体テスト（Python）

```python
# backend/tests/test_random_layer.py
import unittest
from modules.random_layer import RandomLayerProcessor

class TestRandomLayer(unittest.TestCase):
    def test_video_selection_no_duplicates(self):
        processor = RandomLayerProcessor()
        videos = processor.select_random_videos('/path/to/folder', 10)
        
        # 重複なし確認
        self.assertEqual(len(videos), len(set(videos)))
    
    def test_insufficient_videos_raises_error(self):
        processor = RandomLayerProcessor()
        
        with self.assertRaises(ValueError):
            processor.select_random_videos('/small/folder', 100)
```

### E2Eテスト（手動）

**チェックリスト:**
- [ ] プロジェクト作成 → 保存 → 読み込み
- [ ] タイムラインにクリップ追加 → カット → 移動
- [ ] CSV読み込み → バリデーション
- [ ] 動画生成（1本）
- [ ] 動画生成（10本）
- [ ] エラーケース（フォルダなし、動画不足）

---

## 📚 ドキュメント

### README.md（ユーザー向け）

```markdown
# ShortVideo Generator

SNSショート動画を効率的に大量生成するアプリケーション

## インストール

1. DMGファイルをダウンロード
2. ShortVideoGenerator.appをApplicationsフォルダにドラッグ
3. 初回起動時、右クリック→「開く」

## 基本的な使い方

1. 新規プロジェクト作成
2. タイムラインで動画テンプレートを作成
3. CSVで可変要素を定義
4. 書き出しで一括生成

詳細は[ユーザーガイド](docs/user_guide.md)を参照
```

### CONTRIBUTING.md（開発者向け）

```markdown
# 開発ガイド

## セットアップ

```bash
# リポジトリクローン
git clone https://github.com/your-repo/shortvideo-generator.git
cd shortvideo-generator

# 依存関係インストール
npm install
cd backend && pip install -r requirements.txt

# 開発サーバー起動
npm run dev
```

## ブランチ戦略

- `main`: 本番
- `develop`: 開発
- `feature/*`: 機能開発

詳細は仕様書を参照
```

---

## 🔒 セキュリティ

### ファイルアクセス制限

```javascript
// preload.js - サンドボックス化
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 許可された操作のみ公開
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  loadCSV: (path) => ipcRenderer.invoke('load-csv', path),
  exportVideo: (data) => ipcRenderer.invoke('export-video', data),
  
  // ファイルシステムへの直接アクセスは禁止
});
```

### CSVインジェクション対策

```python
# CSV読み込み時にサニタイズ
def sanitize_csv_value(value):
    if isinstance(value, str):
        # 式の実行を防ぐ
        if value.startswith(('=', '+', '-', '@')):
            return "'" + value
    return value
```

---

## 🎯 パフォーマンス最適化

### 動画処理の並列化

```python
from concurrent.futures import ProcessPoolExecutor

def export_batch_parallel(csv_path, output_folder, max_workers=4):
    """
    並列処理で高速化
    """
    df = pd.read_csv(csv_path)
    
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for idx, row in df.iterrows():
            future = executor.submit(export_single, row, output_folder)
            futures.append(future)
        
        for future in futures:
            result = future.result()
```

### Reactパフォーマンス

```javascript
// メモ化でレンダリング最適化
import { memo } from 'react';

const Clip = memo(({ clip, onDrag }) => {
  return <div>{/* ... */}</div>;
}, (prevProps, nextProps) => {
  // clipが変わった時だけ再レンダリング
  return prevProps.clip.clip_id === nextProps.clip.clip_id &&
         prevProps.clip.start_frame === nextProps.clip.start_frame;
});
```

---

## 🐛 既知の制限事項

1. **Mac専用**: Windows/Linux未対応（将来対応予定）
2. **動画形式**: MP4, MOV, AVI のみサポート
3. **メモリ**: 大量生成時（100本以上）はメモリ不足の可能性
4. **FFmpeg**: 別途インストール必要（将来的にバンドル予定）

---

## 📞 サポート・フィードバック

**PM: Shoei**
- 仕様の不明点
- 機能リクエスト
- バグ報告

プロジェクト進行中は、ディレクター（ターミナル2）を通じてPMに確認してください。

---

## 📄 ライセンス

MIT License (仮)

---

## 🗓️ リリーススケジュール

- **v0.1.0 (Alpha)**: Phase 1-6完了（基本機能）- Week 12
- **v0.5.0 (Beta)**: Phase 1-8完了（全機能）- Week 15
- **v1.0.0 (Release)**: Phase 1-10完了（配布可能）- Week 20

---

## 付録

### A. 技術用語集

| 用語 | 説明 |
|------|------|
| Electron | デスクトップアプリを作るための枠組み（HTML/JS使用） |
| React | UIを作るためのライブラリ |
| MoviePy | Pythonで動画編集するツール |
| FFmpeg | 動画処理の基盤エンジン |
| IPC | ElectronとPythonが通信する仕組み |
| Redux | アプリの状態を管理する仕組み |

### B. ショートカットキー一覧

| 操作 | Mac |
|------|-----|
| 新規プロジェクト | ⌘N |
| プロジェクトを開く | ⌘O |
| 保存 | ⌘S |
| カット | C |
| 再生/停止 | Space |
| 削除 | Delete |

### C. トラブルシューティング

**Q: Pythonが見つからない**
A: ターミナルで`which python3`を実行し、パスを確認

**Q: FFmpegエラー**
A: `brew install ffmpeg`でインストール

**Q: 動画生成が遅い**
A: 解像度を下げるか、並列処理を有効化

---

**以上、ShortVideo Generator 完全仕様書**

バージョン: 1.0.0  
最終更新: 2024-12-06  
作成者: PM Shoei
