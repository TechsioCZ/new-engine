import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const lockPath = path.join(root, '.agents/skills-lock.json');
const checkOnly = process.argv.includes('--check');
const force = process.argv.includes('--force');
const postinstall = process.argv.includes('--postinstall');
const truthy = (value) => /^(1|true|yes|on)$/i.test(String(value ?? ''));
const falsy = (value) => /^(0|false|no|off)$/i.test(String(value ?? ''));
const skipRequested =
  truthy(process.env.ULTRAMODERN_SKIP_AGENT_SKILLS) || falsy(process.env.ULTRAMODERN_AGENT_SKILLS);
const cloneTimeoutMs = Number.parseInt(
  process.env.ULTRAMODERN_AGENT_SKILLS_CLONE_TIMEOUT_MS ?? '60000',
  10,
);

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const toDisplayPath = (filePath) => path.relative(root, filePath).replaceAll(path.sep, '/');

const pathIsInside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const pathSegments = (relativePath, label) => {
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0 ||
    path.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath)
  ) {
    throw new Error(`Unsafe ${label}: ${relativePath}`);
  }

  const segments = relativePath.split(/[\\/]+/).filter((segment) => segment.length > 0);
  if (segments.length === 0 || segments.includes('..')) {
    throw new Error(`Unsafe ${label}: ${relativePath}`);
  }
  return segments.filter((segment) => segment !== '.');
};

const resolveRootPath = (relativePath, label) => {
  const resolved = path.resolve(root, ...pathSegments(relativePath, label));
  if (!pathIsInside(root, resolved)) {
    throw new Error(`Unsafe ${label}: ${relativePath}`);
  }
  return resolved;
};

const assertSafeSkillName = (skillName) => {
  if (
    typeof skillName !== 'string' ||
    skillName.length === 0 ||
    skillName === '.' ||
    skillName === '..' ||
    skillName.includes('/') ||
    skillName.includes('\\')
  ) {
    throw new Error(`Unsafe agent skill name in lockfile: ${skillName}`);
  }
};

const assertCommitPin = (source) => {
  if (
    (source.install === 'clone' || source.install === 'clone-if-authorized') &&
    !/^[a-f0-9]{40}$/iu.test(source.commit ?? '')
  ) {
    throw new Error(
      `Agent skill source ${source.id ?? source.repository} must be pinned to a 40-character commit.`,
    );
  }
};

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf-8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    timeout: options.timeout,
  });

