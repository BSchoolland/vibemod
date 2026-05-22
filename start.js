#!/usr/bin/env node
import { spawn, execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORTS = [5173, 3000, 3001];

function clearPorts() {
  for (const port of PORTS) {
    try {
      const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
      if (pids) {
        for (const pid of pids.split('\n')) {
          try {
            process.kill(Number(pid), 'SIGKILL');
            console.log(`[vibemod] Killed pid ${pid} on port ${port}`);
          } catch {}
        }
      }
    } catch {}
  }
}

let serverProc = null;
let clientProc = null;
let shuttingDown = false;

function startServer() {
  const tsx = join(ROOT, 'server', 'node_modules', '.bin', 'tsx');
  const entry = join(ROOT, 'server', 'src', 'index.ts');
  serverProc = spawn(tsx, [entry], {
    stdio: 'inherit',
    detached: true,
  });
  serverProc.on('close', (code) => {
    serverProc = null;
    if (!shuttingDown) {
      console.log(`[vibemod] Server exited with code ${code}`);
      shutdown();
    }
  });
}

function startClient() {
  const vite = join(ROOT, 'client', 'node_modules', '.bin', 'vite');
  clientProc = spawn(vite, [], {
    cwd: join(ROOT, 'client'),
    stdio: 'inherit',
    detached: true,
  });
  clientProc.on('close', (code) => {
    clientProc = null;
    if (!shuttingDown) {
      console.log(`[vibemod] Client exited with code ${code}`);
      shutdown();
    }
  });
}

function killProc(proc, label) {
  if (!proc || !proc.pid) return Promise.resolve();

  return new Promise((resolve) => {
    try { process.kill(-proc.pid, 'SIGTERM'); } catch {}

    const timeout = setTimeout(() => {
      try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
      resolve();
    }, 3000);

    proc.on('close', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log('\n[vibemod] Shutting down...');

  await Promise.all([
    killProc(serverProc, 'server'),
    killProc(clientProc, 'client'),
  ]);

  console.log('[vibemod] Stopped');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

console.log('[vibemod] Starting...');
clearPorts();
startServer();
startClient();
console.log('[vibemod]   Editor:  http://localhost:5173');
console.log('[vibemod]   API:     http://localhost:3000');
console.log('[vibemod]   Live:    http://localhost:3001');
console.log('');
