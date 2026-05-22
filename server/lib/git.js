import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function git(args, cwd) {
  return execFileAsync('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

export async function initRepo(repoPath, seedPath) {
  await git(['init'], repoPath);
  await execFileAsync('cp', ['-r', '.', repoPath], { cwd: seedPath });
  await git(['add', '-A'], repoPath);
  await git(['commit', '-m', 'Initial commit from seed app'], repoPath);
}

export async function createWorktree(repoPath, branchName, worktreePath) {
  await git(['worktree', 'add', '-b', branchName, worktreePath], repoPath);
  return worktreePath;
}

export async function removeWorktree(repoPath, worktreePath) {
  await git(['worktree', 'remove', worktreePath, '--force'], repoPath);
}

export async function listWorktrees(repoPath) {
  const { stdout } = await git(['worktree', 'list', '--porcelain'], repoPath);
  const worktrees = [];
  let current = {};
  for (const line of stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      current.path = line.slice(9);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7).replace('refs/heads/', '');
    } else if (line === '') {
      if (current.path) worktrees.push(current);
      current = {};
    }
  }
  return worktrees;
}

export async function mergeBranch(repoPath, branchName) {
  await git(['checkout', 'main'], repoPath);
  await git(['merge', branchName, '--no-ff', '-m', `Publish: merge ${branchName}`], repoPath);
}

export async function deleteBranch(repoPath, branchName) {
  await git(['branch', '-D', branchName], repoPath);
}

export async function getBranches(repoPath) {
  const { stdout } = await git(['branch', '--list', '--format=%(refname:short)'], repoPath);
  return stdout.trim().split('\n').filter(Boolean);
}
