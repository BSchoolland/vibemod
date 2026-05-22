import { Router, type Request, type Response } from 'express';
import fs from 'fs/promises';
import { config } from '../config.js';
import { commitAll, mergeBranch } from '../lib/git.js';
import { deployLive } from '../lib/bootstrap.js';
import { draftService } from '../services/draft-service.js';

export const publishRouter = Router();

publishRouter.post('/', async (_req: Request, res: Response) => {
  try {
    const draft = draftService.getActive();
    if (!draft) {
      res.status(400).json({ error: 'No active draft to publish' });
      return;
    }

    await commitAll(draft.path, `Draft changes from ${draft.name}`);
    await mergeBranch(config.appRepoPath, draft.branch);
    await deployLive();

    res.json({ ok: true, message: `Published ${draft.branch} to live` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

publishRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const livePath = config.liveClonePath;
    const exists = await fs.access(livePath).then(() => true).catch(() => false);
    res.json({ deployed: exists, livePath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
