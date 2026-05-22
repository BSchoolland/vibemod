import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { draftsRouter } from './routes/drafts.js';
import { chatRouter, setChatWss } from './routes/chat.js';
import { publishRouter } from './routes/publish.js';
import { bootstrapAppRepo } from './lib/bootstrap.js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/drafts', draftsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/publish', publishRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const wss = new WebSocketServer({ server, path: '/ws/chat' });
setChatWss(wss);

const seedPath = path.join(__dirname, '..', 'seed-app');
bootstrapAppRepo(seedPath).then(() => {
  server.listen(config.port, () => {
    console.log(`Vibemod server running on port ${config.port}`);
  });
});
