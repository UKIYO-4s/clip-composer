# Clip Composer 引き継ぎ書

最終更新: 2025-12-08

---

## プロジェクト概要

**Clip Composer** - ショート動画作成デスクトップアプリケーション

- **フロントエンド:** Electron + React + Vite + TailwindCSS
- **バックエンド:** Python (MoviePy)
- **状態管理:** Redux Toolkit
- **D&D:** react-dnd

---

## チーム編成と役割

| 役割 | 担当 | 責務 |
|------|------|------|
| **Director** | Claude (Terminal 2) | 機能設計、指示書作成、タスク分割、進捗管理 |
| **Coder** | Claude (Terminal 1) | 実装、コード修正、Gitコミット |
| **Designer / Code Reviewer** | Claude (Terminal 3) | コードレビュー、原因調査、設計レビュー |

### 作業フロー

1. Director が機能要件を整理し、指示書を作成
2. タスクを分割し、並行実行可能なものはサブエージェントに分配
3. Coder が実装
4. 問題発生時は Designer/Code Reviewer が調査
5. 完了後、ユーザーが動作確認
6. OK なら Git コミット

---

## 完了済み機能（本日）

### タイムライン機能
- [x] レイヤー番号表示修正（Video: 下→上で増加、Sound: 上→下で増加）
- [x] 再生バー操作制限（ルーラー部分のみ操作可能）
- [x] 複数選択機能（Shift+クリック、マーキー選択）
- [x] 動的レイヤー追加・削除
- [x] Option+ドラッグ複製
- [x] 複数クリップ一括移動
- [x] 複数クリップ一括削除（Delete/Backspace）

### バグ修正
- [x] EPIPEエラー対策（console.log削除、throttle適用）
- [x] D&D競合修正（外部ファイルドラッグとクリップドラッグの分離）

---

## 未確認・要テスト項目

以下の機能は実装済みだが、ユーザー確認待ち：

| 機能 | 状態 | テスト内容 |
|------|------|-----------|
| マーキー選択 | 実装済み | 複数クリップが選択されるか |
| 複数クリップ移動 | 実装済み | 相対位置を維持して移動するか |
| 複数クリップ複製 | 実装済み | Option+ドラッグで全て複製されるか |
| 複数クリップ削除 | 実装済み | Delete/Backspaceで全削除されるか |

---

## 次回以降のタスク

### 優先度: 高
1. **未確認機能のテスト** - 上記の要テスト項目を確認
2. **ランダムビデオ一括配置** - フォルダから素材を一括配置する機能
3. **可変テキストレイヤー** - {{変数}}を含むテキスト

### 優先度: 中
4. **CSV読み込み** - CSVからプロジェクトデータをインポート
5. **書き出し機能** - Pythonバックエンドとの連携確認
6. **キーボードショートカット拡充** - Undo/Redo、コピペなど

### 優先度: 低
7. **パフォーマンス最適化** - 大量クリップ時の描画最適化
8. **テスト追加** - 単体テスト、E2Eテスト

---

## 技術的注意事項

### EPIPEエラー対策
- **console.log をイベントハンドラに入れない**
- **mousemove は必ず throttle（50ms以上）**
- **Redux dispatch は mouseup 時のみ**

### D&D実装
- **外部ファイルドラッグ:** `e.dataTransfer.types.includes('Files')` でガード
- **クリップドラッグ:** react-dnd の useDrag/useDrop を使用
- **data-clip 属性:** マーキー選択から除外するために必須

### モジュール化原則
- **1ファイル1責務**
- **新機能は新ファイルとして追加**
- **既存コードの変更は最小限に**

---

## ファイル構成（主要）

```
frontend/
├── src/
│   ├── main.cjs                    # Electron メインプロセス
│   └── renderer/
│       ├── App.jsx                 # アプリルート
│       ├── store/
│       │   └── timelineSlice.js    # Redux状態管理
│       └── components/
│           ├── Timeline/
│           │   ├── Timeline.jsx    # タイムライン本体
│           │   ├── Layer.jsx       # レイヤー
│           │   ├── Clip.jsx        # クリップ
│           │   └── MarqueeSelection.jsx  # 範囲選択
│           ├── PropertyPanel/
│           └── LayerCreation/
├── HANDOVER.md                     # この引き継ぎ書
└── package.json
```

---

## Git コミット履歴（直近）

```
ae430f1 fix: クリップ色パレット名変更
78b6384 fix: クリップ色の透明度を削除
7fa92e7 fix: テキストクリップ色を明るく
```

---

## 開発環境

```bash
# 開発サーバー起動
cd frontend
npm run electron:dev

# Storybook起動
npm run storybook
```

---

## 連絡事項

- 本日の作業は一時中断
- 次回は「未確認機能のテスト」から再開推奨
- 問題発生時は Designer/Code Reviewer に調査依頼
