import { Router, type Request, type Response } from 'express';
import { chatService } from '../services/chat-service.js';
import { draftService } from '../services/draft-service.js';

export const chatRouter = Router();

chatRouter.post('/conversations', (req: Request, res: Response) => {
  try {
    const draft = draftService.getActive();
    if (!draft) {
      res.status(400).json({ error: 'No active draft' });
      return;
    }
    const conversation = chatService.createConversation(draft.id, req.body.title);
    res.json({ conversation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

chatRouter.get('/conversations', (_req: Request, res: Response) => {
  try {
    const draft = draftService.getActive();
    if (!draft) {
      res.json({ conversations: [] });
      return;
    }
    const conversations = chatService.getConversationsForDraft(draft.id);
    res.json({ conversations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

chatRouter.get('/conversations/:id/messages', (req: Request<{ id: string }>, res: Response) => {
  try {
    const messages = chatService.getMessages(Number(req.params.id));
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

chatRouter.post('/conversations/:id/messages', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const aiMessage = await chatService.sendMessage(Number(req.params.id), req.body.content);
    res.json({ message: aiMessage });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
