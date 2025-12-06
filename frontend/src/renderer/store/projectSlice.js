import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  name: 'Untitled Project',
  path: null,
  isDirty: false,
  lastSaved: null,
  recentFiles: [],
  version: '1.0',
  settings: {
    fps: 30,
    resolution: {
      width: 1920,
      height: 1080,
    },
  },
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    newProject: (state) => {
      state.name = 'Untitled Project';
      state.path = null;
      state.isDirty = false;
      state.lastSaved = null;
    },
    setProjectInfo: (state, action) => {
      const { name, path } = action.payload;
      if (name !== undefined) state.name = name;
      if (path !== undefined) state.path = path;
    },
    setDirty: (state, action) => {
      state.isDirty = action.payload;
    },
    setLastSaved: (state, action) => {
      state.lastSaved = action.payload;
      state.isDirty = false;
    },
    addRecentFile: (state, action) => {
      const filePath = action.payload;
      // 重複を削除
      state.recentFiles = state.recentFiles.filter((f) => f !== filePath);
      // 先頭に追加
      state.recentFiles.unshift(filePath);
      // 最大10件まで
      if (state.recentFiles.length > 10) {
        state.recentFiles = state.recentFiles.slice(0, 10);
      }
    },
    removeRecentFile: (state, action) => {
      state.recentFiles = state.recentFiles.filter((f) => f !== action.payload);
    },
    clearRecentFiles: (state) => {
      state.recentFiles = [];
    },
    setProjectSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    loadProjectState: (state, action) => {
      const { name, path, settings, version } = action.payload;
      state.name = name || 'Untitled Project';
      state.path = path || null;
      state.settings = settings || initialState.settings;
      state.version = version || '1.0';
      state.isDirty = false;
      state.lastSaved = new Date().toISOString();
    },
  },
});

export const {
  newProject,
  setProjectInfo,
  setDirty,
  setLastSaved,
  addRecentFile,
  removeRecentFile,
  clearRecentFiles,
  setProjectSettings,
  loadProjectState,
} = projectSlice.actions;

export default projectSlice.reducer;

// セレクター
export const selectProjectName = (state) => state.project.name;
export const selectProjectPath = (state) => state.project.path;
export const selectIsDirty = (state) => state.project.isDirty;
export const selectLastSaved = (state) => state.project.lastSaved;
export const selectRecentFiles = (state) => state.project.recentFiles;
export const selectProjectSettings = (state) => state.project.settings;
