# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for Clip Composer Backend

import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_all, copy_metadata

block_cipher = None

# MoviePyとOpenCVの隠しインポートを収集
hidden_imports = [
    'moviepy',
    'moviepy.editor',
    'moviepy.video',
    'moviepy.audio',
    'moviepy.video.fx.all',
    'moviepy.audio.fx.all',
    'moviepy.video.io',
    'moviepy.video.io.ffmpeg_reader',
    'moviepy.video.io.ffmpeg_writer',
    'moviepy.video.VideoClip',
    'moviepy.audio.AudioClip',
    'cv2',
    'PIL',
    'PIL.Image',
    'pandas',
    'numpy',
    'imageio',
    'imageio_ffmpeg',
    'proglog',
    'decorator',
    'tqdm',
    'json',
    'sys',
    'os',
]

# MoviePyのサブモジュールを収集
hidden_imports += collect_submodules('moviepy')
hidden_imports += collect_submodules('imageio')
hidden_imports += collect_submodules('imageio_ffmpeg')

# MoviePyのデータファイルを収集（メタデータも含む）
datas = []
datas += collect_data_files('moviepy')
datas += collect_data_files('imageio', include_py_files=True)
datas += collect_data_files('imageio_ffmpeg', include_py_files=True)

# パッケージのメタデータを追加（PyInstaller標準の方法）
datas += copy_metadata('imageio')
datas += copy_metadata('imageio-ffmpeg')
datas += copy_metadata('moviepy')

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('modules', 'modules'),
        ('utils', 'utils'),
    ] + datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'scipy',
        'IPython',
        'jupyter',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='clip_composer_backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # コンソールアプリとして実行（IPC用）
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='clip_composer_backend',
)
