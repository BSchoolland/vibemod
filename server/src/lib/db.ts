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
    display_name TEXT,
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

  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

type Migration = { version: number; up: () => void };

const migrations: Migration[] = [
  {
    version: 1,
    up() {
      const cols = db.prepare("PRAGMA table_info(drafts)").all() as Array<{ name: string }>;
      if (!cols.some((c) => c.name === 'status')) {
        db.exec("ALTER TABLE drafts ADD COLUMN status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'live'))");
        return;
      }
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
    },
  },
  {
    version: 2,
    up() {
      const cols = db.prepare("PRAGMA table_info(drafts)").all() as Array<{ name: string }>;
      if (!cols.some((c) => c.name === 'display_name')) {
        db.exec("ALTER TABLE drafts ADD COLUMN display_name TEXT");
      }
    },
  },
];

function runMigrations() {
  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>)
      .map((r) => r.version)
  );

  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    m.up();
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(m.version);
  }
}

runMigrations();

export { db };
export type { DatabaseType };
