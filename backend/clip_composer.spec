# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for Clip Composer Backend

import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# MoviePyとOpenCVの隠しインポートを収集
hidden_imports = [
    'moviepy',
    'moviepy.editor',
    'moviepy.video',
    'moviepy.audio',
    'moviepy.video.fx.all',
    'moviepy.audio.fx.all',
    'cv2',
    'PIL',
    'PIL.Image',
    'pandas',
    'numpy',
    'json',
    'sys',
    'os',
]

# MoviePyのサブモジュールを収集
hidden_imports += collect_submodules('moviepy')

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('modules', 'modules'),
        ('utils', 'utils'),
    ],
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
