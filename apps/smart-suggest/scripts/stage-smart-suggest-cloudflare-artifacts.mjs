#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cloudflareAssetFileLimit = 20_000;
const cloudflareStaticAssetMaxFileSizeBytes = 25 * 1024 * 1024;
const defaultArtifactDirectory = '.codex/artifacts/smart-suggest-owned-data-production';
const defaultPublicPath = 'smart-suggest-owned-data';

function parseArgs(argv) {
  const parsed = {
    app: undefined,
    artifactDirectory: defaultArtifactDirectory,
    help: false,
    mode: 'link',
    publicPath: defaultPublicPath,
    reportPath: '.codex/reports/smart-suggest-cloudflare-artifacts/stage.json',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--app') {
      parsed.app = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--artifact-dir') {
      parsed.artifactDirectory = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--mode') {
      parsed.mode = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--public-path') {
      parsed.publicPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--report') {
      parsed.reportPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.help && parsed.app === undefined) {
    throw new Error('Missing required --app argument.');
  }

  if (!['copy', 'link'].includes(parsed.mode)) {
    throw new Error('--mode must be copy or link.');
  }

  if (parsed.publicPath.startsWith('/') || parsed.publicPath.includes('..')) {
    throw new Error('--public-path must be a relative static asset path without parent segments.');
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/stage-smart-suggest-cloudflare-artifacts.mjs --app shell-super-app [--mode link|copy]

Stages the generated Smart Suggest owned-data artifact directory under the
generated Worker Static Assets output at .output/public/smart-suggest-owned-data.

Options:
  --artifact-dir <path> Defaults to ${defaultArtifactDirectory}
  --public-path <path>  Defaults to ${defaultPublicPath}
  --mode link|copy     Defaults to link. Use copy if Wrangler rejects symlinked assets.
  --report <path>      Writes a public-safe staging report.
`);
}

function assertInside(parent, child) {
  if (child !== parent && !child.startsWith(`${parent}${path.sep}`)) {
    throw new Error(`Path escaped expected root: ${child}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function listArtifactFiles(root) {
  const pending = [root];
  const files = [];

  while (pending.length > 0) {
    const directory = pending.pop();

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        pending.push(entryPath);
        continue;
      }

      if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function validateManifest(manifestPath) {
  const manifest = readJson(manifestPath);
  const errors = [];

  if (manifest.schemaVersion !== 'smart-suggest-owned-artifacts/v1') {
    errors.push('manifest schemaVersion must be smart-suggest-owned-artifacts/v1');
  }
  if (manifest.dataset?.complete !== true) {
    errors.push('manifest dataset.complete must be true');
  }
  if (manifest.dataset?.source?.id !== 'ruian-cz') {
    errors.push('manifest dataset.source.id must be ruian-cz');
  }
  if (manifest.dataset?.importRun?.status !== 'completed') {
    errors.push('manifest dataset.importRun.status must be completed');
  }
  for (const indexName of ['addressRecords', 'addressTokens', 'postalLocalities']) {
    if (manifest.indexes?.[indexName]?.complete !== true) {
      errors.push(`manifest indexes.${indexName}.complete must be true`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Owned artifact manifest is not deployable:\n${errors.join('\n')}`);
  }

  return manifest;
}

function inspectArtifactFiles(sourceRoot) {
  const files = listArtifactFiles(sourceRoot);
  let totalSizeBytes = 0;
  const oversizedFiles = [];
  let largestFile = {
    path: '',
    sizeBytes: 0,
  };

  for (const filePath of files) {
    const sizeBytes = fs.statSync(filePath).size;
    const relativePath = path.relative(sourceRoot, filePath);

    totalSizeBytes += sizeBytes;
    if (sizeBytes > largestFile.sizeBytes) {
      largestFile = { path: relativePath, sizeBytes };
    }
    if (sizeBytes > cloudflareStaticAssetMaxFileSizeBytes) {
      oversizedFiles.push({ path: relativePath, sizeBytes });
    }
  }

  if (files.length > cloudflareAssetFileLimit) {
    throw new Error(
      `Owned artifact has ${files.length} files; Cloudflare Worker Static Assets limit is ${cloudflareAssetFileLimit}.`,
    );
  }
  if (oversizedFiles.length > 0) {
    throw new Error(
      `Owned artifact has files over ${cloudflareStaticAssetMaxFileSizeBytes} bytes: ${oversizedFiles
        .slice(0, 5)
        .map((entry) => `${entry.path} (${entry.sizeBytes})`)
        .join(', ')}`,
    );
  }

  return {
    fileCount: files.length,
    largestFile,
    oversizedFileCount: oversizedFiles.length,
    totalSizeBytes,
  };
}

function stageArtifact({ mode, sourceRoot, targetRoot }) {
  fs.rmSync(targetRoot, { force: true, recursive: true });
  fs.mkdirSync(path.dirname(targetRoot), { recursive: true });

  if (mode === 'link') {
    const relativeSource = path.relative(path.dirname(targetRoot), sourceRoot);
    fs.symlinkSync(relativeSource, targetRoot, 'dir');
    return;
  }

  fs.cpSync(sourceRoot, targetRoot, {
    dereference: true,
    errorOnExist: false,
    force: true,
    recursive: true,
  });
}

function smokeReadStagedManifest(stagedManifestPath) {
  if (!fs.existsSync(stagedManifestPath)) {
    throw new Error(`Staged manifest is missing: ${stagedManifestPath}`);
  }

  return readJson(stagedManifestPath);
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return;
  }

  const appsRoot = path.join(workspaceRoot, 'apps');
  const appRoot = path.resolve(appsRoot, args.app);
  assertInside(appsRoot, appRoot);

  const sourceRoot = path.resolve(workspaceRoot, args.artifactDirectory);
  assertInside(workspaceRoot, sourceRoot);

  const publicRoot = path.join(appRoot, '.output/public');
  const targetRoot = path.resolve(publicRoot, args.publicPath);
  assertInside(publicRoot, targetRoot);

  if (!fs.existsSync(publicRoot)) {
    throw new Error(
      `Cloudflare public output is missing: ${publicRoot}. Run cloudflare:build first.`,
    );
  }
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(
      `Owned artifact directory is missing: ${sourceRoot}. Run smart-suggest:artifacts:build:production first.`,
    );
  }

  const manifest = validateManifest(path.join(sourceRoot, 'manifest.json'));
  const artifactFiles = inspectArtifactFiles(sourceRoot);
  stageArtifact({ mode: args.mode, sourceRoot, targetRoot });
  const stagedManifest = smokeReadStagedManifest(path.join(targetRoot, 'manifest.json'));

  const report = {
    artifact: {
      complete: manifest.dataset.complete,
      countryCode: manifest.dataset.countryCode,
      fileCount: artifactFiles.fileCount,
      largestFile: artifactFiles.largestFile,
      rowCount: manifest.dataset.rowCount,
      sourceId: manifest.dataset.source.id,
      totalSizeBytes: artifactFiles.totalSizeBytes,
    },
    cloudflareStaticAssetLimits: {
      maxFileSizeBytes: cloudflareStaticAssetMaxFileSizeBytes,
      maxFiles: cloudflareAssetFileLimit,
    },
    generatedAt: new Date().toISOString(),
    mode: args.mode,
    publicPath: args.publicPath,
    stagedManifest: {
      complete: stagedManifest.dataset?.complete === true,
      relativePath: `${args.publicPath}/manifest.json`,
    },
    status: 'ok',
    target: path.relative(appRoot, targetRoot),
  };

  writeJson(path.resolve(workspaceRoot, args.reportPath), report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
