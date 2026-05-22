import { execFile } from 'child_process';
import { promisify } from 'util';
import type { WorktreeInfo } from '../types.js';

const execFileAsync = promisify(execFile);

function git(args: string[], cwd: string) {
  return execFileAsync('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

export async function createWorktree(repoPath: string, branchName: string, worktreePath: string): Promise<string> {
  await git(['worktree', 'add', '-b', branchName, worktreePath], repoPath);
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

export async function mergeBranch(repoPath: string, branchName: string): Promise<void> {
  const defaultBranch = await getDefaultBranch(repoPath);
  await git(['checkout', defaultBranch], repoPath);
  await git(['merge', branchName, '--no-ff', '-m', `Publish: merge ${branchName}`], repoPath);
}

export async function deleteBranch(repoPath: string, branchName: string): Promise<void> {
  await git(['branch', '-D', branchName], repoPath);
}
