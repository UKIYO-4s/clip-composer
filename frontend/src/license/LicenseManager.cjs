/**
 * LicenseManager.cjs
 * ライセンス認証管理コアモジュール
 *
 * 機能:
 * - デバイスID生成・管理
 * - ライセンスファイル読み書き
 * - サーバー認証（activate/verify/deactivate）
 * - オフライン猶予期間管理
 * - JWT検証
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

// 定数
const GRACE_PERIOD_HOURS = 72; // オフライン猶予期間（時間）
const TOKEN_REFRESH_DAYS = 7;  // トークン更新間隔（日）

class LicenseManager {
  constructor() {
    this.licensePath = path.join(app.getPath('userData'), 'license.json');
    this.serverUrl = process.env.LICENSE_SERVER_URL || 'https://api.clipcomposer.app';
    this.deviceId = null;
    this.licenseData = null;
    this.initialized = false;
  }

  /**
   * 初期化（起動時に呼び出し）
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.deviceId = await this.getOrCreateDeviceId();
      this.licenseData = await this.loadLicense();
      this.initialized = true;
    } catch (error) {
      console.error('LicenseManager initialization failed:', error);
      this.initialized = true; // エラーでも初期化完了とする
    }
  }

  /**
   * ローカルマシンの指紋を計算（常に現在のマシン情報から生成）
   * license.jsonのコピー攻撃を防ぐため、毎回計算する
   */
  calculateLocalFingerprint() {
    const os = require('os');
    const machineInfo = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0]?.model || 'unknown',
      os.totalmem().toString(),
    ].join('|');

    // ハッシュ化してUUID形式に変換
    const hash = crypto.createHash('sha256').update(machineInfo).digest('hex');
    const fingerprint = [
      hash.slice(0, 8),
      hash.slice(8, 12),
      hash.slice(12, 16),
      hash.slice(16, 20),
      hash.slice(20, 32),
    ].join('-');

    return fingerprint;
  }

  /**
   * デバイスID取得（常にローカル指紋を計算）
   * セキュリティ強化: license.jsonの値ではなく、常にローカル計算値を使用
   */
  async getOrCreateDeviceId() {
    // 常にローカル指紋を計算（コピー攻撃対策）
    return this.calculateLocalFingerprint();
  }

  /**
   * 保存されたdeviceIdとローカル指紋を照合
   * @returns {boolean} 一致すればtrue
   */
  verifyDeviceBinding() {
    if (!this.licenseData || !this.licenseData.deviceId) {
      return true; // ライセンスデータがない場合は検証スキップ
    }

    const localFingerprint = this.calculateLocalFingerprint();
    const storedDeviceId = this.licenseData.deviceId;

    return localFingerprint === storedDeviceId;
  }

  /**
   * ライセンスファイル読み込み
   */
  async loadLicense() {
    try {
      const content = await fs.readFile(this.licensePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // ファイルが存在しない
      }
      throw error;
    }
  }

  /**
   * ライセンスファイル保存
   */
  async saveLicense(data) {
    const saveData = {
      ...data,
      deviceId: this.deviceId,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(this.licensePath, JSON.stringify(saveData, null, 2), 'utf8');
    this.licenseData = saveData;
  }

  /**
   * ライセンスキー認証（サーバー）
   * @param {string} licenseKey - ライセンスキー（XXXX-XXXX-XXXX-XXXX形式）
   */
  async activate(licenseKey) {
    await this.initialize();

    // ライセンスキー形式検証
    if (!this.validateKeyFormat(licenseKey)) {
      return {
        success: false,
        error: 'INVALID_FORMAT',
        message: 'ライセンスキーの形式が正しくありません',
      };
    }

    try {
      const response = await this.fetchWithTimeout(`${this.serverUrl}/v1/license/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          license_key: licenseKey,
          device_id: this.deviceId,
          app_version: app.getVersion(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 認証成功: ライセンス情報を保存
        await this.saveLicense({
          licenseKey,
          token: result.token,
          expiresAt: result.expires_at,
          activatedAt: new Date().toISOString(),
          maxDevices: result.max_devices,
          plan: result.plan,
          lastOnlineVerify: new Date().toISOString(),
        });

        return {
          success: true,
          plan: result.plan,
          expiresAt: result.expires_at,
          maxDevices: result.max_devices,
        };
      } else {
        // 認証失敗
        return {
          success: false,
          error: result.error,
          message: result.message || this.getErrorMessage(result.error),
        };
      }
    } catch (error) {
      console.error('License activation failed:', error);
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'サーバーに接続できません。インターネット接続を確認してください。',
      };
    }
  }

  /**
   * トークン検証（オンライン/オフライン対応）
   */
  async verifyToken() {
    await this.initialize();

    // ライセンスデータがない場合
    if (!this.licenseData) {
      return {
        valid: false,
        reason: 'NO_LICENSE',
        message: 'ライセンスが登録されていません',
      };
    }

    // デバイスバインディング検証（コピー攻撃対策）
    if (!this.verifyDeviceBinding()) {
      console.warn('Device binding mismatch detected');
      return {
        valid: false,
        reason: 'DEVICE_MISMATCH',
        message: 'このライセンスは別のデバイスで登録されています。再認証が必要です。',
      };
    }

    const { token, expiresAt, lastOnlineVerify } = this.licenseData;

    // トークンがない場合
    if (!token) {
      return {
        valid: false,
        reason: 'NO_TOKEN',
        message: 'ライセンストークンがありません',
      };
    }

    // JWT署名検証（サーバー準備後に有効化）
    // TODO: 公開鍵設定後にコメントアウト解除
    // const jwtValid = this.verifyJwtSignature(token);
    // if (!jwtValid) {
    //   return {
    //     valid: false,
    //     reason: 'INVALID_SIGNATURE',
    //     message: 'ライセンストークンの署名が無効です',
    //   };
    // }

    // 有効期限チェック
    const now = new Date();
    const expiry = new Date(expiresAt);

    if (now > expiry) {
      return {
        valid: false,
        reason: 'EXPIRED',
        message: 'ライセンスの有効期限が切れています',
      };
    }

    // オンライン検証が必要かチェック
    const lastVerify = new Date(lastOnlineVerify || 0);
    const daysSinceVerify = (now - lastVerify) / (1000 * 60 * 60 * 24);

    if (daysSinceVerify >= TOKEN_REFRESH_DAYS) {
      // オンライン検証を試行
      try {
        const onlineResult = await this.verifyOnline();
        if (onlineResult.valid) {
          return { valid: true, online: true };
        } else if (onlineResult.error !== 'NETWORK_ERROR') {
          // ネットワークエラー以外は失敗
          return onlineResult;
        }
        // ネットワークエラーの場合は猶予期間チェックへ
      } catch {
        // ネットワークエラー: 猶予期間チェックへ
      }

      // 猶予期間チェック
      const gracePeriodResult = this.checkGracePeriod();
      if (gracePeriodResult.valid) {
        return {
          valid: true,
          gracePeriod: true,
          remainingHours: gracePeriodResult.remainingHours,
        };
      } else {
        return {
          valid: false,
          reason: 'GRACE_PERIOD_EXPIRED',
          message: 'オフライン猶予期間が終了しました。インターネットに接続してください。',
        };
      }
    }

    // ローカル検証OK
    return { valid: true, online: false };
  }

  /**
   * オンライン検証
   */
  async verifyOnline() {
    if (!this.licenseData || !this.licenseData.token) {
      return {
        valid: false,
        error: 'NO_TOKEN',
        message: 'トークンがありません',
      };
    }

    try {
      const response = await this.fetchWithTimeout(`${this.serverUrl}/v1/license/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.licenseData.token}`,
        },
        body: JSON.stringify({
          device_id: this.deviceId,
        }),
      });

      const result = await response.json();

      if (result.valid) {
        // 新しいトークンがあれば更新
        if (result.token) {
          await this.saveLicense({
            ...this.licenseData,
            token: result.token,
            expiresAt: result.expires_at || this.licenseData.expiresAt,
            lastOnlineVerify: new Date().toISOString(),
          });
        } else {
          // lastOnlineVerifyのみ更新
          await this.saveLicense({
            ...this.licenseData,
            lastOnlineVerify: new Date().toISOString(),
          });
        }
        return { valid: true };
      } else {
        return {
          valid: false,
          error: result.error,
          message: result.message || 'ライセンス検証に失敗しました',
        };
      }
    } catch (error) {
      console.error('Online verification failed:', error);
      return {
        valid: false,
        error: 'NETWORK_ERROR',
        message: 'サーバーに接続できません',
      };
    }
  }

  /**
   * オフライン猶予期間チェック
   */
  checkGracePeriod() {
    if (!this.licenseData || !this.licenseData.lastOnlineVerify) {
      return { valid: false, remainingHours: 0 };
    }

    const now = new Date();
    const lastVerify = new Date(this.licenseData.lastOnlineVerify);
    const hoursSinceVerify = (now - lastVerify) / (1000 * 60 * 60);

    if (hoursSinceVerify <= GRACE_PERIOD_HOURS) {
      return {
        valid: true,
        remainingHours: Math.ceil(GRACE_PERIOD_HOURS - hoursSinceVerify),
      };
    }

    return { valid: false, remainingHours: 0 };
  }

  /**
   * 猶予期間残り時間を取得
   */
  getGracePeriodRemaining() {
    const result = this.checkGracePeriod();
    return result.remainingHours;
  }

  /**
   * ライセンス状態取得
   */
  getStatus() {
    if (!this.licenseData) {
      return {
        licensed: false,
        status: 'unlicensed',
        message: 'ライセンス未登録',
      };
    }

    const { licenseKey, expiresAt, plan, maxDevices } = this.licenseData;

    // マスク表示用（最後の4文字のみ表示）
    const maskedKey = licenseKey
      ? `****-****-****-${licenseKey.slice(-4)}`
      : 'N/A';

    const now = new Date();
    const expiry = new Date(expiresAt);
    const isExpired = now > expiry;

    return {
      licensed: !isExpired,
      status: isExpired ? 'expired' : 'active',
      maskedKey,
      expiresAt,
      plan: plan || 'standard',
      maxDevices: maxDevices || 2,
      message: isExpired ? 'ライセンス期限切れ' : 'ライセンス有効',
    };
  }

  /**
   * デバイス解除
   */
  async deactivate() {
    await this.initialize();

    if (!this.licenseData || !this.licenseData.token) {
      return {
        success: false,
        error: 'NO_LICENSE',
        message: 'ライセンスが登録されていません',
      };
    }

    try {
      const response = await this.fetchWithTimeout(`${this.serverUrl}/v1/license/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.licenseData.token}`,
        },
        body: JSON.stringify({
          device_id: this.deviceId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // ローカルのライセンスファイルを削除
        await this.deleteLicenseFile();
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.message || 'デバイス解除に失敗しました',
        };
      }
    } catch (error) {
      console.error('Deactivation failed:', error);
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'サーバーに接続できません',
      };
    }
  }

  /**
   * ライセンスファイル削除
   */
  async deleteLicenseFile() {
    try {
      await fs.unlink(this.licensePath);
      this.licenseData = null;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  // ===============================
  // ユーティリティメソッド
  // ===============================

  /**
   * ライセンスキー形式検証
   * 形式: XXXX-XXXX-XXXX-XXXX（16文字 + 3ハイフン）
   */
  validateKeyFormat(key) {
    if (!key || typeof key !== 'string') return false;
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return pattern.test(key.toUpperCase());
  }

  /**
   * タイムアウト付きfetch
   */
  async fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * エラーコードからメッセージ取得
   */
  getErrorMessage(errorCode) {
    const messages = {
      INVALID_KEY: '無効なライセンスキーです',
      EXPIRED_KEY: 'ライセンスキーの有効期限が切れています',
      REVOKED_KEY: 'このライセンスキーは停止されています',
      DEVICE_LIMIT_EXCEEDED: 'デバイス数の上限に達しています',
      ALREADY_ACTIVATED: 'このデバイスは既に登録されています',
      SERVER_ERROR: 'サーバーエラーが発生しました',
      DEVICE_MISMATCH: 'このライセンスは別のデバイスで登録されています',
      INVALID_SIGNATURE: 'ライセンストークンの署名が無効です',
    };
    return messages[errorCode] || '不明なエラーが発生しました';
  }

  // ===============================
  // JWT署名検証（サーバー準備後に有効化）
  // ===============================

  /**
   * JWT公開鍵（RS256用）
   * TODO: サーバー構築後、実際の公開鍵に置き換える
   * 公開鍵はハードコードし、秘密鍵はサーバー側のみで保持
   */
  static get JWT_PUBLIC_KEY() {
    // プレースホルダー: サーバー準備後に実際の公開鍵を埋め込む
    return `-----BEGIN PUBLIC KEY-----
PLACEHOLDER_PUBLIC_KEY_WILL_BE_REPLACED_BY_ACTUAL_KEY
-----END PUBLIC KEY-----`;
  }

  /**
   * JWT署名検証（スケルトン）
   * サーバー準備後に実際の検証ロジックを有効化
   *
   * @param {string} token - JWTトークン
   * @returns {boolean} 署名が有効ならtrue
   *
   * 検証項目:
   * 1. 署名の検証（RS256）
   * 2. 有効期限（exp）の検証
   * 3. 発行者（iss）の検証
   * 4. デバイスID（device_id）の検証
   */
  verifyJwtSignature(token) {
    // TODO: サーバー準備後に以下を有効化

    // 現時点ではスケルトンのみ（常にtrueを返す）
    // サーバー構築後、以下のロジックを実装:
    //
    // try {
    //   // JWTをデコード（ヘッダー.ペイロード.署名）
    //   const parts = token.split('.');
    //   if (parts.length !== 3) {
    //     console.warn('Invalid JWT format');
    //     return false;
    //   }
    //
    //   const [headerB64, payloadB64, signatureB64] = parts;
    //
    //   // 署名対象データ
    //   const signatureInput = `${headerB64}.${payloadB64}`;
    //
    //   // Base64URL -> Base64 変換
    //   const signature = Buffer.from(
    //     signatureB64.replace(/-/g, '+').replace(/_/g, '/'),
    //     'base64'
    //   );
    //
    //   // RS256署名検証
    //   const verifier = crypto.createVerify('RSA-SHA256');
    //   verifier.update(signatureInput);
    //   const isValid = verifier.verify(LicenseManager.JWT_PUBLIC_KEY, signature);
    //
    //   if (!isValid) {
    //     console.warn('JWT signature verification failed');
    //     return false;
    //   }
    //
    //   // ペイロードをデコード
    //   const payload = JSON.parse(
    //     Buffer.from(payloadB64, 'base64').toString('utf8')
    //   );
    //
    //   // 有効期限チェック
    //   if (payload.exp && Date.now() / 1000 > payload.exp) {
    //     console.warn('JWT token expired');
    //     return false;
    //   }
    //
    //   // デバイスIDチェック
    //   if (payload.device_id !== this.deviceId) {
    //     console.warn('JWT device_id mismatch');
    //     return false;
    //   }
    //
    //   return true;
    // } catch (error) {
    //   console.error('JWT verification error:', error);
    //   return false;
    // }

    // 暫定: 検証をスキップ（サーバー未準備）
    console.log('JWT signature verification skipped (server not ready)');
    return true;
  }

  /**
   * JWTペイロードをデコード（署名検証なし）
   * デバッグ・情報取得用
   *
   * @param {string} token - JWTトークン
   * @returns {object|null} デコードされたペイロード
   */
  decodeJwtPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payloadB64 = parts[1];
      // Base64URL -> UTF8
      const payload = Buffer.from(
        payloadB64.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf8');

      return JSON.parse(payload);
    } catch (error) {
      console.error('JWT decode error:', error);
      return null;
    }
  }
}

// シングルトンインスタンス
let instance = null;

/**
 * LicenseManagerインスタンスを取得
 */
function getLicenseManager() {
  if (!instance) {
    instance = new LicenseManager();
  }
  return instance;
}

module.exports = { LicenseManager, getLicenseManager };
