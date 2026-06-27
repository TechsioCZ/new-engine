#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localD1DatabaseId = '00000000-0000-0000-0000-000000000000';
const smartSuggestD1MigrationsSource = path.resolve(
  workspaceRoot,
  '../../libs/smart-suggest/storage/drizzle',
);
const smartSuggestD1MigrationsOutput = 'migrations/smart-suggest';

function parseArgs(argv) {
  const parsed = {
    applyMigrations: false,
    app: undefined,
    requireD1: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--app') {
      parsed.app = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--apply-migrations') {
      parsed.applyMigrations = true;
      continue;
    }

    if (arg === '--require-d1') {
      parsed.requireD1 = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.app && !parsed.help) {
    throw new Error('Missing required --app argument.');
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/apply-smart-suggest-cloudflare-bindings.mjs --app shell-super-app [--require-d1] [--apply-migrations]

Adds Smart Suggest Cloudflare bindings to the generated .output/wrangler.json.
Copies generated D1 migrations into .output and can apply them before deploy.

Environment:
  SMART_SUGGEST_D1_BINDING             Defaults to SMART_SUGGEST_D1
  SMART_SUGGEST_D1_DATABASE_NAME       Defaults to smart-suggest
  SMART_SUGGEST_D1_DATABASE_ID         Required with --require-d1
  SMART_SUGGEST_D1_PREVIEW_DATABASE_ID Optional preview database id
`);
}

function envValue(name) {
  const value = process.env[name]?.trim();

  return value === undefined || value === '' ? undefined : value;
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
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function removeServerOnlyPublicOutput(appRoot) {
  const publicRoot = path.join(appRoot, '.output/public');
  const removedPaths = [];

  for (const relativePath of ['api', 'shared']) {
    const target = path.join(publicRoot, relativePath);

    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true, recursive: true });
      removedPaths.push(path.relative(appRoot, target));
    }
  }

  return removedPaths;
}

function copyD1Migrations(appRoot) {
  if (!fs.existsSync(smartSuggestD1MigrationsSource)) {
    throw new Error(`Smart Suggest D1 migrations are missing: ${smartSuggestD1MigrationsSource}`);
  }

  const sqlFiles = fs
    .readdirSync(smartSuggestD1MigrationsSource)
    .filter((entry) => entry.endsWith('.sql'));

  if (sqlFiles.length === 0) {
    throw new Error(`Smart Suggest D1 migrations directory has no SQL files.`);
  }

  const outputPath = path.join(appRoot, '.output', smartSuggestD1MigrationsOutput);
  fs.rmSync(outputPath, { force: true, recursive: true });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.cpSync(smartSuggestD1MigrationsSource, outputPath, { recursive: true });

  return {
    outputPath,
    sqlFiles,
  };
}

function applyD1Migrations({ appRoot, databaseName }) {
  const wranglerExecutable = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
  const result = spawnSync(
    wranglerExecutable,
    ['d1', 'migrations', 'apply', databaseName, '--remote', '--config', '.output/wrangler.json'],
    {
      cwd: appRoot,
      env: process.env,
      stdio: 'inherit',
    },
  );

  if (result.error !== undefined) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`wrangler d1 migrations apply failed with exit code ${result.status ?? 1}.`);
  }
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return 0;
  }

  const appsRoot = path.resolve(workspaceRoot, 'apps');
  const appRoot = path.resolve(appsRoot, args.app);
  assertInside(appsRoot, appRoot);

  const wranglerPath = path.join(appRoot, '.output/wrangler.json');
  const config = readJson(wranglerPath);
  const binding = envValue('SMART_SUGGEST_D1_BINDING') ?? 'SMART_SUGGEST_D1';
  const databaseName = envValue('SMART_SUGGEST_D1_DATABASE_NAME') ?? 'smart-suggest';
  const databaseId = envValue('SMART_SUGGEST_D1_DATABASE_ID');
  const previewDatabaseId = envValue('SMART_SUGGEST_D1_PREVIEW_DATABASE_ID');

  if (args.requireD1 && databaseId === undefined) {
    throw new Error('SMART_SUGGEST_D1_DATABASE_ID is required for Cloudflare deploy.');
  }

  const d1Database = {
    binding,
    database_id: databaseId ?? localD1DatabaseId,
    database_name: databaseName,
    migrations_dir: `./${smartSuggestD1MigrationsOutput}`,
    preview_database_id: previewDatabaseId ?? databaseId ?? localD1DatabaseId,
  };
  const existingD1Databases = Array.isArray(config.d1_databases) ? config.d1_databases : [];
  const migrations = copyD1Migrations(appRoot);

  writeJson(wranglerPath, {
    ...config,
    d1_databases: [
      d1Database,
      ...existingD1Databases.filter((entry) => entry?.binding !== binding),
    ],
  });
  const removedPaths = removeServerOnlyPublicOutput(appRoot);
  process.stdout.write(`Applied Smart Suggest D1 binding ${binding} to ${wranglerPath}\n`);
  process.stdout.write(
    `Copied Smart Suggest D1 migrations to ${path.relative(appRoot, migrations.outputPath)} (${migrations.sqlFiles.length} SQL file(s))\n`,
  );
  if (args.applyMigrations) {
    applyD1Migrations({ appRoot, databaseName });
  }
  if (removedPaths.length > 0) {
    process.stdout.write(`Removed server-only public output: ${removedPaths.join(', ')}\n`);
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
