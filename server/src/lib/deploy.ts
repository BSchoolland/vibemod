import { exec } from 'child_process';
import { promisify } from 'util';
import { detectAdapter } from './adapters.js';
import { createLogger } from './logger.js';
import type { AppAdapter } from '../types.js';

const execAsync = promisify(exec);
const log = createLogger('deploy');

export async function installAndBuild(appDir: string, adapter?: AppAdapter | null): Promise<AppAdapter> {
  const resolved = adapter ?? await detectAdapter(appDir);
  if (!resolved) {
    throw new Error(`Could not detect app type in ${appDir}`);
  }

  log.info({ appDir, adapter: resolved.id }, 'installing and building');

  if (resolved.install) {
    await execAsync(resolved.install, { cwd: appDir });
  }
  if (resolved.build) {
    await execAsync(resolved.build, { cwd: appDir });
  }

  log.info({ appDir, adapter: resolved.id }, 'install and build complete');

  return resolved;
}
