import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { createSqliteStream } from './log-transport.js';

const stdout = process.env.NODE_ENV !== 'production'
  ? pinoPretty({ colorize: true })
  : process.stdout;

export const log = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pino.multistream([
    { stream: stdout },
    { stream: createSqliteStream() },
  ]),
);

export function createLogger(module: string) {
  return log.child({ module });
}
