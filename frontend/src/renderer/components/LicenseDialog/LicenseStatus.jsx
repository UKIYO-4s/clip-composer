/**
 * LicenseStatus.jsx
 * ライセンス状態表示コンポーネント（設定画面用）
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui';

function LicenseStatus({ onOpenActivateDialog }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);

  // ステータス取得
  const fetchStatus = async () => {
    try {
      const result = await window.api.license.getStatus();
      if (result.success) {
        setStatus(result.data);
      }
    } catch (err) {
      console.error('Failed to get license status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // デバイス解除
  const handleDeactivate = async () => {
    if (!confirm('このデバイスのライセンスを解除しますか？\n解除後は再度認証が必要です。')) {
      return;
    }

    setDeactivating(true);
    try {
      const result = await window.api.license.deactivate();
      if (result.success) {
        await fetchStatus();
        alert('ライセンスを解除しました');
      } else {
        alert(result.message || 'デバイス解除に失敗しました');
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded bg-surface-sunken border border-line">
        <p className="text-sm text-ink-muted">読み込み中...</p>
      </div>
    );
  }

  // 未登録状態
  if (!status || !status.licensed) {
    return (
      <div className="p-4 rounded bg-surface-sunken border border-line space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-yellow" />
          <span className="text-sm text-ink-secondary">
            {status?.status === 'expired' ? 'ライセンス期限切れ' : 'ライセンス未登録'}
          </span>
        </div>
        <p className="text-xs text-ink-muted">
          ライセンスキーを入力して認証してください。
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenActivateDialog}
        >
          ライセンスを認証
        </Button>
      </div>
    );
  }

  // 有効な状態
  const expiryDate = new Date(status.expiresAt).toLocaleDateString('ja-JP');

  return (
    <div className="p-4 rounded bg-surface-sunken border border-line space-y-3">
      {/* ステータスインジケータ */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-accent-green" />
        <span className="text-sm text-ink-secondary">ライセンス有効</span>
      </div>

      {/* 詳細情報 */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-ink-muted">ライセンスキー:</span>
          <span className="text-ink-secondary font-mono">{status.maskedKey}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">プラン:</span>
          <span className="text-ink-secondary capitalize">{status.plan}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">有効期限:</span>
          <span className="text-ink-secondary">{expiryDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">デバイス数:</span>
          <span className="text-ink-secondary">1 / {status.maxDevices}</span>
        </div>
      </div>

      {/* アクション */}
      <div className="flex gap-2 pt-2 border-t border-line">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenActivateDialog}
        >
          別のキーで認証
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeactivate}
          disabled={deactivating}
        >
          {deactivating ? '解除中...' : 'このデバイスを解除'}
        </Button>
      </div>
    </div>
  );
}

export default LicenseStatus;
