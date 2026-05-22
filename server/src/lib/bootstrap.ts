import fs from 'fs/promises';
import path from 'path';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { spawn, type ChildProcess } from 'child_process';
import { config } from '../config.js';
import { detectAdapter } from './adapters.js';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

let liveProcess: ChildProcess | null = null;

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
    await execAsync('git pull origin main', { cwd: livePath }).catch(() => {
      console.log('[live] git pull failed, continuing with existing state');
    });
  }

  const adapter = await detectAdapter(livePath);
  if (!adapter) {
    console.error('[live] Could not detect app type, skipping live server');
    return;
  }

  if (adapter.install) {
    console.log('[live] Installing dependencies...');
    await execAsync(adapter.install, { cwd: livePath });
  }
  if (adapter.build) {
    console.log('[live] Building...');
    await execAsync(adapter.build, { cwd: livePath });
  }

  startLiveServer(livePath, adapter);
}

function startLiveServer(appDir: string, adapter: { start: string | null; dev: string | null }): void {
  if (liveProcess) {
    liveProcess.kill();
    liveProcess = null;
  }

  const startCmd = adapter.start || adapter.dev;
  if (!startCmd) return;

  const [cmd, ...args] = startCmd.split(' ');
  liveProcess = spawn(cmd, args, {
    cwd: appDir,
    env: { ...process.env, PORT: String(config.livePort) },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  liveProcess.stdout!.on('data', (chunk: Buffer) => {
    console.log(`[live] ${chunk.toString().trim()}`);
  });

  liveProcess.stderr!.on('data', (chunk: Buffer) => {
    console.error(`[live] ${chunk.toString().trim()}`);
  });

  liveProcess.on('close', (code) => {
    console.log(`[live] process exited with code ${code}`);
    liveProcess = null;
  });

  console.log(`[live] Server starting on port ${config.livePort}`);
}
