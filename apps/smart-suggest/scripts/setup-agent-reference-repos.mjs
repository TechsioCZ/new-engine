import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const appRoot = process.cwd();
let worktreeRoot = appRoot;
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const configPath = path.join(appRoot, '.agents', 'agent-reference-repos.json');
const manifestPath = path.join(appRoot, '.modernjs', 'agent-reference-repos.json');

const truthy = (value) => /^(1|true|yes|on)$/i.test(String(value ?? ''));
const falsy = (value) => /^(0|false|no|off)$/i.test(String(value ?? ''));

const skipRequested =
  truthy(process.env.ULTRAMODERN_SKIP_AGENT_REPOS) || falsy(process.env.ULTRAMODERN_AGENT_REPOS);
const required = truthy(process.env.ULTRAMODERN_AGENT_REPOS_REQUIRED);
const refresh = truthy(process.env.ULTRAMODERN_AGENT_REPOS_REFRESH);

const gitIdentityEnv = {
  GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'UltraModern Agent Reference Setup',
  GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || 'ultramodern-agent-refs@local',
  GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || 'UltraModern Agent Reference Setup',
  GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || 'ultramodern-agent-refs@local',
};

const log = (message) => console.log(`[agent-reference-repos] ${message}`);
const warn = (message) => console.warn(`[agent-reference-repos] ${message}`);

function fail(message) {
  if (required || checkOnly) {
    throw new Error(message);
  }
  warn(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? appRoot,
    encoding: 'utf-8',
    env: {
      ...process.env,
      ...gitIdentityEnv,
      ...(options.env ?? {}),
    },
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    timeout: options.timeout ?? 120_000,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(`${command} ${commandArgs.join(' ')} failed${stderr ? `: ${stderr}` : ''}`);
  }
  return result.stdout?.trim() ?? '';
}

function toGitPath(filePath) {
  return filePath.replaceAll(path.sep, '/');
}

function appRelativePath(filePath) {
  return toGitPath(path.relative(appRoot, filePath));
}

function worktreeRelativePath(filePath) {
  const relativePath = path.relative(worktreeRoot, filePath);
  if (relativePath.length === 0 || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`${filePath} is outside git worktree ${worktreeRoot}`);
  }
  return toGitPath(relativePath);
}

function runGit(commandArgs, options = {}) {
  return run('git', commandArgs, {
    ...options,
    cwd: options.cwd ?? worktreeRoot,
  });
}

function assertSafeRepoPath(relativePath) {
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0 ||
    path.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]+/).includes('..') ||
    !relativePath.startsWith('repos/')
  ) {
    throw new Error(`Unsafe reference repository path: ${relativePath}`);
  }
}

