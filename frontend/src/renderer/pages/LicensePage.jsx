/**
 * LicensePage.jsx
 * ライセンス認証ページ（起動時ライセンスチェック用）
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui';

// 状態定義
const STATE = {
  INPUT: 'input',
  ACTIVATING: 'activating',
  SUCCESS: 'success',
  ERROR: 'error',
};

function LicensePage() {
  const [state, setState] = useState(STATE.INPUT);
  const [licenseKey, setLicenseKey] = useState(['', '', '', '']);
  const [error, setError] = useState(null);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  // 起動時に最初の入力欄にフォーカス
  useEffect(() => {
    setTimeout(() => inputRefs[0].current?.focus(), 100);
  }, []);

  // ライセンスキー入力ハンドラ
  const handleKeyChange = (index, value) => {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

    const newKey = [...licenseKey];
    newKey[index] = sanitized;
    setLicenseKey(newKey);

    if (sanitized.length === 4 && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  // キーボードイベント
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && licenseKey[index] === '' && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePaste();
    }
    if (e.key === 'Enter' && licenseKey.every(part => part.length === 4)) {
      handleActivate();
    }
  };

  // ペースト処理
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
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
      // クリップボードアクセス失敗
    }
  };

  // 認証実行
  const handleActivate = async () => {
    const fullKey = licenseKey.join('-');

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
        setState(STATE.SUCCESS);
        // 認証成功: メインウィンドウを起動
        setTimeout(async () => {
          await window.api.license.openMainWindow();
        }, 1000);
      } else {
        setError(result.message || '認証に失敗しました');
        setState(STATE.ERROR);
      }
    } catch (err) {
      setError('通信エラーが発生しました');
      setState(STATE.ERROR);
    }
  };

  // 再試行
  const handleRetry = () => {
    setState(STATE.INPUT);
    setError(null);
    setTimeout(() => inputRefs[0].current?.focus(), 100);
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴ/タイトル */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Clip Composer</h1>
          <p className="text-ink-muted">ライセンス認証</p>
        </div>

        {/* カード */}
        <div className="rounded-lg border border-line bg-surface-raised shadow-xl">
          <div className="p-6">
            {/* 入力状態 */}
            {(state === STATE.INPUT || state === STATE.ERROR) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-ink-secondary mb-3">
                    ライセンスキーを入力
                  </label>
                  <div className="flex gap-2 items-center justify-center">
                    {licenseKey.map((part, index) => (
                      <React.Fragment key={index}>
                        <input
                          ref={inputRefs[index]}
                          type="text"
                          value={part}
                          onChange={(e) => handleKeyChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          className={`
                            w-16 h-12 text-center text-lg font-mono uppercase
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
                          <span className="text-ink-muted text-xl">-</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* エラーメッセージ */}
                {state === STATE.ERROR && error && (
                  <div className="p-3 rounded bg-accent-red/10 border border-accent-red/30">
                    <p className="text-sm text-accent-red text-center">{error}</p>
                  </div>
                )}

                {/* ヒント */}
                <div className="p-3 rounded bg-surface-sunken border border-line">
                  <p className="text-xs text-ink-muted text-center">
                    購入時に受け取った16桁のライセンスキーを入力してください
                  </p>
                </div>

                {/* ボタン */}
                <div className="flex gap-2 pt-2">
                  {state === STATE.ERROR && (
                    <Button variant="ghost" size="md" onClick={handleRetry} className="flex-1">
                      再入力
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleActivate}
                    disabled={licenseKey.some(part => part.length !== 4)}
                    className="flex-1"
                  >
                    認証
                  </Button>
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
                <p className="text-sm text-ink-muted">アプリを起動しています...</p>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-6">
          <p className="text-xs text-ink-muted">
            Clip Composer v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}

export default LicensePage;
