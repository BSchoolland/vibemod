import { db } from '../lib/db.js';
import type { AppAdapter } from '../types.js';

export interface DraftRow {
  id: number;
  name: string;
  branch: string;
  path: string;
  adapter_id: string | null;
  adapter_json: string | null;
  display_name: string | null;
  is_active: number;
  status: 'inactive' | 'live';
  created_at: string;
  updated_at: string;
}

export function adapterFromRow(row: DraftRow): AppAdapter | null {
  if (!row.adapter_id || !row.adapter_json) return null;
  return { id: row.adapter_id, ...JSON.parse(row.adapter_json) };
}

export function adapterToDb(adapter: AppAdapter): { id: string; json: string } {
  const { id, ...rest } = adapter;
  return { id, json: JSON.stringify(rest) };
}

class DraftRepo {
  list(): DraftRow[] {
    return db.prepare('SELECT * FROM drafts ORDER BY created_at DESC').all() as DraftRow[];
  }

  getActive(): (DraftRow & { adapter: AppAdapter | null }) | null {
    const row = db.prepare('SELECT * FROM drafts WHERE is_active = 1').get() as DraftRow | undefined;
    if (!row) return null;
    return { ...row, adapter: adapterFromRow(row) };
  }

  getLive(): (DraftRow & { adapter: AppAdapter | null }) | null {
    const row = db.prepare("SELECT * FROM drafts WHERE status = 'live'").get() as DraftRow | undefined;
    if (!row) return null;
    return { ...row, adapter: adapterFromRow(row) };
  }

  getByName(name: string): DraftRow | undefined {
    return db.prepare('SELECT * FROM drafts WHERE name = ?').get(name) as DraftRow | undefined;
  }

  getById(id: number | bigint): DraftRow {
    return db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as DraftRow;
  }

  deactivateAll(): void {
    db.prepare('UPDATE drafts SET is_active = 0 WHERE is_active = 1').run();
  }

  insert(name: string, branch: string, path: string, adapter: AppAdapter): DraftRow {
    const { id: adapterId, json: adapterJson } = adapterToDb(adapter);
    const result = db.prepare(
      "INSERT INTO drafts (name, branch, path, adapter_id, adapter_json, is_active, status) VALUES (?, ?, ?, ?, ?, 1, 'inactive')"
    ).run(name, branch, path, adapterId, adapterJson);
    return this.getById(result.lastInsertRowid);
  }

  activate(id: number): void {
    db.prepare("UPDATE drafts SET is_active = 1, updated_at = datetime('now') WHERE id = ?").run(id);
  }

  updateAdapter(id: number, adapter: AppAdapter): void {
    const { id: adapterId, json: adapterJson } = adapterToDb(adapter);
    db.prepare("UPDATE drafts SET adapter_id = ?, adapter_json = ?, updated_at = datetime('now') WHERE id = ?")
      .run(adapterId, adapterJson, id);
  }

  promoteToLive(id: number, adapter: AppAdapter): void {
    const { id: adapterId, json: adapterJson } = adapterToDb(adapter);
    db.prepare("UPDATE drafts SET status = 'inactive' WHERE status = 'live'").run();
    db.prepare(
      "UPDATE drafts SET status = 'live', adapter_id = ?, adapter_json = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(adapterId, adapterJson, id);
  }

  updateDisplayName(id: number, displayName: string, branch: string): void {
    db.prepare(
      "UPDATE drafts SET display_name = ?, branch = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(displayName, branch, id);
  }

  deleteById(id: number): void {
    db.prepare('DELETE FROM drafts WHERE id = ?').run(id);
  }
}

export const draftRepo = new DraftRepo();
