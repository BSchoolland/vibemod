import { type Server } from 'http';
import { type ChildProcess } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { chatService } from '../services/chat-service.js';
import { createLogger } from './logger.js';

const log = createLogger('chat-ws');

interface SendMessagePayload {
  type: 'send_message';
  conversationId: number;
  content: string;
  drawing?: { dataUrl: string; width: number; height: number };
}

interface CancelPayload {
  type: 'cancel';
}

type ClientMessage = SendMessagePayload | CancelPayload;

function send(ws: WebSocket, data: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function attachChatWs(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    log.info('client connected');
    let activeProc: ChildProcess | null = null;
    let busy = false;

    ws.on('message', (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(ws, { type: 'error', error: 'Invalid JSON' });
        return;
      }

      log.info({ type: msg.type }, 'received message');

      if (msg.type === 'cancel') {
        if (activeProc) {
          activeProc.kill('SIGTERM');
          activeProc = null;
        }
        busy = false;
        return;
      }

      if (msg.type === 'send_message') {
        if (busy) {
          send(ws, { type: 'error', error: 'A message is already in progress' });
          return;
        }
        busy = true;

        log.info({ conversationId: msg.conversationId, hasDrawing: !!msg.drawing }, 'starting stream');

        chatService.streamMessage(
          msg.conversationId,
          msg.content,
          {
            onChunk: (content) => send(ws, { type: 'chunk', content }),
            onTool: (event) => send(ws, { ...event }),
            onThinking: (thinking) => send(ws, { type: 'thinking', thinking }),
            onAiMessage: (message) => {
              activeProc = null;
              busy = false;
              log.info({ messageId: message.id }, 'ai done');
              send(ws, { type: 'ai_done', message });
            },
            onRebuildComplete: () => {
              log.info('rebuild complete');
              send(ws, { type: 'rebuild_complete' });
            },
            onError: (error) => {
              log.error({ error }, 'stream error');
              busy = false;
              send(ws, { type: 'error', error });
            },
          },
          msg.drawing,
        ).then((proc) => {
          activeProc = proc;
          proc.on('error', (err) => {
            log.error({ err: err.message }, 'process error');
            activeProc = null;
            busy = false;
          });
        }).catch((err: any) => {
          log.error({ err: err.message }, 'streamMessage threw');
          activeProc = null;
          busy = false;
          send(ws, { type: 'error', error: err.message });
        });
        return;
      }

      send(ws, { type: 'error', error: `Unknown message type` });
    });

    ws.on('close', () => {
      log.info('client disconnected');
      if (activeProc) {
        activeProc.kill('SIGTERM');
        activeProc = null;
      }
    });
  });

  log.info('WebSocket server attached');
}
