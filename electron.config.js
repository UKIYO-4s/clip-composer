export default {
  appId: 'com.clipcomposer.app',
  productName: 'Clip Composer',
  directories: {
    output: 'dist',
  },
  files: [
    'frontend/build/**/*',
    'frontend/src/main.cjs',
    'frontend/src/preload.cjs',
    'backend/**/*',
    'assets/**/*',
  ],
  mac: {
    category: 'public.app-category.video',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
    ],
  },
};
