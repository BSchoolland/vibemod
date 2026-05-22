import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { config } from '../config.js';
import { mergeBranch } from '../lib/git.js';
import { detectAdapter } from '../lib/adapters.js';
import { getActiveDraft } from './drafts.js';

const execAsync = promisify(exec);
export const publishRouter = Router();

publishRouter.post('/', async (req, res) => {
  try {
    const draft = getActiveDraft();
    if (!draft) {
      return res.status(400).json({ error: 'No active draft to publish' });
    }

    await mergeBranch(config.appRepoPath, draft.branch);
    await deployLive();

    res.json({ ok: true, message: `Published ${draft.branch} to live` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function deployLive() {
  const livePath = config.liveClonePath;

  const exists = await fs.access(livePath).then(() => true).catch(() => false);
  if (!exists) {
    await execAsync(`git clone ${config.appRepoPath} ${livePath}`);
  }

  await execAsync('git pull origin main', { cwd: livePath });

  const adapter = await detectAdapter(livePath);
  if (!adapter) {
    throw new Error('Could not detect app type in live clone');
  }

  if (adapter.install) {
    await execAsync(adapter.install, { cwd: livePath });
  }
  if (adapter.build) {
    await execAsync(adapter.build, { cwd: livePath });
  }

  console.log('[publish] Live deployment complete. Restart live server process.');
}

publishRouter.get('/status', async (req, res) => {
  try {
    const livePath = config.liveClonePath;
    const exists = await fs.access(livePath).then(() => true).catch(() => false);
    res.json({ deployed: exists, livePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
