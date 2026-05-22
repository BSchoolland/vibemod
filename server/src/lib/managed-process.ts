import { spawn, execSync, type ChildProcess } from 'child_process';
import { createConnection } from 'net';
import express from 'express';
import { createServer, type Server } from 'http';
import path from 'path';
import { createLogger } from './logger.js';

interface ManagedProcessOptions {
  label: string;
  port: number;
}

export class ManagedProcess {
  private process: ChildProcess | null = null;
  private staticServer: Server | null = null;
  private log;
  readonly label: string;
  readonly port: number;

  constructor({ label, port }: ManagedProcessOptions) {
    this.label = label;
    this.port = port;
    this.log = createLogger(label);
  }

  async start(appDir: string, adapter: { start: string | null; dev: string | null; startFile: string | null }): Promise<void> {
    this.stop();
    this.killPortHolder();
    await this.waitForPortFree();

    if (adapter.startFile) {
      await this.startStatic(appDir, adapter.startFile);
      return;
    }

    const startCmd = adapter.start || adapter.dev;
    if (!startCmd) return;

    const [cmd, ...args] = startCmd.split(' ');
    this.process = spawn(cmd, args, {
      cwd: appDir,
      env: { ...process.env, PORT: String(this.port) },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      detached: true,
    });

    this.process.stdout!.on('data', (chunk: Buffer) => {
      this.log.debug({ output: chunk.toString().trim() }, 'stdout');
    });

    this.process.stderr!.on('data', (chunk: Buffer) => {
      this.log.warn({ output: chunk.toString().trim() }, 'stderr');
    });

    const spawned = this.process;
    spawned.on('close', (code) => {
      this.log.info({ exitCode: code }, 'process exited');
      if (this.process === spawned) {
        this.process = null;
      }
    });

    this.log.info({ port: this.port, pid: this.process.pid, cmd: startCmd }, 'starting');
    await this.waitForPort();
  }

  stop(): void {
    if (this.process) {
      this.killTree(this.process.pid!);
      this.process = null;
    }
    if (this.staticServer) {
      this.staticServer.close();
      this.staticServer = null;
    }
  }

  async stopGraceful(timeoutMs = 5000): Promise<void> {
    if (!this.process && !this.staticServer) return;

    if (this.staticServer) {
      await new Promise<void>((resolve) => {
        this.staticServer!.close(() => resolve());
      });
      this.staticServer = null;
      this.log.info('static server closed');
      return;
    }

    if (!this.process) return;

    const pid = this.process.pid!;
    this.killTree(pid, 'SIGTERM');

    const exited = await Promise.race([
      new Promise<boolean>((resolve) => {
        this.process?.on('close', () => resolve(true));
      }),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);

    if (!exited) {
      this.log.warn({ pid, timeoutMs }, 'graceful shutdown timed out, sending SIGKILL');
      this.killTree(pid, 'SIGKILL');
      this.killPortHolder();
    }

    this.process = null;
    this.log.info('stopped');
  }

  get running(): boolean {
    return this.process !== null || this.staticServer !== null;
  }

  private killTree(pid: number, signal: NodeJS.Signals = 'SIGKILL'): void {
    try {
      process.kill(-pid, signal);
    } catch {
      try { process.kill(pid, signal); } catch {}
    }
  }

  private killPortHolder(): void {
    try {
      const pids = execSync(`lsof -t -i :${this.port}`, { encoding: 'utf-8' }).trim();
      if (pids) {
        for (const pid of pids.split('\n')) {
          try { process.kill(Number(pid), 'SIGKILL'); } catch {}
        }
        this.log.warn({ port: this.port, pids: pids.split('\n').map(Number) }, 'killed stale process(es)');
      }
    } catch {}
  }

  private startStatic(appDir: string, startFile: string): Promise<void> {
    return new Promise((resolve) => {
      const app = express();
      app.use(express.static(appDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(appDir, startFile));
      });
      this.staticServer = createServer(app);
      this.staticServer.listen(this.port, () => {
        this.log.info({ port: this.port, startFile }, 'static server ready');
        resolve();
      });
    });
  }

  private waitForPortFree(timeoutMs = 5000, intervalMs = 100): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        const sock = createConnection({ port: this.port, host: '127.0.0.1' });
        sock.once('connect', () => {
          sock.destroy();
          if (Date.now() >= deadline) {
            reject(new Error(`Port ${this.port} still in use after ${timeoutMs}ms`));
          } else {
            setTimeout(check, intervalMs);
          }
        });
        sock.once('error', () => {
          sock.destroy();
          resolve();
        });
      };
      check();
    });
  }

  private waitForPort(timeoutMs = 30000, intervalMs = 200): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        if (!this.process) {
          reject(new Error('Process exited before server became ready'));
          return;
        }
        const sock = createConnection({ port: this.port, host: '127.0.0.1' });
        sock.once('connect', () => {
          sock.destroy();
          this.log.info({ port: this.port }, 'server ready');
          resolve();
        });
        sock.once('error', () => {
          sock.destroy();
          if (Date.now() >= deadline) {
            reject(new Error(`Timed out waiting for port ${this.port}`));
          } else {
            setTimeout(check, intervalMs);
          }
        });
      };
      check();
    });
  }
}
