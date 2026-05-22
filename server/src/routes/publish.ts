import { Router } from 'express';
import { draftService } from '../services/draft-service.js';
import { route, annotate } from '../lib/request-context.js';

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

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (stage: string) => {
    res.write(`data: ${JSON.stringify({ stage })}\n\n`);
  };

  try {
    send('committing');
    await draftService.publishWithProgress(draft.name, {
      onCommit: () => send('building'),
      onBuild: () => send('starting'),
    });
    send('done');
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ stage: 'error', error: err.message ?? String(err) })}\n\n`);
  } finally {
    res.end();
  }
}));

publishRouter.get('/status', route((_req, res) => {
  const live = draftService.getLive();
  annotate({ deployed: !!live, liveDraft: live?.name ?? null });
  res.json({ deployed: !!live, liveDraft: live?.name ?? null });
}));
