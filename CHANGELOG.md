# Changelog

All notable changes to Clip Composer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Auto-update feature using electron-updater
- In-app update banner and modal
- Release notes panel with GitHub Releases integration
- Version display in footer with update status

### Removed
- 品質プリセット選択機能を廃止（出力設定は固定: preset=medium, bitrate=5000k に簡略化）

## [1.0.0] - 2024-12-17

### Added
- Initial release
- Timeline-based video editing
- Multi-layer support with drag & drop
- Preview playback
- Effects and transitions
- CSV batch export
- Variable text support
- Random layer placement
- Project save/load (.ccproj)
- Auto-save (3-minute interval)
- Template system
- License authentication system
- macOS DMG distribution (Intel & Apple Silicon)

### Technical
- Electron 28 + React 18 + Vite
- Redux Toolkit for state management
- Python backend with MoviePy + FFmpeg
- Tailwind CSS styling
