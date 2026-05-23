import { spawn, type ChildProcess } from 'child_process';
import { config } from '../config.js';
import { createLogger } from './logger.js';

const log = createLogger('ai-cli');

export interface ToolEvent {
  type: 'tool_start' | 'tool_end';
  toolName: string;
  args?: Record<string, unknown>;
}

export interface AiCliCallbacks {
  onText: (chunk: string) => void;
  onTool: (event: ToolEvent) => void;
  onThinking: (thinking: string) => void;
  onDone: (code: number, fullText: string) => void;
}

export function runAiCli(
  prompt: string,
  cwd: string,
  callbacks: AiCliCallbacks,
  attachments: string[] = [],
): ChildProcess {
  const args = [
    '--provider', 'google',
    '--model', 'gemini-3.5-flash',
    '--mode', 'json',
    '--no-session',
    '--no-context-files',
    '-p', prompt,
    ...attachments.map((p) => `@${p}`),
  ];

  log.info({ cwd, cli: config.aiCli }, 'starting');

  const proc = spawn(config.aiCli, args, {
    cwd,
    env: { ...process.env, GEMINI_API_KEY: config.geminiApiKey },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let fullText = '';
  let lineBuf = '';

  const processLine = (line: string) => {
    if (!line.trim()) return;
    let event: any;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }

    switch (event.type) {
      case 'tool_execution_start':
        callbacks.onTool({
          type: 'tool_start',
          toolName: event.toolName,
          args: event.args,
        });
        break;

      case 'tool_execution_end':
        callbacks.onTool({
          type: 'tool_end',
          toolName: event.toolName,
        });
        break;

      case 'message_update': {
        const ae = event.assistantMessageEvent;
        if (!ae) break;
        if (ae.type === 'text_delta' && ae.delta) {
          fullText += ae.delta;
          callbacks.onText(ae.delta);
        }
        if (ae.type === 'thinking_start' && ae.partial?.content?.[0]?.thinking) {
          callbacks.onThinking(ae.partial.content[0].thinking);
        }
        break;
      }
    }
  };

  proc.stdout!.on('data', (chunk: Buffer) => {
    lineBuf += chunk.toString();
    const lines = lineBuf.split('\n');
    lineBuf = lines.pop()!;
    for (const line of lines) {
      processLine(line);
    }
  });

  proc.stderr!.on('data', (chunk: Buffer) => {
    log.warn({ stderr: chunk.toString().trim() }, 'stderr');
  });

  proc.on('close', (code) => {
    if (lineBuf.trim()) processLine(lineBuf);
    log.info({ exitCode: code ?? 1, outputLength: fullText.length }, 'finished');
    callbacks.onDone(code ?? 1, fullText);
  });

  proc.on('error', (err) => {
    log.error({ err }, 'failed to start');
    callbacks.onDone(1, `Failed to start AI CLI: ${err.message}`);
  });

  return proc;
}
