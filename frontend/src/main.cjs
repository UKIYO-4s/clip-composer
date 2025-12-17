const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const { getLicenseManager } = require('./license/LicenseManager.cjs');
const fs = require('fs');

// UUID v4生成（crypto.randomUUID()を使用）
const uuidv4 = () => crypto.randomUUID();

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ライセンスマネージャーインスタンス
const licenseManager = getLicenseManager();

let mainWindow = null;
let licenseWindow = null;
let splashWindow = null;
let pythonProcess = null;
let pendingRequests = new Map();

// ライセンス状態
let licenseStatus = {
  valid: false,
  gracePeriod: false,
  remainingHours: 0,
};

// ファイルから開く際の保留パス（macOSでダブルクリックで開いた場合）
let pendingFilePath = null;

// Python プロセス管理
class PythonBridge {
  constructor() {
    this.process = null;
    this.buffer = '';
    this.isReady = false;
    this.candidates = [];
    this.currentCandidateIndex = -1;
    this.isStarting = false;
  }

  buildCandidates() {
    const candidates = [];
    const backendDirDev = path.join(__dirname, '../../backend');
    const venvPython = path.join(backendDirDev, 'venv/bin/python');
    const scriptPathDev = path.join(backendDirDev, 'main.py');

    if (isDev && fs.existsSync(venvPython) && fs.existsSync(scriptPathDev)) {
      candidates.push({
        label: 'venv python (dev)',
        executablePath: venvPython,
        executableArgs: [scriptPathDev, '--ipc'],
        backendDir: backendDirDev,
        ffmpegDir: '/usr/local/bin',
      });
    }

    if (!isDev) {
      const bundledBackend = path.join(process.resourcesPath, 'backend/clip_composer_backend');
      const bundledDir = path.join(process.resourcesPath, 'backend');
      if (fs.existsSync(bundledBackend)) {
        candidates.push({
          label: 'bundled backend binary',
          executablePath: bundledBackend,
          executableArgs: ['--ipc'],
          backendDir: bundledDir,
          ffmpegDir: path.join(process.resourcesPath, 'bin'),
        });
      }

      // フォールバック: システムPythonでmain.pyを実行
      const scriptPathProd = path.join(process.resourcesPath, 'backend/main.py');
      if (fs.existsSync(scriptPathProd)) {
        candidates.push({
          label: 'system python main.py',
          executablePath: 'python3',
          executableArgs: [scriptPathProd, '--ipc'],
          backendDir: path.join(process.resourcesPath, 'backend'),
          ffmpegDir: path.join(process.resourcesPath, 'bin'),
        });
      }
    }

    // 最終フォールバック: システムpython + dev main.py（開発用リカバリー）
    if (fs.existsSync(scriptPathDev)) {
      candidates.push({
        label: 'system python dev main.py',
        executablePath: 'python3',
        executableArgs: [scriptPathDev, '--ipc'],
        backendDir: backendDirDev,
        ffmpegDir: '/usr/local/bin',
      });
    }

    return candidates;
  }

  start() {
    if (this.isStarting) return;
    if (this.process) {
      console.log('Python process already running');
      return;
    }

    this.isStarting = true;
    this.candidates = this.buildCandidates();
    this.currentCandidateIndex = -1;
    this._startNextCandidate();
    this.isStarting = false;
  }

