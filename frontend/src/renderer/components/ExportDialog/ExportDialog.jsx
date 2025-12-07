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
import { Button, Input, Select, IconButton } from '../ui';

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
          message: data.message || 'レンダリング中...',
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
        dispatch(exportError(result.error || '不明なエラー'));
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
      <div className="w-full max-w-md rounded-lg border border-line bg-surface-raised shadow-xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-lg font-semibold text-white">動画をエクスポート</h2>
          <IconButton
            variant="ghost"
            onClick={handleCancel}
            className="text-xl"
          >
            ✕
          </IconButton>
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
              <Select
                label="解像度"
                value={settings.resolution}
                onChange={(e) => handleSettingChange('resolution', e.target.value)}
                options={[
                  { value: '1080p', label: '1080p (1920 x 1080)' },
                  { value: '720p', label: '720p (1280 x 720)' },
                  { value: '480p', label: '480p (854 x 480)' },
                  { value: 'custom', label: 'カスタム' },
                ]}
                className="w-full"
              />

              {/* カスタム解像度 */}
              {settings.resolution === 'custom' && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    label="幅"
                    value={settings.customWidth}
                    onChange={(e) => handleSettingChange('customWidth', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    label="高さ"
                    value={settings.customHeight}
                    onChange={(e) => handleSettingChange('customHeight', parseInt(e.target.value))}
                    className="flex-1"
                  />
                </div>
              )}

              {/* フレームレート */}
              <Select
                label="フレームレート"
                value={settings.fps}
                onChange={(e) => handleSettingChange('fps', parseInt(e.target.value))}
                options={[
                  { value: 30, label: '30 fps' },
                  { value: 60, label: '60 fps' },
                  { value: 24, label: '24 fps' },
                ]}
                className="w-full"
              />

              {/* 品質 */}
              <Select
                label="品質"
                value={settings.quality}
                onChange={(e) => handleSettingChange('quality', e.target.value)}
                options={[
                  { value: 'high', label: '高（低速）' },
                  { value: 'medium', label: '中' },
                  { value: 'low', label: '低（高速）' },
                ]}
                className="w-full"
              />

              {/* 出力先 */}
              <div>
                <label className="mb-1 block text-sm text-ink-secondary">出力先</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={outputPath}
                    placeholder="出力ファイルを選択..."
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="subtle"
                    size="md"
                    onClick={handleSelectOutput}
                  >
                    参照
                  </Button>
                </div>
              </div>

              {/* エラー表示 */}
              {error && (
                <div className="rounded border border-accent-red/50 bg-accent-red/10 p-3 text-sm text-accent-red">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* フッター */}
        {!isExporting && (
          <div className="flex justify-end gap-2 border-t border-line p-4">
            <Button
              variant="ghost"
              size="md"
              onClick={handleCancel}
            >
              キャンセル
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleStartExport}
              disabled={!outputPath}
            >
              エクスポート
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportDialog;
