# コーダー向けクイックスタートガイド

## 👨‍💻 役割と責任

あなたはターミナル1のコーダーです。

### あなたの責任
✅ ディレクターからの指示に従って実装する
✅ コードを書く、テストする、コミットする
✅ 進捗と問題を報告する
✅ 品質の高いコードを書く

### あなたの責任ではないこと
❌ 設計判断をする（ディレクターに相談）
❌ タスクの優先順位を決める（ディレクターが決定）
❌ 仕様を解釈する（不明点はディレクターに確認）

---

## 🚀 初日にやること

### 1. 環境確認

```bash
# Node.js確認
node --version  # v18以上必要

# Python確認
python3 --version  # 3.11以上推奨

# Git確認
git --version

# FFmpeg確認（後で必要）
ffmpeg -version  # なければ brew install ffmpeg
```

### 2. プロジェクトクローン

```bash
# リポジトリクローン（ディレクターから指示されたら）
git clone [リポジトリURL]
cd shortvideo-generator

# developブランチに切り替え
git checkout develop
```

### 3. 依存関係インストール

```bash
# Node.js依存関係
npm install

# Python依存関係
cd backend
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
cd ..
```

### 4. 動作確認

```bash
# Electron起動
npm start

# Pythonテスト
python backend/main.py --test
```

---

## 📋 日常の作業フロー

### 朝のルーティン

```bash
# 1. 最新のdevelopを取得
git checkout develop
git pull origin develop

# 2. 今日のタスクを確認
# （ディレクターからの指示を確認）

# 3. feature ブランチ作成
git checkout -b feature/timeline-ui
```

### 実装中

```bash
# 1. コーディング
# エディタでコードを書く

# 2. こまめに保存・確認
npm start  # フロントエンド確認

# 3. 動作確認できたらコミット
git add .
git commit -m "feat: タイムライン基本表示実装"

# 頻繁にコミット（30分〜1時間ごと）
```

### タスク完了時

```bash
# 1. 最終確認
npm start  # 動作確認
npm run lint  # コード品質確認（あれば）

# 2. developにマージ
git checkout develop
git merge feature/timeline-ui

# 3. ブランチ削除
git branch -d feature/timeline-ui

# 4. ディレクターに報告
# 完了報告フォーマットに従って報告
```

---

## 💻 コーディング規約

### JavaScript/React

```javascript
// ✅ Good
import React from 'react';

function Timeline({ layers, currentFrame }) {
  // コンポーネント名はPascalCase
  // 関数はcamelCase
  
  const handleClipClick = (clipId) => {
    // イベントハンドラは handle から始める
  };
  
  return (
    <div className="timeline">
      {/* Tailwindクラスを使用 */}
    </div>
  );
}

export default Timeline;

// ❌ Bad
function timeline() {  // 小文字はNG
  var x = 1;  // varではなくconstまたはlet
}
```

### Python

```python
# ✅ Good
class VideoProcessor:
    """動画処理クラス"""
    
    def __init__(self, settings):
        self.settings = settings
    
    def process_video(self, input_path):
        """動画を処理する
        
        Args:
            input_path (str): 入力動画パス
            
        Returns:
            str: 出力動画パス
        """
        # 処理内容
        return output_path

# ❌ Bad
class videoprocessor:  # クラス名はPascalCase
    def Process(self):  # メソッド名はsnake_case
        pass
```

### コミットメッセージ

```bash
# ✅ Good
git commit -m "feat: ランダムレイヤーUIを追加"
git commit -m "fix: タイムコード表示のバグ修正"
git commit -m "refactor: Redux stateの構造を改善"

# ❌ Bad
git commit -m "update"  # 何を更新したか不明
git commit -m "いろいろ修正"  # 具体性がない
```

**種類:**
- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `docs`: ドキュメント
- `style`: コードスタイル
- `test`: テスト
- `chore`: ビルド・設定

---

## 🔍 よくある質問

### Q1: 実装方法がわからない

```
❌ 勝手に判断して実装する

✅ ディレクターに質問する
「タスク2-1のXXXの部分ですが、AとBどちらの方法で実装すべきですか？」
```

### Q2: 仕様が不明確

```
❌ 自分で解釈して進める

✅ ディレクターに確認依頼
「仕様書のセクション3.2について、XXXの場合はどうなりますか？PM確認が必要でしょうか？」
```

### Q3: エラーが解決できない

```
❌ 何時間も悩み続ける

✅ 1時間試してダメならディレクターに報告
「XXXのエラーが出ています。以下を試しましたが解決しません：
1. 試したこと1
2. 試したこと2
エラーログ: [ログ貼り付け]」
```

### Q4: 見積もり時間を超えそう

```
❌ 黙って作業を続ける

✅ 早めにディレクターに報告
「タスク2-1ですが、想定より複雑で見積もり3時間のところ、現在5時間経過しています。
完了にはあと2時間かかりそうです。」
```

---

## 🛠️ 便利なコマンド集

### Git

```bash
# ブランチ一覧
git branch

# 変更状態確認
git status

# 変更差分確認
git diff

# コミット履歴
git log --oneline

# 直前のコミットを修正
git commit --amend

# ブランチ名変更
git branch -m old-name new-name

# 変更を一時退避
git stash
git stash pop  # 戻す
```

### npm

```bash
# 開発サーバー起動
npm start

# ビルド
npm run build

# 依存関係追加
npm install パッケージ名

# 依存関係削除
npm uninstall パッケージ名
```

### Python

