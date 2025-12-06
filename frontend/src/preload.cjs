const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),

  // File operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  loadCSV: (path) => ipcRenderer.invoke('load-csv', path),

  // Export operations
  exportVideo: (data) => ipcRenderer.invoke('export-video', data),

  // Progress listener
  onExportProgress: (callback) => {
    ipcRenderer.on('export-progress', (event, data) => callback(data));
  },

  // Cleanup
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
