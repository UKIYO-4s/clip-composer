#!/bin/bash
# Apple Silicon Macにリモート接続してarm64ビルドを実行するスクリプト
#
# 使用方法:
#   ./scripts/build-remote-arm64.sh user@192.168.x.x
#
# 事前準備:
#   1. Apple Silicon Mac で「リモートログイン」を有効化
#   2. SSHキー認証を設定（パスワード入力を省略するため）:
#      ssh-copy-id user@192.168.x.x

set -e

if [ -z "$1" ]; then
    echo "使用方法: $0 user@hostname"
    echo "例: $0 shoei@192.168.1.100"
    exit 1
fi

REMOTE_HOST="$1"
PROJECT_NAME="clip-composer"
LOCAL_PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_PROJECT_DIR="~/Desktop/$PROJECT_NAME"

echo "=== Apple Silicon Mac へのリモートビルド ==="
echo "ホスト: $REMOTE_HOST"
echo "ローカル: $LOCAL_PROJECT_DIR"
echo ""

# 1. プロジェクトを同期
echo "[1/4] プロジェクトファイルを同期中..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'backend/venv' \
    --exclude 'backend/build' \
    --exclude 'backend/dist' \
    --exclude 'dist' \
    --exclude '.git' \
    "$LOCAL_PROJECT_DIR/" \
    "$REMOTE_HOST:$REMOTE_PROJECT_DIR/"

# 2. リモートでビルド実行
echo "[2/4] リモートでnpm installを実行中..."
ssh "$REMOTE_HOST" "cd $REMOTE_PROJECT_DIR && npm install"

echo "[3/4] リモートでarm64ビルドを実行中..."
ssh "$REMOTE_HOST" "cd $REMOTE_PROJECT_DIR && npm run dist:mac:arm64"

# 3. ビルド成果物を取得
echo "[4/4] ビルド成果物をダウンロード中..."
mkdir -p "$LOCAL_PROJECT_DIR/dist"
rsync -avz "$REMOTE_HOST:$REMOTE_PROJECT_DIR/dist/*.dmg" "$LOCAL_PROJECT_DIR/dist/"

echo ""
echo "=== ビルド完了 ==="
echo "成果物: $LOCAL_PROJECT_DIR/dist/"
ls -la "$LOCAL_PROJECT_DIR/dist/"*.dmg 2>/dev/null || echo "(DMGファイルが見つかりません)"
