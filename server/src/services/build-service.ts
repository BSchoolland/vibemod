import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '../lib/db.js';
import { detectAdapter } from '../lib/adapters.js';
import { createLogger } from '../lib/logger.js';
import { annotate, time } from '../lib/request-context.js';
import type { AppAdapter } from '../types.js';

const execAsync = promisify(exec);
const log = createLogger('build-service');

class BuildService {
  async installAndBuild(appDir: string, adapter?: AppAdapter | null, draftId?: number): Promise<AppAdapter> {
    const resolved = adapter ?? await detectAdapter(appDir);
    if (!resolved) {
      throw new Error(`Could not detect app type in ${appDir}`);
    }

    annotate({ adapterId: resolved.id, adapterName: resolved.name });

    let buildId: number | undefined;
    if (draftId) {
      const result = db.prepare(
        'INSERT INTO builds (draft_id, status, triggered_by) VALUES (?, \'running\', \'system\')'
      ).run(draftId);
      buildId = Number(result.lastInsertRowid);
      annotate({ buildId });
    }

    let logs = '';
    try {
      if (resolved.install) {
        const installResult = await time('install', () => execAsync(resolved.install!, { cwd: appDir }));
        logs += installResult.stdout + installResult.stderr;
      }
      if (resolved.build) {
        const buildResult = await time('buildStep', () => execAsync(resolved.build!, { cwd: appDir }));
        logs += buildResult.stdout + buildResult.stderr;
      }

      annotate({ buildStatus: 'success' });

      if (buildId) {
        db.prepare(
          'UPDATE builds SET status = \'success\', exit_code = 0, logs = ?, finished_at = datetime(\'now\') WHERE id = ?'
        ).run(logs, buildId);
      }

      return resolved;
    } catch (err: any) {
      logs += err.stdout ?? '';
      logs += err.stderr ?? '';

      annotate({ buildStatus: 'failed' });
      log.error({ buildId, appDir, err }, 'build failed');

      if (buildId) {
        db.prepare(
          'UPDATE builds SET status = \'failed\', exit_code = ?, logs = ?, finished_at = datetime(\'now\') WHERE id = ?'
        ).run(err.code ?? 1, logs, buildId);
      }

      throw err;
    }
  }

  getBuildsForDraft(draftId: number, limit = 20) {
    return db.prepare(
      'SELECT * FROM builds WHERE draft_id = ? ORDER BY started_at DESC LIMIT ?'
    ).all(draftId, limit);
  }

  getLatestBuild(draftId: number) {
    return db.prepare(
      'SELECT * FROM builds WHERE draft_id = ? ORDER BY started_at DESC LIMIT 1'
    ).get(draftId);
  }
}

export const buildService = new BuildService();
