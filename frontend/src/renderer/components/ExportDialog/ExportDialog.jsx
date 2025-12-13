import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  closeExportDialog,
  setExportSettings,
  setExportMode,
  setCsvPath,
  startExport,
  startBatchExport,
  updateProgress,
  updateBatchProgress,
  addBatchError,
  incrementBatchSuccess,
  exportSuccess,
  batchExportComplete,
  clearBatchCompleted,
  exportError,
  cancelExport,
  selectExportState,
  selectExportSettings,
} from '../../store/exportSlice';
import { selectResolution, selectFps } from '../../store/timelineSlice';
import ExportProgress from './ExportProgress';
import { Button, Input, Select, IconButton } from '../ui';

// CSVセル値のエスケープ処理
const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // カンマ、引用符、改行を含む場合は引用符で囲む
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// タイムラインから可変要素を抽出してCSVカラムを生成
const extractCsvColumns = (timeline) => {
  const columns = new Set(['動画名']); // 必須カラム

  const { layers } = timeline;

  Object.values(layers).forEach((layer) => {
    layer.clips.forEach((clip) => {
      // CSVテキストプレースホルダー
      if (clip.type === 'csv_text_placeholder' && clip.csvColumnName) {
        columns.add(clip.csvColumnName);
      }

      // 可変テキスト（テンプレート内の変数）
      if (clip.type === 'variable_text' && clip.variables) {
        clip.variables.forEach((varName) => {
          columns.add(varName);
        });
      }

      // ランダムレイヤー
      if (clip.type === 'random_layer' && clip.randomColumnName) {
        columns.add(clip.randomColumnName);
      }
    });
  });

  return Array.from(columns);
};

