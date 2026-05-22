import { spawn } from 'child_process';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { config } from '../config.js';

let previewProcess = null;
let staticServer = null;

export function startPreview(appDir, adapter) {
  stopPreview();

  if (adapter.startFile) {
    const app = express();
    app.use(express.static(appDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(appDir, adapter.startFile));
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

  previewProcess.stdout.on('data', (chunk) => {
    console.log(`[preview] ${chunk.toString().trim()}`);
  });

  previewProcess.stderr.on('data', (chunk) => {
    console.error(`[preview] ${chunk.toString().trim()}`);
  });

  previewProcess.on('close', (code) => {
    console.log(`[preview] process exited with code ${code}`);
    previewProcess = null;
  });
}

export function stopPreview() {
  if (previewProcess) {
    previewProcess.kill();
    previewProcess = null;
  }
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
}

export function isPreviewRunning() {
  return previewProcess !== null || staticServer !== null;
}
