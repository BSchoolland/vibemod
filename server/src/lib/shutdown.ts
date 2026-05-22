import type { Server } from 'http';
import { previewServer, liveServer } from './servers.js';
import { createLogger } from './logger.js';

const log = createLogger('shutdown');

let shuttingDown = false;

export function registerShutdown(httpServer: Server): void {
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ signal }, 'shutting down');

    httpServer.close();
    log.info('http server closed');

    await Promise.all([
      previewServer.stopGraceful(3000),
      liveServer.stopGraceful(3000),
    ]);
    log.info('all child processes stopped');

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));

  process.on('exit', () => {
    if (!shuttingDown) {
      previewServer.stop();
      liveServer.stop();
    }
  });
}
