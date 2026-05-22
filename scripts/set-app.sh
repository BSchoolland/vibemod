#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path-to-app>"
  echo "Copies the given directory into app-repo as a fresh git repo."
  echo "Restart vibemod afterwards to rebuild and serve it."
  exit 1
fi

SOURCE="$(cd "$1" && pwd)"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_REPO="${APP_REPO_PATH:-$ROOT/app-repo}"
APP_LIVE="${LIVE_CLONE_PATH:-$ROOT/app-live}"

WORKTREES="$ROOT/worktrees"
DB="$ROOT/server/vibemod.db"

# Clean slate
rm -rf "$APP_REPO" "$APP_LIVE" "$WORKTREES"
rm -f "$DB" "$DB-wal" "$DB-shm"

mkdir -p "$APP_REPO"
git init "$APP_REPO" --quiet

# Copy everything except node_modules, .git, and dist
rsync -a --exclude='node_modules' --exclude='.git' --exclude='dist' "$SOURCE/" "$APP_REPO/"

cd "$APP_REPO"
git add -A
git commit -m "Initial commit" --quiet

echo "app-repo created at $APP_REPO from $SOURCE"
echo "Restart vibemod to install, build, and serve it."
