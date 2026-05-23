import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';
import { createWorktree, removeWorktree, commitAll, renameBranch } from '../lib/git.js';
import { buildService } from './build-service.js';
import { draftRepo, adapterFromRow } from './draft-repo.js';
import { serverManager } from './server-manager.js';
import { createLogger } from '../lib/logger.js';
import { annotate, time } from '../lib/request-context.js';
import type { AppAdapter } from '../types.js';

export type { DraftRow } from './draft-repo.js';

const log = createLogger('draft-service');

class DraftService {
  list() { return draftRepo.list(); }
  getActive() { return draftRepo.getActive(); }
  getLive() { return draftRepo.getLive(); }
  getByName(name: string) { return draftRepo.getByName(name); }

  async create(name?: string): Promise<ReturnType<typeof draftRepo.getById> & { adapter: AppAdapter }> {
    const draftName = name || `draft-${Date.now()}`;
    const branchName = `draft/${draftName}`;
    const worktreePath = path.join(config.appRepoPath, '..', 'worktrees', draftName);

    annotate({ draftName, branchName });

    const liveVersion = draftRepo.getLive();
    const startPoint = liveVersion?.branch;

    await fs.mkdir(path.dirname(worktreePath), { recursive: true });
    await time('worktree', () => createWorktree(config.appRepoPath, branchName, worktreePath, startPoint));

    const adapter = await time('build', () => buildService.installAndBuild(worktreePath));
    annotate({ adapterId: adapter.id, adapterName: adapter.name });

    draftRepo.deactivateAll();
    const row = draftRepo.insert(draftName, branchName, worktreePath, adapter);

    await serverManager.startPreview(worktreePath, adapter, row.id);

    return { ...row, adapter };
  }

  async activate(name: string) {
    const row = draftRepo.getByName(name);
    if (!row) throw new Error(`Draft "${name}" not found`);

    draftRepo.deactivateAll();
    draftRepo.activate(row.id);

    const adapter = adapterFromRow(row);
    if (adapter) {
      await serverManager.startPreview(row.path, adapter, row.id);
    }

    return { ...row, is_active: 1 as const, adapter };
  }

  async publish(name: string): Promise<void> {
    await this.publishWithProgress(name, {});
  }

  async publishWithProgress(name: string, hooks: {
    onCommit?: () => void;
    onBuild?: () => void;
    onStart?: () => void;
  }): Promise<void> {
    const row = draftRepo.getByName(name);
    if (!row) throw new Error(`Draft "${name}" not found`);

    annotate({ draftName: row.name, draftBranch: row.branch });

    await time('commit', () => commitAll(row.path, `Publish ${row.name}`));
    hooks.onCommit?.();

    const adapter = await time('build', () => buildService.installAndBuild(row.path, undefined, row.id));
    hooks.onBuild?.();

    draftRepo.promoteToLive(row.id, adapter);

    await serverManager.startLive(row.path, adapter);
    hooks.onStart?.();

    log.info({ draftName: row.name }, 'published to live');
  }

  async delete(name: string): Promise<void> {
    const row = draftRepo.getByName(name);
    if (!row) throw new Error(`Draft "${name}" not found`);
    if (row.status === 'live') throw new Error('Cannot delete the live version');

    if (row.is_active) {
      serverManager.stopPreview();
    }

    const worktreePath = path.join(config.appRepoPath, '..', 'worktrees', name);
    await removeWorktree(config.appRepoPath, worktreePath);
    draftRepo.deleteById(row.id);
  }

  async setDisplayName(name: string, displayName: string): Promise<void> {
    const row = draftRepo.getByName(name);
    if (!row) throw new Error(`Draft "${name}" not found`);

    const newBranch = `draft/${displayName}`;
    await renameBranch(row.path, newBranch);
    draftRepo.updateDisplayName(row.id, displayName, newBranch);

    log.info({ draftName: name, displayName, newBranch }, 'renamed draft');
  }

  async rebuild(name: string): Promise<AppAdapter> {
    const row = draftRepo.getByName(name);
    if (!row) throw new Error(`Draft "${name}" not found`);

    const adapter = await buildService.installAndBuild(row.path, undefined, row.id);
    draftRepo.updateAdapter(row.id, adapter);

    if (row.is_active) {
      await serverManager.startPreview(row.path, adapter, row.id);
    }

    if (row.status === 'live') {
      await serverManager.startLive(row.path, adapter);
    }

    return adapter;
  }
}

export const draftService = new DraftService();
