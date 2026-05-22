import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, '..', '..', '.env');
try {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {}

export const config = {
  port: Number(process.env.PORT) || 3000,
  previewPort: Number(process.env.PREVIEW_PORT) || 3002,
  livePort: Number(process.env.LIVE_PORT) || 3001,
  appRepoPath: process.env.APP_REPO_PATH || path.join(__dirname, '..', '..', 'app-repo'),
  seedPath: process.env.SEED_PATH || path.join(__dirname, '..', '..', 'seed-app'),
  aiCli: process.env.AI_CLI || 'agy',
  aiCliArgs: process.env.AI_CLI_ARGS || '-p --dangerously-skip-permissions',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
