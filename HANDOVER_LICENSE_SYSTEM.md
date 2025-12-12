# Clip Composer ライセンス認証システム 引き継ぎドキュメント

## 現在の状態

### 完了済み機能（本日実装）
1. **タイムコードジャンプ機能** - `Timeline.jsx`
2. **FFmpegフィルター実装** - `ffmpeg_filters.py`, `video_processor.py`
   - 時間範囲対応
   - 後勝ちロジック（重複区間で最上位レイヤーのみ適用）
   - 総時間クランプ
3. **並列動画生成** - `parallel_processor.py`, `csv_handler.py`
4. **DMGビルド設定** - `electron.config.js`, `entitlements.mac.plist`

### 未実装（次回以降）
- ライセンス認証システム
- 配布方式の完成

---

## ライセンス認証システム 実装計画

### アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│                    Clip Composer App                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ License UI  │◄──►│ License      │◄──►│ License    │ │
│  │ (React)     │    │ IPC Handler  │    │ Manager    │ │
│  └─────────────┘    └──────────────┘    └────────────┘ │
│                                               │         │
│                                               ▼         │
│                                      ┌────────────────┐ │
│                                      │ license.json   │ │
│                                      │ (appData)      │ │
│                                      └────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │     License Server       │
              │  POST /v1/license/activate│
              │  POST /v1/license/verify  │
              │  POST /v1/license/deactivate│
              └──────────────────────────┘
```

### 実装すべきファイル

#### 1. クライアント側（Electron）

**新規作成:**
- `frontend/src/license/LicenseManager.cjs` - ライセンス管理コア
- `frontend/src/renderer/components/LicenseDialog/LicenseDialog.jsx` - ライセンス入力UI
- `frontend/src/renderer/components/LicenseDialog/LicenseStatus.jsx` - ライセンス状態表示

**修正:**
- `frontend/src/main.cjs` - 起動時ライセンスチェック追加
- `frontend/src/preload.cjs` - ライセンスAPI追加

#### 2. サーバー側（別リポジトリ推奨）

**新規作成:**
- `server/` ディレクトリ（Node.js/Express または Python/FastAPI）
  - `POST /v1/license/activate` - ライセンスキー認証
  - `POST /v1/license/verify` - トークン検証
  - `POST /v1/license/deactivate` - デバイス解除

---

## 詳細実装仕様

### 1. LicenseManager.cjs

```javascript
// frontend/src/license/LicenseManager.cjs
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class LicenseManager {
  constructor() {
    this.licensePath = path.join(app.getPath('userData'), 'license.json');
    this.serverUrl = 'https://api.clipcomposer.app'; // 本番URL
    this.deviceId = null;
    this.licenseData = null;
  }

  // デバイスID生成（初回のみ、以降は保存されたものを使用）
  async getOrCreateDeviceId() { ... }

  // ライセンスファイル読み込み
  async loadLicense() { ... }

  // ライセンスファイル保存
  async saveLicense(data) { ... }

  // サーバー認証
  async activate(licenseKey) { ... }

  // トークン検証（オフライン可）
  async verifyToken() { ... }

  // オフライン猶予チェック
  isWithinGracePeriod() { ... }

  // ライセンス状態取得
  getStatus() { ... }

  // デバイス解除
  async deactivate() { ... }
}
```

### 2. license.json 形式

```json
{
  "deviceId": "uuid-v4-generated-locally",
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-01-15T00:00:00Z",
  "activatedAt": "2024-12-10T12:00:00Z",
  "maxDevices": 2,
  "plan": "standard"
}
```

### 3. JWT トークン クレーム

```json
{
  "sub": "license_key_hash",
  "device_id": "uuid",
  "app_version": "1.0.0",
  "plan": "standard",
  "max_devices": 2,
  "iat": 1733836800,
  "exp": 1733923200
}
```

### 4. 起動時フロー

```
┌─────────────────┐
│   App Start     │
└────────┬────────┘
         ▼
┌─────────────────┐     No      ┌─────────────────┐
│ license.json    │────────────►│ Show License    │
│ exists?         │             │ Input Dialog    │
└────────┬────────┘             └────────┬────────┘
         │ Yes                           │
         ▼                               ▼
┌─────────────────┐             ┌─────────────────┐
│ Token expired?  │             │ Server Activate │
└────────┬────────┘             └────────┬────────┘
         │                               │
    ┌────┴────┐                          │
    │         │                          │
   Yes       No                          │
    │         │                          │
    ▼         ▼                          │
