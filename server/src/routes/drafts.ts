import { Router, type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config.js';
import { createWorktree, removeWorktree, listWorktrees } from '../lib/git.js';
import { installAndBuild } from '../lib/deploy.js';
import { previewServer } from '../lib/servers.js';
import type { Draft } from '../types.js';

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

    const adapter = await installAndBuild(worktreePath);
    activeDraft = { name, branch: branchName, path: worktreePath, adapter };
    await previewServer.start(worktreePath, adapter);

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
      previewServer.stop();
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

    const adapter = await installAndBuild(worktreePath);
    previewServer.stop();
    await previewServer.start(worktreePath, adapter);

    if (activeDraft?.name === name) {
      activeDraft.adapter = adapter;
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
