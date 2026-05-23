import { type ChildProcess } from 'child_process';
import { db } from '../lib/db.js';
import { runAiCli, type ToolEvent } from '../lib/ai-cli.js';
import { draftService } from './draft-service.js';
import { screenshotService } from './screenshot-service.js';
import { generateBranchName } from '../lib/gemini.js';
import { config } from '../config.js';
import { createLogger } from '../lib/logger.js';

export interface DrawingInput {
  dataUrl: string;
  width: number;
  height: number;
}

const log = createLogger('chat-service');

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

export interface StreamCallbacks {
  onChunk: (content: string) => void;
  onTool: (event: ToolEvent) => void;
  onThinking: (thinking: string) => void;
  onAiMessage: (message: MessageRow) => void;
  onRebuildComplete: () => void;
  onError: (error: string) => void;
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

  getConversation(id: number): ConversationRow | undefined {
    return db.prepare('SELECT * FROM conversations WHERE id = ?')
      .get(id) as ConversationRow | undefined;
  }

  async streamMessage(
    conversationId: number,
    content: string,
    callbacks: StreamCallbacks,
    drawing?: DrawingInput,
  ): Promise<ChildProcess> {
    const conversation = this.getConversation(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const draft = draftService.getActive();
    if (!draft || draft.id !== conversation.draft_id) {
      throw new Error('Conversation does not belong to the active draft');
    }

    const storedContent = drawing ? `${content}\n\n[annotated screenshot attached]` : content;
    this.addMessage(conversationId, 'user', storedContent);

    if (!draft.display_name && config.geminiApiKey) {
      generateBranchName(content)
        .then((name) => draftService.setDisplayName(draft.name, name))
        .catch((err) => log.warn({ err: err.message }, 'branch naming failed'));
    }

    const attachments: string[] = [];
    let prompt = content;
    if (drawing) {
      try {
        const screenshotPath = await screenshotService.captureWithOverlay(
          config.previewPort,
          drawing.dataUrl,
          drawing.width,
          drawing.height,
        );
        attachments.push(screenshotPath);
        prompt = `${content}\n\nThe attached image shows the current preview of the app with the user's pink-ink annotation drawn on top. Use the annotation to understand which element(s) they're pointing at.`;
      } catch (err: any) {
        log.error({ err: err.message }, 'failed to capture annotated screenshot');
        prompt = `${content}\n\n(The user tried to attach an annotated screenshot but capture failed: ${err.message}.)`;
      }
    }

    const proc = runAiCli(prompt, draft.path, {
      onText: (chunk) => callbacks.onChunk(chunk),
      onTool: (event) => callbacks.onTool(event),
      onThinking: (thinking) => callbacks.onThinking(thinking),
      onDone: async (code, fullText) => {
        const aiMessage = this.addMessage(conversationId, 'ai', fullText);
        callbacks.onAiMessage(aiMessage);

        if (code !== 0) {
          callbacks.onRebuildComplete();
          return;
        }

        try {
          await draftService.rebuild(draft.name);
          callbacks.onRebuildComplete();
        } catch (err: any) {
          this.addMessage(conversationId, 'system', `Rebuild failed: ${err.message}`);
          callbacks.onError(`Rebuild failed: ${err.message}`);
        }
      },
    }, attachments);

    return proc;
  }
}

export const chatService = new ChatService();
