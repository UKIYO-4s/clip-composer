export default {
  appId: 'com.clipcomposer.app',
  productName: 'Clip Composer',
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  directories: {
    output: 'dist',
    buildResources: 'assets',
  },
  files: [
    'frontend/build/**/*',
    'frontend/src/main.cjs',
    'frontend/src/preload.cjs',
    'frontend/src/splash.html',
    'frontend/src/license/**/*',
    'backend/**/*',
    '!backend/venv/**/*',
    '!backend/__pycache__/**/*',
    '!backend/**/__pycache__/**/*',
    '!backend/**/*.pyc',
    'assets/**/*',
  ],
  extraResources: [
    // PyInstallerでビルドされたPythonバックエンド
    {
      from: 'backend/dist/clip_composer_backend',
      to: 'backend/clip_composer_backend',
      filter: ['**/*'],
    },
    // フォールバック用: Pythonソースファイル（システムPythonで実行用）
    {
      from: 'backend/main.py',
      to: 'backend/main.py',
    },
    {
      from: 'backend/modules',
      to: 'backend/modules',
      filter: ['**/*.py'],
    },
    // FFmpegバイナリ
    {
      from: 'assets/bin',
      to: 'bin',
      filter: ['ffmpeg', 'ffprobe'],
    },
  ],
  mac: {
    category: 'public.app-category.video',
    icon: 'assets/icon.icns',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'assets/entitlements.mac.plist',
    entitlementsInherit: 'assets/entitlements.mac.plist',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'], // Intel Mac + Apple Silicon両対応
      },
    ],
    extendInfo: {
      CFBundleDocumentTypes: [
        {
          CFBundleTypeExtensions: ['ccproj'],
          CFBundleTypeName: 'Clip Composer Project',
          CFBundleTypeRole: 'Editor',
          LSItemContentTypes: ['com.clipcomposer.project'],
          LSHandlerRank: 'Owner',
        },
      ],
      UTExportedTypeDeclarations: [
        {
          UTTypeIdentifier: 'com.clipcomposer.project',
          UTTypeDescription: 'Clip Composer Project',
          UTTypeConformsTo: ['public.json', 'public.data'],
          UTTypeTagSpecification: {
            'public.filename-extension': ['ccproj'],
          },
        },
      ],
    },
  },
  dmg: {
    sign: false,
    title: '${productName} ${version}',
    contents: [
      {
        x: 130,
        y: 220,
        type: 'file',
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications',
      },
    ],
    window: {
      width: 540,
      height: 400,
    },
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'assets/icon.ico',
  },
  nsis: {
    oneClick: false,
    perMachine: true,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
    ],
    category: 'Video',
    icon: 'assets/icon.png',
  },
  // afterPack: async (context) => {
  //   // Python環境のセットアップをここで行うことができる
  //   console.log('After pack hook:', context.appOutDir);
  // },
};
