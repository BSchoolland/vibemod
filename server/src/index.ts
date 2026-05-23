import { execSync } from 'child_process';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { draftsRouter } from './routes/drafts.js';
import { chatRouter } from './routes/chat.js';
import { publishRouter } from './routes/publish.js';
import { bootstrapAppRepo } from './lib/bootstrap.js';
import { registerShutdown } from './lib/shutdown.js';
import { serverManager } from './services/server-manager.js';
import { config } from './config.js';
import { createLogger } from './lib/logger.js';
import { requestLogger, errorHandler } from './lib/request-context.js';
import { screenshotService } from './services/screenshot-service.js';

const log = createLogger('startup');

screenshotService.listen();

function killPort(port: number): void {
  try {
    const pids = execSync(`lsof -t -i :${port}`, { encoding: 'utf-8' }).trim();
    if (pids) {
      for (const pid of pids.split('\n')) {
        try { process.kill(Number(pid), 'SIGKILL'); } catch {}
      }
      log.warn({ port, pids: pids.split('\n').map(Number) }, 'killed stale process(es)');
    }
  } catch {}
}

killPort(config.port);

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/api/drafts', draftsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/publish', publishRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

registerShutdown(server);

bootstrapAppRepo(config.seedPath).then(async () => {
  await serverManager.restoreServers();
  server.listen(config.port, () => {
    log.info({ port: config.port }, 'server started');
  });
});
