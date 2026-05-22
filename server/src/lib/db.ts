import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'vibemod.db');

const db: DatabaseType = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    branch TEXT NOT NULL,
    path TEXT NOT NULL,
    adapter_id TEXT,
    adapter_json TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'live')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id INTEGER NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    title TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS builds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id INTEGER NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
    exit_code INTEGER,
    logs TEXT,
    triggered_by TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT
  );
`);

// Migrate: add status column if missing, or fix CHECK constraint if it has stale values
{
  const cols = db.prepare("PRAGMA table_info(drafts)").all() as Array<{ name: string }>;
  const hasStatus = cols.some((c) => c.name === 'status');

  if (!hasStatus) {
    db.exec("ALTER TABLE drafts ADD COLUMN status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'live'))");
  } else {
    // The column may exist with an old CHECK constraint (e.g. 'draft'/'published' instead of 'inactive').
    // SQLite can't alter constraints, so rebuild the table.
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'drafts'").get() as { sql: string } | undefined;
    if (schema && !schema.sql.includes("'inactive'")) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE drafts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          branch TEXT NOT NULL,
          path TEXT NOT NULL,
          adapter_id TEXT,
          adapter_json TEXT,
          is_active INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'live')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO drafts_new (id, name, branch, path, adapter_id, adapter_json, is_active, status, created_at, updated_at)
          SELECT id, name, branch, path, adapter_id, adapter_json, is_active,
            CASE WHEN status = 'live' THEN 'live' ELSE 'inactive' END,
            created_at, updated_at
          FROM drafts;
        DROP TABLE drafts;
        ALTER TABLE drafts_new RENAME TO drafts;
      `);
      db.pragma('foreign_keys = ON');
    }
  }
}

export { db };
export type { DatabaseType };
