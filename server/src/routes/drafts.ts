import { Router, type Request, type Response } from 'express';
import { draftService } from '../services/draft-service.js';

export const draftsRouter = Router();

draftsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const drafts = draftService.list();
    const active = draftService.getActive();
    res.json({ drafts, active });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

draftsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const draft = await draftService.create(req.body.name);
    res.json({ draft });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

draftsRouter.delete('/:name', async (req: Request<{ name: string }>, res: Response) => {
  try {
    await draftService.delete(req.params.name);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

draftsRouter.post('/:name/rebuild', async (req: Request<{ name: string }>, res: Response) => {
  try {
    const adapter = await draftService.rebuild(req.params.name);
    res.json({ ok: true, adapter });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
