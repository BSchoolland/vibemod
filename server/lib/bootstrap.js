import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config.js';

const execFileAsync = promisify(execFile);

export async function bootstrapAppRepo(seedPath) {
  const repoPath = config.appRepoPath;

  const exists = await fs.access(path.join(repoPath, '.git')).then(() => true).catch(() => false);
  if (exists) {
    console.log('[bootstrap] App repo already exists, skipping');
    return;
  }

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
}
