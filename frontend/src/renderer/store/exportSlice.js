import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isExporting: false,
  isDialogOpen: false,
  progress: 0,
  currentTask: '',
  elapsedTime: 0,
  estimatedRemaining: 0,
  error: null,
  outputPath: null,
  settings: {
    resolution: '1080x1920',  // 縦動画デフォルト（TikTok/Reels/Shorts）
    customWidth: 1080,
    customHeight: 1920,
    fps: 30,
    quality: 'medium',
    codec: 'libx264',
  },
  // CSV一括書き出し用
  exportMode: 'single', // 'single' or 'batch'
  csvPath: null,
  batchProgress: {
    current: 0,
    total: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
  },
  // バッチ完了状態
  batchCompleted: false,
  failedRows: [], // リトライ用に失敗した行データを保持
};

// 解像度プリセット
export const resolutionPresets = {
  // 横動画
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  // 縦動画（TikTok/Reels/Shorts）
  '1080x1920': { width: 1080, height: 1920 },
  '720x1280': { width: 720, height: 1280 },
  // 正方形
  '1080x1080': { width: 1080, height: 1080 },
  'custom': null,
};

// 品質プリセット
export const qualityPresets = {
  high: { preset: 'slow', crf: 18 },
  medium: { preset: 'medium', crf: 23 },
  low: { preset: 'fast', crf: 28 },
};

const exportSlice = createSlice({
  name: 'export',
  initialState,
  reducers: {
    openExportDialog: (state) => {
      state.isDialogOpen = true;
      state.error = null;
    },
    closeExportDialog: (state) => {
      state.isDialogOpen = false;
    },
    setExportSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setExportMode: (state, action) => {
      state.exportMode = action.payload;
      state.csvPath = null;
      state.batchProgress = {
        current: 0,
        total: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };
    },
    setCsvPath: (state, action) => {
      state.csvPath = action.payload;
    },
    startExport: (state, action) => {
      state.isExporting = true;
      state.progress = 0;
      state.currentTask = 'Initializing...';
      state.elapsedTime = 0;
      state.estimatedRemaining = 0;
      state.error = null;
      state.outputPath = action.payload.outputPath;
    },
    startBatchExport: (state, action) => {
      state.isExporting = true;
      state.progress = 0;
      state.currentTask = 'CSV一括書き出しを開始...';
      state.elapsedTime = 0;
      state.estimatedRemaining = 0;
      state.error = null;
      state.batchCompleted = false;
      state.failedRows = [];
      state.batchProgress = {
        current: 0,
        total: action.payload.total || 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };
    },
    updateProgress: (state, action) => {
      const { progress, message, elapsedTime, estimatedRemaining } = action.payload;
      if (progress !== undefined) state.progress = progress;
      if (message !== undefined) state.currentTask = message;
      if (elapsedTime !== undefined) state.elapsedTime = elapsedTime;
      if (estimatedRemaining !== undefined) state.estimatedRemaining = estimatedRemaining;
    },
    updateBatchProgress: (state, action) => {
      const { current, total, message, elapsedTime, estimatedRemaining } = action.payload;
      if (current !== undefined) state.batchProgress.current = current;
      if (total !== undefined) state.batchProgress.total = total;
      if (message !== undefined) state.currentTask = message;
      if (elapsedTime !== undefined) state.elapsedTime = elapsedTime;
      if (estimatedRemaining !== undefined) state.estimatedRemaining = estimatedRemaining;

      // 進捗率を計算
      if (state.batchProgress.total > 0) {
        state.progress = (state.batchProgress.current / state.batchProgress.total) * 100;
      }
    },
    addBatchError: (state, action) => {
      state.batchProgress.errorCount += 1;
      state.batchProgress.errors.push(action.payload);
      // リトライ用に失敗した行データを保存
      if (action.payload.rowData) {
        state.failedRows.push({
          row: action.payload.row,
          videoName: action.payload.videoName,
          error: action.payload.error,
          rowData: action.payload.rowData,
        });
      }
    },
    incrementBatchSuccess: (state) => {
      state.batchProgress.successCount += 1;
    },
    exportSuccess: (state) => {
      state.isExporting = false;
      state.progress = 100;
      state.currentTask = 'Complete!';
    },
    batchExportComplete: (state, action) => {
      state.isExporting = false;
      state.progress = 100;
      state.batchCompleted = true;
      const { successCount, errorCount } = state.batchProgress;
      state.currentTask = `完了: 成功 ${successCount}件 / 失敗 ${errorCount}件`;
    },
    clearBatchCompleted: (state) => {
      state.batchCompleted = false;
      state.failedRows = [];
      state.batchProgress = {
        current: 0,
        total: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };
    },
    exportError: (state, action) => {
      state.isExporting = false;
      state.error = action.payload;
      state.currentTask = 'Error';
    },
    cancelExport: (state) => {
      state.isExporting = false;
      state.currentTask = 'Cancelled';
    },
    resetExport: (state) => {
      state.isExporting = false;
      state.progress = 0;
      state.currentTask = '';
      state.elapsedTime = 0;
      state.estimatedRemaining = 0;
      state.error = null;
    },
  },
});

export const {
  openExportDialog,
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
  resetExport,
} = exportSlice.actions;

export default exportSlice.reducer;

// セレクター
export const selectExportState = (state) => state.export;
export const selectIsExporting = (state) => state.export.isExporting;
export const selectIsDialogOpen = (state) => state.export.isDialogOpen;
export const selectExportProgress = (state) => state.export.progress;
export const selectExportSettings = (state) => state.export.settings;
