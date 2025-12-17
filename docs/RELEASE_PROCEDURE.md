# Clip Composer リリース手順書

## 概要

このドキュメントでは、Clip Composerの新バージョンをリリースする手順を説明します。
自動アップデート機能（electron-updater）を使用しているため、GitHub Releasesへの正しいアップロードが必要です。

## 前提条件

- [ ] GitHub リポジトリへのプッシュ権限
- [ ] Apple Developer ID（macOS署名・公証用、本番リリース時）
- [ ] Windows コード署名証明書（Windows版リリース時）

---

## リリース手順

### 1. バージョン更新

#### 1.1 package.json のバージョンを更新

```bash
# package.json の version フィールドを更新
# 例: "1.0.0" → "1.1.0"
```

セマンティックバージョニングに従う:
- **MAJOR**: 後方互換性のない変更
- **MINOR**: 後方互換性のある新機能
- **PATCH**: 後方互換性のあるバグ修正

### 2. CHANGELOG.md の更新

```markdown
## [1.1.0] - 2024-XX-XX

### 追加
- 新機能A
- 新機能B

### 変更
- 既存機能の改善

### 修正
- バグ修正A
- バグ修正B

### 削除
- 非推奨機能の削除
```

### 3. ビルド

#### 3.1 フロントエンドビルド

```bash
npm run build
```

#### 3.2 macOS DMG ビルド

```bash
npm run dist:mac
```

生成物:
- `dist/Clip Composer-X.X.X-mac-x64.dmg` (Intel Mac)
- `dist/Clip Composer-X.X.X-mac-arm64.dmg` (Apple Silicon)
- `dist/latest-mac.yml` (auto-updater用メタデータ)

#### 3.3 Windows ビルド（オプション）

```bash
npm run dist:win
```

生成物:
- `dist/Clip Composer Setup X.X.X.exe`
- `dist/latest.yml` (auto-updater用メタデータ)

### 4. 署名・公証（本番リリース時）

#### 4.1 macOS署名

```bash
# Apple Developer ID で署名
# electron.config.js の mac.identity を設定
```

#### 4.2 macOS公証

```bash
# notarization設定が必要
# electron.config.js の mac.notarize を設定
```

### 5. GitHub Release 作成

#### 5.1 Release作成

1. GitHub リポジトリの「Releases」ページへ
2. 「Draft a new release」をクリック
3. タグを作成: `vX.X.X`（例: `v1.1.0`）
4. リリースタイトル: `v1.1.0` または説明的なタイトル
5. リリースノートを記入（CHANGELOG.mdの内容をコピー）

#### 5.2 ファイルアップロード

**必須ファイル**（electron-updaterが参照）:
- `Clip Composer-X.X.X-mac-x64.dmg`
- `Clip Composer-X.X.X-mac-arm64.dmg`
- `latest-mac.yml`

Windowsリリース時:
- `Clip Composer Setup X.X.X.exe`
- `latest.yml`

#### 5.3 Releaseを公開

- 「Publish release」をクリック
- Pre-releaseの場合は「Set as a pre-release」にチェック

### 6. 動作確認

#### 6.1 自動アップデートテスト

1. 旧バージョンのアプリを起動
2. 起動後5秒でアップデートチェックが実行される
3. 「新しいバージョンが利用可能」バナーが表示されることを確認
4. ダウンロード → 再起動 → 新バージョンで起動を確認

#### 6.2 手動ダウンロードテスト

1. GitHub Releasesページからダウンロード
2. インストール・起動確認

### 7. 告知

リリース後、以下のチャンネルで告知:
- Discord
- メール
- 社内チャット

（告知テンプレートは `docs/RELEASE_ANNOUNCEMENT_TEMPLATE.md` を参照）

---

## トラブルシューティング

### 自動アップデートが動作しない

1. `latest-mac.yml` が正しくアップロードされているか確認
2. GitHub Releaseが「Release」（Pre-releaseではない）になっているか確認
3. ファイル名が `artifactName` 設定と一致しているか確認

### 署名エラー

1. Apple Developer ID の有効期限を確認
2. `electron.config.js` の entitlements 設定を確認

### 公証エラー

1. `hardened-runtime` が有効か確認
2. entitlements.mac.plist の設定を確認

---

## 関連ファイル

- `package.json` - バージョン管理
- `electron.config.js` - ビルド設定
- `CHANGELOG.md` - 変更履歴
- `docs/RELEASE_ANNOUNCEMENT_TEMPLATE.md` - 告知テンプレート
