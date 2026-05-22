import fs from 'fs/promises';
import path from 'path';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config.js';
import { installAndBuild } from './deploy.js';
import { liveServer } from './servers.js';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export async function bootstrapAppRepo(seedPath: string): Promise<void> {
  const repoPath = config.appRepoPath;

  const exists = await fs.access(path.join(repoPath, '.git')).then(() => true).catch(() => false);
  if (!exists) {
    console.log('[bootstrap] Initializing app repo from seed...');

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

    console.log('[bootstrap] App repo ready at', repoPath);
  } else {
    console.log('[bootstrap] App repo already exists, skipping');
  }

  await deployLive();
}

export async function deployLive(): Promise<void> {
  const livePath = config.liveClonePath;

  const exists = await fs.access(path.join(livePath, '.git')).then(() => true).catch(() => false);
  if (!exists) {
    console.log('[live] Cloning app repo for live server...');
    await execAsync(`git clone ${config.appRepoPath} ${livePath}`);
  } else {
    await execAsync('git pull origin main', { cwd: livePath });
  }

  const adapter = await installAndBuild(livePath);
  liveServer.start(livePath, adapter);
}
