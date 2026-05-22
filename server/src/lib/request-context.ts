import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';
import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import { log } from './logger.js';

interface RequestContext {
  requestId: string;
  startTime: number;
  fields: Record<string, unknown>;
}

const store = new AsyncLocalStorage<RequestContext>();

export function annotate(fields: Record<string, unknown>): void {
  const ctx = store.getStore();
  if (ctx) Object.assign(ctx.fields, fields);
}

export async function time<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    annotate({ [`${key}DurationMs`]: Date.now() - start });
  }
}

export function getRequestId(): string | undefined {
  return store.getStore()?.requestId;
}

export const requestLogger: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const ctx: RequestContext = {
    requestId: crypto.randomUUID(),
    startTime: Date.now(),
    fields: {},
  };

  res.on('finish', () => {
    const durationMs = Date.now() - ctx.startTime;
    const event = {
      ...ctx.fields,
      requestId: ctx.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
    };

    if (res.statusCode >= 500) {
      log.error(event, 'request');
    } else if (res.statusCode >= 400) {
      log.warn(event, 'request');
    } else {
      log.info(event, 'request');
    }
  });

  store.run(ctx, () => next());
};

export function route(fn: (req: Request, res: Response) => Promise<void> | void): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    let result: Promise<void> | void;
    try {
      result = fn(req, res);
    } catch (err) {
      next(err);
      return;
    }
    if (result instanceof Promise) {
      result.catch(next);
    }
  };
}

export const errorHandler: ErrorRequestHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  annotate({ error: err.message, errorStack: err.stack });

  if (!res.headersSent) {
    const status = (err as any).status || 500;
    res.status(status).json({ error: err.message });
  }
};