```bash
# 仮想環境有効化
source backend/venv/bin/activate  # Mac/Linux
backend\venv\Scripts\activate  # Windows

# 仮想環境無効化
deactivate

# パッケージ追加
pip install パッケージ名
pip freeze > requirements.txt  # 記録

# スクリプト実行
python backend/main.py --test
```

---

## 📊 進捗報告フォーマット

### 毎日の報告（ディレクターへ）

```
【日報 YYYY-MM-DD】

■ 完了したタスク
- タスク2-1: タイムライン基本UI（100%）
  - 成果物: frontend/src/components/Timeline/
  - コミット: abc1234

■ 進行中のタスク
- タスク2-2: クリップコンポーネント（60%）
  - 予定: 明日午前中に完了予定

■ 問題・ブロッカー
- なし / あれば具体的に記載

■ 明日の予定
- タスク2-2完了
- タスク2-3開始
```

### タスク完了報告

```
【タスク完了報告】

タスクID: 2-1
タスク名: タイムライン基本UI実装

成果物:
- frontend/src/components/Timeline/Timeline.jsx
- frontend/src/components/Timeline/Layer.jsx
- frontend/src/store/timelineSlice.js

動作確認:
✅ タイムライン表示
✅ 4つのレイヤー表示
✅ タイムコード表示
[スクリーンショット添付]

所要時間: 3.5時間（見積もり3時間）

問題:
- 特になし

Git:
- ブランチ: feature/timeline-ui
- コミット: abc1234
- developにマージ済み

次のタスクへの引き継ぎ:
- Redux stateの構造はtimelineSlice.jsを参照
```

---

## 🎨 デザイン基準

### カラー（Tailwind）

```javascript
// ダークテーマ
bg-[#1e1e1e]      // 背景（メイン）
bg-[#2d2d2d]      // 背景（セカンダリ）
bg-[#252525]      // タイムライン背景

text-[#e0e0e0]    // テキスト（メイン）
text-[#a0a0a0]    // テキスト（セカンダリ）

border-[#3e3e3e]  // ボーダー

// アクセントカラー
bg-[#007acc]      // 青（メインアクション）
bg-[#4ec9b0]      // 緑（成功）
bg-[#f48771]      // 赤（エラー）
```

### スペーシング

```javascript
p-4    // パディング 1rem (16px)
m-2    // マージン 0.5rem (8px)
gap-4  // 要素間の隙間 1rem

// 統一性のため、2の倍数を使用（2, 4, 6, 8...）
```

### タイポグラフィ

```javascript
text-sm   // 12px (小さいテキスト)
text-base // 16px (通常)
text-lg   // 18px (見出し)
text-xl   // 20px (大きな見出し)

font-normal  // 通常
font-semibold // 太字
```

---

## 🐛 デバッグTips

### Reactデバッグ

```javascript
// console.log よりも useEffect で確認
useEffect(() => {
  console.log('State changed:', state);
}, [state]);

// React DevTools を活用
// Chrome拡張: React Developer Tools
```

### Pythonデバッグ

```python
# print デバッグ
print(f"DEBUG: variable = {variable}")

# エラー詳細を確認
try:
    # 処理
except Exception as e:
    import traceback
    traceback.print_exc()
```

### IPC通信デバッグ

```javascript
// Electron側
ipcMain.handle('test', (event, data) => {
  console.log('Received:', data);
  return { result: 'ok' };
});

// React側
const result = await window.api.test({ foo: 'bar' });
console.log('Result:', result);
```

---

## ⚠️ やってはいけないこと

### ❌ 絶対NG

1. **mainブランチに直接コミット**
   ```bash
   # これはNG
   git checkout main
   git commit -m "fix"
   ```

2. **force push**
   ```bash
   # これはNG（共有ブランチでは絶対ダメ）
   git push -f origin develop
   ```

3. **大きなファイルをコミット**
   - 動画ファイル、ビルド成果物はNG
   - .gitignoreに追加されているか確認

4. **個人情報をコミット**
   - APIキー、パスワードは絶対にNG
   - 環境変数（.env）で管理

5. **勝手に依存関係を追加**
   - 必ずディレクターに確認

---

## 📚 参考リンク

### ドキュメント
- [仕様書](./ShortVideoGenerator_Specification.md)
- [ディレクター指示テンプレート](./Director_Instructions_Template.md)

### 技術
- [React公式](https://react.dev)
- [Electron公式](https://www.electronjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [MoviePy](https://zulko.github.io/moviepy/)

### Git
- [Git基本コマンド](https://git-scm.com/docs)
- [コミットメッセージ規約](https://www.conventionalcommits.org/)

---

## 🎯 成功のためのマインドセット

1. **わからないことは聞く**
   - 1時間悩んだらディレクターに相談
   - 質問は恥ずかしくない、むしろ重要

2. **こまめにコミット**
   - 30分〜1時間ごとにコミット
   - 小さく頻繁に

3. **動作確認を怠らない**
   - 書いたら必ず動かす
   - 思い込みで進めない

4. **報告・連絡・相談**
   - 進捗は毎日報告
   - 問題は早めに報告
   - 判断に迷ったら相談

5. **品質を大切に**
   - 動けばいいではなく、綺麗なコードを
   - 後で読む人（未来の自分含む）のために

---

## 🎉 準備完了！

このガイドを手元に置いて、ディレクターからの最初のタスクを待ちましょう。

わからないことがあれば、いつでもディレクターに質問してください！

Let's build an amazing app! 🚀
