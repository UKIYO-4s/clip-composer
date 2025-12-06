import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeExportDialog,
  setExportSettings,
  startExport,
  updateProgress,
  exportSuccess,
  exportError,
  cancelExport,
  selectExportState,
  selectExportSettings,
  resolutionPresets,
} from '../../store/exportSlice';
import ExportProgress from './ExportProgress';

function ExportDialog() {
  const dispatch = useDispatch();
  const exportState = useSelector(selectExportState);
  const settings = useSelector(selectExportSettings);
  const timeline = useSelector((state) => state.timeline);

  const [outputPath, setOutputPath] = useState('');
  const [startTime, setStartTime] = useState(null);

  const { isExporting, isDialogOpen, progress, error } = exportState;

  // ダイアログが開いていなければ何も表示しない
  if (!isDialogOpen) return null;

  // 出力先選択
  const handleSelectOutput = async () => {
    try {
      const result = await window.api.saveFile({
        defaultPath: 'output.mp4',
        filters: [{ name: 'MP4 Video', extensions: ['mp4'] }],
      });
      if (!result.canceled && result.filePath) {
        setOutputPath(result.filePath);
      }
    } catch (err) {
      console.error('Failed to select output path:', err);
    }
  };

  // 解像度取得
  const getResolution = () => {
    if (settings.resolution === 'custom') {
      return { width: settings.customWidth, height: settings.customHeight };
    }
    return resolutionPresets[settings.resolution];
  };

  // 書き出し開始
  const handleStartExport = async () => {
    if (!outputPath) {
      alert('出力先を選択してください');
      return;
    }

    const resolution = getResolution();

    // タイムラインデータを準備
    const timelineData = {
      fps: settings.fps,
      totalFrames: timeline.totalFrames,
      layers: timeline.layers,
      layerOrder: timeline.layerOrder,
    };

    const options = {
      resolution: [resolution.width, resolution.height],
      fps: settings.fps,
      codec: settings.codec,
      quality: settings.quality,
    };

    dispatch(startExport({ outputPath }));
    setStartTime(Date.now());

    try {
      // 進捗リスナーを設定
      const removeProgressListener = window.api.python.onProgress((data) => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = data.progress > 0
          ? (elapsed / data.progress) * (100 - data.progress)
          : 0;

        dispatch(updateProgress({
          progress: data.progress,
          message: data.message || 'Rendering...',
          elapsedTime: elapsed,
          estimatedRemaining: remaining,
        }));
      });

      // レンダリング実行
      const result = await window.api.python.render(timelineData, outputPath, options);

      removeProgressListener();

      if (result.success) {
        dispatch(exportSuccess());
      } else {
        dispatch(exportError(result.error || 'Unknown error'));
      }
    } catch (err) {
      dispatch(exportError(err.message));
    }
  };

  // キャンセル
  const handleCancel = async () => {
    if (isExporting) {
      try {
        await window.api.python.cancel();
      } catch (err) {
        console.error('Failed to cancel:', err);
      }
      dispatch(cancelExport());
    }
    dispatch(closeExportDialog());
  };

  // 設定変更
  const handleSettingChange = (key, value) => {
    dispatch(setExportSettings({ [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Export Video</h2>
          <button
            className="text-gray-400 hover:text-white text-xl"
            onClick={handleCancel}
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {isExporting ? (
            <ExportProgress
              progress={progress}
              currentTask={exportState.currentTask}
              elapsedTime={exportState.elapsedTime}
              estimatedRemaining={exportState.estimatedRemaining}
              error={error}
              outputPath={outputPath}
              onCancel={handleCancel}
            />
          ) : (
            <>
              {/* 解像度 */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Resolution</label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  value={settings.resolution}
                  onChange={(e) => handleSettingChange('resolution', e.target.value)}
                >
                  <option value="1080p">1080p (1920 x 1080)</option>
                  <option value="720p">720p (1280 x 720)</option>
                  <option value="480p">480p (854 x 480)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* カスタム解像度 */}
              {settings.resolution === 'custom' && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-300 mb-1">Width</label>
                    <input
                      type="number"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      value={settings.customWidth}
                      onChange={(e) => handleSettingChange('customWidth', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-300 mb-1">Height</label>
                    <input
                      type="number"
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      value={settings.customHeight}
                      onChange={(e) => handleSettingChange('customHeight', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* フレームレート */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Frame Rate</label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  value={settings.fps}
                  onChange={(e) => handleSettingChange('fps', parseInt(e.target.value))}
                >
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                  <option value={24}>24 fps</option>
                </select>
              </div>

              {/* 品質 */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Quality</label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  value={settings.quality}
                  onChange={(e) => handleSettingChange('quality', e.target.value)}
                >
                  <option value="high">High (slower)</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low (faster)</option>
                </select>
              </div>

              {/* 出力先 */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Output</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    value={outputPath}
                    placeholder="Select output file..."
                    readOnly
                  />
                  <button
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm"
                    onClick={handleSelectOutput}
                  >
                    Browse
                  </button>
                </div>
              </div>

              {/* エラー表示 */}
              {error && (
                <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        {!isExporting && (
          <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
            <button
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
              onClick={handleStartExport}
              disabled={!outputPath}
            >
              Export
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportDialog;
