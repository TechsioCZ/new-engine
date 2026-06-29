#!/usr/bin/env node
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const smartSuggestD1MigrationsSource = path.resolve(
  workspaceRoot,
  '../../libs/smart-suggest/storage/drizzle',
);
const smartSuggestD1MigrationsOutput = 'migrations/smart-suggest';
const expectedCzVuscCodes = [
  '19',
  '27',
  '35',
  '43',
  '51',
  '60',
  '78',
  '86',
  '94',
  '108',
  '116',
  '124',
  '132',
  '141',
];
const defaultCzVuscShardBindingPrefix = 'SMART_SUGGEST_CZ_VUSC_';
const defaultCzVuscShardDatabaseNamePrefix = 'smart-suggest-cz-vusc-';

function localD1DatabaseIdForBinding(binding) {
  const hash = crypto.createHash('sha1').update(binding).digest('hex');

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

function parseArgs(argv) {
  const parsed = {
    applyMigrations: false,
    app: undefined,
    czVuscShards: false,
    printCzVuscEnvTemplate: false,
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

    if (arg === '--cz-vusc-shards') {
      parsed.czVuscShards = true;
      continue;
    }

    if (arg === '--print-cz-vusc-env-template') {
      parsed.printCzVuscEnvTemplate = true;
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

  if (!(parsed.app || parsed.help || parsed.printCzVuscEnvTemplate)) {
    throw new Error('Missing required --app argument.');
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/apply-smart-suggest-cloudflare-bindings.mjs --app shell-super-app [--require-d1] [--apply-migrations]
  node scripts/apply-smart-suggest-cloudflare-bindings.mjs --print-cz-vusc-env-template

Adds Smart Suggest Cloudflare bindings to the generated .output/wrangler.json.
Copies generated D1 migrations into .output and can apply them before deploy.

Environment:
  SMART_SUGGEST_D1_BINDING             Defaults to SMART_SUGGEST_D1
  SMART_SUGGEST_D1_DATABASE_NAME       Defaults to smart-suggest
  SMART_SUGGEST_D1_DATABASE_ID         Required with --require-d1
  SMART_SUGGEST_D1_PREVIEW_DATABASE_ID Optional preview database id
  SMART_SUGGEST_ROUTER_D1_ENABLED      true to add router D1 binding
  SMART_SUGGEST_ROUTER_D1_BINDING      Defaults to SMART_SUGGEST_ROUTER_D1
  SMART_SUGGEST_ROUTER_D1_DATABASE_NAME Defaults to smart-suggest-router
  SMART_SUGGEST_ROUTER_D1_DATABASE_ID  Required with --require-d1 when enabled
  SMART_SUGGEST_D1_SHARDS_JSON         JSON array of shard D1 configs
  SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON Optional JSON object mapping VUSC codes to shard bindings
  SMART_SUGGEST_D1_CZ_VUSC_SHARDS_ENABLED true to add all 14 CZ VUSC shards
  SMART_SUGGEST_D1_CZ_VUSC_SHARD_BINDING_PREFIX Defaults to SMART_SUGGEST_CZ_VUSC_
  SMART_SUGGEST_D1_CZ_VUSC_SHARD_DATABASE_NAME_PREFIX Defaults to smart-suggest-cz-vusc-
  SMART_SUGGEST_CZ_VUSC_<code>_DATABASE_ID Required with --require-d1 for enabled CZ VUSC shards
  SMART_SUGGEST_CZ_VUSC_<code>_PREVIEW_DATABASE_ID Optional preview database id

SMART_SUGGEST_D1_SHARDS_JSON entries:
  [{"binding":"SMART_SUGGEST_CZ_VUSC_19","database_name":"smart-suggest-cz-vusc-19","database_id":"...","preview_database_id":"..."}]
`);
}

function envValue(name) {
  const value = process.env[name]?.trim();

  return value === undefined || value === '' ? undefined : value;
}

function envFlag(name) {
  const value = envValue(name);

  return value === '1' || value === 'true';
}

function assertInside(parent, child) {
  if (child !== parent && !child.startsWith(`${parent}${path.sep}`)) {
    throw new Error(`Path escaped expected root: ${child}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseJsonEnv(name) {
  const value = envValue(name);

  if (value === undefined) {
    return;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(
      `${name} must contain valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function writeJson(filePath, value) {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(temporaryPath, filePath);
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalStringField(record, snakeKey, camelKey = snakeKey) {
  const value = record[snakeKey] ?? record[camelKey];

  if (value === undefined) {
    return;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${snakeKey} must be a non-empty string when present.`);
  }

  return value.trim();
}

function requiredStringField(record, key, label) {
  const value = optionalStringField(record, key);

  if (value === undefined) {
    throw new Error(`${label} requires ${key}.`);
  }

  return value;
}

function createD1DatabaseConfig({
  binding,
  databaseId,
  databaseName,
  migrationsDir = `./${smartSuggestD1MigrationsOutput}`,
  previewDatabaseId,
  requireD1,
}) {
  if (requireD1 && databaseId === undefined) {
    throw new Error(`${binding} database_id is required for Cloudflare deploy.`);
  }

  return {
    binding,
    database_id: databaseId ?? localD1DatabaseIdForBinding(binding),
    database_name: databaseName,
    migrations_dir: migrationsDir,
    preview_database_id:
      previewDatabaseId ?? databaseId ?? localD1DatabaseIdForBinding(`${binding}:preview`),
  };
}

function createPrimaryD1Database({
  databaseId,
  databaseName,
  previewDatabaseId,
  requireD1,
  binding,
}) {
  return createD1DatabaseConfig({
    binding,
    databaseId,
    databaseName,
    previewDatabaseId,
    requireD1,
  });
}

function routerD1Enabled() {
  return (
    envValue('SMART_SUGGEST_ROUTER_D1_ENABLED') === 'true' ||
    envValue('SMART_SUGGEST_ROUTER_D1_DATABASE_ID') !== undefined ||
    envValue('SMART_SUGGEST_ROUTER_D1_DATABASE_NAME') !== undefined ||
    envValue('SMART_SUGGEST_ROUTER_D1_BINDING') !== undefined
  );
}

function czVuscShardsEnabled(args) {
  return args.czVuscShards || envFlag('SMART_SUGGEST_D1_CZ_VUSC_SHARDS_ENABLED');
}

function createRouterD1Database(requireD1) {
  if (!routerD1Enabled()) {
    return;
  }

  return createD1DatabaseConfig({
    binding: envValue('SMART_SUGGEST_ROUTER_D1_BINDING') ?? 'SMART_SUGGEST_ROUTER_D1',
    databaseId: envValue('SMART_SUGGEST_ROUTER_D1_DATABASE_ID'),
    databaseName: envValue('SMART_SUGGEST_ROUTER_D1_DATABASE_NAME') ?? 'smart-suggest-router',
    previewDatabaseId: envValue('SMART_SUGGEST_ROUTER_D1_PREVIEW_DATABASE_ID'),
    requireD1,
  });
}

function czVuscShardFieldEnv(prefix, code, suffix) {
  return envValue(`${prefix}${code}_${suffix}`);
}

function createCzVuscShardD1Databases(args, requireD1) {
  if (!czVuscShardsEnabled(args)) {
    return [];
  }

  const bindingPrefix =
    envValue('SMART_SUGGEST_D1_CZ_VUSC_SHARD_BINDING_PREFIX') ?? defaultCzVuscShardBindingPrefix;
  const databaseNamePrefix =
    envValue('SMART_SUGGEST_D1_CZ_VUSC_SHARD_DATABASE_NAME_PREFIX') ??
    defaultCzVuscShardDatabaseNamePrefix;

  return expectedCzVuscCodes.map((code) => {
    const binding = `${bindingPrefix}${code}`;

    return createD1DatabaseConfig({
      binding,
      databaseId:
        czVuscShardFieldEnv(bindingPrefix, code, 'DATABASE_ID') ??
        envValue(`SMART_SUGGEST_D1_CZ_VUSC_${code}_DATABASE_ID`),
      databaseName:
        czVuscShardFieldEnv(bindingPrefix, code, 'DATABASE_NAME') ??
        envValue(`SMART_SUGGEST_D1_CZ_VUSC_${code}_DATABASE_NAME`) ??
        `${databaseNamePrefix}${code}`,
      migrationsDir: `./${smartSuggestD1MigrationsOutput}`,
      previewDatabaseId:
        czVuscShardFieldEnv(bindingPrefix, code, 'PREVIEW_DATABASE_ID') ??
        envValue(`SMART_SUGGEST_D1_CZ_VUSC_${code}_PREVIEW_DATABASE_ID`),
      requireD1,
    });
  });
}

function parseShardD1Databases(requireD1) {
  const parsed = parseJsonEnv('SMART_SUGGEST_D1_SHARDS_JSON');

  if (parsed === undefined) {
    return [];
  }
  if (!Array.isArray(parsed)) {
    throw new Error('SMART_SUGGEST_D1_SHARDS_JSON must be a JSON array.');
  }

  return parsed.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`SMART_SUGGEST_D1_SHARDS_JSON[${index}] must be an object.`);
    }

    return createD1DatabaseConfig({
      binding: requiredStringField(entry, 'binding', `SMART_SUGGEST_D1_SHARDS_JSON[${index}]`),
      databaseId: optionalStringField(entry, 'database_id', 'databaseId'),
      databaseName: requiredStringField(
        entry,
        'database_name',
        `SMART_SUGGEST_D1_SHARDS_JSON[${index}]`,
      ),
      migrationsDir:
        optionalStringField(entry, 'migrations_dir', 'migrationsDir') ??
        `./${smartSuggestD1MigrationsOutput}`,
      previewDatabaseId: optionalStringField(entry, 'preview_database_id', 'previewDatabaseId'),
      requireD1,
    });
  });
}

function mergeShardD1Databases(...groups) {
  const merged = [];
  const seenBindings = new Set();

  for (const database of groups.flat()) {
    if (seenBindings.has(database.binding)) {
      throw new Error(`Duplicate Smart Suggest shard D1 binding: ${database.binding}`);
    }

    seenBindings.add(database.binding);
    merged.push(database);
  }

  return merged;
}

function printCzVuscEnvTemplate() {
  const lines = [
    '# Smart Suggest CZ VUSC D1 shard bindings',
    '# Fill database ids from `wrangler d1 create ...` output in deployment-owned env, not git.',
    'export SMART_SUGGEST_ROUTER_D1_ENABLED=true',
    'export SMART_SUGGEST_ROUTER_D1_DATABASE_ID="<router-database-id>"',
    'export SMART_SUGGEST_D1_CZ_VUSC_SHARDS_ENABLED=true',
  ];

  for (const code of expectedCzVuscCodes) {
    lines.push(`export SMART_SUGGEST_CZ_VUSC_${code}_DATABASE_ID="<cz-vusc-${code}-database-id>"`);
  }

  process.stdout.write(`${lines.join('\n')}\n`);
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

function exposeSdkDemoAtRoot(appRoot) {
  const publicRoot = path.join(appRoot, '.output/public');
  const demoPath = path.join(publicRoot, 'sdk/demo.html');
  const rootPath = path.join(publicRoot, 'index.html');

  if (!fs.existsSync(demoPath)) {
    throw new Error(`Smart Suggest SDK demo is missing from Cloudflare output: ${demoPath}`);
  }

  fs.copyFileSync(demoPath, rootPath);
}

function patchWorkerAssetDispatch(appRoot) {
  const workerPath = path.join(appRoot, '.output/server/index.mjs');
  const source = fs.readFileSync(workerPath, 'utf8');
  const existing = `async function fetchAsset(request, env) {
    const assets = env?.[ASSETS_BINDING];
    if (!assets || 'function' != typeof assets.fetch) return null;
    const response = await assets.fetch(request);
    if (404 === response.status) return null;
    return withAssetHeaders(response, request);
}`;
  const patched = `async function fetchAsset(request, env) {
    if ('GET' !== request.method && 'HEAD' !== request.method) return null;
    const assets = env?.[ASSETS_BINDING];
    if (!assets || 'function' != typeof assets.fetch) return null;
    const response = await assets.fetch(request);
    if (404 === response.status) return null;
    return withAssetHeaders(response, request);
}`;

  if (source.includes(patched)) {
    return;
  }

  if (!source.includes(existing)) {
    throw new Error(`Modern.js Cloudflare worker asset dispatch shape changed: ${workerPath}`);
  }

  fs.writeFileSync(workerPath, source.replace(existing, patched));
}

function copyD1Migrations(appRoot) {
  if (!fs.existsSync(smartSuggestD1MigrationsSource)) {
    throw new Error(`Smart Suggest D1 migrations are missing: ${smartSuggestD1MigrationsSource}`);
  }

  const sqlFiles = fs
    .readdirSync(smartSuggestD1MigrationsSource)
    .filter((entry) => entry.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  if (sqlFiles.length === 0) {
    throw new Error('Smart Suggest D1 migrations directory has no SQL files.');
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

function applyD1MigrationsForDatabases({ appRoot, databases }) {
  for (const database of databases) {
    applyD1Migrations({ appRoot, databaseName: database.database_name });
  }
}

function assertRemoteMigrationDatabaseIds(databases) {
  for (const database of databases) {
    if (database.database_id !== localD1DatabaseIdForBinding(database.binding)) {
      continue;
    }

    throw new Error(`${database.binding} database_id is required when using --apply-migrations.`);
  }
}

function mergeSmartSuggestVars(config, routerDatabase, shardDatabases) {
  const existingVars = isRecord(config.vars) ? config.vars : {};
  const nextVars = { ...existingVars };

  if (routerDatabase !== undefined) {
    nextVars.SMART_SUGGEST_D1_ROUTER_BINDING = routerDatabase.binding;
  }

  if (shardDatabases.length > 0) {
    nextVars.SMART_SUGGEST_D1_SHARD_BINDINGS = shardDatabases
      .map((database) => database.binding)
      .join(',');
  }
  if (envValue('SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON') !== undefined) {
    nextVars.SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON = envValue(
      'SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON',
    );
  }

  return nextVars;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return 0;
  }
  if (args.printCzVuscEnvTemplate) {
    printCzVuscEnvTemplate();
    return 0;
  }

  const appsRoot = path.resolve(workspaceRoot, 'apps');
  const appRoot = path.resolve(appsRoot, args.app);
  assertInside(appsRoot, appRoot);

  const wranglerPath = path.join(appRoot, '.output/wrangler.json');
  if (!fs.existsSync(wranglerPath)) {
    throw new Error(
      `Generated Wrangler config is missing: ${wranglerPath}. Run the app Cloudflare build before applying Smart Suggest bindings.`,
    );
  }
  const config = readJson(wranglerPath);
  const binding = envValue('SMART_SUGGEST_D1_BINDING') ?? 'SMART_SUGGEST_D1';
  const databaseName = envValue('SMART_SUGGEST_D1_DATABASE_NAME') ?? 'smart-suggest';
  const databaseId = envValue('SMART_SUGGEST_D1_DATABASE_ID');
  const previewDatabaseId = envValue('SMART_SUGGEST_D1_PREVIEW_DATABASE_ID');

  if (args.requireD1 && databaseId === undefined) {
    throw new Error('SMART_SUGGEST_D1_DATABASE_ID is required for Cloudflare deploy.');
  }

  const d1Database = createPrimaryD1Database({
    binding,
    databaseId,
    databaseName,
    previewDatabaseId,
    requireD1: args.requireD1,
  });
  const routerD1Database = createRouterD1Database(args.requireD1);
  const shardD1Databases = mergeShardD1Databases(
    parseShardD1Databases(args.requireD1),
    createCzVuscShardD1Databases(args, args.requireD1),
  );
  const smartSuggestD1Databases = [
    d1Database,
    ...(routerD1Database === undefined ? [] : [routerD1Database]),
    ...shardD1Databases,
  ];
  const smartSuggestBindings = new Set(smartSuggestD1Databases.map((database) => database.binding));
  const existingD1Databases = Array.isArray(config.d1_databases) ? config.d1_databases : [];
  const migrations = copyD1Migrations(appRoot);
  exposeSdkDemoAtRoot(appRoot);
  patchWorkerAssetDispatch(appRoot);

  writeJson(wranglerPath, {
    ...config,
    d1_databases: [
      ...smartSuggestD1Databases,
      ...existingD1Databases.filter((entry) => !smartSuggestBindings.has(entry?.binding)),
    ],
    vars: mergeSmartSuggestVars(config, routerD1Database, shardD1Databases),
  });
  const removedPaths = removeServerOnlyPublicOutput(appRoot);
  process.stdout.write(`Applied Smart Suggest D1 binding ${binding} to ${wranglerPath}\n`);
  if (routerD1Database !== undefined) {
    process.stdout.write(`Applied Smart Suggest router D1 binding ${routerD1Database.binding}\n`);
  }
  if (shardD1Databases.length > 0) {
    process.stdout.write(
      `Applied Smart Suggest shard D1 bindings ${shardD1Databases
        .map((database) => database.binding)
        .join(', ')}\n`,
    );
  }
  process.stdout.write('Exposed Smart Suggest SDK demo at public root index.html\n');
  process.stdout.write(
    'Patched Cloudflare asset dispatch to leave non-GET/HEAD BFF bodies unread\n',
  );
  process.stdout.write(
    `Copied Smart Suggest D1 migrations to ${path.relative(appRoot, migrations.outputPath)} (${migrations.sqlFiles.length} SQL file(s))\n`,
  );
  if (args.applyMigrations) {
    assertRemoteMigrationDatabaseIds(smartSuggestD1Databases);
    applyD1MigrationsForDatabases({ appRoot, databases: smartSuggestD1Databases });
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
