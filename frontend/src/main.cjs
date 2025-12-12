const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { getLicenseManager } = require('./license/LicenseManager.cjs');

// UUID v4生成（crypto.randomUUID()を使用）
const uuidv4 = () => crypto.randomUUID();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ライセンスマネージャーインスタンス
const licenseManager = getLicenseManager();

let mainWindow = null;
let licenseWindow = null;
let pythonProcess = null;
let pendingRequests = new Map();

// ライセンス状態
let licenseStatus = {
  valid: false,
  gracePeriod: false,
  remainingHours: 0,
};

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

    // Python パスを解決
    const fs = require('fs');
    let executablePath;
    let executableArgs;
    let backendDir;

    if (isDev) {
      // 開発環境: venv を使用
      const pythonPath = path.join(__dirname, '../../backend/venv/bin/python');
      const scriptPath = path.join(__dirname, '../../backend/main.py');
      executablePath = pythonPath;
      executableArgs = [scriptPath, '--ipc'];
      backendDir = path.join(__dirname, '../../backend');
    } else {
      // 本番環境: PyInstallerでビルドされた実行ファイルを使用
      const bundledBackend = path.join(process.resourcesPath, 'backend/clip_composer_backend');

      if (fs.existsSync(bundledBackend)) {
        executablePath = bundledBackend;
        executableArgs = ['--ipc'];
        backendDir = path.join(process.resourcesPath, 'backend');
        console.log('Using bundled PyInstaller backend');
      } else {
        // フォールバック: システムPythonを使用
        console.log('Bundled backend not found, falling back to system Python');
        const scriptPath = path.join(process.resourcesPath, 'backend/main.py');
        executablePath = 'python3';
        executableArgs = [scriptPath, '--ipc'];
        backendDir = path.join(process.resourcesPath, 'backend');
      }
    }

    // FFmpegパスを設定
    let ffmpegDir;
    if (isDev) {
      // 開発環境: システムのFFmpegを使用
      ffmpegDir = '/usr/local/bin';
    } else {
      // 本番環境: バンドルされたFFmpegを使用
      ffmpegDir = path.join(process.resourcesPath, 'bin');
    }

    console.log('Starting backend process:', executablePath, executableArgs.join(' '));
    console.log('FFmpeg directory:', ffmpegDir);

    try {
      this.process = spawn(executablePath, executableArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: backendDir,
        env: {
          ...process.env,
          // PYTHONPATH を設定してモジュールを見つけやすくする
          PYTHONPATH: backendDir,
          // FFmpegのパスを追加
          PATH: `${ffmpegDir}:${process.env.PATH}`,
          // MoviePy用のFFmpegパス
          IMAGEIO_FFMPEG_EXE: path.join(ffmpegDir, 'ffmpeg'),
        },
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

/**
 * ライセンス入力ウィンドウを作成
 */
function createLicenseWindow() {
  licenseWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Clip Composer - ライセンス認証',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1e1e1e',
  });

  if (isDev) {
    // 開発環境: ライセンス画面用のルートを使用
    licenseWindow.loadURL('http://localhost:5173/#/license');
  } else {
    licenseWindow.loadFile(path.join(__dirname, '../build/index.html'), {
      hash: '/license',
    });
  }

  licenseWindow.on('closed', () => {
    licenseWindow = null;
    // ライセンス画面を閉じたらアプリ終了
    if (!mainWindow) {
      app.quit();
    }
  });
}

/**
 * 猶予期間警告を表示
 */
function showGracePeriodWarning(remainingHours) {
  if (mainWindow) {
    mainWindow.webContents.send('license-grace-warning', {
      remainingHours,
      message: `オフライン猶予期間: 残り約${remainingHours}時間`,
    });
  }
}

/**
 * 起動時ライセンスチェック
 */
async function checkLicenseOnStartup() {
  try {
    await licenseManager.initialize();
    const result = await licenseManager.verifyToken();

    licenseStatus = {
      valid: result.valid,
      gracePeriod: result.gracePeriod || false,
      remainingHours: result.remainingHours || 0,
    };

    if (result.valid) {
      // ライセンス有効: メインウィンドウを起動
      createWindow();

      // 猶予期間中なら警告表示
      if (result.gracePeriod) {
        setTimeout(() => {
          showGracePeriodWarning(result.remainingHours);
        }, 2000);
      }
    } else {
      // ライセンス無効: ライセンス入力画面を表示
      console.log('License invalid:', result.reason);
      createLicenseWindow();
    }
  } catch (error) {
    console.error('License check failed:', error);
    // エラー時もライセンス入力画面を表示
    createLicenseWindow();
  }
}

