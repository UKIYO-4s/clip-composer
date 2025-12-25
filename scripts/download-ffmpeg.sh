#!/bin/bash
# FFmpeg Universal Binary ダウンロードスクリプト
# Martin Riedlのビルドサーバーからarm64とx64をダウンロードしてUniversal Binaryを作成

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$PROJECT_DIR/assets/bin"
TMP_DIR="/tmp/ffmpeg-download-$$"

echo "=== FFmpeg Universal Binary ダウンロード ==="

# 既存のバイナリがUniversal Binaryか確認
if [ -f "$BIN_DIR/ffmpeg" ]; then
    ARCH_COUNT=$(file "$BIN_DIR/ffmpeg" | grep -c "universal binary" || true)
    if [ "$ARCH_COUNT" -gt 0 ]; then
        echo "既にUniversal Binaryがインストールされています"
        file "$BIN_DIR/ffmpeg"
        exit 0
    fi
fi

mkdir -p "$TMP_DIR"
cd "$TMP_DIR"

echo "ダウンロード中..."

# arm64版をダウンロード
curl -L -o ffmpeg-arm64.zip "https://ffmpeg.martin-riedl.de/redirect/latest/macos/arm64/release/ffmpeg.zip"
curl -L -o ffprobe-arm64.zip "https://ffmpeg.martin-riedl.de/redirect/latest/macos/arm64/release/ffprobe.zip"

# x64版をダウンロード
curl -L -o ffmpeg-x64.zip "https://ffmpeg.martin-riedl.de/redirect/latest/macos/amd64/release/ffmpeg.zip"
curl -L -o ffprobe-x64.zip "https://ffmpeg.martin-riedl.de/redirect/latest/macos/amd64/release/ffprobe.zip"

echo "解凍中..."
unzip -o ffmpeg-arm64.zip -d arm64
unzip -o ffprobe-arm64.zip -d arm64
unzip -o ffmpeg-x64.zip -d x64
unzip -o ffprobe-x64.zip -d x64

echo "Universal Binary作成中..."
lipo -create arm64/ffmpeg x64/ffmpeg -output ffmpeg-universal
lipo -create arm64/ffprobe x64/ffprobe -output ffprobe-universal

echo "インストール中..."
mkdir -p "$BIN_DIR"
cp ffmpeg-universal "$BIN_DIR/ffmpeg"
cp ffprobe-universal "$BIN_DIR/ffprobe"
chmod +x "$BIN_DIR/ffmpeg" "$BIN_DIR/ffprobe"

echo "クリーンアップ..."
rm -rf "$TMP_DIR"

echo "=== 完了 ==="
file "$BIN_DIR/ffmpeg"
file "$BIN_DIR/ffprobe"
