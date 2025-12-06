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
    resolution: '1080p',
    customWidth: 1920,
    customHeight: 1080,
    fps: 30,
    quality: 'medium',
    codec: 'libx264',
  },
};

// 解像度プリセット
export const resolutionPresets = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
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
    startExport: (state, action) => {
      state.isExporting = true;
      state.progress = 0;
      state.currentTask = 'Initializing...';
      state.elapsedTime = 0;
      state.estimatedRemaining = 0;
      state.error = null;
      state.outputPath = action.payload.outputPath;
    },
    updateProgress: (state, action) => {
      const { progress, message, elapsedTime, estimatedRemaining } = action.payload;
      if (progress !== undefined) state.progress = progress;
      if (message !== undefined) state.currentTask = message;
      if (elapsedTime !== undefined) state.elapsedTime = elapsedTime;
      if (estimatedRemaining !== undefined) state.estimatedRemaining = estimatedRemaining;
    },
    exportSuccess: (state) => {
      state.isExporting = false;
      state.progress = 100;
      state.currentTask = 'Complete!';
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
  startExport,
  updateProgress,
  exportSuccess,
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
