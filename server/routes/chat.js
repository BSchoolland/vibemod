import { Router } from 'express';
import { runAiCli } from '../lib/ai-cli.js';
import { getActiveDraft } from './drafts.js';

export const chatRouter = Router();
let wss = null;

export function setChatWss(webSocketServer) {
  wss = webSocketServer;

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'chat') {
          handleChat(msg.content, ws);
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', content: 'Invalid message' }));
      }
    });
  });
}

function broadcast(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

function handleChat(prompt, ws) {
  const draft = getActiveDraft();
  if (!draft) {
    ws.send(JSON.stringify({
      type: 'error',
      content: 'No active draft. Create a draft first.',
    }));
    return;
  }

  ws.send(JSON.stringify({ type: 'status', content: 'AI is thinking...' }));

  runAiCli(
    prompt,
    draft.path,
    (chunk) => {
      broadcast({ type: 'ai-stream', content: chunk });
    },
    (code, fullOutput) => {
      broadcast({
        type: 'ai-done',
        content: fullOutput,
        exitCode: code,
      });
    },
  );
}

chatRouter.get('/history', (req, res) => {
  res.json({ messages: [] });
});
