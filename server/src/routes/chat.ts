import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { runAiCli } from '../lib/ai-cli.js';
import { getActiveDraft } from './drafts.js';
import type { WsMessageIn, WsMessageOut } from '../types.js';

export const chatRouter = Router();
let wss: WebSocketServer | null = null;

export function setChatWss(webSocketServer: WebSocketServer): void {
  wss = webSocketServer;

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg: WsMessageIn = JSON.parse(raw.toString());
        if (msg.type === 'chat') {
          handleChat(msg.content, ws);
        }
      } catch {
        send(ws, { type: 'error', content: 'Invalid message' });
      }
    });
  });
}

function send(ws: WebSocket, data: WsMessageOut): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data: WsMessageOut): void {
  if (!wss) return;
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

function handleChat(prompt: string, ws: WebSocket): void {
  const draft = getActiveDraft();
  if (!draft) {
    send(ws, { type: 'error', content: 'No active draft. Create a draft first.' });
    return;
  }

  send(ws, { type: 'status', content: 'AI is thinking...' });

  runAiCli(
    prompt,
    draft.path,
    (chunk) => broadcast({ type: 'ai-stream', content: chunk }),
    (code, fullOutput) => broadcast({ type: 'ai-done', content: fullOutput, exitCode: code }),
  );
}

chatRouter.get('/history', (_req, res) => {
  res.json({ messages: [] });
});
