#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localD1DatabaseId = '00000000-0000-0000-0000-000000000000';

function parseArgs(argv) {
  const parsed = {
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
  node scripts/apply-smart-suggest-cloudflare-bindings.mjs --app shell-super-app [--require-d1]

Adds Smart Suggest Cloudflare bindings to the generated .output/wrangler.json.

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
    preview_database_id: previewDatabaseId ?? databaseId ?? localD1DatabaseId,
  };
  const existingD1Databases = Array.isArray(config.d1_databases) ? config.d1_databases : [];

  writeJson(wranglerPath, {
    ...config,
    d1_databases: [
      d1Database,
      ...existingD1Databases.filter((entry) => entry?.binding !== binding),
    ],
  });
  const removedPaths = removeServerOnlyPublicOutput(appRoot);
  process.stdout.write(`Applied Smart Suggest D1 binding ${binding} to ${wranglerPath}\n`);
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
