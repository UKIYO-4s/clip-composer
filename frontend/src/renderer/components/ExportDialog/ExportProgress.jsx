import React from 'react';

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
        <div className="flex justify-between text-sm text-gray-300 mb-1">
          <span>{currentTask}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isFailed
                ? 'bg-red-500'
                : isComplete
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* 時間情報 */}
      {!isComplete && !isFailed && (
        <div className="flex justify-between text-sm text-gray-400">
          <span>Elapsed: {formatTime(elapsedTime)}</span>
          <span>Remaining: ~{formatTime(estimatedRemaining)}</span>
        </div>
      )}

      {/* エラー表示 */}
      {isFailed && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          <div className="font-semibold mb-1">Export Failed</div>
          <div>{error}</div>
        </div>
      )}

      {/* 完了メッセージ */}
      {isComplete && (
        <div className="p-3 bg-green-900/50 border border-green-700 rounded text-green-300 text-sm">
          <div className="font-semibold mb-1">Export Complete!</div>
          <div className="text-xs text-green-400 truncate">{outputPath}</div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex justify-end gap-2 pt-2">
        {isComplete ? (
          <>
            <button
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
              onClick={onCancel}
            >
              Close
            </button>
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
              onClick={handleOpenFolder}
            >
              Show in Folder
            </button>
          </>
        ) : (
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white"
            onClick={onCancel}
            disabled={isFailed}
          >
            {isFailed ? 'Close' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
}

export default ExportProgress;
