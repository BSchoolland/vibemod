import type { Server } from 'http';
import { serverManager } from '../services/server-manager.js';
import { screenshotService } from '../services/screenshot-service.js';
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
      serverManager.stopAllGraceful(3000),
      screenshotService.shutdown(),
    ]);
    log.info('all child processes stopped');

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));

  process.on('exit', () => {
    if (!shuttingDown) {
      serverManager.stopAll();
    }
  });
}
