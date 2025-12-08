const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

// UUID v4生成（crypto.randomUUID()を使用）
const uuidv4 = () => crypto.randomUUID();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let pythonProcess = null;
let pendingRequests = new Map();

// Python プロセス管理
class PythonBridge {
  constructor() {
    this.process = null;
    this.buffer = '';
    this.isReady = false;
  }

  start() {
    if (this.process) {
      console.log('Python process already running');
      return;
    }

    const pythonPath = isDev
      ? path.join(__dirname, '../../backend/venv/bin/python')
      : path.join(process.resourcesPath, 'backend/venv/bin/python');

    const scriptPath = isDev
      ? path.join(__dirname, '../../backend/main.py')
      : path.join(process.resourcesPath, 'backend/main.py');

    console.log('Starting Python process:', pythonPath, scriptPath);

    try {
      this.process = spawn(pythonPath, [scriptPath, '--ipc'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: isDev ? path.join(__dirname, '../../backend') : path.join(process.resourcesPath, 'backend'),
      });

      this.process.stdout.on('data', (data) => {
        this.handleOutput(data.toString());
      });

      this.process.stderr.on('data', (data) => {
        console.error('Python stderr:', data.toString());
        if (mainWindow) {
          mainWindow.webContents.send('python-error', {
            type: 'stderr',
            message: data.toString(),
          });
        }
      });

      this.process.on('error', (error) => {
        console.error('Python process error:', error);
        this.isReady = false;
      });

      this.process.on('close', (code) => {
        console.log('Python process exited with code:', code);
        this.process = null;
        this.isReady = false;
      });

      this.isReady = true;
      console.log('Python process started successfully');
    } catch (error) {
      console.error('Failed to start Python process:', error);
      this.isReady = false;
    }
  }

  handleOutput(data) {
    this.buffer += data;

    // 改行で区切ってJSONを解析
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // 最後の不完全な行を保持

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response = JSON.parse(line);
        this.handleResponse(response);
      } catch (error) {
        console.error('Failed to parse Python response:', line, error);
      }
    }
  }

  handleResponse(response) {
    const { id, status, data } = response;

    // 進捗通知
    if (status === 'progress') {
      if (mainWindow) {
        mainWindow.webContents.send('python-progress', data);
      }
      return;
    }

    // リクエストへのレスポンス
    const pending = pendingRequests.get(id);
    if (pending) {
      pendingRequests.delete(id);

      if (status === 'success') {
        pending.resolve(data);
      } else if (status === 'error') {
        pending.reject(new Error(data.message || 'Unknown error'));
      }
    }
  }

  async invoke(command, params) {
    if (!this.process || !this.isReady) {
      this.start();
      // 起動待ち
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!this.process) {
      throw new Error('Python process not available');
    }

    const id = uuidv4();
    const request = {
      id,
      command,
      params,
    };

    return new Promise((resolve, reject) => {
      // タイムアウト設定（長時間レンダリング用に長めに）
      const timeout = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, 600000); // 10分

      pendingRequests.set(id, {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      // リクエスト送信
      const jsonLine = JSON.stringify(request) + '\n';
      try {
        if (this.process && this.process.stdin && !this.process.stdin.destroyed) {
          this.process.stdin.write(jsonLine);
        } else {
          pendingRequests.delete(id);
          clearTimeout(timeout);
          reject(new Error('Python process stdin not available'));
        }
      } catch (writeError) {
        pendingRequests.delete(id);
        clearTimeout(timeout);
        reject(new Error('Failed to write to Python process: ' + writeError.message));
      }
    });
  }

  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isReady = false;
    }
  }
}

