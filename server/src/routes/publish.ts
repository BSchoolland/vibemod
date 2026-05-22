import { Router } from 'express';
import fs from 'fs/promises';
import { config } from '../config.js';
import { commitAll, mergeBranch } from '../lib/git.js';
import { deployLive } from '../lib/bootstrap.js';
import { draftService } from '../services/draft-service.js';
import { route, annotate, time } from '../lib/request-context.js';

export const publishRouter = Router();

publishRouter.post('/', route(async (_req, res) => {
  const draft = draftService.getActive();
  if (!draft) {
    res.status(400).json({ error: 'No active draft to publish' });
    return;
  }

  annotate({ draftName: draft.name, draftBranch: draft.branch });

  await time('commit', () => commitAll(draft.path, `Draft changes from ${draft.name}`));
  await time('merge', () => mergeBranch(config.appRepoPath, draft.branch));
  await time('deploy', () => deployLive());

  res.json({ ok: true, message: `Published ${draft.branch} to live` });
}));

publishRouter.get('/status', route(async (_req, res) => {
  const livePath = config.liveClonePath;
  const exists = await fs.access(livePath).then(() => true).catch(() => false);
  annotate({ deployed: exists });
  res.json({ deployed: exists, livePath });
}));
