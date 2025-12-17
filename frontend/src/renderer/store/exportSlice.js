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
  // タイマー更新用
  exportStartTime: null,        // エクスポート開始時刻（Date.now()）
  lastProgressPercent: 0,       // 最後に受け取った進捗率（0-100）
  lastProgressTimestamp: null,  // 最後に進捗を受け取った時刻
  settings: {
    resolution: '1080x1920',  // 縦動画デフォルト（TikTok/Reels/Shorts）
    customWidth: 1080,
    customHeight: 1920,
    fps: 30,
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
  // バッチETA表示フラグ（1本目完了までfalse）
  showBatchEta: false,
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
      // タイマー用（0.001で初期化してETA計算を即時開始）
      state.exportStartTime = action.payload.startTime || Date.now();
      state.lastProgressPercent = 0.001;
      state.lastProgressTimestamp = Date.now();
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
      state.showBatchEta = false; // 1本目完了までETA非表示
      state.batchProgress = {
        current: 0,
        total: action.payload.total || 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
      };
      // タイマー用（0.001で初期化してETA計算を即時開始）
      state.exportStartTime = action.payload.startTime || Date.now();
      state.lastProgressPercent = 0.001;
      state.lastProgressTimestamp = Date.now();
    },
    updateProgress: (state, action) => {
      const { progress, message, elapsedTime, estimatedRemaining } = action.payload;
      if (progress !== undefined && progress >= 0) {
        state.progress = progress;
        // 有効な進捗の場合のみタイマー用stateを更新
        state.lastProgressPercent = progress;
        state.lastProgressTimestamp = Date.now();
      }
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

      // 1本目完了後にETA表示を有効化
      if (state.batchProgress.current >= 1 && !state.showBatchEta) {
        state.showBatchEta = true;
      }

      // 進捗率を計算
      if (state.batchProgress.total > 0) {
        const newProgress = (state.batchProgress.current / state.batchProgress.total) * 100;
        state.progress = newProgress;
        // タイマー用stateを更新
        state.lastProgressPercent = newProgress;
        state.lastProgressTimestamp = Date.now();
      }
    },
    // タイマーからの時間更新専用（進捗率は変更しない）
    updateTimeOnly: (state, action) => {
      const { elapsedTime, estimatedRemaining } = action.payload;
      if (elapsedTime !== undefined) state.elapsedTime = elapsedTime;
      if (estimatedRemaining !== undefined) state.estimatedRemaining = estimatedRemaining;
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
  updateTimeOnly,
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
export const selectShowBatchEta = (state) => state.export.showBatchEta;
