import { Router } from 'express';
import { draftService } from '../services/draft-service.js';
import { route, annotate, time } from '../lib/request-context.js';

export const publishRouter = Router();

publishRouter.post('/', route(async (req, res) => {
  const name = req.body.name as string | undefined;

  const draft = name
    ? draftService.getByName(name)
    : draftService.getActive();

  if (!draft) {
    res.status(400).json({ error: name ? `Draft "${name}" not found` : 'No active draft to publish' });
    return;
  }

  annotate({ draftName: draft.name, draftBranch: draft.branch });

  await time('publish', () => draftService.publish(draft.name));

  res.json({ ok: true, message: `Published ${draft.name} to live` });
}));

publishRouter.get('/status', route((_req, res) => {
  const live = draftService.getLive();
  annotate({ deployed: !!live, liveDraft: live?.name ?? null });
  res.json({ deployed: !!live, liveDraft: live?.name ?? null });
}));
