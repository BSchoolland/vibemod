import { Writable } from 'stream';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', '..', 'vibemod.db');

export function createSqliteStream(): Writable {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level INTEGER NOT NULL,
      time TEXT NOT NULL,
      module TEXT,
      msg TEXT NOT NULL,
      request_id TEXT,
      method TEXT,
      path TEXT,
      status INTEGER,
      duration_ms INTEGER,
      error TEXT,
      data TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_logs_time ON logs(time);
    CREATE INDEX IF NOT EXISTS idx_logs_request_id ON logs(request_id);
    CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
  `);

  const insert = db.prepare(`
    INSERT INTO logs (level, time, module, msg, request_id, method, path, status, duration_ms, error, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return new Writable({
    write(chunk, _encoding, callback) {
      try {
        const str = typeof chunk === 'string' ? chunk : chunk.toString();
        const obj = JSON.parse(str);
        const {
          level, time, module, msg,
          requestId, method, path: reqPath, status, durationMs,
          error, errorStack,
          pid: _, hostname: __,
          ...rest
        } = obj;

        insert.run(
          level,
          typeof time === 'number' ? new Date(time).toISOString() : time,
          module ?? null,
          msg ?? '',
          requestId ?? null,
          method ?? null,
          reqPath ?? null,
          status ?? null,
          durationMs ?? null,
          error ?? null,
          Object.keys(rest).length > 0
            ? JSON.stringify(errorStack ? { errorStack, ...rest } : rest)
            : null,
        );
      } catch {
        // Never let log persistence crash the app
      }
      callback();
    },
  });
}