function ExportDialog() {
  const dispatch = useDispatch();
  const exportState = useSelector(selectExportState);
  const settings = useSelector(selectExportSettings);
  const timeline = useSelector((state) => state.timeline);
  const projectResolution = useSelector(selectResolution);
  const projectFps = useSelector(selectFps);

  const [outputPath, setOutputPath] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [parallelProcessing, setParallelProcessing] = useState(false);
  const [maxWorkers, setMaxWorkers] = useState(null); // null = auto

  const {
    isExporting,
    isDialogOpen,
    progress,
    error,
    exportMode,
    csvPath,
    batchProgress,
    batchCompleted,
  } = exportState;

  // タイムラインから抽出したCSVカラム（hooksは条件付きreturnの前に呼ぶ必要がある）
  const csvColumns = useMemo(() => extractCsvColumns(timeline), [timeline]);

  // ダイアログが開いていなければ何も表示しない
  if (!isDialogOpen) return null;

  // 出力先選択（単発書き出し用）
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

  // 出力ディレクトリ選択（CSV一括書き出し用）
  const handleSelectOutputDir = async () => {
    try {
      const result = await window.api.selectDirectory({
        title: '出力先フォルダを選択',
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        setOutputPath(result.filePaths[0]);
      }
    } catch (err) {
      console.error('Failed to select output directory:', err);
    }
  };

  // CSVファイル選択
  const handleSelectCsv = async () => {
    try {
      const result = await window.api.openFile({
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        properties: ['openFile'],
      });
      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        dispatch(setCsvPath(result.filePaths[0]));
      }
    } catch (err) {
      console.error('Failed to select CSV file:', err);
    }
  };

  // 書き出しモード変更
  const handleModeChange = (mode) => {
    dispatch(setExportMode(mode));
    setOutputPath('');
  };

  // CSVテンプレートをエクスポート
  const handleExportTemplate = async () => {
    try {
      const result = await window.api.saveFile({
        defaultPath: 'template.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });

      if (result.canceled || !result.filePath) {
        return;
      }

      // CSVヘッダー行を生成（エスケープ処理付き）
      const headerRow = csvColumns.map(escapeCsvValue).join(',');
      // サンプル行を生成
      const sampleRow = csvColumns.map((col) => {
        if (col === '動画名') return escapeCsvValue('video_001');
        return escapeCsvValue(`[${col}の値]`);
      }).join(',');

      // BOM付きUTF-8でExcelでの文字化けを防ぐ
      const bom = '\uFEFF';
      const csvContent = `${bom}${headerRow}\n${sampleRow}\n`;

      // ファイルに書き込み（Electron API経由）
      const writeResult = await window.api.fs.writeTextFile(result.filePath, csvContent);

      if (writeResult.success) {
        alert(`CSVテンプレートを保存しました:\n${result.filePath}\n\nカラム: ${csvColumns.join(', ')}`);
      } else {
        alert('CSVテンプレートの保存に失敗しました');
      }
    } catch (err) {
      console.error('Failed to export CSV template:', err);
      alert('CSVテンプレートの保存中にエラーが発生しました');
    }
  };

  // 解像度取得（プロジェクト設定から）
  const getResolution = () => {
    return projectResolution;
  };

  // 書き出し開始
  const handleStartExport = async () => {
    if (exportMode === 'single') {
      await handleSingleExport();
    } else {
      await handleBatchExport();
    }
  };

  // 単発書き出し
  const handleSingleExport = async () => {
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
      fps: projectFps,
      codec: settings.codec,
      quality: settings.quality,
    };

    // 開始時刻をローカル変数で保持（クロージャでキャプチャ）
    const exportStartTime = Date.now();
    dispatch(startExport({ outputPath }));
    setStartTime(exportStartTime);

    try {
      // 進捗リスナーを設定
      const removeProgressListener = window.api.python.onProgress((data) => {
        const elapsed = (Date.now() - exportStartTime) / 1000;
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

  // CSV一括書き出し
  const handleBatchExport = async () => {
    if (!csvPath) {
      alert('CSVファイルを選択してください');
      return;
    }
    if (!outputPath) {
      alert('出力先フォルダを選択してください');
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
      fps: projectFps,
      codec: settings.codec,
      quality: settings.quality,
    };

    // 開始時刻をローカル変数で保持（クロージャでキャプチャ）
    const batchStartTime = Date.now();
    dispatch(startBatchExport({ total: 0 }));
    setStartTime(batchStartTime);

    try {
      // 進捗リスナーを設定
      const removeProgressListener = window.api.python.onProgress((data) => {
        // バッチ処理の進捗を処理
        if (data.current !== undefined && data.total !== undefined) {
          dispatch(updateBatchProgress({
            current: data.current,
            total: data.total,
            message: data.message || `処理中... (${data.current}/${data.total})`,
          }));
        }

        // 行単位の結果を処理
        if (data.type === 'row_result') {
          if (data.success) {
            dispatch(incrementBatchSuccess());
          } else {
            dispatch(addBatchError({
              row: data.row_number,
              videoName: data.video_name,
              error: data.error,
            }));
          }
        }
      });

      // CSV一括レンダリング実行（並列処理オプション付き）
      const result = await window.api.python.renderBatch(timelineData, csvPath, outputPath, options, parallelProcessing, maxWorkers);

      removeProgressListener();

      if (result.success) {
        dispatch(batchExportComplete(result.data));
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

  // エラーログをCSVで出力
  const handleExportErrorLog = async () => {
    if (batchProgress.errors.length === 0) return;

    try {
      const result = await window.api.saveFile({
        defaultPath: 'error_log.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });

      if (result.canceled || !result.filePath) return;

      // エラーログCSVを生成
      const bom = '\uFEFF';
      const header = '行番号,動画名,エラー内容';
      const rows = batchProgress.errors.map((err) =>
        `${err.row},${escapeCsvValue(err.videoName)},${escapeCsvValue(err.error)}`
      );
      const csvContent = `${bom}${header}\n${rows.join('\n')}\n`;

      const writeResult = await window.api.fs.writeTextFile(result.filePath, csvContent);

      if (writeResult.success) {
        alert(`エラーログを保存しました:\n${result.filePath}`);
      } else {
        alert('エラーログの保存に失敗しました');
      }
    } catch (err) {
      console.error('Failed to export error log:', err);
      alert('エラーログの保存中にエラーが発生しました');
    }
  };

  // バッチ完了後にダイアログを閉じる
  const handleCloseBatchComplete = () => {
    dispatch(clearBatchCompleted());
    dispatch(closeExportDialog());
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
          {batchCompleted ? (
            /* バッチ完了サマリー */
            <div className="space-y-4">
              <div className="text-center py-4">
                {batchProgress.errorCount === 0 ? (
                  <div className="text-accent-green text-4xl mb-2">✓</div>
                ) : (
                  <div className="text-accent-yellow text-4xl mb-2">⚠</div>
                )}
                <h3 className="text-lg font-semibold text-white mb-1">
                  {batchProgress.errorCount === 0 ? '書き出し完了' : '書き出し完了（一部エラー）'}
                </h3>
                <p className="text-sm text-ink-secondary">
                  {batchProgress.total}件中{batchProgress.successCount}件が正常に書き出されました
                </p>
              </div>

              {/* 結果サマリー */}
              <div className="p-3 rounded border border-line bg-surface text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-ink-secondary">合計:</span>
                  <span className="text-white font-semibold">{batchProgress.total}件</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-ink-secondary">成功:</span>
                  <span className="text-accent-green font-semibold">{batchProgress.successCount}件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-secondary">失敗:</span>
                  <span className={`font-semibold ${batchProgress.errorCount > 0 ? 'text-accent-red' : 'text-ink-muted'}`}>
                    {batchProgress.errorCount}件
                  </span>
                </div>
              </div>

              {/* エラーがある場合の詳細とログ出力 */}
              {batchProgress.errors.length > 0 && (
                <div className="p-3 rounded border border-accent-red/30 bg-accent-red/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-accent-red">エラー詳細</span>
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={handleExportErrorLog}
                    >
                      エラーログ出力
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {batchProgress.errors.map((err, idx) => (
                      <div key={idx} className="text-xs text-accent-red">
                        行{err.row} ({err.videoName}): {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCloseBatchComplete}
                >
                  閉じる
                </Button>
              </div>
            </div>
          ) : isExporting ? (
            <>
              <ExportProgress
                progress={progress}
                currentTask={exportState.currentTask}
                elapsedTime={exportState.elapsedTime}
                estimatedRemaining={exportState.estimatedRemaining}
                error={error}
                outputPath={outputPath}
                onCancel={handleCancel}
              />
              {/* バッチ処理の進捗詳細 */}
              {exportMode === 'batch' && batchProgress.total > 0 && (
                <div className="mt-4 p-3 rounded border border-line bg-surface text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-ink-secondary">進捗:</span>
                    <span className="text-white font-semibold">
                      {batchProgress.current} / {batchProgress.total}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-ink-secondary">成功:</span>
                    <span className="text-accent-green">{batchProgress.successCount}件</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">失敗:</span>
                    <span className="text-accent-red">{batchProgress.errorCount}件</span>
                  </div>
                  {batchProgress.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-line">
                      <div className="text-ink-secondary mb-1">エラー詳細:</div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {batchProgress.errors.map((err, idx) => (
                          <div key={idx} className="text-xs text-accent-red">
                            行{err.row} ({err.videoName}): {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* 書き出しモード選択 */}
              <div>
                <label className="mb-2 block text-sm text-ink-secondary">書き出しモード</label>
                <div className="flex gap-2">
                  <Button
                    variant={exportMode === 'single' ? 'primary' : 'subtle'}
                    size="md"
                    onClick={() => handleModeChange('single')}
                    className="flex-1"
                  >
                    単発書き出し
                  </Button>
                  <Button
                    variant={exportMode === 'batch' ? 'primary' : 'subtle'}
                    size="md"
                    onClick={() => handleModeChange('batch')}
                    className="flex-1"
                  >
                    CSV一括書き出し
                  </Button>
                </div>
              </div>

              {/* CSV一括書き出しの場合のCSV選択 */}
              {exportMode === 'batch' && (
                <>
                  {/* 検出されたCSVカラム */}
                  <div className="p-3 rounded bg-surface-sunken border border-line">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-ink-muted">検出された可変要素</div>
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={handleExportTemplate}
                        disabled={csvColumns.length <= 1}
                      >
                        テンプレート出力
                      </Button>
                    </div>
                    {csvColumns.length > 1 ? (
                      <div className="flex flex-wrap gap-1">
                        {csvColumns.map((col) => (
                          <span
                            key={col}
                            className="px-2 py-0.5 text-xs rounded bg-accent-blue/20 text-accent-blue"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-ink-muted">
                        可変テキストやランダムレイヤーが検出されませんでした
                      </div>
                    )}
                  </div>

                  {/* CSVファイル選択 */}
                  <div>
                    <label className="mb-1 block text-sm text-ink-secondary">CSVファイル</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={csvPath || ''}
                        placeholder="CSVファイルを選択..."
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        variant="subtle"
                        size="md"
                        onClick={handleSelectCsv}
                      >
                        参照
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* プロジェクト設定（読み取り専用） */}
              <div className="p-3 rounded bg-surface-sunken border border-line">
                <div className="text-xs text-ink-muted mb-2">プロジェクト設定</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">解像度:</span>
                    <span className="text-white font-medium">{projectResolution.width} × {projectResolution.height}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">フレームレート:</span>
                    <span className="text-white font-medium">{projectFps} fps</span>
                  </div>
                </div>
              </div>

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

              {/* 並列処理オプション（CSV一括書き出しのみ） */}
              {exportMode === 'batch' && (
                <div className="p-3 rounded bg-surface-sunken border border-line">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="parallelProcessing"
                      checked={parallelProcessing}
                      onChange={(e) => setParallelProcessing(e.target.checked)}
                      className="w-4 h-4 rounded border-line bg-surface text-accent-blue focus:ring-accent-blue"
                    />
                    <label htmlFor="parallelProcessing" className="text-sm text-white cursor-pointer">
                      並列処理を有効にする
                    </label>
                  </div>
                  {parallelProcessing && (
                    <div className="mt-2 text-xs text-ink-muted">
                      複数のCPUコアを使用して動画を同時に生成します。
                      大量の動画を書き出す際に処理速度が向上しますが、
                      メモリ使用量が増加します。
                    </div>
                  )}
                </div>
              )}

              {/* 出力先 */}
              <div>
                <label className="mb-1 block text-sm text-ink-secondary">
                  {exportMode === 'single' ? '出力先' : '出力先フォルダ'}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={outputPath}
                    placeholder={exportMode === 'single' ? '出力ファイルを選択...' : '出力先フォルダを選択...'}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="subtle"
                    size="md"
                    onClick={exportMode === 'single' ? handleSelectOutput : handleSelectOutputDir}
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
        {!isExporting && !batchCompleted && (
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
              disabled={exportMode === 'single' ? !outputPath : (!csvPath || !outputPath)}
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
