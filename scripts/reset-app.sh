#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_REPO="${APP_REPO_PATH:-$ROOT/app-repo}"
APP_LIVE="${LIVE_CLONE_PATH:-$ROOT/app-live}"
WORKTREES="$ROOT/worktrees"
DB="$ROOT/server/vibemod.db"

echo "Removing app-repo at $APP_REPO"
rm -rf "$APP_REPO"

echo "Removing app-live at $APP_LIVE"
rm -rf "$APP_LIVE"

echo "Removing draft worktrees at $WORKTREES"
rm -rf "$WORKTREES"

echo "Removing database at $DB"
rm -f "$DB" "$DB-wal" "$DB-shm"

echo "Done. Restart vibemod to re-bootstrap from seed-app."
