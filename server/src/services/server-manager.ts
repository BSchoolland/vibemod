import fs from 'fs/promises';
import { previewServer, liveServer } from '../lib/servers.js';
import { config } from '../config.js';
import { draftRepo } from './draft-repo.js';
import { draftEvents } from '../lib/draft-events.js';
import { createLogger } from '../lib/logger.js';
import type { AppAdapter } from '../types.js';

const log = createLogger('server-manager');

class ServerManager {
  async startPreview(path: string, adapter: AppAdapter, draftId: number): Promise<void> {
    previewServer.stop();
    await previewServer.start(path, adapter);
    draftEvents.emit('preview-started', draftId, config.previewPort);
  }

  stopPreview(): void {
    previewServer.stop();
  }

  async startLive(path: string, adapter: AppAdapter): Promise<void> {
    liveServer.stop();
    await liveServer.start(path, adapter);
  }

  async stopAllGraceful(timeoutMs = 3000): Promise<void> {
    await Promise.all([
      previewServer.stopGraceful(timeoutMs),
      liveServer.stopGraceful(timeoutMs),
    ]);
  }

  stopAll(): void {
    previewServer.stop();
    liveServer.stop();
  }

  async restoreServers(): Promise<void> {
    for (const draft of [draftRepo.getLive(), draftRepo.getActive()]) {
      if (!draft?.adapter) continue;

      const pathExists = await fs.access(draft.path).then(() => true).catch(() => false);
      if (!pathExists) {
        log.info({ draftName: draft.name }, 'stale draft — worktree missing, cleaning up');
        draftRepo.deleteById(draft.id);
        continue;
      }

      const isLive = draft.status === 'live';
      const server = isLive ? liveServer : previewServer;

      if (!server.running) {
        log.info({ draftName: draft.name }, isLive ? 'restoring live server' : 'restoring preview server');
        await server.start(draft.path, draft.adapter);
      }
    }
  }
}

export const serverManager = new ServerManager();
