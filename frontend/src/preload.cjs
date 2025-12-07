const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),

  // File operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectDirectory: (options) => ipcRenderer.invoke('select-directory', options),
  selectFiles: (options) => ipcRenderer.invoke('select-files', options),
  openFile: (options) => ipcRenderer.invoke('open-file', options),
  loadCSV: (path) => ipcRenderer.invoke('load-csv', path),

  // Python Backend IPC
  python: {
    // 汎用コマンド呼び出し
    invoke: (command, params = {}) => ipcRenderer.invoke('python-invoke', { command, params }),

    // 動画情報取得
    getInfo: (filePath) => ipcRenderer.invoke('python-invoke', {
      command: 'get_info',
      params: { filePath }
    }),

    // レンダリング開始
    render: (timelineData, outputPath, options = {}) => ipcRenderer.invoke('python-invoke', {
      command: 'render',
      params: { timelineData, outputPath, options }
    }),

    // CSV一括レンダリング開始
    renderBatch: (timelineData, csvPath, outputDir, options = {}) => ipcRenderer.invoke('python-invoke', {
      command: 'render_batch',
      params: { timelineData, csvPath, outputDir, options }
    }),

    // レンダリングキャンセル
    cancel: () => ipcRenderer.invoke('python-invoke', {
      command: 'cancel',
      params: {}
    }),

    // 進捗リスナー
    onProgress: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('python-progress', handler);
      return () => ipcRenderer.removeListener('python-progress', handler);
    },

    // エラーリスナー
    onError: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('python-error', handler);
      return () => ipcRenderer.removeListener('python-error', handler);
    },
  },

  // Save file dialog
  saveFile: (options) => ipcRenderer.invoke('save-file', options),

  // Export operations (legacy)
  exportVideo: (data) => ipcRenderer.invoke('export-video', data),

  // Progress listener (legacy)
  onExportProgress: (callback) => {
    ipcRenderer.on('export-progress', (event, data) => callback(data));
  },

  // Cleanup
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Project operations
  project: {
    // 保存ダイアログを表示
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

    // 読み込みダイアログを表示
    showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),

    // プロジェクトを保存
    save: (path, data) => ipcRenderer.invoke('save-project', { path, data }),

    // プロジェクトを読み込み
    load: (path) => ipcRenderer.invoke('load-project', { path }),
  },
});
