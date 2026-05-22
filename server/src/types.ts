export interface AppAdapter {
  id: string;
  name: string;
  install: string | null;
  build: string | null;
  dev: string | null;
  start: string | null;
  startFile: string | null;
}

export interface Draft {
  name: string;
  branch: string;
  path: string;
  adapter: AppAdapter;
}

export interface WorktreeInfo {
  path: string;
  branch: string;
}

export type WsMessageIn =
  | { type: 'chat'; content: string };

export type WsMessageOut =
  | { type: 'status'; content: string }
  | { type: 'ai-stream'; content: string }
  | { type: 'ai-done'; content: string; exitCode: number }
  | { type: 'error'; content: string }
  | { type: 'preview-reload' };
