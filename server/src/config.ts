import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 3000,
  previewPort: Number(process.env.PREVIEW_PORT) || 3002,
  livePort: Number(process.env.LIVE_PORT) || 3001,
  appRepoPath: process.env.APP_REPO_PATH || path.join(__dirname, '..', '..', 'app-repo'),
  liveClonePath: process.env.LIVE_CLONE_PATH || path.join(__dirname, '..', '..', 'app-live'),
  seedPath: process.env.SEED_PATH || path.join(__dirname, '..', '..', 'seed-app'),
  aiCli: process.env.AI_CLI || 'claude',
  aiCliArgs: process.env.AI_CLI_ARGS || '-p',
};
