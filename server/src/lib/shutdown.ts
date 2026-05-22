import type { Server } from 'http';
import { previewServer, liveServer } from './servers.js';

let shuttingDown = false;

export function registerShutdown(httpServer: Server): void {
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[shutdown] Received ${signal}, shutting down...`);

    httpServer.close();
    console.log('[shutdown] HTTP server closed');

    await Promise.all([
      previewServer.stopGraceful(3000),
      liveServer.stopGraceful(3000),
    ]);
    console.log('[shutdown] All child processes stopped');

    console.log('[shutdown] Clean exit');
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
