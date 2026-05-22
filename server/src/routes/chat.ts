import { Router } from 'express';
import { chatService } from '../services/chat-service.js';
import { draftService } from '../services/draft-service.js';
import { route, annotate } from '../lib/request-context.js';

export const chatRouter = Router();

chatRouter.post('/conversations', route((req, res) => {
  const draft = draftService.getActive();
  if (!draft) {
    res.status(400).json({ error: 'No active draft' });
    return;
  }
  annotate({ draftId: draft.id });
  const conversation = chatService.createConversation(draft.id, req.body.title);
  annotate({ conversationId: conversation.id });
  res.json({ conversation });
}));

chatRouter.get('/conversations', route((_req, res) => {
  const draft = draftService.getActive();
  if (!draft) {
    res.json({ conversations: [] });
    return;
  }
  annotate({ draftId: draft.id });
  const conversations = chatService.getConversationsForDraft(draft.id);
  annotate({ conversationCount: conversations.length });
  res.json({ conversations });
}));

chatRouter.get('/conversations/:id/messages', route((req, res) => {
  const conversationId = Number(req.params.id);
  annotate({ conversationId });
  const messages = chatService.getMessages(conversationId);
  annotate({ messageCount: messages.length });
  res.json({ messages });
}));

chatRouter.post('/conversations/:id/messages', route(async (req, res) => {
  const conversationId = Number(req.params.id);
  annotate({ conversationId });
  const aiMessage = await chatService.sendMessage(conversationId, req.body.content);
  annotate({ aiMessageId: aiMessage.id });
  res.json({ message: aiMessage });
}));
