import type { Server } from 'http';
import type { WebSocketServer } from 'ws';
import { previewServer, liveServer } from './servers.js';

let shuttingDown = false;

export function registerShutdown(httpServer: Server, wss: WebSocketServer): void {
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[shutdown] Received ${signal}, shutting down...`);

    // 1. Close WebSocket connections so no new AI work starts
    for (const client of wss.clients) {
      client.close(1001, 'Server shutting down');
    }
    wss.close();
    console.log('[shutdown] WebSocket server closed');

    // 2. Stop accepting new HTTP requests
    httpServer.close();
    console.log('[shutdown] HTTP server closed');

    // 3. Gracefully stop child processes (SIGTERM → wait → SIGKILL)
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

  // Last resort: if something hangs, force exit after 10s
  process.on('exit', () => {
    if (!shuttingDown) {
      previewServer.stop();
      liveServer.stop();
    }
  });
}
