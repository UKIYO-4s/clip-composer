/**
 * LicenseDialog.jsx
 * ライセンス入力・認証ダイアログ
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button, Input } from '../ui';

// 状態定義
const STATE = {
  INPUT: 'input',
  ACTIVATING: 'activating',
  SUCCESS: 'success',
  ERROR: 'error',
};

function LicenseDialog({ isOpen, onClose, onSuccess }) {
  const [state, setState] = useState(STATE.INPUT);
  const [licenseKey, setLicenseKey] = useState(['', '', '', '']);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  // ダイアログ開閉時にリセット
  useEffect(() => {
    if (isOpen) {
      setState(STATE.INPUT);
      setLicenseKey(['', '', '', '']);
      setError(null);
      setSuccessData(null);
      // 最初の入力欄にフォーカス
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    }
  }, [isOpen]);

  // ライセンスキー入力ハンドラ
  const handleKeyChange = (index, value) => {
    // 英数字のみ許可、大文字に変換
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

    const newKey = [...licenseKey];
    newKey[index] = sanitized;
    setLicenseKey(newKey);

    // 4文字入力したら次の欄へ
    if (sanitized.length === 4 && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  // キーボードイベント
  const handleKeyDown = (index, e) => {
    // Backspace で前の欄へ
    if (e.key === 'Backspace' && licenseKey[index] === '' && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    // ペースト対応
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePaste();
    }
  };

  // ペースト処理
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // XXXX-XXXX-XXXX-XXXX または XXXXXXXXXXXXXXXX 形式を解析
      const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleaned.length === 16) {
        setLicenseKey([
          cleaned.slice(0, 4),
          cleaned.slice(4, 8),
          cleaned.slice(8, 12),
          cleaned.slice(12, 16),
        ]);
        inputRefs[3].current?.focus();
      }
    } catch {
      // クリップボードアクセス失敗は無視
    }
  };

  // 認証実行
  const handleActivate = async () => {
    const fullKey = licenseKey.join('-');

    // 形式チェック
    if (licenseKey.some(part => part.length !== 4)) {
      setError('ライセンスキーを正しく入力してください');
      setState(STATE.ERROR);
      return;
    }

    setState(STATE.ACTIVATING);
    setError(null);

    try {
      const result = await window.api.license.activate(fullKey);

      if (result.success) {
        setSuccessData(result);
        setState(STATE.SUCCESS);
        // 成功コールバック
        if (onSuccess) {
          setTimeout(() => onSuccess(result), 1500);
        }
      } else {
        setError(result.message || '認証に失敗しました');
        setState(STATE.ERROR);
      }
    } catch (err) {
      setError('通信エラーが発生しました');
      setState(STATE.ERROR);
    }
  };

  // キャンセル
  const handleCancel = () => {
    if (onClose) onClose();
  };

  // 再試行
  const handleRetry = () => {
    setState(STATE.INPUT);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface-raised shadow-xl">
        {/* ヘッダー */}
        <div className="border-b border-line p-4">
          <h2 className="text-lg font-semibold text-white">ライセンス認証</h2>
          <p className="text-sm text-ink-muted mt-1">
            ライセンスキーを入力して認証してください
          </p>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          {/* 入力状態 */}
          {(state === STATE.INPUT || state === STATE.ERROR) && (
            <div className="space-y-4">
              {/* ライセンスキー入力 */}
              <div>
                <label className="block text-sm text-ink-secondary mb-2">
                  ライセンスキー
                </label>
                <div className="flex gap-2 items-center">
                  {licenseKey.map((part, index) => (
                    <React.Fragment key={index}>
                      <input
                        ref={inputRefs[index]}
                        type="text"
                        value={part}
                        onChange={(e) => handleKeyChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className={`
                          w-16 h-10 text-center text-lg font-mono uppercase
                          rounded bg-surface-sunken border
                          text-ink-primary placeholder:text-ink-muted
                          focus:outline-none focus:ring-2 focus:ring-accent-blue/50
                          transition-colors duration-150
                          ${state === STATE.ERROR ? 'border-accent-red' : 'border-line hover:border-line-bright'}
                        `}
                        placeholder="XXXX"
                        maxLength={4}
                      />
                      {index < 3 && (
                        <span className="text-ink-muted text-lg">-</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* エラーメッセージ */}
              {state === STATE.ERROR && error && (
                <div className="p-3 rounded bg-accent-red/10 border border-accent-red/30">
                  <p className="text-sm text-accent-red">{error}</p>
                </div>
              )}

              {/* ヒント */}
              <div className="p-3 rounded bg-surface-sunken border border-line">
                <p className="text-xs text-ink-muted">
                  購入時に受け取ったライセンスキー（16桁）を入力してください。
                  キーはハイフン区切りでも、連続入力でも構いません。
                </p>
              </div>
            </div>
          )}

          {/* 認証中 */}
          {state === STATE.ACTIVATING && (
            <div className="flex flex-col items-center py-8">
              <div className="w-10 h-10 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-ink-secondary">認証中...</p>
            </div>
          )}

          {/* 成功 */}
          {state === STATE.SUCCESS && (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 rounded-full bg-accent-green/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium text-white mb-2">認証成功</p>
              <p className="text-sm text-ink-muted">
                プラン: {successData?.plan || 'Standard'}
              </p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-2 border-t border-line p-4">
          {(state === STATE.INPUT || state === STATE.ERROR) && (
            <>
              <Button variant="ghost" size="md" onClick={handleCancel}>
                キャンセル
              </Button>
              {state === STATE.ERROR && (
                <Button variant="subtle" size="md" onClick={handleRetry}>
                  再入力
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={handleActivate}
                disabled={licenseKey.some(part => part.length !== 4)}
              >
                認証
              </Button>
            </>
          )}
          {state === STATE.ACTIVATING && (
            <Button variant="ghost" size="md" disabled>
              認証中...
            </Button>
          )}
          {state === STATE.SUCCESS && (
            <Button variant="primary" size="md" onClick={() => onClose?.()}>
              続行
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LicenseDialog;