  _startNextCandidate() {
    this.stop();
    this.currentCandidateIndex += 1;
    if (this.currentCandidateIndex >= this.candidates.length) {
      console.error('No more backend candidates to try');
      this.isReady = false;
      return;
    }

    const candidate = this.candidates[this.currentCandidateIndex];
    const {
      executablePath,
      executableArgs,
      backendDir,
      ffmpegDir,
      label,
    } = candidate;

    console.log(`Starting backend process (${label}):`, executablePath, executableArgs.join(' '));
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
        this._rejectAllPending(new Error('Python process error: ' + error.message));
        this._startNextCandidate();
      });

      if (this.process.stdin) {
        this.process.stdin.on('error', (err) => {
          console.error('Python stdin error:', err);
          this.isReady = false;
          this._startNextCandidate();
          this._rejectAllPending(new Error('Python process stdin error: ' + err.message));
        });
      }

      this.process.on('close', (code) => {
        console.log('Python process exited with code:', code);
        this.process = null;
        this.isReady = false;
        this._rejectAllPending(new Error(`Python process exited (code ${code})`));
        if (code !== 0) {
          this._startNextCandidate();
        }
      });

      this.isReady = true;
      console.log('Python process started successfully');
    } catch (error) {
      console.error('Failed to start Python process:', error);
      this.isReady = false;
      this._rejectAllPending(new Error('Failed to start Python process: ' + error.message));
      this._startNextCandidate();
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
        const trimmed = line.trim();
        // JSON以外の標準出力（printデバッグなど）はスキップ
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          console.log('Python stdout (non-JSON):', trimmed);
          continue;
        }

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
      // 進捗受信時にタイムアウトをリセット（ハートビート）
      const pending = pendingRequests.get(id);
      if (pending && pending.resetTimeout) {
        pending.resetTimeout();
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
      // タイムアウト設定（コマンド別に設定）
      // render_batch: 6時間（複数動画生成用）
      // render: 1時間（単発レンダリング用）
      // その他: 10分
      let timeoutMs = 600000; // デフォルト10分
      if (command === 'render_batch') {
        timeoutMs = 21600000; // 6時間
      } else if (command === 'render') {
        timeoutMs = 3600000; // 1時間
      }

      // 進捗受信用のハートビートタイムアウト（5分）
      const heartbeatTimeoutMs = 300000;
      let currentTimeout = null;

      // タイムアウトを設定する関数
      const setTimeoutTimer = (ms) => {
        if (currentTimeout) {
          clearTimeout(currentTimeout);
        }
        currentTimeout = setTimeout(() => {
          pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }, ms);
      };

      // 初回タイムアウト設定
      setTimeoutTimer(timeoutMs);

      // タイムアウトをリセットする関数（進捗受信時に呼ばれる）
      const resetTimeout = () => {
        // 進捗を受信したらハートビートタイムアウトにリセット
        setTimeoutTimer(heartbeatTimeoutMs);
      };

      pendingRequests.set(id, {
        resolve: (data) => {
          if (currentTimeout) clearTimeout(currentTimeout);
          resolve(data);
        },
        reject: (error) => {
          if (currentTimeout) clearTimeout(currentTimeout);
          reject(error);
        },
        resetTimeout,
      });

      // リクエスト送信
      const jsonLine = JSON.stringify(request) + '\n';
      try {
        if (this.process && this.process.stdin && !this.process.stdin.destroyed) {
          this.process.stdin.write(jsonLine);
        } else {
          pendingRequests.delete(id);
          if (currentTimeout) clearTimeout(currentTimeout);
          this.isReady = false;
          this.stop();
          reject(new Error('Python process stdin not available'));
        }
      } catch (writeError) {
        pendingRequests.delete(id);
        if (currentTimeout) clearTimeout(currentTimeout);
        // パイプが死んだ場合はプロセスをリスタートできるように停止しておく
        this.isReady = false;
        this.stop();
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

  _rejectAllPending(error) {
    pendingRequests.forEach((pending) => {
      if (pending.reject) {
        pending.reject(error);
      }
    });
    pendingRequests.clear();
  }
}

const pythonBridge = new PythonBridge();

/**
 * スプラッシュウィンドウを作成
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

/**
 * スプラッシュを閉じてメインウィンドウを表示
 */
function closeSplashAndShowMain() {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
  }
  if (mainWindow) {
    mainWindow.show();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Clip Composer',
    show: false, // 最初は非表示
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1e1e1e',
  });

  // 保留ファイルパスを送信する共通処理
  const sendPendingFile = () => {
    if (pendingFilePath && mainWindow && !mainWindow.isDestroyed()) {
      // 少し遅延させてレンダラーの準備を待つ
      setTimeout(() => {
        mainWindow.webContents.send('open-project-file', pendingFilePath);
        pendingFilePath = null;
      }, 1000);
    }
  };

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
    // 開発環境ではすぐに表示
    mainWindow.once('ready-to-show', () => {
      closeSplashAndShowMain();
      sendPendingFile();
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    // 本番環境: ページの読み込み完了後に表示
    mainWindow.once('ready-to-show', () => {
      // 少し遅延させてスムーズに見せる
      setTimeout(() => {
        closeSplashAndShowMain();
        sendPendingFile();
      }, 500);
    });
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

// macOS: ファイルをダブルクリックで開いた場合のハンドラ
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  console.log('open-file event received:', filePath);

  // .ccprojファイルのみ処理
  if (filePath.endsWith('.ccproj')) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // ウィンドウが既に存在する場合は直接送信
      mainWindow.webContents.send('open-project-file', filePath);
    } else {
      // ウィンドウがまだない場合は保留
      pendingFilePath = filePath;
    }
  }
});

app.whenReady().then(() => {
  // スプラッシュ画面を表示（本番環境のみ）
  if (!isDev) {
    createSplashWindow();
  }

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

// ファイルを開くダイアログ
ipcMain.handle('open-file', async (event, options = {}) => {
  console.log('open-file handler called with options:', options);

  const properties = ['openFile'];
  if (options.allowMultiple) {
    properties.push('multiSelections');
  }

  // mainWindowがnullの場合はnullを渡す（モードレスダイアログ）
  const parentWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;

  try {
    // ウィンドウをフォーカス
    if (parentWindow) {
      parentWindow.focus();
    }

    const result = await dialog.showOpenDialog(parentWindow, {
      properties: properties,
      filters: options.filters || [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    console.log('open-file dialog result:', result);

    return {
      canceled: result.canceled,
      filePaths: result.filePaths || [],
    };
  } catch (error) {
    console.error('open-file dialog error:', error);
    return {
      canceled: true,
      filePaths: [],
      error: error.message,
    };
  }
});

// ディレクトリ選択ダイアログ
ipcMain.handle('select-directory', async (event, options = {}) => {
  console.log('select-directory handler called with options:', options);

  // mainWindowがnullの場合はnullを渡す（モードレスダイアログ）
  const parentWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;

  try {
    // ウィンドウをフォーカス
    if (parentWindow) {
      parentWindow.focus();
    }

    const result = await dialog.showOpenDialog(parentWindow, {
      properties: ['openDirectory', 'createDirectory'],
      ...options,
    });

    console.log('select-directory dialog result:', result);

    return {
      canceled: result.canceled,
      filePaths: result.filePaths || [],
    };
  } catch (error) {
    console.error('select-directory dialog error:', error);
    return {
      canceled: true,
      filePaths: [],
      error: error.message,
    };
  }
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

// フォルダを開く（Finderで表示）
ipcMain.handle('open-folder', async (event, { path: filePath }) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    console.error('Failed to open folder:', error);
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
