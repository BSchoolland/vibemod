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