import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config.js';
import { draftService } from '../services/draft-service.js';
import { createLogger } from './logger.js';

const execFileAsync = promisify(execFile);
const log = createLogger('bootstrap');

export async function bootstrapAppRepo(seedPath: string): Promise<void> {
  const repoPath = config.appRepoPath;

  const exists = await fs.access(path.join(repoPath, '.git')).then(() => true).catch(() => false);
  if (!exists) {
    log.info({ seedPath, repoPath }, 'initializing app repo from seed');

    await fs.mkdir(repoPath, { recursive: true });
    await execFileAsync('git', ['init'], { cwd: repoPath });

    const entries = await fs.readdir(seedPath);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.git') continue;
      const src = path.join(seedPath, entry);
      const dest = path.join(repoPath, entry);
      await fs.cp(src, dest, { recursive: true });
    }

    await execFileAsync('git', ['add', '-A'], { cwd: repoPath });
    await execFileAsync('git', ['commit', '-m', 'Initial commit'], { cwd: repoPath });

    log.info({ repoPath }, 'app repo ready');
  } else {
    log.info({ repoPath }, 'app repo already exists');
  }

  const live = draftService.getLive();
  if (!live) {
    log.info('no live version found, creating initial version');
    const initial = await draftService.create('initial');
    await draftService.publish('initial');
    log.info({ name: initial.name }, 'initial version published');
  }
}