const commandExists = (command) => {
  try {
    run(command, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const requireGit = () => {
  if (commandExists('git')) {
    return;
  }

  throw new Error(
    'Git is required to install agent skills. Install git yourself (for example "brew install git" or "sudo apt-get install git") and run pnpm skills:install again. This script never installs system packages on your behalf.',
  );
};

const gitTopLevel = () => {
  try {
    return run('git', ['rev-parse', '--show-toplevel']).trim();
  } catch {
    return;
  }
};

const initializeGitRepository = () => {
  const topLevel = gitTopLevel();
  if (topLevel !== undefined) {
    return path.resolve(topLevel) === root;
  }

  try {
    run('git', ['init', '-b', 'main'], { stdio: 'inherit' });
  } catch {
    run('git', ['init'], { stdio: 'inherit' });
    run('git', ['branch', '-M', 'main'], { stdio: 'inherit' });
  }
  return true;
};

const installLefthook = () => {
  if (!commandExists('git')) {
    console.warn(
      'Skipping lefthook hook installation because git is not available. Install git and run lefthook install from the generated workspace root to enable local hooks.',
    );
    return;
  }

  if (!initializeGitRepository()) {
    console.log(
      'Skipping lefthook hook installation because this generated workspace is nested inside another Git worktree. Run git init from the generated workspace root before installing hooks if you want workspace-local hooks.',
    );
    return;
  }

  try {
    run('lefthook', ['install'], { stdio: 'inherit' });
  } catch (error) {
    console.warn(`Unable to install lefthook hooks: ${error.message}`);
  }
};

const removeTree = (dir) =>
  fs.rmSync(dir, {
    force: true,
    maxRetries: 5,
    recursive: true,
    retryDelay: 100,
  });

const cloneSource = (source, targetDir) => {
  if (source.commit) {
    run('git', ['init', targetDir], { timeout: 30_000 });
    run('git', ['remote', 'add', 'origin', source.repository], {
      cwd: targetDir,
      timeout: 30_000,
    });
    run('git', ['fetch', '--depth', '1', '--quiet', 'origin', source.commit], {
      cwd: targetDir,
      timeout: cloneTimeoutMs,
    });
    run(
      'git',
      ['-c', 'advice.detachedHead=false', 'checkout', '--detach', '--quiet', 'FETCH_HEAD'],
      { cwd: targetDir, timeout: 30_000 },
    );
    return;
  }

  const repo = source.repository.replace(/^https:\/\/github.com\//u, '');
  try {
    run('gh', ['repo', 'clone', repo, targetDir, '--', '--depth', '1', '--quiet'], {
      timeout: cloneTimeoutMs,
    });
  } catch {
    run('git', ['clone', '--depth', '1', '--quiet', source.repository, targetDir], {
      timeout: cloneTimeoutMs,
    });
  }
};

const resolveSkillDir = (sourceRoot, skillName) => {
  assertSafeSkillName(skillName);
  const candidates = [
    path.join(sourceRoot, skillName),
    path.join(sourceRoot, 'skills', skillName),
    path.join(sourceRoot, 'skills', 'engineering', skillName),
    path.join(sourceRoot, 'skills', 'productivity', skillName),
  ];
  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'SKILL.md')));
};

if (!fs.existsSync(lockPath)) {
  console.error('Missing .agents/skills-lock.json');
  process.exit(1);
}

const lock = readJson(lockPath);
const agentSkillsDir = path.resolve(root, '.agents', 'skills');
const installDir = resolveRootPath(lock.installDir ?? '.agents/skills', 'agent skills installDir');
if (!pathIsInside(agentSkillsDir, installDir)) {
  throw new Error(
    `Agent skills installDir must stay inside .agents/skills, got ${toDisplayPath(installDir)}`,
  );
}
const sources = lock.sources ?? [];
for (const source of sources) {
  assertCommitPin(source);
}
const requiredCloneSources = sources.filter((source) => source.install === 'clone');
const optionalCloneSources = sources.filter((source) => source.install === 'clone-if-authorized');
const cloneSourceSkillNames = new Set(
  [...requiredCloneSources, ...optionalCloneSources].flatMap((source) =>
    (source.baseline ?? []).map((skill) => skill.name),
  ),
);
const vendoredRequiredSkills = (lock.baseline ?? []).filter(
  (skill) => !cloneSourceSkillNames.has(skill.name),
);
const cloneOptIn = truthy(process.env.ULTRAMODERN_AGENT_SKILLS);

const skillTargetDir = (skillName) => {
  assertSafeSkillName(skillName);
  const targetDir = path.resolve(installDir, skillName);
  if (!pathIsInside(installDir, targetDir)) {
    throw new Error(`Agent skill ${skillName} resolves outside ${toDisplayPath(installDir)}`);
  }
  return targetDir;
};

const validateSkillDefinition = (skill) => {
  assertSafeSkillName(skill.name);
  if (skill.path === undefined) {
    return;
  }

  const resolvedSkillPath = resolveRootPath(skill.path, `agent skill path for ${skill.name}`);
  const expectedSkillPath = skillTargetDir(skill.name);
  if (resolvedSkillPath !== expectedSkillPath) {
    throw new Error(
      `Agent skill ${skill.name} path must resolve to ${toDisplayPath(expectedSkillPath)}, got ${toDisplayPath(resolvedSkillPath)}`,
    );
  }
};

for (const skill of [
  ...(lock.baseline ?? []),
  ...sources.flatMap((source) => source.baseline ?? []),
]) {
  validateSkillDefinition(skill);
}

if (skipRequested) {
  const reason = 'agent skills bootstrap skipped by environment';
  if (checkOnly) {
    console.log(reason);
    process.exit(0);
  }
  console.log(reason);
  installLefthook();
  process.exit(0);
}

if (checkOnly) {
  const missingVendored = vendoredRequiredSkills
    .map((skill) => skill.name)
    .filter((skillName) => !fs.existsSync(path.join(skillTargetDir(skillName), 'SKILL.md')));
  const missingRequiredCloneInstalled = requiredCloneSources.flatMap((source) =>
    (source.baseline ?? [])
      .map((skill) => skill.name)
      .filter((skillName) => !fs.existsSync(path.join(skillTargetDir(skillName), 'SKILL.md'))),
  );
  const missingOptionalCloneInstalled = optionalCloneSources.flatMap((source) =>
    (source.baseline ?? [])
      .map((skill) => skill.name)
      .filter((skillName) => !fs.existsSync(path.join(skillTargetDir(skillName), 'SKILL.md'))),
  );

  let hasBlockingMissingSkills = false;

  if (missingVendored.length > 0) {
    console.error(
      `Required agent skills not installed: ${missingVendored.join(', ')}. Run pnpm skills:install.`,
    );
    hasBlockingMissingSkills = true;
  }

  if (missingRequiredCloneInstalled.length > 0) {
    console.error(
      `Required clone-installed agent skills not installed: ${missingRequiredCloneInstalled.join(', ')}. Run pnpm skills:install.`,
    );
    hasBlockingMissingSkills = true;
  }

  if (missingOptionalCloneInstalled.length > 0) {
    console.log(
      `Advisory: optional authorization-gated agent skills are not present: ${missingOptionalCloneInstalled.join(', ')}. Run pnpm skills:install from an authorized environment when you need those skills.`,
    );
  } else if (!hasBlockingMissingSkills) {
    console.log('All pinned agent skills are installed.');
  }

  if (hasBlockingMissingSkills) {
    process.exit(1);
  }
  process.exit(0);
}

if (postinstall && !cloneOptIn) {
  console.log(
    'Skipping agent skill repository clones during postinstall. Run pnpm skills:install (or set ULTRAMODERN_AGENT_SKILLS=1 before installing) to fetch them.',
  );
  installLefthook();
  process.exit(0);
}

fs.mkdirSync(installDir, { recursive: true });
requireGit();

for (const source of [...requiredCloneSources, ...optionalCloneSources]) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ultramodern-skills-'));
  try {
    try {
      cloneSource(source, tempDir);
    } catch (error) {
      if (source.install === 'clone-if-authorized' || postinstall) {
        console.warn(`Skipping ${source.repository}; ${error.message}`);
        continue;
      }
      throw error;
    }
    for (const skill of source.baseline ?? []) {
      const sourceSkillDir = resolveSkillDir(tempDir, skill.name);
      if (!sourceSkillDir) {
        throw new Error(`Skill ${skill.name} not found in ${source.repository}`);
      }
      const targetSkillDir = skillTargetDir(skill.name);
      if (fs.existsSync(targetSkillDir)) {
        if (!force) {
          console.log(`Skipping existing ${skill.name}`);
          continue;
        }
        removeTree(targetSkillDir);
      }
      fs.cpSync(sourceSkillDir, targetSkillDir, { recursive: true });
      console.log(`Installed ${skill.name}`);
    }
  } finally {
    removeTree(tempDir);
  }
}

installLefthook();
