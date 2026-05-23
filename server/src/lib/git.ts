import { execFile } from 'child_process';
import { promisify } from 'util';
import type { WorktreeInfo } from '../types.js';

const execFileAsync = promisify(execFile);

function git(args: string[], cwd: string) {
  return execFileAsync('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

export async function createWorktree(repoPath: string, branchName: string, worktreePath: string, startPoint?: string): Promise<string> {
  const args = ['worktree', 'add', '-b', branchName, worktreePath];
  if (startPoint) args.push(startPoint);
  try {
    await git(args, repoPath);
  } catch (err: any) {
    if (err.stderr?.includes('already exists')) {
      await git(['worktree', 'prune'], repoPath);
      await git(['branch', '-D', branchName], repoPath).catch(() => {});
      await git(args, repoPath);
    } else {
      throw err;
    }
  }
  return worktreePath;
}

export async function removeWorktree(repoPath: string, worktreePath: string): Promise<void> {
  await git(['worktree', 'remove', worktreePath, '--force'], repoPath);
}

export async function listWorktrees(repoPath: string): Promise<WorktreeInfo[]> {
  const { stdout } = await git(['worktree', 'list', '--porcelain'], repoPath);
  const worktrees: WorktreeInfo[] = [];
  let current: Partial<WorktreeInfo> = {};
  for (const line of stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      current.path = line.slice(9);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).replace('refs/heads/', '');
    } else if (line === '') {
      if (current.path && current.branch) worktrees.push(current as WorktreeInfo);
      current = {};
    }
  }
  return worktrees;
}

export async function getDefaultBranch(repoPath: string): Promise<string> {
  const { stdout } = await git(['rev-parse', '--verify', '--quiet', 'main'], repoPath).catch(() => ({ stdout: '' }));
  return stdout.trim() ? 'main' : 'master';
}

export async function renameBranch(cwd: string, newBranchName: string): Promise<void> {
  await git(['branch', '-m', newBranchName], cwd);
}

export async function commitAll(worktreePath: string, message: string): Promise<boolean> {
  const { stdout } = await git(['status', '--porcelain'], worktreePath);
  if (!stdout.trim()) return false;

  await git(['add', '-A'], worktreePath);
  await git(['commit', '-m', message], worktreePath);
  return true;
}

export async function pruneWorktrees(repoPath: string): Promise<void> {
  await git(['worktree', 'prune'], repoPath);
}
