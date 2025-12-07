# CSV一括動画生成機能 実装ドキュメント

## 概要

CSVファイルを使用して複数の動画を一括生成する機能を実装しました。
CSVの各行に動画のパラメータ（可変テキスト、ランダムフォルダなど）を指定し、自動的に複数の動画を生成できます。

## 実装内容

### 1. バックエンド (Python)

#### csv_handler.py (新規作成)
**場所**: `/Users/shoeigoto/Desktop/clip-composer/backend/modules/csv_handler.py`

**機能**:
- CSVファイルの読み込みとバリデーション
- 各行のデータをタイムラインデータに適用
- ランダムフォルダからファイルを選択
- バッチ処理の進捗管理
- エラーハンドリング（エラー時は該当行をスキップして継続）

**主要メソッド**:
- `load_csv(csv_path)`: CSVファイルを読み込み
- `validate_row(row_data)`: 行データのバリデーション
- `parse_row_to_overrides(row_data)`: CSV行データをタイムライン上書きデータに変換
- `process_batch(...)`: CSV全行を一括処理して動画を生成

#### ipc_handler.py (更新)
**場所**: `/Users/shoeigoto/Desktop/clip-composer/backend/ipc_handler.py`

**追加内容**:
- `render_batch` コマンドハンドラーを追加
- CSV一括レンダリングの進捗通知
- 行単位の成功/失敗の通知

### 2. フロントエンド (React/Redux)

#### exportSlice.js (更新)
**場所**: `/Users/shoeigoto/Desktop/clip-composer/frontend/src/renderer/store/exportSlice.js`

**追加内容**:
- CSV一括書き出し用のstate（`exportMode`, `csvPath`, `batchProgress`）
- 新しいactions:
  - `setExportMode`: 書き出しモード切り替え（single/batch）
  - `setCsvPath`: CSVパス設定
  - `startBatchExport`: CSV一括書き出し開始
  - `updateBatchProgress`: バッチ処理進捗更新
  - `addBatchError`: エラー追加
  - `incrementBatchSuccess`: 成功カウント増加
  - `batchExportComplete`: バッチ処理完了

#### ExportDialog.jsx (更新)
**場所**: `/Users/shoeigoto/Desktop/clip-composer/frontend/src/renderer/components/ExportDialog/ExportDialog.jsx`

**追加内容**:
- 書き出しモード選択UI（単発/CSV一括）
- CSVファイル選択ボタン
- 出力先フォルダ選択（CSV一括の場合）
- バッチ処理の進捗表示:
  - 現在X/全Y本
  - 成功件数/失敗件数
  - エラー詳細リスト
- `handleBatchExport()`: CSV一括書き出し処理

### 3. Electron IPC (更新)

#### preload.cjs (更新)
**場所**: `/Users/shoeigoto/Desktop/clip-composer/frontend/src/preload.cjs`

**追加内容**:
- `python.renderBatch()`: CSV一括レンダリングAPI
- `selectDirectory()`: ディレクトリ選択API
- `openFile()`: ファイル開くAPI

#### main.cjs (更新)
**場所**: `/Users/shoeigoto/Desktop/clip-composer/frontend/src/main.cjs`

**追加内容**:
- `select-directory` ハンドラー: ディレクトリ選択ダイアログ
- `open-file` ハンドラー: ファイル開くダイアログ

## CSVファイル形式

### ヘッダー行

```csv
動画名,ランダム1,ランダム2,ランダム3,可変テキスト1内容,可変テキスト1フォント,可変テキスト1カラー,可変テキスト2内容,...
```

### 必須カラム
- **動画名**: 出力される動画ファイルの名前（拡張子なし）

### オプションカラム

#### ランダムフォルダ（ランダム1〜3）
- フォルダパスを指定すると、そのフォルダ内からランダムにファイルを選択
- 動画または画像ファイルに対応
- 空欄の場合はスキップ

#### 可変テキスト（可変テキスト1〜9）
各テキストに対して以下の3つのカラムを指定可能:
- **可変テキストN内容**: テキストの内容
- **可変テキストNフォント**: フォント名（例: Arial, Hiragino Sans）
- **可変テキストNカラー**: カラーコード（例: #FF0000）または色名（red, blue, etc）

### サンプルCSV

```csv
動画名,ランダム1,ランダム2,ランダム3,可変テキスト1内容,可変テキスト1フォント,可変テキスト1カラー
video_001,/path/to/folderA,,,商品A,Arial,#FF0000
video_002,/path/to/folderB,,,商品B,Hiragino Sans,#0000FF
video_003,,,,"商品C - 特別版",Arial,#00FF00
```

## 使用方法

### 1. エクスポートダイアログを開く

メニューまたはショートカットでエクスポートダイアログを開きます。

### 2. CSV一括書き出しを選択

「書き出しモード」で「CSV一括書き出し」を選択します。

### 3. CSVファイルを選択