function hasGit() {
  const result = spawnSync('git', ['--version'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0;
}

function hasGitSubtree() {
  const result = spawnSync('git', ['subtree', '-h'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return (
    (result.status === 0 || result.status === 129) && result.stdout.includes('usage: git subtree')
  );
}

function isGitWorkTree() {
  const result = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: appRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0 && result.stdout.trim() === 'true';
}

function gitTopLevel() {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: appRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    return;
  }
  return path.resolve(result.stdout.trim());
}

function hasCommits() {
  const result = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], {
    cwd: worktreeRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0;
}

function porcelainStatus() {
  return runGit(['status', '--porcelain'], { timeout: 30_000 });
}

function commitInstallerChanges(message) {
  runGit(['commit', '--no-verify', '-m', message], {
    timeout: 120_000,
  });
}

function ensureGitRepository() {
  if (!isGitWorkTree()) {
    if (checkOnly) {
      fail('workspace is not a git repository');
      return false;
    }
    log('initializing git repository for agent reference subtrees');
    run('git', ['init'], { timeout: 30_000 });
    worktreeRoot = appRoot;
  } else {
    worktreeRoot = gitTopLevel() ?? appRoot;
  }

  if (!hasCommits()) {
    if (checkOnly) {
      fail('workspace has no initial git commit');
      return false;
    }
    log('creating initial workspace commit before adding reference subtrees');
    runGit(['add', '-A'], { timeout: 30_000 });
    commitInstallerChanges('Initialize UltraModern workspace');
    return true;
  }

  if (checkOnly) {
    return true;
  }

  const status = porcelainStatus();
  if (status) {
    fail(
      'workspace has uncommitted changes; commit or stash them before installing reference subtrees',
    );
    return false;
  }

  return true;
}

function remoteCommit(repo) {
  let output = runGit(['ls-remote', repo.url, `refs/heads/${repo.ref}`], {
    timeout: 120_000,
  });
  if (!output) {
    output = runGit(['ls-remote', repo.url, repo.ref], {
      timeout: 120_000,
    });
  }
  const [commit] = output.split(/\s+/);
  if (!/^[a-f0-9]{40}$/i.test(commit ?? '')) {
    throw new Error(`Could not resolve ${repo.url}#${repo.ref}`);
  }
  return commit;
}

function repoTargetPath(repo) {
  assertSafeRepoPath(repo.path);
  return path.resolve(appRoot, repo.path);
}

function repoSubtreePrefix(repo) {
  return worktreeRelativePath(repoTargetPath(repo));
}

function subtreeEvidence(repo) {
  const subtreePrefix = repoSubtreePrefix(repo);
  const result = spawnSync(
    'git',
    [
      'log',
      '--fixed-strings',
      '--grep',
      `git-subtree-dir: ${subtreePrefix}`,
      '--format=%H%n%B',
      '-n',
      '1',
    ],
    {
      cwd: worktreeRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const output = result.stdout.trim();
  if (result.status !== 0 || output.length === 0) {
    return;
  }

  const [subtreeCommit] = output.split(/\r?\n/u);
  const splitCommit = output.match(/git-subtree-split:\s*([a-f0-9]{40})/iu)?.[1];
  return {
    splitCommit,
    subtreeCommit,
    subtreePrefix,
  };
}

function installedManifestEntry(repo) {
  if (!fs.existsSync(manifestPath)) {
    return;
  }
  try {
    const manifest = readJson(manifestPath);
    return manifest.repositories?.find((entry) => entry.id === repo.id);
  } catch {
    return;
  }
}

function fallbackManifestEntry(repo, evidence) {
  return {
    id: repo.id,
    name: repo.name,
    url: repo.url,
    ref: repo.ref,
    commit: evidence.splitCommit,
    path: repo.path,
    readOnly: repo.readOnly !== false,
    status: 'present',
    strategy: 'git-subtree-squash',
  };
}

function validateManifestEntry(repo, entry) {
  const expectedReadOnly = repo.readOnly !== false;
  const mismatches = [];
  for (const [field, expected] of Object.entries({
    id: repo.id,
    name: repo.name,
    url: repo.url,
    ref: repo.ref,
    path: repo.path,
    readOnly: expectedReadOnly,
    strategy: 'git-subtree-squash',
  })) {
    if (entry[field] !== expected) {
      mismatches.push(`${field}=${JSON.stringify(entry[field])}`);
    }
  }
  if (!/^[a-f0-9]{40}$/iu.test(entry.commit ?? '')) {
    mismatches.push('commit=<missing or invalid>');
  }
  if (mismatches.length > 0) {
    fail(
      `${appRelativePath(manifestPath)} entry for ${repo.id} does not match generated config: ${mismatches.join(', ')}`,
    );
    return;
  }
  return entry;
}

function assertSubtreePresent(repo, options = {}) {
  const targetPath = repoTargetPath(repo);
  if (!fs.existsSync(targetPath)) {
    fail(`${repo.path} is missing`);
    return;
  }
  const evidence = subtreeEvidence(repo);
  if (!evidence) {
    fail(`${repo.path} is present but has no git-subtree commit evidence`);
    return;
  }
  const manifestEntry = installedManifestEntry(repo);
  if (manifestEntry) {
    return validateManifestEntry(repo, manifestEntry);
  }
  if (options.requireManifest) {
    fail(
      `${repo.path} is present but ${appRelativePath(manifestPath)} has no entry for ${repo.id}`,
    );
    return;
  }
  if (!evidence.splitCommit) {
    fail(`${repo.path} is present but its git-subtree commit has no split commit metadata`);
    return;
  }
  return fallbackManifestEntry(repo, evidence);
}

function addSubtree(repo) {
  const targetPath = repoTargetPath(repo);
  const subtreePrefix = repoSubtreePrefix(repo);
  const existing = fs.existsSync(targetPath);

  if (existing && !refresh) {
    return assertSubtreePresent(repo);
  }

  if (existing && refresh) {
    fail(`${repo.path} already exists; refresh for subtree references is intentionally manual`);
    return;
  }

  if (checkOnly) {
    fail(`${repo.path} is missing`);
    return;
  }

  const commit = remoteCommit(repo);
  log(`adding ${repo.name} as git subtree at ${repo.path} (${commit})`);
  runGit(['fetch', '--depth', '1', repo.url, repo.ref], {
    timeout: 300_000,
  });
  runGit(
    [
      'subtree',
      'add',
      '--prefix',
      subtreePrefix,
      'FETCH_HEAD',
      '--squash',
      '-m',
      `Add ${repo.name} agent reference repo`,
    ],
    { timeout: 600_000 },
  );

  return {
    schemaVersion: 1,
    id: repo.id,
    name: repo.name,
    url: repo.url,
    ref: repo.ref,
    commit,
    path: repo.path,
    readOnly: repo.readOnly !== false,
    strategy: 'git-subtree-squash',
    status: 'installed',
    installedAt: new Date().toISOString(),
  };
}

function writeManifest(entries) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        strategy: 'git-subtree-squash',
        installDir: 'repos',
        repositories: entries,
      },
      null,
      2,
    )}\n`,
  );
}

function commitManifestIfChanged() {
  const manifestGitPath = worktreeRelativePath(manifestPath);
  const status = runGit(['status', '--porcelain', '--', manifestGitPath], {
    timeout: 30_000,
  });
  if (!status) {
    return;
  }
  runGit(['add', manifestGitPath], { timeout: 30_000 });
  commitInstallerChanges('Record agent reference repo manifest');
}

function main() {
  if (!fs.existsSync(configPath)) {
    fail('Missing .agents/agent-reference-repos.json');
    return;
  }

  const config = readJson(configPath);
  const enabled = config.defaultEnabled !== false && !skipRequested;

  if (!enabled) {
    log('setup skipped; set ULTRAMODERN_SKIP_AGENT_REPOS=0 to enable it again');
    return;
  }

  if (!hasGit()) {
    fail('git is required to install agent reference repositories');
    return;
  }
  if (!hasGitSubtree()) {
    fail('git subtree is required to install agent reference repositories');
    return;
  }
  if (!ensureGitRepository()) {
    return;
  }

  const entries = [];
  for (const repo of config.repositories ?? []) {
    const result = checkOnly
      ? assertSubtreePresent(repo, { requireManifest: true })
      : addSubtree(repo);
    if (result) {
      entries.push(result);
    }
  }

  if (!checkOnly) {
    writeManifest(entries);
    commitManifestIfChanged();
  }
}

try {
  main();
} catch (error) {
  if (required || checkOnly) {
    console.error(`[agent-reference-repos] ${error.message}`);
    process.exitCode = 1;
  } else {
    warn(error.message);
  }
}
