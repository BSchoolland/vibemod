import { spawn, type ChildProcess } from 'child_process';
import { config } from '../config.js';

export function runAiCli(
  prompt: string,
  cwd: string,
  onData: (chunk: string) => void,
  onDone: (code: number, fullOutput: string) => void,
): ChildProcess {
  const args = config.aiCliArgs.split(' ').filter(Boolean);
  args.push(prompt);

  const proc = spawn(config.aiCli, args, {
    cwd,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let fullOutput = '';

  proc.stdout!.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    fullOutput += text;
    onData(text);
  });

  proc.stderr!.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    fullOutput += text;
    onData(text);
  });

  proc.on('close', (code) => {
    onDone(code ?? 1, fullOutput);
  });

  proc.on('error', (err) => {
    onDone(1, `Failed to start AI CLI: ${err.message}`);
  });

  return proc;
}
