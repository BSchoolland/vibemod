import { Router } from 'express';
import { draftService } from '../services/draft-service.js';
import { route, annotate } from '../lib/request-context.js';

export const draftsRouter = Router();

draftsRouter.get('/', route((_req, res) => {
  const drafts = draftService.list();
  const active = draftService.getActive();
  annotate({ draftCount: drafts.length, activeDraft: active?.name ?? null });
  res.json({ drafts, active });
}));

draftsRouter.post('/', route(async (req, res) => {
  annotate({ requestedName: req.body.name ?? null });
  const draft = await draftService.create(req.body.name);
  annotate({ draftId: draft.id, draftName: draft.name });
  res.json({ draft });
}));

draftsRouter.post('/:name/activate', route(async (req, res) => {
  const name = req.params.name as string;
  annotate({ draftName: name });
  const draft = await draftService.activate(name);
  annotate({ draftId: draft.id });
  res.json({ draft });
}));

draftsRouter.delete('/:name', route(async (req, res) => {
  const name = req.params.name as string;
  annotate({ draftName: name });
  await draftService.delete(name);
  res.json({ ok: true });
}));

draftsRouter.post('/:name/rebuild', route(async (req, res) => {
  const name = req.params.name as string;
  annotate({ draftName: name });
  const adapter = await draftService.rebuild(name);
  annotate({ adapterId: adapter.id });
  res.json({ ok: true, adapter });
}));
