# ShortVideo Generator - プロジェクト開始ガイド

## 📚 ドキュメント一覧

このプロジェクトには以下のドキュメントが用意されています：

### 1. [完全仕様書](./ShortVideoGenerator_Specification.md) ⭐️最重要
**全員必読！**
- プロジェクト概要
- 技術スタック
- 詳細な機能仕様
- アーキテクチャ設計
- 開発フェーズ
- ビルド・配布方法

### 2. [ディレクター指示テンプレート](./Director_Instructions_Template.md)
**ターミナル2（ディレクター）向け**
- タスク指示の出し方
- 並列作業の判断基準
- 進捗報告フォーマット
- PMへのエスカレーション

### 3. [コーダークイックスタートガイド](./Coder_Quick_Start_Guide.md)
**ターミナル1（コーダー）向け**
- 環境セットアップ
- 日常の作業フロー
- コーディング規約
- Git運用ルール
- よくある質問

### 4. [デザイナー兼コードレビュアーガイド](./Designer_Code_Reviewer_Guide.md)
**ターミナル3（デザイナー/レビュアー）向け**
- UI/UXデザイン原則
- デザインシステム
- コードレビュー観点
- アクセシビリティ基準

---

## 🚀 Claude Codeでの開発開始方法

### 前提条件

Claude Codeを3つのターミナルで起動してください：

```
ターミナル1: コーダー（実装担当）
ターミナル2: ディレクター（プロジェクト管理）
ターミナル3: デザイナー兼コードレビュアー
```

---

## 🎬 開発開始手順

### Step 1: ディレクター（ターミナル2）の初期化

```markdown
【ターミナル2への指示】

あなたはディレクターです。

役割:
- プロジェクト全体の進行管理
- コーダー（ターミナル1）への具体的な指示
- デザイナー（ターミナル3）との調整
- PM Shoeiへの報告・相談

最初にやること:
1. 以下の仕様書を読み込んでください:
   - ShortVideoGenerator_Specification.md
   - Director_Instructions_Template.md

2. Phase 1（基盤構築）のタスク分解を開始してください

3. コーダーへの最初の指示を準備してください

PM Shoeiに確認したいことがあれば、まず私に報告してください。
```

### Step 2: コーダー（ターミナル1）の初期化

```markdown
【ターミナル1への指示】

あなたはコーダーです。

役割:
- ディレクターからの指示に従って実装
- コードを書く、テストする、コミットする
- 進捗と問題を報告する

最初にやること:
1. 以下のガイドを読み込んでください:
   - ShortVideoGenerator_Specification.md（全体像把握）
   - Coder_Quick_Start_Guide.md（作業方法）

2. 環境確認を実施してください:
   - Node.js, Python, Git, FFmpegのバージョン確認
   - 結果をディレクターに報告

3. ディレクターからの指示を待機してください

わからないことは遠慮なくディレクターに質問してください。
```

### Step 3: デザイナー（ターミナル3）の初期化

```markdown
【ターミナル3への指示】

あなたはデザイナー兼コードレビュアーです。

役割:
- UI/UXデザインの設計と改善提案
- コードレビューによる品質管理
- デザインガイドラインの維持

最初にやること:
1. 以下のガイドを読み込んでください:
   - ShortVideoGenerator_Specification.md（UI/UX設計部分）
   - Designer_Code_Reviewer_Guide.md（デザイン基準）

2. デザインシステムを理解してください:
   - カラーパレット
   - タイポグラフィ
   - スペーシング

3. コードレビュー依頼を待機してください

UIに関する提案があれば、いつでもディレクターに共有してください。
```

---

## 🎯 Phase 1の開始（例）

### ディレクターからコーダーへの最初の指示

```markdown
【タスク1-1】プロジェクト初期化
担当: コーダー1
優先度: 高
依存タスク: なし

目的:
- Electron + Reactの開発環境を構築する
- 基本フォルダ構造を作成する

具体的な作業内容:
1. プロジェクトフォルダ作成
   mkdir shortvideo-generator
   cd shortvideo-generator

2. package.json初期化
   npm init -y

3. 必要なパッケージインストール
   npm install electron@28 react@18 react-dom@18
   npm install -D @vitejs/plugin-react vite electron-builder
   npm install tailwindcss@3 react-redux@8 @reduxjs/toolkit
   npm install react-dnd react-dnd-html5-backend

4. フォルダ構造作成
   - frontend/src/
   - frontend/public/
   - backend/
   - assets/
   - docs/

5. 基本ファイル作成
   - frontend/src/main.js (Electronメインプロセス)
   - frontend/src/preload.js
   - frontend/src/renderer/App.jsx
   - frontend/src/renderer/index.jsx

期待成果:
- package.jsonが存在する
- フォルダ構造が完成している
- npm installが成功する
- Hello Worldが表示される（npm startで起動）

確認方法:
1. npm startを実行
2. Electronウィンドウが開く
3. "Hello World"が表示される

見積もり時間: 1時間

完了したら、成果物のスクリーンショットと共に報告してください。

---

並列で以下のタスクをサブエージェントに依頼してください:

【タスク1-2】Pythonバックエンド環境構築
（詳細は Director_Instructions_Template.md を参照）
```

