import { execSync } from 'child_process';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { draftsRouter } from './routes/drafts.js';
import { chatRouter } from './routes/chat.js';
import { publishRouter } from './routes/publish.js';
import { bootstrapAppRepo } from './lib/bootstrap.js';
import { registerShutdown } from './lib/shutdown.js';
import { draftService } from './services/draft-service.js';
import { config } from './config.js';

function killPort(port: number): void {
  try {
    const pids = execSync(`lsof -t -i :${port}`, { encoding: 'utf-8' }).trim();
    if (pids) {
      for (const pid of pids.split('\n')) {
        try { process.kill(Number(pid), 'SIGKILL'); } catch {}
      }
      console.log(`[startup] Killed stale process(es) on port ${port}`);
    }
  } catch {}
}

killPort(config.port);

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/drafts', draftsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/publish', publishRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

registerShutdown(server);

bootstrapAppRepo(config.seedPath).then(async () => {
  await draftService.restoreActive();
  server.listen(config.port, () => {
    console.log(`Vibemod server running on port ${config.port}`);
  });
});
