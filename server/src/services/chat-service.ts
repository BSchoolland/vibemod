import { db } from '../lib/db.js';
import { runAiCli } from '../lib/ai-cli.js';
import { draftService } from './draft-service.js';

export interface MessageRow {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  created_at: string;
}

export interface ConversationRow {
  id: number;
  draft_id: number;
  title: string | null;
  created_at: string;
}

class ChatService {
  createConversation(draftId: number, title?: string): ConversationRow {
    const result = db.prepare(
      'INSERT INTO conversations (draft_id, title) VALUES (?, ?)'
    ).run(draftId, title ?? null);

    return db.prepare('SELECT * FROM conversations WHERE id = ?')
      .get(result.lastInsertRowid) as ConversationRow;
  }

  getConversationsForDraft(draftId: number): ConversationRow[] {
    return db.prepare(
      'SELECT * FROM conversations WHERE draft_id = ? ORDER BY created_at DESC'
    ).all(draftId) as ConversationRow[];
  }

  getMessages(conversationId: number): MessageRow[] {
    return db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId) as MessageRow[];
  }

  addMessage(conversationId: number, role: string, content: string): MessageRow {
    const result = db.prepare(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
    ).run(conversationId, role, content);

    return db.prepare('SELECT * FROM messages WHERE id = ?')
      .get(result.lastInsertRowid) as MessageRow;
  }

  async sendMessage(conversationId: number, content: string): Promise<MessageRow> {
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?')
      .get(conversationId) as ConversationRow | undefined;
    if (!conversation) throw new Error('Conversation not found');

    const draft = draftService.getActive();
    if (!draft || draft.id !== conversation.draft_id) {
      throw new Error('Conversation does not belong to the active draft');
    }

    this.addMessage(conversationId, 'user', content);

    const aiResponse = await new Promise<{ code: number; output: string }>((resolve) => {
      runAiCli(
        content,
        draft.path,
        () => {},
        (code, fullOutput) => resolve({ code, output: fullOutput }),
      );
    });

    const aiMessage = this.addMessage(conversationId, 'ai', aiResponse.output);

    if (aiResponse.code === 0) {
      try {
        await draftService.rebuild(draft.name);
      } catch (err: any) {
        this.addMessage(conversationId, 'system', `Rebuild failed: ${err.message}`);
      }
    }

    return aiMessage;
  }
}

export const chatService = new ChatService();