app.whenReady().then(() => {
  // テスト配布用: ライセンスチェックをスキップ
  // TODO: 販売時にはこのフラグをfalseに変更すること
  const SKIP_LICENSE_FOR_TESTING = true;

  // 開発環境ではライセンスチェックをスキップ可能
  const skipLicenseCheck = SKIP_LICENSE_FOR_TESTING || (isDev && process.env.SKIP_LICENSE_CHECK === 'true');

  if (skipLicenseCheck) {
    console.log('Skipping license check (testing/development mode)');
    createWindow();
  } else {
    checkLicenseOnStartup();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (licenseStatus.valid) {
        createWindow();
      } else {
        createLicenseWindow();
      }
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

// CSVファイル読み込み
ipcMain.handle('load-csv', async (event, csvPath) => {
  const fs = require('fs').promises;
  try {
    const content = await fs.readFile(csvPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return { success: false, error: 'CSVファイルが空です' };
    }

    // ヘッダー行を解析
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // データ行を解析
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return { success: true, data: { headers, rows, totalRows: rows.length } };
  } catch (error) {
    console.error('Failed to load CSV:', error);
    return { success: false, error: error.message };
  }
});

// テキストファイル書き込み（CSVテンプレートなど）
ipcMain.handle('write-text-file', async (event, { path, content }) => {
  const fs = require('fs').promises;
  try {
    await fs.writeFile(path, content, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to write text file:', error);
    return { success: false, error: error.message };
  }
});

// ==============================
// 自動保存機能
// ==============================

// アプリデータディレクトリを取得
const getAppDataDir = () => {
  const appDataPath = app.getPath('userData');
  return appDataPath;
};

// 自動保存ディレクトリを取得（なければ作成）
const getAutoSaveDir = async () => {
  const fs = require('fs').promises;
  const autoSaveDir = path.join(getAppDataDir(), 'autosave');
  try {
    await fs.mkdir(autoSaveDir, { recursive: true });
  } catch (error) {
    // ディレクトリが既に存在する場合は無視
  }
  return autoSaveDir;
};

// 自動保存を実行
ipcMain.handle('auto-save-project', async (event, { data }) => {
  const fs = require('fs').promises;
  try {
    const autoSaveDir = await getAutoSaveDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `autosave_${timestamp}.ccproj`;
    const filePath = path.join(autoSaveDir, filename);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    // 古い自動保存を削除（最新5件のみ保持）
    const files = await fs.readdir(autoSaveDir);
    const autoSaveFiles = files
      .filter(f => f.startsWith('autosave_') && f.endsWith('.ccproj'))
      .sort()
      .reverse();

    for (let i = 5; i < autoSaveFiles.length; i++) {
      await fs.unlink(path.join(autoSaveDir, autoSaveFiles[i]));
    }

    return { success: true, path: filePath };
  } catch (error) {
    console.error('Auto-save failed:', error);
    return { success: false, error: error.message };
  }
});

// 自動保存一覧を取得
ipcMain.handle('get-auto-saves', async () => {
  const fs = require('fs').promises;
  try {
    const autoSaveDir = await getAutoSaveDir();
    const files = await fs.readdir(autoSaveDir);
    const autoSaveFiles = files
      .filter(f => f.startsWith('autosave_') && f.endsWith('.ccproj'))
      .sort()
      .reverse();

    const autoSaves = [];
    for (const filename of autoSaveFiles) {
      const filePath = path.join(autoSaveDir, filename);
      const stat = await fs.stat(filePath);
      autoSaves.push({
        filename,
        path: filePath,
        savedAt: stat.mtime.toISOString(),
      });
    }

    return { success: true, autoSaves };
  } catch (error) {
    console.error('Failed to get auto-saves:', error);
    return { success: false, error: error.message };
  }
});

// 自動保存を削除
ipcMain.handle('delete-auto-save', async (event, { filename }) => {
  const fs = require('fs').promises;
  try {
    const autoSaveDir = await getAutoSaveDir();
    const filePath = path.join(autoSaveDir, filename);
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete auto-save:', error);
    return { success: false, error: error.message };
  }
});

// ==============================
// テンプレート機能
// ==============================

// テンプレートディレクトリを取得（なければ作成）
const getTemplateDir = async () => {
  const fs = require('fs').promises;
  const templateDir = path.join(getAppDataDir(), 'templates');
  try {
    await fs.mkdir(templateDir, { recursive: true });
  } catch (error) {
    // ディレクトリが既に存在する場合は無視
  }
  return templateDir;
};

// テンプレートを保存
ipcMain.handle('save-template', async (event, { name, data }) => {
  const fs = require('fs').promises;
  try {
    const templateDir = await getTemplateDir();
    // ファイル名をサニタイズ
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${safeName}.cctemplate`;
    const filePath = path.join(templateDir, filename);

    const templateData = {
      ...data,
      templateName: name,
      createdAt: new Date().toISOString(),
      isTemplate: true,
    };

    await fs.writeFile(filePath, JSON.stringify(templateData, null, 2), 'utf8');
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Failed to save template:', error);
    return { success: false, error: error.message };
  }
});

// テンプレート一覧を取得
ipcMain.handle('list-templates', async () => {
  const fs = require('fs').promises;
  try {
    const templateDir = await getTemplateDir();
    const files = await fs.readdir(templateDir);
    const templateFiles = files.filter(f => f.endsWith('.cctemplate'));

    const templates = [];
    for (const filename of templateFiles) {
      const filePath = path.join(templateDir, filename);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        templates.push({
          name: data.templateName || filename.replace('.cctemplate', ''),
          filename,
          path: filePath,
          createdAt: data.createdAt,
        });
      } catch (e) {
        // 読み込みエラーは無視
      }
    }

    return { success: true, templates };
  } catch (error) {
    console.error('Failed to list templates:', error);
    return { success: false, error: error.message };
  }
});

// テンプレートを読み込み
ipcMain.handle('load-template', async (event, { name }) => {
  const fs = require('fs').promises;
  try {
    const templateDir = await getTemplateDir();
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${safeName}.cctemplate`;
    const filePath = path.join(templateDir, filename);

    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to load template:', error);
    return { success: false, error: error.message };
  }
});

// テンプレートを削除
ipcMain.handle('delete-template', async (event, { name }) => {
  const fs = require('fs').promises;
  try {
    const templateDir = await getTemplateDir();
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${safeName}.cctemplate`;
    const filePath = path.join(templateDir, filename);

    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete template:', error);
    return { success: false, error: error.message };
  }
});

// ==============================
// ライセンス認証機能
// ==============================

// ライセンス状態取得
ipcMain.handle('license-get-status', async () => {
  try {
    await licenseManager.initialize();
    return { success: true, data: licenseManager.getStatus() };
  } catch (error) {
    console.error('Failed to get license status:', error);
    return { success: false, error: error.message };
  }
});

// ライセンスキー認証
ipcMain.handle('license-activate', async (event, key) => {
  try {
    const result = await licenseManager.activate(key);
    return result;
  } catch (error) {
    console.error('Failed to activate license:', error);
    return { success: false, error: 'UNKNOWN', message: error.message };
  }
});

// トークン検証
ipcMain.handle('license-verify', async () => {
  try {
    const result = await licenseManager.verifyToken();
    return result;
  } catch (error) {
    console.error('Failed to verify license:', error);
    return { valid: false, reason: 'ERROR', message: error.message };
  }
});

// デバイス解除
ipcMain.handle('license-deactivate', async () => {
  try {
    const result = await licenseManager.deactivate();
    return result;
  } catch (error) {
    console.error('Failed to deactivate license:', error);
    return { success: false, error: 'UNKNOWN', message: error.message };
  }
});

// オフライン猶予残り時間取得
ipcMain.handle('license-grace-remaining', async () => {
  try {
    await licenseManager.initialize();
    return { success: true, remainingHours: licenseManager.getGracePeriodRemaining() };
  } catch (error) {
    console.error('Failed to get grace period:', error);
    return { success: false, error: error.message };
  }
});

// ライセンス認証成功後、メインウィンドウを起動
// セキュリティ強化: DevToolsからの直接呼び出しを防ぐため、必ず検証を実行
ipcMain.handle('license-open-main-window', async () => {
  try {
    // 必ずライセンス検証を実行（バイパス防止）
    const verifyResult = await licenseManager.verifyToken();

    if (!verifyResult.valid) {
      console.warn('License verification failed in open-main-window:', verifyResult.reason);
      return {
        success: false,
        error: 'LICENSE_INVALID',
        reason: verifyResult.reason,
        message: verifyResult.message || 'ライセンス検証に失敗しました',
      };
    }

    // 検証成功: ライセンス状態を更新
    licenseStatus.valid = true;
    licenseStatus.gracePeriod = verifyResult.gracePeriod || false;
    licenseStatus.remainingHours = verifyResult.remainingHours || 0;

    // ライセンスウィンドウを閉じる
    if (licenseWindow) {
      licenseWindow.close();
      licenseWindow = null;
    }

    // メインウィンドウを起動
    createWindow();

    // 猶予期間中なら警告表示
    if (verifyResult.gracePeriod) {
      setTimeout(() => {
        showGracePeriodWarning(verifyResult.remainingHours);
      }, 2000);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to open main window:', error);
    return { success: false, error: 'UNKNOWN', message: error.message };
  }
});