---

## ✅ チェックリスト

### プロジェクト開始前

- [ ] Claude Codeで3つのターミナルを起動
- [ ] 各ターミナルにドキュメントを読み込ませる
- [ ] 各自の役割を理解する
- [ ] 環境確認を実施（Node.js, Python, Git, FFmpeg）

### Phase 1開始前

- [ ] ディレクターがPhase 1のタスク分解を完了
- [ ] コーダーが最初のタスクを受け取る
- [ ] デザイナーがデザインシステムを理解
- [ ] Git初期化の準備完了

### 毎日の終わりに

- [ ] コーダーが進捗報告（日報）
- [ ] ディレクターがPMに週次報告（金曜日）
- [ ] デザイナーがレビュー完了報告

---

## 🔄 開発サイクル

```
1. ディレクターがタスクを定義
   ↓
2. コーダーが実装
   ↓
3. コーダーがコミット
   ↓
4. ディレクターがデザイナーにレビュー依頼
   ↓
5. デザイナーがコードレビュー
   ↓
6. 修正があればコーダーが対応
   ↓
7. 承認後、developにマージ
   ↓
8. 次のタスクへ
```

---

## 🚨 重要な注意事項

### コーダー
- **勝手に設計判断しない** → ディレクターに相談
- **1時間以上悩まない** → すぐに報告
- **こまめにコミット** → 30分〜1時間ごと

### ディレクター
- **明確な指示を出す** → 曖昧な指示はNG
- **並列作業を活用** → 効率化を図る
- **PM確認が必要か判断** → 重要な決定は必ずPMに

### デザイナー
- **建設的なフィードバック** → 具体的かつ丁寧に
- **ガイドライン準拠を確認** → 一貫性を保つ
- **アクセシビリティを重視** → すべてのユーザーのために

---

## 📞 PM Shoeiへの連絡

以下の場合、ディレクター経由でPM Shoeiに確認してください：

### 即座に確認が必要
- 仕様の解釈が不明確
- 技術的に実現困難な要求
- セキュリティ/パフォーマンスに影響
- スケジュールに大きな影響

### 週次報告で共有
- 進捗報告
- 完了したタスク
- 次週の計画
- リスクや課題

---

## 🎓 成功のポイント

1. **コミュニケーション**
   - 報告・連絡・相談を徹底
   - 不明点は早めに確認
   - チーム間の情報共有

2. **品質第一**
   - 動けばいいではなく、綺麗なコードを
   - デザインガイドライン準拠
   - テストを怠らない

3. **効率的な進行**
   - 並列作業を活用
   - ブロッカーの早期解決
   - 定期的な振り返り

4. **継続的改善**
   - レビューからの学び
   - プロセスの改善提案
   - ドキュメントの更新

---

## 📁 ファイル構成（予定）

```
shortvideo-generator/
├── README.md                          ← 本ファイル
├── package.json
├── electron.config.js
│
├── frontend/
│   ├── src/
│   │   ├── main.js
│   │   ├── preload.js
│   │   └── renderer/
│   │       ├── App.jsx
│   │       ├── components/
│   │       ├── store/
│   │       └── styles/
│   └── public/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── modules/
│   └── utils/
│
├── assets/
│   ├── icons/
│   └── templates/
│
└── docs/
    ├── ShortVideoGenerator_Specification.md
    ├── Director_Instructions_Template.md
    ├── Coder_Quick_Start_Guide.md
    └── Designer_Code_Reviewer_Guide.md
```

---

## 🎉 準備完了！

すべてのドキュメントを確認したら、開発を開始できます。

**まず、ディレクター（ターミナル2）から動き始めてください。**

Let's build something amazing! 🚀

---

## 📝 バージョン履歴

- v1.0.0 (2024-12-06): 初版作成
  - 完全仕様書
  - 3つのガイドライン
  - プロジェクト開始手順

---

**質問や不明点があれば、いつでもPM Shoeiに確認してください！**
