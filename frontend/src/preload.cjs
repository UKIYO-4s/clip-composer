const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),

  // File operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  listFolderFiles: (folderPath, extensions) =>
    ipcRenderer.invoke('list-folder-files', { folderPath, extensions }),
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
    renderBatch: (timelineData, csvPath, outputDir, options = {}, parallel = false, maxWorkers = null) => ipcRenderer.invoke('python-invoke', {
      command: 'render_batch',
      params: { timelineData, csvPath, outputDir, options, parallel, maxWorkers }
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

    // 自動保存
    autoSave: (data) => ipcRenderer.invoke('auto-save-project', { data }),

    // 自動保存を復元
    getAutoSaves: () => ipcRenderer.invoke('get-auto-saves'),

    // 自動保存を削除
    deleteAutoSave: (filename) => ipcRenderer.invoke('delete-auto-save', { filename }),
  },

  // テンプレート操作
  templates: {
    // テンプレートとして保存
    save: (name, data) => ipcRenderer.invoke('save-template', { name, data }),

    // テンプレート一覧取得
    list: () => ipcRenderer.invoke('list-templates'),

    // テンプレートを読み込み
    load: (name) => ipcRenderer.invoke('load-template', { name }),

    // テンプレートを削除
    delete: (name) => ipcRenderer.invoke('delete-template', { name }),
  },

  // ファイルシステム操作
  fs: {
    // テキストファイル書き込み（CSVなど）
    writeTextFile: (path, content) => ipcRenderer.invoke('write-text-file', { path, content }),
  },

  // ライセンス認証
  license: {
    // ライセンス状態取得
    getStatus: () => ipcRenderer.invoke('license-get-status'),

    // ライセンスキー認証
    activate: (key) => ipcRenderer.invoke('license-activate', key),

    // トークン検証（再認証）
    verify: () => ipcRenderer.invoke('license-verify'),

    // デバイス解除
    deactivate: () => ipcRenderer.invoke('license-deactivate'),

    // オフライン猶予残り時間
    getGracePeriodRemaining: () => ipcRenderer.invoke('license-grace-remaining'),

    // メインウィンドウを起動（認証成功後）
    openMainWindow: () => ipcRenderer.invoke('license-open-main-window'),

    // 猶予期間警告リスナー
    onGraceWarning: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('license-grace-warning', handler);
      return () => ipcRenderer.removeListener('license-grace-warning', handler);
    },
  },
});