const pythonBridge = new PythonBridge();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Clip Composer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1e1e1e',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    pythonBridge.stop();
    app.quit();
  });

  // Python プロセスを起動（エラーがあってもアプリは起動する）
  try {
    pythonBridge.start();
  } catch (error) {
    console.error('Failed to start Python bridge:', error);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  pythonBridge.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('ping', () => {
  return 'pong';
});

// Python IPC handler
ipcMain.handle('python-invoke', async (event, { command, params }) => {
  try {
    const result = await pythonBridge.invoke(command, params);
    return { success: true, data: result };
  } catch (error) {
    console.error('Python invoke error:', error);
    return { success: false, error: error.message };
  }
});

// ファイル選択ダイアログ
ipcMain.handle('select-files', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: options.filters || [
      { name: 'Media Files', extensions: ['mp4', 'mov', 'avi', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'mp3', 'wav', 'ogg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) {
    return { canceled: true, filePaths: [] };
  }

  return { canceled: false, filePaths: result.filePaths };
});

// フォルダ選択ダイアログ
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });

  if (result.canceled) {
    return { canceled: true, folderPath: null };
  }

  return { canceled: false, folderPath: result.filePaths[0] };
});

// フォルダ内のファイル一覧取得
ipcMain.handle('list-folder-files', async (event, { folderPath, extensions }) => {
  const fs = require('fs').promises;
  const path = require('path');

  const MAX_FILES = 500;
  const allowedExtensions = extensions || ['.mp4', '.mov', '.avi', '.webm', '.mkv'];

  try {
    // パス正規化（セキュリティ）
    const realPath = await fs.realpath(folderPath);

    // ディレクトリか確認
    const stat = await fs.stat(realPath);
    if (!stat.isDirectory()) {
      return { ok: false, code: 'ENOTDIR', message: 'フォルダではありません' };
    }

    // ファイル一覧取得（withFileTypesで効率化）
    const entries = await fs.readdir(realPath, { withFileTypes: true });

    // フィルタリング
    const filteredFiles = entries
      .filter(entry => {
        if (!entry.isFile()) return false;
        const ext = path.extname(entry.name).toLowerCase();
        return allowedExtensions.includes(ext);
      })
      .map(entry => ({
        name: entry.name,
        path: path.join(realPath, entry.name),
      }));

    const totalCount = filteredFiles.length;
    const files = filteredFiles.slice(0, MAX_FILES);

    return { ok: true, files, totalCount };

  } catch (error) {
    const messages = {
      EACCES: 'アクセス権限がありません',
      ENOENT: 'フォルダが見つかりません',
    };
    return {
      ok: false,
      code: error.code || 'UNKNOWN',
      message: messages[error.code] || error.message,
    };
  }
});

// 保存先選択ダイアログ
ipcMain.handle('save-file', async (event, options = {}) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultPath || 'output.mp4',
    filters: options.filters || [
      { name: 'MP4 Video', extensions: ['mp4'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) {
    return { canceled: true, filePath: null };
  }

  return { canceled: false, filePath: result.filePath };
});

// プロジェクト保存ダイアログ
ipcMain.handle('show-save-dialog', async (event, options = {}) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultPath || 'Untitled.ccproj',
    filters: [
      { name: 'Clip Composer Project', extensions: ['ccproj'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) {
    return { canceled: true, filePath: null };
  }

  return { canceled: false, filePath: result.filePath };
});

// プロジェクト読み込みダイアログ
ipcMain.handle('show-open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Clip Composer Project', extensions: ['ccproj'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled) {
    return { canceled: true, filePath: null };
  }

  return { canceled: false, filePath: result.filePaths[0] };
});

// プロジェクト保存
ipcMain.handle('save-project', async (event, { path, data }) => {
  const fs = require('fs').promises;
  try {
    await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to save project:', error);
    return { success: false, error: error.message };
  }
});

// プロジェクト読み込み
ipcMain.handle('load-project', async (event, { path }) => {
  const fs = require('fs').promises;
  try {
    const content = await fs.readFile(path, 'utf8');
    const data = JSON.parse(content);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to load project:', error);
    return { success: false, error: error.message };
  }
});
