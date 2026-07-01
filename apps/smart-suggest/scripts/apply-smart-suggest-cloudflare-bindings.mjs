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
const defaultFreeTierShardBindingPrefix = 'SMART_SUGGEST_FREE_TIER_';
const defaultFreeTierShardDatabaseNamePrefix = 'smart-suggest-free-tier-';
const freeTierShardGroups = [
  { index: '01', regionCodes: ['19'] },
  { index: '02', regionCodes: ['27'] },
  { index: '03', regionCodes: ['35', '43'] },
  { index: '04', regionCodes: ['51', '78'] },
  { index: '05', regionCodes: ['60'] },
  { index: '06', regionCodes: ['86', '94', '108'] },
  { index: '07', regionCodes: ['116'] },
  { index: '08', regionCodes: ['124', '132'] },
  { index: '09', regionCodes: ['141'] },
];

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
    artifactManifestUrl: undefined,
    artifactPublicOrigin: undefined,
    artifactStatic: false,
    compactCzShard: false,
    czVuscShards: false,
    printCzVuscEnvTemplate: false,
    printFreeTierEnvTemplate: false,
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

    if (arg === '--artifact-static') {
      parsed.artifactStatic = true;
      continue;
    }

    if (arg === '--artifact-manifest-url') {
      parsed.artifactManifestUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--artifact-public-origin') {
      parsed.artifactPublicOrigin = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--cz-vusc-shards') {
      parsed.czVuscShards = true;
      continue;
    }

    if (arg === '--compact-cz-shard') {
      parsed.compactCzShard = true;
      continue;
    }

    if (arg === '--print-cz-vusc-env-template') {
      parsed.printCzVuscEnvTemplate = true;
      continue;
    }

    if (arg === '--print-free-tier-env-template') {
      parsed.printFreeTierEnvTemplate = true;
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

  if (
    !(parsed.app || parsed.help || parsed.printCzVuscEnvTemplate || parsed.printFreeTierEnvTemplate)
  ) {
    throw new Error('Missing required --app argument.');
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/apply-smart-suggest-cloudflare-bindings.mjs --app shell-super-app [--require-d1] [--apply-migrations]
  node scripts/apply-smart-suggest-cloudflare-bindings.mjs --app shell-super-app --artifact-static --artifact-public-origin https://example.workers.dev
  node scripts/apply-smart-suggest-cloudflare-bindings.mjs --print-free-tier-env-template
  node scripts/apply-smart-suggest-cloudflare-bindings.mjs --print-cz-vusc-env-template

Adds Smart Suggest Cloudflare bindings to the generated .output/wrangler.json.
Copies generated D1 migrations into .output and can apply them before deploy.
Use --artifact-static for the no-pay profile: full owned data is served from
Worker Static Assets, and corpus D1 bindings are removed from generated output.

Environment:
  SMART_SUGGEST_ARTIFACT_STATIC_ENABLED true to enable the no-pay static artifact profile
  SMART_SUGGEST_ARTIFACT_PUBLIC_ORIGIN Public origin used to derive /smart-suggest-owned-data/manifest.json
  SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL Explicit deployed artifact manifest URL
  SMART_SUGGEST_OWNED_ARTIFACT_MAX_TOKEN_PAGES Optional runtime token-page read ceiling
  SMART_SUGGEST_D1_BINDING             Defaults to SMART_SUGGEST_D1
  SMART_SUGGEST_D1_DATABASE_NAME       Defaults to smart-suggest
  SMART_SUGGEST_D1_DATABASE_ID         Required with --require-d1
  SMART_SUGGEST_D1_PREVIEW_DATABASE_ID Optional preview database id
  SMART_SUGGEST_ROUTER_D1_ENABLED      true to add router D1 binding
  SMART_SUGGEST_ROUTER_D1_BINDING      Defaults to SMART_SUGGEST_ROUTER_D1
  SMART_SUGGEST_ROUTER_D1_DATABASE_NAME Defaults to smart-suggest-router
  SMART_SUGGEST_ROUTER_D1_DATABASE_ID  Required with --require-d1 when enabled
  SMART_SUGGEST_D1_TOPOLOGY            free-tier, compact-cz, paid-vusc, or custom
  SMART_SUGGEST_D1_FREE_TIER_MAX_SHARDS_ENABLED true to use router plus 9 address D1s
  SMART_SUGGEST_D1_FREE_TIER_SHARD_BINDING_PREFIX Defaults to SMART_SUGGEST_FREE_TIER_
  SMART_SUGGEST_D1_FREE_TIER_SHARD_DATABASE_NAME_PREFIX Defaults to smart-suggest-free-tier-
  SMART_SUGGEST_FREE_TIER_<index>_DATABASE_ID Required with --require-d1 for free-tier max shards
  SMART_SUGGEST_FREE_TIER_<index>_PREVIEW_DATABASE_ID Optional preview database id
  SMART_SUGGEST_D1_SHARD_ROUTE_STRATEGY Defaults to hash for free-tier, vusc for paid-vusc
  SMART_SUGGEST_D1_COMPACT_CZ_ENABLED  true to map all CZ VUSC regions to one physical D1 fallback
  SMART_SUGGEST_D1_COMPACT_CZ_SHARD_BINDING Defaults to SMART_SUGGEST_D1
  SMART_SUGGEST_D1_SHARDS_JSON         JSON array of shard D1 configs
  SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON Optional legacy/vusc JSON object mapping VUSC codes to shard bindings
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

function normalizePublicOrigin(value) {
  if (value === undefined) {
    return;
  }

  const origin = value.replace(/\/+$/u, '');

  if (!/^https?:\/\//u.test(origin)) {
    throw new Error(`Artifact public origin must be an absolute URL: ${value}`);
  }

  return origin;
}

function normalizeArtifactManifestUrl(args) {
  const explicitUrl =
    args.artifactManifestUrl ?? envValue('SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL');

  if (explicitUrl !== undefined) {
    if (!/^https?:\/\//u.test(explicitUrl)) {
      throw new Error(`Artifact manifest URL must be an absolute URL: ${explicitUrl}`);
    }

    return explicitUrl;
  }

  const publicOrigin = normalizePublicOrigin(
    args.artifactPublicOrigin ?? envValue('SMART_SUGGEST_ARTIFACT_PUBLIC_ORIGIN'),
  );

  if (publicOrigin === undefined) {
    throw new Error(
      '--artifact-static requires --artifact-manifest-url, --artifact-public-origin, SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL, or SMART_SUGGEST_ARTIFACT_PUBLIC_ORIGIN.',
    );
  }

  return `${publicOrigin}/smart-suggest-owned-data/manifest.json`;
}

function artifactStaticEnabled(args) {
  return args.artifactStatic || envFlag('SMART_SUGGEST_ARTIFACT_STATIC_ENABLED');
}

function compactCzRegionMapJson(binding) {
  return JSON.stringify(Object.fromEntries(expectedCzVuscCodes.map((code) => [code, binding])));
}

function freeTierRegionMapJson(databases) {
  return JSON.stringify(
    Object.fromEntries(
      freeTierShardGroups.flatMap((group, index) =>
        group.regionCodes.map((code) => [code, databases[index].binding]),
      ),
    ),
  );
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

function paidCzVuscShardsEnabled(args) {
  return (
    args.czVuscShards ||
    envFlag('SMART_SUGGEST_D1_CZ_VUSC_SHARDS_ENABLED') ||
    envValue('SMART_SUGGEST_D1_TOPOLOGY') === 'paid-vusc'
  );
}

function compactCzShardEnabled(args) {
  if (paidCzVuscShardsEnabled(args)) {
    return false;
  }

  const topology = envValue('SMART_SUGGEST_D1_TOPOLOGY');

  return (
    args.compactCzShard ||
    envFlag('SMART_SUGGEST_D1_COMPACT_CZ_ENABLED') ||
    topology === 'compact-cz'
  );
}

function freeTierMaxShardsEnabled(args) {
  if (paidCzVuscShardsEnabled(args) || compactCzShardEnabled(args)) {
    return false;
  }

  const topology = envValue('SMART_SUGGEST_D1_TOPOLOGY');

  return (
    envFlag('SMART_SUGGEST_D1_FREE_TIER_MAX_SHARDS_ENABLED') ||
    (topology === 'free-tier' && envValue('SMART_SUGGEST_D1_SHARDS_JSON') === undefined) ||
    (topology === undefined && envValue('SMART_SUGGEST_D1_SHARDS_JSON') === undefined)
  );
}

function routerD1Enabled(args) {
  return (
    compactCzShardEnabled(args) ||
    freeTierMaxShardsEnabled(args) ||
    envValue('SMART_SUGGEST_ROUTER_D1_ENABLED') === 'true' ||
    envValue('SMART_SUGGEST_ROUTER_D1_DATABASE_ID') !== undefined ||
    envValue('SMART_SUGGEST_ROUTER_D1_DATABASE_NAME') !== undefined ||
    envValue('SMART_SUGGEST_ROUTER_D1_BINDING') !== undefined
  );
}

function czVuscShardsEnabled(args) {
  return paidCzVuscShardsEnabled(args);
}

function createRouterD1Database(args, requireD1) {
  if (!routerD1Enabled(args)) {
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

function compactCzShardBinding(primaryBinding) {
  return envValue('SMART_SUGGEST_D1_COMPACT_CZ_SHARD_BINDING') ?? primaryBinding;
}

function czVuscShardFieldEnv(prefix, code, suffix) {
  return envValue(`${prefix}${code}_${suffix}`);
}

function freeTierShardFieldEnv(prefix, index, suffix) {
  return envValue(`${prefix}${index}_${suffix}`);
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

function createFreeTierShardD1Databases(args, requireD1) {
  if (!freeTierMaxShardsEnabled(args)) {
    return [];
  }

  const bindingPrefix =
    envValue('SMART_SUGGEST_D1_FREE_TIER_SHARD_BINDING_PREFIX') ??
    defaultFreeTierShardBindingPrefix;
  const databaseNamePrefix =
    envValue('SMART_SUGGEST_D1_FREE_TIER_SHARD_DATABASE_NAME_PREFIX') ??
    defaultFreeTierShardDatabaseNamePrefix;

  return freeTierShardGroups.map((group) => {
    const binding = `${bindingPrefix}${group.index}`;

    return createD1DatabaseConfig({
      binding,
      databaseId: freeTierShardFieldEnv(bindingPrefix, group.index, 'DATABASE_ID'),
      databaseName:
        freeTierShardFieldEnv(bindingPrefix, group.index, 'DATABASE_NAME') ??
        `${databaseNamePrefix}${group.index}`,
      migrationsDir: `./${smartSuggestD1MigrationsOutput}`,
      previewDatabaseId: freeTierShardFieldEnv(bindingPrefix, group.index, 'PREVIEW_DATABASE_ID'),
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

function printFreeTierEnvTemplate() {
  const bindingPrefix =
    envValue('SMART_SUGGEST_D1_FREE_TIER_SHARD_BINDING_PREFIX') ??
    defaultFreeTierShardBindingPrefix;
  const shardBindings = freeTierShardGroups.map((group) => `${bindingPrefix}${group.index}`);
  const lines = [
    '# Smart Suggest free-tier D1 bindings',
    '# Uses one router D1 plus 9 row-balanced address D1s; raw source snapshots stay outside git.',
    'export SMART_SUGGEST_D1_TOPOLOGY=free-tier',
    'export SMART_SUGGEST_D1_SHARD_ROUTE_STRATEGY=hash',
    'export SMART_SUGGEST_ROUTER_D1_ENABLED=true',
    'export SMART_SUGGEST_ROUTER_D1_DATABASE_ID="<router-database-id>"',
    'export SMART_SUGGEST_D1_FREE_TIER_MAX_SHARDS_ENABLED=true',
  ];

  for (const binding of shardBindings) {
    lines.push(
      `export ${binding}_DATABASE_ID="<${binding.toLowerCase().replaceAll('_', '-')}-database-id>"`,
    );
  }

  lines.push(`export SMART_SUGGEST_D1_SHARD_BINDINGS="${shardBindings.join(',')}"`);

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

function assertSdkDemoOutput(appRoot) {
  const publicRoot = path.join(appRoot, '.output/public');
  const demoPath = path.join(publicRoot, 'sdk/demo.html');

  if (!fs.existsSync(demoPath)) {
    throw new Error(`Smart Suggest SDK demo is missing from Cloudflare output: ${demoPath}`);
  }
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

function uniqueDatabasesByBinding(databases) {
  const unique = [];
  const seen = new Set();

  for (const database of databases.filter((entry) => entry !== undefined)) {
    if (seen.has(database.binding)) {
      continue;
    }

    seen.add(database.binding);
    unique.push(database);
  }

  return unique;
}

function isManagedSmartSuggestD1Binding(binding, managedBindings) {
  if (typeof binding !== 'string') {
    return false;
  }
  if (managedBindings.has(binding)) {
    return true;
  }

  const managedPrefixes = [
    defaultCzVuscShardBindingPrefix,
    envValue('SMART_SUGGEST_D1_CZ_VUSC_SHARD_BINDING_PREFIX') ?? defaultCzVuscShardBindingPrefix,
    defaultFreeTierShardBindingPrefix,
    envValue('SMART_SUGGEST_D1_FREE_TIER_SHARD_BINDING_PREFIX') ??
      defaultFreeTierShardBindingPrefix,
  ];

  return managedPrefixes.some((prefix) => binding.startsWith(prefix));
}

function removeSmartSuggestD1Vars(vars) {
  const nextVars = { ...vars };

  for (const key of [
    'SMART_SUGGEST_D1_ROUTER_BINDING',
    'SMART_SUGGEST_D1_SHARD_BINDINGS',
    'SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON',
    'SMART_SUGGEST_D1_SHARD_ROUTE_STRATEGY',
  ]) {
    delete nextVars[key];
  }

  return nextVars;
}

function mergeSmartSuggestArtifactStaticVars(config, args) {
  const existingVars = isRecord(config.vars) ? config.vars : {};
  const nextVars = removeSmartSuggestD1Vars(existingVars);
  const maxTokenPages = envValue('SMART_SUGGEST_OWNED_ARTIFACT_MAX_TOKEN_PAGES');

  nextVars.SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL = normalizeArtifactManifestUrl(args);
  nextVars.SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE =
    envValue('SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE') ?? 'false';
  nextVars.SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS =
    envValue('SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS') ?? 'false';

  if (maxTokenPages !== undefined) {
    nextVars.SMART_SUGGEST_OWNED_ARTIFACT_MAX_TOKEN_PAGES = maxTokenPages;
  } else {
    delete nextVars.SMART_SUGGEST_OWNED_ARTIFACT_MAX_TOKEN_PAGES;
  }

  return nextVars;
}

function mergeSmartSuggestVars(
  config,
  routerDatabase,
  shardBindingNames,
  shardRegionMapJson,
  shardRouteStrategy,
) {
  const existingVars = isRecord(config.vars) ? config.vars : {};
  const nextVars = { ...existingVars };

  if (routerDatabase !== undefined) {
    nextVars.SMART_SUGGEST_D1_ROUTER_BINDING = routerDatabase.binding;
  }

  if (shardRouteStrategy !== undefined) {
    nextVars.SMART_SUGGEST_D1_SHARD_ROUTE_STRATEGY = shardRouteStrategy;
  }

  if (shardBindingNames.length > 0) {
    nextVars.SMART_SUGGEST_D1_SHARD_BINDINGS = shardBindingNames.join(',');
  }
  if (shardRegionMapJson !== undefined) {
    nextVars.SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON = shardRegionMapJson;
  } else if (shardRouteStrategy === 'hash') {
    delete nextVars.SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON;
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
  if (args.printFreeTierEnvTemplate) {
    printFreeTierEnvTemplate();
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
  const existingD1Databases = Array.isArray(config.d1_databases) ? config.d1_databases : [];
  const migrations = copyD1Migrations(appRoot);
  assertSdkDemoOutput(appRoot);
  patchWorkerAssetDispatch(appRoot);

  if (artifactStaticEnabled(args)) {
    const managedBindings = new Set([
      'SMART_SUGGEST_D1',
      'SMART_SUGGEST_ROUTER_D1',
      envValue('SMART_SUGGEST_D1_BINDING') ?? 'SMART_SUGGEST_D1',
      envValue('SMART_SUGGEST_ROUTER_D1_BINDING') ?? 'SMART_SUGGEST_ROUTER_D1',
    ]);
    writeJson(wranglerPath, {
      ...config,
      d1_databases: existingD1Databases.filter(
        (entry) => !isManagedSmartSuggestD1Binding(entry?.binding, managedBindings),
      ),
      workers_dev: config.workers_dev ?? true,
      vars: mergeSmartSuggestArtifactStaticVars(config, args),
    });
    const removedPaths = removeServerOnlyPublicOutput(appRoot);
    process.stdout.write(`Applied Smart Suggest static artifact profile to ${wranglerPath}\n`);
    process.stdout.write('Removed Smart Suggest corpus D1 bindings for artifact-first deploy\n');
    process.stdout.write('Verified Smart Suggest SDK demo output at sdk/demo.html\n');
    process.stdout.write(
      'Patched Cloudflare asset dispatch to leave non-GET/HEAD BFF bodies unread\n',
    );
    process.stdout.write(
      `Copied Smart Suggest D1 migrations to ${path.relative(appRoot, migrations.outputPath)} (${migrations.sqlFiles.length} SQL file(s))\n`,
    );
    if (removedPaths.length > 0) {
      process.stdout.write(`Removed server-only public output: ${removedPaths.join(', ')}\n`);
    }
    return 0;
  }

  const binding = envValue('SMART_SUGGEST_D1_BINDING') ?? 'SMART_SUGGEST_D1';
  const databaseName = envValue('SMART_SUGGEST_D1_DATABASE_NAME') ?? 'smart-suggest';
  const databaseId = envValue('SMART_SUGGEST_D1_DATABASE_ID');
  const previewDatabaseId = envValue('SMART_SUGGEST_D1_PREVIEW_DATABASE_ID');
  const compactShardBindingName = compactCzShardEnabled(args)
    ? compactCzShardBinding(binding)
    : undefined;
  const primaryBinding = compactShardBindingName ?? binding;
  const parsedShardD1Databases = parseShardD1Databases(args.requireD1);
  const freeTierShardD1Databases = createFreeTierShardD1Databases(args, args.requireD1);
  const czVuscShardD1Databases = createCzVuscShardD1Databases(args, args.requireD1);
  const shardD1Databases = mergeShardD1Databases(
    parsedShardD1Databases,
    freeTierShardD1Databases,
    czVuscShardD1Databases,
  );
  const primaryD1Required = shardD1Databases.length === 0 || compactShardBindingName !== undefined;

  if (args.requireD1 && primaryD1Required && databaseId === undefined) {
    throw new Error('SMART_SUGGEST_D1_DATABASE_ID is required for Cloudflare deploy.');
  }

  const d1Database = primaryD1Required
    ? createPrimaryD1Database({
        binding: primaryBinding,
        databaseId,
        databaseName,
        previewDatabaseId,
        requireD1: args.requireD1,
      })
    : undefined;
  const routerD1Database = createRouterD1Database(args, args.requireD1);
  const shardBindingNames = [
    ...shardD1Databases.map((database) => database.binding),
    ...(compactShardBindingName === undefined ? [] : [compactShardBindingName]),
  ];
  const d1Topology = envValue('SMART_SUGGEST_D1_TOPOLOGY') ?? 'custom';
  const shardRouteStrategy =
    envValue('SMART_SUGGEST_D1_SHARD_ROUTE_STRATEGY') ??
    (d1Topology === 'paid-vusc' ? 'vusc' : d1Topology === 'free-tier' ? 'hash' : undefined);
  const shardRegionMapJson =
    shardRouteStrategy === 'hash'
      ? undefined
      : (envValue('SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON') ??
        (compactShardBindingName !== undefined
          ? compactCzRegionMapJson(compactShardBindingName)
          : freeTierShardD1Databases.length > 0
            ? freeTierRegionMapJson(freeTierShardD1Databases)
            : undefined));
  const smartSuggestD1Databases = uniqueDatabasesByBinding([
    d1Database,
    ...(routerD1Database === undefined ? [] : [routerD1Database]),
    ...shardD1Databases,
  ]);
  const smartSuggestBindings = new Set([
    'SMART_SUGGEST_D1',
    'SMART_SUGGEST_ROUTER_D1',
    binding,
    primaryBinding,
    ...smartSuggestD1Databases.map((database) => database.binding),
  ]);
  writeJson(wranglerPath, {
    ...config,
    d1_databases: [
      ...smartSuggestD1Databases,
      ...existingD1Databases.filter(
        (entry) => !isManagedSmartSuggestD1Binding(entry?.binding, smartSuggestBindings),
      ),
    ],
    vars: mergeSmartSuggestVars(
      config,
      routerD1Database,
      shardBindingNames,
      shardRegionMapJson,
      shardRouteStrategy,
    ),
  });
  const removedPaths = removeServerOnlyPublicOutput(appRoot);
  if (d1Database !== undefined) {
    process.stdout.write(
      `Applied Smart Suggest D1 binding ${d1Database.binding} to ${wranglerPath}\n`,
    );
  } else {
    process.stdout.write(`Applied Smart Suggest D1 topology to ${wranglerPath}\n`);
  }
  if (routerD1Database !== undefined) {
    process.stdout.write(`Applied Smart Suggest router D1 binding ${routerD1Database.binding}\n`);
  }
  if (shardBindingNames.length > 0) {
    process.stdout.write(
      `Applied Smart Suggest shard D1 bindings ${shardBindingNames.join(', ')}\n`,
    );
  }
  process.stdout.write('Verified Smart Suggest SDK demo output at sdk/demo.html\n');
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