┌───────┐ ┌───────────┐                  │
│Server │ │ Continue  │◄─────────────────┘
│Verify │ │ to App    │
└───┬───┘ └───────────┘
    │
    ├─── Success ──► Continue
    │
    └─── Fail ──► Grace Period Check
                       │
                  ┌────┴────┐
                  │         │
                Within   Expired
                  │         │
                  ▼         ▼
              Continue   Block
```

### 5. preload.cjs 追加API

```javascript
license: {
  // ライセンス状態取得
  getStatus: () => ipcRenderer.invoke('license-get-status'),

  // ライセンスキー認証
  activate: (key) => ipcRenderer.invoke('license-activate', key),

  // 再認証
  verify: () => ipcRenderer.invoke('license-verify'),

  // デバイス解除
  deactivate: () => ipcRenderer.invoke('license-deactivate'),

  // オフライン猶予残り時間
  getGracePeriodRemaining: () => ipcRenderer.invoke('license-grace-remaining'),
}
```

### 6. main.cjs 追加処理

```javascript
// アプリ起動前にライセンスチェック
app.whenReady().then(async () => {
  const licenseManager = new LicenseManager();
  const status = await licenseManager.verifyToken();

  if (status.valid) {
    createWindow();
  } else if (status.gracePeriod) {
    createWindow(); // 猶予期間内
    showGracePeriodWarning(status.remainingHours);
  } else {
    createLicenseWindow(); // ライセンス入力画面
  }
});
```

---

## サーバー側 API 仕様

### POST /v1/license/activate

**Request:**
```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "device_id": "uuid",
  "app_version": "1.0.0"
}
```

**Response (成功):**
```json
{
  "success": true,
  "token": "jwt_token",
  "expires_at": "2025-01-15T00:00:00Z",
  "max_devices": 2,
  "plan": "standard"
}
```

**Response (エラー):**
```json
{
  "success": false,
  "error": "DEVICE_LIMIT_EXCEEDED",
  "message": "このライセンスキーは登録デバイス数の上限に達しています",
  "max_devices": 2,
  "current_devices": 2
}
```

### エラーコード
- `INVALID_KEY` - 無効なライセンスキー
- `EXPIRED_KEY` - 期限切れ
- `REVOKED_KEY` - 停止されたキー
- `DEVICE_LIMIT_EXCEEDED` - デバイス数超過

---

## UI コンポーネント

### LicenseDialog.jsx

```jsx
// 状態
// - 'input': キー入力画面
// - 'activating': 認証中
// - 'success': 成功
// - 'error': エラー（再試行可）

// 表示要素
// - ライセンスキー入力フィールド（XXXX-XXXX-XXXX-XXXX形式）
// - 認証ボタン
// - エラーメッセージ
// - オフラインモード説明
```

### 設定画面への追加

```jsx
// Settings.tsx または新規 LicenseSettings.jsx
// - 現在のライセンス状態表示
// - ライセンスキー（マスク表示）
// - 有効期限
// - デバイス数 (1/2)
// - 「別のキーで認証」ボタン
// - 「このデバイスを解除」ボタン
```

---

## 配布方式チェックリスト

### ビルド前
- [ ] アイコンファイル作成 (`icon.icns`, `icon.ico`, `icon.png`)
- [ ] ライセンスサーバーURL設定
- [ ] 公開鍵埋め込み（JWT検証用）

### ビルド
- [ ] `npm run dist:mac` でDMG作成
- [ ] macOS公証（Apple Developer Account必要）
- [ ] Windows署名（EV証明書推奨）

### 配布
- [ ] ダウンロードページ用意
- [ ] ライセンスキー発行システム
- [ ] 決済連携（Stripe等）

---

## 次回作業の優先順位

1. **LicenseManager.cjs** - コアロジック
2. **main.cjs修正** - 起動時チェック統合
3. **preload.cjs修正** - IPC API追加
4. **LicenseDialog.jsx** - UI実装
5. **サーバーAPI** - 認証エンドポイント（別途検討）
6. **テスト** - オフライン動作確認
7. **ビルド** - 公証付きDMG作成

---

## 参考コマンド

```bash
# 開発
npm start

# ビルド（macOS）
npm run dist:mac

# ビルド成果物
ls -la dist/
```

---

*作成日: 2025-12-10*
*次回作業者向け: 上記の順序で実装を進めてください。サーバー側は別途相談が必要です。*
