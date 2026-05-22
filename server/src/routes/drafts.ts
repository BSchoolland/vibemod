import { Router, type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from '../config.js';
import { createWorktree, removeWorktree, listWorktrees } from '../lib/git.js';
import { detectAdapter } from '../lib/adapters.js';
import { startPreview, stopPreview } from '../lib/preview.js';
import type { Draft } from '../types.js';

const execAsync = promisify(exec);
export const draftsRouter = Router();

let activeDraft: Draft | null = null;

export function getActiveDraft(): Draft | null {
  return activeDraft;
}

draftsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const worktrees = await listWorktrees(config.appRepoPath);
    const drafts = worktrees.filter(w => w.branch !== 'main');
    res.json({ drafts, active: activeDraft });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

draftsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const name = req.body.name || `draft-${Date.now()}`;
    const branchName = `draft/${name}`;
    const worktreePath = path.join(config.appRepoPath, '..', 'worktrees', name);

    await fs.mkdir(path.dirname(worktreePath), { recursive: true });
    await createWorktree(config.appRepoPath, branchName, worktreePath);

    const adapter = await detectAdapter(worktreePath);
    if (!adapter) {
      res.status(400).json({ error: 'Could not detect app type' });
      return;
    }

    if (adapter.install) {
      await execAsync(adapter.install, { cwd: worktreePath });
    }
    if (adapter.build) {
      await execAsync(adapter.build, { cwd: worktreePath });
    }

    activeDraft = { name, branch: branchName, path: worktreePath, adapter };
    startPreview(worktreePath, adapter);

    res.json({ draft: activeDraft });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

draftsRouter.delete('/:name', async (req: Request<{ name: string }>, res: Response) => {
  try {
    const { name } = req.params;
    const worktreePath = path.join(config.appRepoPath, '..', 'worktrees', name);

    if (activeDraft?.name === name) {
      stopPreview();
      activeDraft = null;
    }

    await removeWorktree(config.appRepoPath, worktreePath);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

draftsRouter.post('/:name/rebuild', async (req: Request<{ name: string }>, res: Response) => {
  try {
    const { name } = req.params;
    const worktreePath = path.join(config.appRepoPath, '..', 'worktrees', name);

    const adapter = await detectAdapter(worktreePath);
    if (!adapter) {
      res.status(400).json({ error: 'Could not detect app type' });
      return;
    }

    if (adapter.install) {
      await execAsync(adapter.install, { cwd: worktreePath });
    }
    if (adapter.build) {
      await execAsync(adapter.build, { cwd: worktreePath });
    }

    stopPreview();
    startPreview(worktreePath, adapter);

    if (activeDraft?.name === name) {
      activeDraft.adapter = adapter;
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
