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

    // Copy .gitignore first so we can use git check-ignore to filter
    const gitignoreSrc = path.join(seedPath, '.gitignore');
    const hasGitignore = await fs.access(gitignoreSrc).then(() => true).catch(() => false);
    if (hasGitignore) {
      await fs.cp(gitignoreSrc, path.join(repoPath, '.gitignore'));
    }

    const entries = await fs.readdir(seedPath);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.git' || entry === '.gitignore') continue;
      const ignored = await execFileAsync('git', ['check-ignore', '-q', entry], { cwd: repoPath })
        .then(() => true)
        .catch(() => false);
      if (ignored) {
        log.info({ entry }, 'skipping gitignored entry from seed');
        continue;
      }
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
