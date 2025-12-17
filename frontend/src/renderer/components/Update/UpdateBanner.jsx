import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Download, X, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '../ui';
import {
  dismissBanner,
  setDownloading,
  setDownloadProgress,
  setUpdateDownloaded,
  setError,
} from '../../store/updateSlice';

function UpdateBanner() {
  const dispatch = useDispatch();
  const { status, showBanner, availableUpdate, downloadProgress } = useSelector(
    (state) => state.update
  );

  // バナー非表示条件
  if (!showBanner) return null;
  if (status !== 'available' && status !== 'downloading' && status !== 'downloaded') return null;

  // ダウンロード開始
  const handleDownload = async () => {
    dispatch(setDownloading());
    try {
      const result = await window.api.update.downloadUpdate();
      if (!result.success) {
        dispatch(setError(result.error));
      }
    } catch (err) {
      dispatch(setError(err.message));
    }
  };

  // 再起動して適用
  const handleInstall = () => {
    window.api.update.quitAndInstall();
  };

  // バナーを閉じる
  const handleDismiss = () => {
    dispatch(dismissBanner());
  };

  // GitHubリリースページを開く
  const handleOpenReleasePage = () => {
    window.open(
      `https://github.com/UKIYO-4s/clip-composer/releases/tag/v${availableUpdate?.version}`,
      '_blank'
    );
  };

  // ダウンロード完了状態
  if (status === 'downloaded') {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-accent-green/50 bg-surface-high p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-green/20">
            <Download className="h-4 w-4 text-accent-green" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-ink-primary">
              アップデート準備完了
            </h4>
            <p className="mt-1 text-sm text-ink-secondary">
              v{availableUpdate?.version} がダウンロードされました。
              再起動して適用してください。
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" size="sm" onClick={handleInstall}>
                <RefreshCw className="mr-1 h-3 w-3" />
                再起動して適用
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                後で
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-ink-muted hover:text-ink-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ダウンロード中状態
  if (status === 'downloading') {
    const percent = downloadProgress?.percent || 0;
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-accent-blue/50 bg-surface-high p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-blue/20">
            <Download className="h-4 w-4 animate-pulse text-accent-blue" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-ink-primary">
              ダウンロード中...
            </h4>
            <p className="mt-1 text-sm text-ink-secondary">
              v{availableUpdate?.version} ({percent.toFixed(0)}%)
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-highest">
              <div
                className="h-full rounded-full bg-accent-blue transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // アップデート利用可能状態
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-accent-purple/50 bg-surface-high p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-purple/20">
          <Download className="h-4 w-4 text-accent-purple" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-ink-primary">
            新しいバージョンが利用可能
          </h4>
          <p className="mt-1 text-sm text-ink-secondary">
            v{availableUpdate?.version} にアップデートできます。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={handleDownload}>
              <Download className="mr-1 h-3 w-3" />
              ダウンロード
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenReleasePage}>
              <ExternalLink className="mr-1 h-3 w-3" />
              詳細
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              後で
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-ink-muted hover:text-ink-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default UpdateBanner;
