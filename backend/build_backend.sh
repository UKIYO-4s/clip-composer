#!/bin/bash
# Clip Composer Backend Build Script
# Builds the Python backend for the current architecture

set -e

cd "$(dirname "$0")"

# Detect architecture
ARCH=$(uname -m)
echo "=== Building backend for architecture: $ARCH ==="

# Clean up existing build
rm -rf build dist venv

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt pyinstaller

# Verify architecture of installed packages
echo "Verifying numpy architecture..."
NUMPY_SO=$(find venv -name "*.so" -path "*numpy*" | head -1)
if [ -n "$NUMPY_SO" ]; then
    file "$NUMPY_SO"
fi

# Build with PyInstaller
echo "Building with PyInstaller..."
pyinstaller clip_composer_backend.spec --clean

# Verify output
echo "Verifying output..."
# Check for onefile output first, then onedir
if [ -f "dist/clip_composer_backend" ]; then
    OUTPUT_BINARY="dist/clip_composer_backend"
    # Create directory structure expected by electron-builder
    mkdir -p dist/clip_composer_backend_dir
    cp dist/clip_composer_backend dist/clip_composer_backend_dir/clip_composer_backend
    file "$OUTPUT_BINARY"
    echo "=== Build completed successfully ==="
elif [ -f "dist/clip_composer_backend/clip_composer_backend" ]; then
    OUTPUT_BINARY="dist/clip_composer_backend/clip_composer_backend"
    file "$OUTPUT_BINARY"
    echo "=== Build completed successfully ==="
else
    echo "ERROR: Output binary not found"
    ls -la dist/
    exit 1
fi
