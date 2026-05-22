import { spawn, type ChildProcess } from 'child_process';
import express from 'express';
import { createServer, type Server } from 'http';
import path from 'path';
import { config } from '../config.js';
import type { AppAdapter } from '../types.js';

let previewProcess: ChildProcess | null = null;
let staticServer: Server | null = null;

export function startPreview(appDir: string, adapter: AppAdapter): void {
  stopPreview();

  if (adapter.startFile) {
    const app = express();
    app.use(express.static(appDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(appDir, adapter.startFile!));
    });
    staticServer = createServer(app);
    staticServer.listen(config.previewPort, () => {
      console.log(`[preview] Static server on port ${config.previewPort}`);
    });
    return;
  }

  const startCmd = adapter.start || adapter.dev;
  if (!startCmd) return;

  const [cmd, ...args] = startCmd.split(' ');
  previewProcess = spawn(cmd, args, {
    cwd: appDir,
    env: { ...process.env, PORT: String(config.previewPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  previewProcess.stdout!.on('data', (chunk: Buffer) => {
    console.log(`[preview] ${chunk.toString().trim()}`);
  });

  previewProcess.stderr!.on('data', (chunk: Buffer) => {
    console.error(`[preview] ${chunk.toString().trim()}`);
  });

  previewProcess.on('close', (code) => {
    console.log(`[preview] process exited with code ${code}`);
    previewProcess = null;
  });
}

export function stopPreview(): void {
  if (previewProcess) {
    previewProcess.kill();
    previewProcess = null;
  }
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
}