「CSVファイル」の「参照」ボタンをクリックし、準備したCSVファイルを選択します。

### 4. 出力先フォルダを選択

「出力先フォルダ」の「参照」ボタンをクリックし、動画を保存するフォルダを選択します。

### 5. その他の設定

解像度、フレームレート、品質などを設定します。

### 6. エクスポート開始

「エクスポート」ボタンをクリックして一括生成を開始します。

### 7. 進捗確認

進捗画面で以下の情報を確認できます:
- 現在の処理状況（X/Y本）
- 成功件数
- 失敗件数
- エラー詳細（失敗した場合）

## タイムラインデータとの連携

CSVのデータをタイムラインデータに適用するには、タイムラインのクリップに識別子を設定する必要があります:

### ランダムフォルダの適用

ビデオまたは画像クリップに `randomId` プロパティを設定:

```javascript
{
  type: 'video',
  randomId: 'random_folder_1',  // CSV の「ランダム1」に対応
  filePath: '/default/path.mp4',
  // ...
}
```

### 可変テキストの適用

テキストクリップに `variableId` プロパティを設定:

```javascript
{
  type: 'text',
  variableId: 'variable_text_1',  // CSV の「可変テキスト1〜」に対応
  text: 'デフォルトテキスト',
  font: 'Arial',
  color: '#FFFFFF',
  // ...
}
```

## エラーハンドリング

### バリデーション

以下の場合はその行をスキップして処理を継続:
- 動画名が空
- ランダムフォルダのパスが存在しない
- カラーコードの形式が不正

### 処理中のエラー

動画生成中にエラーが発生した場合:
- エラーを記録
- その行をスキップ
- 次の行の処理を継続

### 完了時の表示

処理完了時に以下の情報を表示:
- 成功件数
- 失敗件数
- エラーの詳細リスト（行番号、動画名、エラーメッセージ）

## 技術的な詳細

### CSV読み込み

- エンコーディング: UTF-8 (BOM付きにも対応)
- Pythonの `csv.DictReader` を使用
- ヘッダー行は必須

### ファイル選択

ランダムフォルダから選択される拡張子:
- **動画**: .mp4, .mov, .avi, .mkv, .webm
- **画像**: .jpg, .jpeg, .png, .gif, .bmp, .webp

### 進捗通知

IPC経由で以下の情報を送信:
- 全体の進捗（パーセンテージ）
- 現在処理中の動画名
- 成功/失敗の通知（行単位）

### パフォーマンス

- 各動画は順次処理（並列処理ではない）
- 長時間のレンダリングでもタイムアウトしない設定
- メモリ効率化のため、各動画完了後にリソースを解放

## 今後の拡張案

1. **並列処理**: 複数の動画を同時にレンダリング
2. **プレビュー機能**: CSV読み込み後に生成される動画のプレビュー
3. **テンプレート機能**: よく使うCSV形式をテンプレートとして保存
4. **Excel対応**: .xlsxファイルからの読み込み
5. **進捗エクスポート**: 処理結果をCSVやJSONでエクスポート
6. **再試行機能**: 失敗した行のみを再処理

## トラブルシューティング

### CSVファイルが読み込めない

- 文字エンコーディングがUTF-8であることを確認
- ヘッダー行が正しく設定されているか確認
- カンマ区切りになっているか確認

### 動画が生成されない

- ランダムフォルダのパスが正しいか確認
- 出力先フォルダに書き込み権限があるか確認
- Pythonバックエンドが正常に起動しているか確認

### 進捗が表示されない

- Electron-Python間のIPC通信を確認
- ブラウザの開発者ツールでエラーログを確認

## ファイル一覧

### 新規作成
- `/Users/shoeigoto/Desktop/clip-composer/backend/modules/csv_handler.py`
- `/Users/shoeigoto/Desktop/clip-composer/sample_batch.csv`
- `/Users/shoeigoto/Desktop/clip-composer/CSV_BATCH_EXPORT.md`

### 更新
- `/Users/shoeigoto/Desktop/clip-composer/backend/ipc_handler.py`
- `/Users/shoeigoto/Desktop/clip-composer/frontend/src/renderer/store/exportSlice.js`
- `/Users/shoeigoto/Desktop/clip-composer/frontend/src/renderer/components/ExportDialog/ExportDialog.jsx`
- `/Users/shoeigoto/Desktop/clip-composer/frontend/src/preload.cjs`
- `/Users/shoeigoto/Desktop/clip-composer/frontend/src/main.cjs`

## まとめ

CSV一括動画生成機能により、以下が実現できるようになりました:

1. CSVファイルから複数の動画パラメータを読み込み
2. 可変テキストとランダムフォルダの自動適用
3. バッチ処理の進捗表示と成功/失敗の管理
4. エラー時のスキップと継続処理
5. 日本語UIの維持

これにより、大量の類似動画を効率的に生成できるようになりました。
