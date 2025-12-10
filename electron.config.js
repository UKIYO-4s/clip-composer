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
    'backend/**/*',
    '!backend/venv/**/*',
    '!backend/__pycache__/**/*',
    '!backend/**/__pycache__/**/*',
    '!backend/**/*.pyc',
    'assets/**/*',
  ],
  extraResources: [
    {
      from: 'backend',
      to: 'backend',
      filter: [
        '**/*.py',
        '!venv/**/*',
        '!**/__pycache__/**/*',
        '!**/*.pyc',
      ],
    },
  ],
  mac: {
    category: 'public.app-category.video',
    // アイコンファイルが存在する場合のみ使用
    // icon: 'assets/icon.icns',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'assets/entitlements.mac.plist',
    entitlementsInherit: 'assets/entitlements.mac.plist',
    target: [
      {
        target: 'dmg',
        arch: ['arm64'], // 現在のMac用（Apple Silicon）
      },
    ],
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
    // icon: 'assets/icon.ico',
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
    // icon: 'assets/icon.png',
  },
  // afterPack: async (context) => {
  //   // Python環境のセットアップをここで行うことができる
  //   console.log('After pack hook:', context.appOutDir);
  // },
};
