import React from 'react';
import { Button } from '../ui';

function ExportProgress({
  progress,
  currentTask,
  elapsedTime,
  estimatedRemaining,
  error,
  outputPath,
  onCancel,
}) {
  // 時間フォーマット
  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 完了判定
  const isComplete = progress >= 100 && !error;
  const isFailed = !!error;

  // フォルダを開く
  const handleOpenFolder = async () => {
    if (outputPath) {
      try {
        // Electron shell.showItemInFolder を呼び出す
        await window.api.python.invoke('open_folder', { path: outputPath });
      } catch (err) {
        console.error('Failed to open folder:', err);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* プログレスバー */}
      <div>
        <div className="mb-1 flex justify-between text-sm text-ink-secondary">
          <span>{currentTask}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-highest">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isFailed
                ? 'bg-accent-red'
                : isComplete
                ? 'bg-accent-green'
                : 'bg-accent-blue'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* 時間情報 */}
      {!isComplete && !isFailed && (
        <div className="flex justify-between text-sm text-ink-muted">
          <span>Elapsed: {formatTime(elapsedTime)}</span>
          <span>Remaining: ~{formatTime(estimatedRemaining)}</span>
        </div>
      )}

      {/* エラー表示 */}
      {isFailed && (
        <div className="rounded border border-accent-red/50 bg-accent-red/10 p-3 text-sm text-accent-red">
          <div className="font-semibold mb-1">Export Failed</div>
          <div>{error}</div>
        </div>
      )}

      {/* 完了メッセージ */}
      {isComplete && (
        <div className="rounded border border-accent-green/50 bg-accent-green/10 p-3 text-sm text-accent-green">
          <div className="mb-1 font-semibold">Export Complete!</div>
          <div className="truncate text-xs text-accent-green/80">{outputPath}</div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex justify-end gap-2 pt-2">
        {isComplete ? (
          <>
            <Button
              variant="ghost"
              size="md"
              onClick={onCancel}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenFolder}
            >
              Show in Folder
            </Button>
          </>
        ) : (
          <Button
            variant="danger"
            size="md"
            onClick={onCancel}
            disabled={isFailed}
          >
            {isFailed ? 'Close' : 'Cancel'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ExportProgress;
