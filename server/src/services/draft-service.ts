import path from 'path';
import fs from 'fs/promises';
import { db } from '../lib/db.js';
import { config } from '../config.js';
import { createWorktree, removeWorktree, commitAll } from '../lib/git.js';
import { previewServer, liveServer } from '../lib/servers.js';
import { buildService } from './build-service.js';
import { createLogger } from '../lib/logger.js';
import { annotate, time } from '../lib/request-context.js';
import { screenshotService } from './screenshot-service.js';
import type { AppAdapter } from '../types.js';

const log = createLogger('draft-service');

export interface DraftRow {
  id: number;
  name: string;
  branch: string;
  path: string;
  adapter_id: string | null;
  adapter_json: string | null;
  is_active: number;
  status: 'inactive' | 'live';
  created_at: string;
  updated_at: string;
}

function adapterFromRow(row: DraftRow): AppAdapter | null {
  if (!row.adapter_id || !row.adapter_json) return null;
  return { id: row.adapter_id, ...JSON.parse(row.adapter_json) };
}

function adapterToDb(adapter: AppAdapter): { id: string; json: string } {
  const { id, ...rest } = adapter;
  return { id, json: JSON.stringify(rest) };
}

class DraftService {
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

  async create(name?: string): Promise<DraftRow & { adapter: AppAdapter }> {
    const draftName = name || `draft-${Date.now()}`;
    const branchName = `draft/${draftName}`;
    const worktreePath = path.join(config.appRepoPath, '..', 'worktrees', draftName);

    annotate({ draftName, branchName });

    const liveVersion = this.getLive();
    const startPoint = liveVersion?.branch;

    await fs.mkdir(path.dirname(worktreePath), { recursive: true });
    await time('worktree', () => createWorktree(config.appRepoPath, branchName, worktreePath, startPoint));

    const adapter = await time('build', () => buildService.installAndBuild(worktreePath));
    annotate({ adapterId: adapter.id, adapterName: adapter.name });

    db.prepare('UPDATE drafts SET is_active = 0 WHERE is_active = 1').run();

    const result = db.prepare(
      "INSERT INTO drafts (name, branch, path, adapter_id, adapter_json, is_active, status) VALUES (?, ?, ?, ?, ?, 1, 'inactive')"
    ).run(draftName, branchName, worktreePath, ...Object.values(adapterToDb(adapter)));

    previewServer.stop();
    await previewServer.start(worktreePath, adapter);

    const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(result.lastInsertRowid) as DraftRow;
    screenshotService.scheduleCapture(row.id, config.previewPort);
    return { ...row, adapter };
  }

  async activate(name: string): Promise<DraftRow & { adapter: AppAdapter | null }> {
    const row = this.getByName(name);
    if (!row) throw new Error(`Draft "${name}" not found`);

    db.prepare('UPDATE drafts SET is_active = 0 WHERE is_active = 1').run();
    db.prepare("UPDATE drafts SET is_active = 1, updated_at = datetime('now') WHERE id = ?").run(row.id);

    previewServer.stop();
    const adapter = adapterFromRow(row);
    if (adapter) {
      await previewServer.start(row.path, adapter);
      screenshotService.scheduleCapture(row.id, config.previewPort);
    }

    return { ...row, is_active: 1, adapter };
  }

  async publish(name: string): Promise<void> {
    await this.publishWithProgress(name, {});
  }

  async publishWithProgress(name: string, hooks: {
    onCommit?: () => void;
    onBuild?: () => void;
    onStart?: () => void;
  }): Promise<void> {
    const row = this.getByName(name);
    if (!row) throw new Error(`Draft "${name}" not found`);

    annotate({ draftName: row.name, draftBranch: row.branch });

    await time('commit', () => commitAll(row.path, `Publish ${row.name}`));
    hooks.onCommit?.();

    const adapter = await time('build', () => buildService.installAndBuild(row.path, undefined, row.id));
    hooks.onBuild?.();

    const { id: adapterId, json: adapterJson } = adapterToDb(adapter);

    db.prepare("UPDATE drafts SET status = 'inactive' WHERE status = 'live'").run();
    db.prepare(
      "UPDATE drafts SET status = 'live', adapter_id = ?, adapter_json = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(adapterId, adapterJson, row.id);

    liveServer.stop();
    await liveServer.start(row.path, adapter);
    hooks.onStart?.();

    log.info({ draftName: row.name }, 'published to live');
  }

  async delete(name: string): Promise<void> {
    const row = this.getByName(name);
    if (!row) throw new Error(`Draft "${name}" not found`);
    if (row.status === 'live') throw new Error('Cannot delete the live version');

    if (row.is_active) {
      previewServer.stop();
    }

    const worktreePath = path.join(config.appRepoPath, '..', 'worktrees', name);
    await removeWorktree(config.appRepoPath, worktreePath);
    db.prepare('DELETE FROM drafts WHERE id = ?').run(row.id);
  }

  async rebuild(name: string): Promise<AppAdapter> {
    const row = this.getByName(name);
    if (!row) throw new Error(`Draft "${name}" not found`);

    const adapter = await buildService.installAndBuild(row.path, undefined, row.id);
    const { id: adapterId, json: adapterJson } = adapterToDb(adapter);

    db.prepare("UPDATE drafts SET adapter_id = ?, adapter_json = ?, updated_at = datetime('now') WHERE id = ?")
      .run(adapterId, adapterJson, row.id);

    if (row.is_active) {
      previewServer.stop();
      await previewServer.start(row.path, adapter);
      screenshotService.scheduleCapture(row.id, config.previewPort);
    }

    if (row.status === 'live') {
      liveServer.stop();
      await liveServer.start(row.path, adapter);
    }

    return adapter;
  }

  async restoreServers(): Promise<void> {
    for (const draft of [this.getLive(), this.getActive()]) {
      if (!draft?.adapter) continue;

      const pathExists = await fs.access(draft.path).then(() => true).catch(() => false);
      if (!pathExists) {
        log.info({ draftName: draft.name }, 'stale draft — worktree missing, cleaning up');
        db.prepare('DELETE FROM drafts WHERE id = ?').run(draft.id);
        continue;
      }

      const isLive = (draft as DraftRow).status === 'live';
      const server = isLive ? liveServer : previewServer;

      if (!server.running) {
        log.info({ draftName: draft.name }, isLive ? 'restoring live server' : 'restoring preview server');
        await server.start(draft.path, draft.adapter);
      }
    }
  }
}

export const draftService = new DraftService();
