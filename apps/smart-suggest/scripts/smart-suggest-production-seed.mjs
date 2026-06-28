#!/usr/bin/env node
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWranglerConfigPath = 'apps/shell-super-app/.output/wrangler.json';
const defaultSeedReportPath = '.codex/reports/smart-suggest-production-seed/plan.json';
const defaultExecuteReportPath = '.codex/reports/smart-suggest-production-seed/execute.json';
const defaultStatusReportPath =
  '.codex/reports/smart-suggest-d1-operations/status-production-seed.json';
const defaultOptimizeReportPath =
  '.codex/reports/smart-suggest-d1-operations/optimize-production-seed.json';
const defaultPreflightReportPath =
  '.codex/reports/smart-suggest-d1-operations/preflight-production-seed.json';
const expectedSourceAttributions = new Map([
  [
    'ruian-cz',
    {
      label: 'CUZK RUIAN',
      license: 'CC BY 4.0',
      url: 'https://ruian.cuzk.cz/',
    },
  ],
]);
const d1Targets = new Set(['local', 'remote']);
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
const defaultShardBindingPrefix = 'SMART_SUGGEST_CZ_VUSC_';
const productionSeedRequiredEnvironment = {
  d1GeneratedConfig: [
    {
      env: 'SMART_SUGGEST_ROUTER_D1_ENABLED',
      purpose: 'Enables the router D1 binding during cloudflare:build.',
    },
    {
      env: 'SMART_SUGGEST_ROUTER_D1_DATABASE_ID',
      purpose: 'Cloudflare database id for the router D1 binding.',
    },
    {
      env: 'SMART_SUGGEST_D1_CZ_VUSC_SHARDS_ENABLED',
      purpose: 'Enables all CZ VUSC shard D1 bindings during cloudflare:build.',
    },
    ...expectedCzVuscCodes.map((code) => ({
      env: `SMART_SUGGEST_CZ_VUSC_${code}_DATABASE_ID`,
      purpose: `Cloudflare database id for CZ VUSC shard ${code}.`,
    })),
  ],
  sourceSnapshot: [
    {
      env: 'SMART_SUGGEST_RUIAN_SNAPSHOT_PATH',
      option: '--snapshot-path',
      purpose: 'Retained official snapshot path outside git.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_SNAPSHOT_CHECKSUM_SHA256',
      option: '--snapshot-checksum-sha256',
      purpose: 'Expected SHA-256 for the retained official snapshot.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_SNAPSHOT_URI',
      option: '--snapshot-uri',
      purpose: 'Stable retained snapshot URI recorded in lineage.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_SOURCE_URI',
      option: '--source-uri',
      purpose: 'Official source URI recorded in lineage.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_DATASET_VERSION',
      option: '--dataset-version',
      purpose: 'Dataset/import version recorded on every shard.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_SOURCE_VERSION',
      option: '--source-version',
      purpose: 'Official source version recorded on every shard.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_SOURCE_GENERATED_AT',
      option: '--source-generated-at',
      purpose: 'Official generated timestamp recorded in provenance.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_SOURCE_VALID_AT',
      option: '--source-valid-at',
      purpose: 'Official valid-at timestamp/date recorded in provenance.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_ATOM_ENTRY_ID',
      option: '--atom-entry-id',
      purpose: 'Stable source feed entry id recorded for restart and delta continuity.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH',
      option: '--municipality-region-map-snapshot-path',
      purpose:
        'Retained official RUIAN ST_UZSZ hierarchy snapshot path used to derive municipality-to-VUSC shard routing.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_CHECKSUM_SHA256',
      option: '--municipality-region-map-snapshot-checksum-sha256',
      purpose: 'Expected SHA-256 for the retained hierarchy snapshot.',
    },
  ],
  sourceGovernance: [
    {
      env: 'SMART_SUGGEST_RUIAN_ATTRIBUTION_LABEL',
      expectedPublicValue: 'CUZK RUIAN',
      option: '--attribution-label',
      purpose: 'Public source attribution label stored with source provenance.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_ATTRIBUTION_LICENSE',
      expectedPublicValue: 'CC BY 4.0',
      option: '--attribution-license',
      purpose: 'Public source attribution license stored with source provenance.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_ATTRIBUTION_URL',
      expectedPublicValue: 'https://ruian.cuzk.cz/',
      option: '--attribution-url',
      purpose: 'Public source attribution URL stored with source provenance.',
    },
    {
      env: 'SMART_SUGGEST_RUIAN_MODIFICATION_NOTE',
      option: '--modification-note',
      purpose: 'Operator-authored normalization note. Reports store only its SHA-256.',
    },
  ],
};
const productionSeedOptionalEnvironment = [
  {
    env: 'SMART_SUGGEST_D1_SHARD_BINDINGS',
    option: '--shard-bindings',
    purpose: 'Override the generated CZ VUSC shard binding allowlist.',
  },
  {
    env: 'SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON',
    option: '--shard-region-map-json',
    purpose:
      'Optional JSON map from CZ VUSC region codes to physical D1 shard bindings when multiple logical regions share one D1 database.',
  },
  {
    env: 'SMART_SUGGEST_D1_ROUTER_BINDING',
    option: '--router-d1-binding',
    purpose: 'Override the generated router binding name.',
  },
  {
    env: 'SMART_SUGGEST_ROUTER_D1_BINDING',
    option: '--router-d1-binding',
    purpose: 'Backward-compatible router binding override.',
  },
  {
    env: 'SMART_SUGGEST_RUIAN_CSV_ENCODING',
    option: '--csv-encoding',
    purpose: 'Override official RUIAN CSV text encoding; defaults to windows-1250.',
  },
  {
    env: 'SMART_SUGGEST_RUIAN_CSV_DELIMITER',
    option: '--csv-delimiter',
    purpose: 'Override official RUIAN CSV delimiter; defaults to semicolon.',
  },
];
const checkInputContracts = new Map([
  [
    'missing-snapshot-path',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SNAPSHOT_PATH',
      option: '--snapshot-path',
    },
  ],
  [
    'snapshot-path-not-found',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SNAPSHOT_PATH',
      option: '--snapshot-path',
    },
  ],
  [
    'missing-snapshot-checksum-sha256',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SNAPSHOT_CHECKSUM_SHA256',
      option: '--snapshot-checksum-sha256',
    },
  ],
  [
    'invalid-snapshot-checksum-sha256',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SNAPSHOT_CHECKSUM_SHA256',
      option: '--snapshot-checksum-sha256',
    },
  ],
  [
    'snapshot-checksum-not-computed',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SNAPSHOT_PATH',
      option: '--snapshot-path',
    },
  ],
  [
    'snapshot-checksum-mismatch',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SNAPSHOT_CHECKSUM_SHA256',
      option: '--snapshot-checksum-sha256',
    },
  ],
  [
    'missing-source-uri',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SOURCE_URI',
      option: '--source-uri',
    },
  ],
  [
    'missing-snapshot-uri',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SNAPSHOT_URI',
      option: '--snapshot-uri',
    },
  ],
  [
    'missing-dataset-version',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_DATASET_VERSION',
      option: '--dataset-version',
    },
  ],
  [
    'missing-source-version',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SOURCE_VERSION',
      option: '--source-version',
    },
  ],
  [
    'missing-source-generated-at',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SOURCE_GENERATED_AT',
      option: '--source-generated-at',
    },
  ],
  [
    'missing-source-valid-at',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_SOURCE_VALID_AT',
      option: '--source-valid-at',
    },
  ],
  [
    'missing-atom-entry-id',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_ATOM_ENTRY_ID',
      option: '--atom-entry-id',
    },
  ],
  [
    'missing-region-map-snapshot-path',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH',
      option: '--municipality-region-map-snapshot-path',
    },
  ],
  [
    'region-map-snapshot-path-not-found',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH',
      option: '--municipality-region-map-snapshot-path',
    },
  ],
  [
    'missing-region-map-snapshot-checksum-sha256',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_CHECKSUM_SHA256',
      option: '--municipality-region-map-snapshot-checksum-sha256',
    },
  ],
  [
    'invalid-region-map-snapshot-checksum-sha256',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_CHECKSUM_SHA256',
      option: '--municipality-region-map-snapshot-checksum-sha256',
    },
  ],
  [
    'region-map-snapshot-checksum-not-computed',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH',
      option: '--municipality-region-map-snapshot-path',
    },
  ],
  [
    'region-map-snapshot-checksum-mismatch',
    {
      category: 'source-snapshot',
      env: 'SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_CHECKSUM_SHA256',
      option: '--municipality-region-map-snapshot-checksum-sha256',
    },
  ],
  [
    'missing-attribution-label',
    {
      category: 'source-governance',
      env: 'SMART_SUGGEST_RUIAN_ATTRIBUTION_LABEL',
      option: '--attribution-label',
    },
  ],
  [
    'missing-attribution-license',
    {
      category: 'source-governance',
      env: 'SMART_SUGGEST_RUIAN_ATTRIBUTION_LICENSE',
      option: '--attribution-license',
    },
  ],
  [
    'missing-attribution-url',
    {
      category: 'source-governance',
      env: 'SMART_SUGGEST_RUIAN_ATTRIBUTION_URL',
      option: '--attribution-url',
    },
  ],
  [
    'source-attribution-catalog-mismatch',
    {
      category: 'source-governance',
      env: 'SMART_SUGGEST_RUIAN_ATTRIBUTION_LABEL',
      option: '--attribution-label',
    },
  ],
  [
    'unsupported-production-source-attribution',
    {
      category: 'source-governance',
      option: '--source-id',
    },
  ],
  [
    'missing-modification-note',
    {
      category: 'source-governance',
      env: 'SMART_SUGGEST_RUIAN_MODIFICATION_NOTE',
      option: '--modification-note',
    },
  ],
  [
    'missing-router-d1-binding',
    {
      category: 'd1-config',
      env: 'SMART_SUGGEST_D1_ROUTER_BINDING',
      option: '--router-d1-binding',
    },
  ],
  [
    'missing-shard-bindings',
    {
      category: 'd1-config',
      env: 'SMART_SUGGEST_D1_SHARD_BINDINGS',
      option: '--shard-bindings',
    },
  ],
  [
    'missing-shard-region-map-bindings',
    {
      category: 'd1-config',
      env: 'SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON',
      option: '--shard-region-map-json',
    },
  ],
  [
    'missing-expected-cz-vusc-shards',
    {
      category: 'd1-config',
      env: 'SMART_SUGGEST_D1_SHARD_BINDINGS + SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON',
      option: '--shard-bindings + --shard-region-map-json',
    },
  ],
]);
const stringOptionFields = {
  '--atom-entry-id': 'atomEntryId',
  '--attribution-label': 'attributionLabel',
  '--attribution-license': 'attributionLicense',
  '--attribution-url': 'attributionUrl',
  '--chunk-size': 'chunkSize',
  '--csv-delimiter': 'csvDelimiter',
  '--csv-encoding': 'csvEncoding',
  '--d1-target': 'd1Target',
  '--dataset-version': 'datasetVersion',
  '--feed-id': 'feedId',
  '--file-kind': 'fileKind',
  '--json-out': 'jsonOut',
  '--max-import-age-hours': 'maxImportAgeHours',
  '--modification-note': 'modificationNote',
  '--municipality-region-map-snapshot-checksum-sha256':
    'municipalityRegionMapSnapshotChecksumSha256',
  '--municipality-region-map-snapshot-entry': 'municipalityRegionMapSnapshotEntry',
  '--municipality-region-map-snapshot-path': 'municipalityRegionMapSnapshotPath',
  '--optimize-json-out': 'optimizeJsonOut',
  '--persist-to': 'persistTo',
  '--preflight-json-out': 'preflightJsonOut',
  '--router-d1-binding': 'routerD1Binding',
  '--shard-binding-prefix': 'shardBindingPrefix',
  '--shard-bindings': 'shardBindings',
  '--shard-region-map-json': 'shardRegionMapJson',
  '--snapshot-checksum-sha256': 'snapshotChecksumSha256',
  '--shard-max-rows': 'shardMaxRows',
  '--snapshot-entry': 'snapshotEntry',
  '--snapshot-format': 'snapshotFormat',
  '--snapshot-path': 'snapshotPath',
  '--snapshot-uri': 'snapshotUri',
  '--source-generated-at': 'sourceGeneratedAt',
  '--source-id': 'sourceId',
  '--source-uri': 'sourceUri',
  '--source-valid-at': 'sourceValidAt',
  '--source-version': 'sourceVersion',
  '--status-json-out': 'statusJsonOut',
  '--wrangler-config': 'wranglerConfig',
};

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/smart-suggest-production-seed.mjs [options]
  node scripts/smart-suggest-production-seed.mjs --execute [options]

Strict operator entrypoint for the Smart Suggest CZ production dataset seed.
It validates the official external snapshot, source metadata, source
attribution/modification-note provenance, D1 shard config, and then either
writes a public-safe plan report or, with --execute, runs the sharded D1 import,
D1-safe post-import optimization, and strict status checks.

Options:
  --execute                    Actually run the sharded D1 import. Default only plans.
  --allow-partial-shards       Allow fewer than all 14 CZ VUSC shards for local proof only.
  --skip-d1-preflight          Skip D1 config preflight. Not for production.
  --no-apply-migrations        Do not apply migrations before import.
  --d1-target remote           D1 target: remote or local.
  --snapshot-path path         External official snapshot path. May live outside git.
  --snapshot-checksum-sha256 value
                               Expected SHA-256 of the retained snapshot.
  --snapshot-uri uri           Retained snapshot URI recorded in lineage.
  --source-uri uri             Official source URI recorded in lineage.
  --dataset-version value      Dataset/import version.
  --source-version value       Official source version.
  --source-generated-at value  Official generated timestamp.
  --source-valid-at value      Official valid-at timestamp/date.
  --atom-entry-id value        Atom/feed entry id or stable source entry id.
  --municipality-region-map-snapshot-path path
                               External official RUIAN ST_UZSZ XML/ZIP hierarchy snapshot path.
  --municipality-region-map-snapshot-checksum-sha256 value
                               Expected SHA-256 of the retained hierarchy snapshot.
  --municipality-region-map-snapshot-entry value
                               Optional XML ZIP entry name or suffix for the hierarchy snapshot.
  --attribution-label value    Required source attribution label for the retained artifact.
  --attribution-license value  Required source attribution license for the retained artifact.
  --attribution-url value      Required source attribution URL for the retained artifact.
  --modification-note value    Required note describing Smart Suggest normalization.
  --feed-id RUIAN-CSV-ADR-ST   Feed id, defaults to official CSV baseline feed.
  --csv-delimiter ";"          Official CSV delimiter.
  --csv-encoding windows-1250  Official CSV text encoding.
  --shard-bindings value       Comma-separated shard binding allowlist.
  --shard-region-map-json value JSON object mapping VUSC region codes to shard bindings.
  --router-d1-binding value    Router D1 binding.
  --persist-to path            Optional local Wrangler D1 persistence directory.
  --optimize-json-out path     Public-safe post-import optimize report.
  --json-out path              Public-safe seed plan/result report.

Environment fallbacks:
  SMART_SUGGEST_RUIAN_SNAPSHOT_PATH
  SMART_SUGGEST_RUIAN_SNAPSHOT_CHECKSUM_SHA256
  SMART_SUGGEST_RUIAN_SNAPSHOT_URI
  SMART_SUGGEST_RUIAN_SOURCE_URI
  SMART_SUGGEST_RUIAN_DATASET_VERSION
  SMART_SUGGEST_RUIAN_SOURCE_VERSION
  SMART_SUGGEST_RUIAN_SOURCE_GENERATED_AT
  SMART_SUGGEST_RUIAN_SOURCE_VALID_AT
  SMART_SUGGEST_RUIAN_ATOM_ENTRY_ID
  SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH
  SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_CHECKSUM_SHA256
  SMART_SUGGEST_RUIAN_ATTRIBUTION_LABEL
  SMART_SUGGEST_RUIAN_ATTRIBUTION_LICENSE
  SMART_SUGGEST_RUIAN_ATTRIBUTION_URL
  SMART_SUGGEST_RUIAN_MODIFICATION_NOTE
  SMART_SUGGEST_D1_SHARD_BINDINGS
  SMART_SUGGEST_D1_ROUTER_BINDING or SMART_SUGGEST_ROUTER_D1_BINDING

If --shard-bindings and SMART_SUGGEST_D1_SHARD_BINDINGS are absent, the wrapper
uses SMART_SUGGEST_D1_SHARD_BINDINGS from the generated Wrangler vars, then
falls back to D1 bindings matching --shard-binding-prefix.
`);
}

function envValue(name) {
  const value = process.env[name]?.trim();

  return value === undefined || value === '' ? undefined : value;
}

function defaultArgs() {
  const execute = false;

  return {
    allowPartialShards: false,
    applyMigrations: true,
    atomEntryId: envValue('SMART_SUGGEST_RUIAN_ATOM_ENTRY_ID'),
    attributionLabel: envValue('SMART_SUGGEST_RUIAN_ATTRIBUTION_LABEL'),
    attributionLicense: envValue('SMART_SUGGEST_RUIAN_ATTRIBUTION_LICENSE'),
    attributionUrl: envValue('SMART_SUGGEST_RUIAN_ATTRIBUTION_URL'),
    chunkSize: '500',
    csvDelimiter: envValue('SMART_SUGGEST_RUIAN_CSV_DELIMITER') ?? ';',
    csvEncoding: envValue('SMART_SUGGEST_RUIAN_CSV_ENCODING') ?? 'windows-1250',
    d1Target: 'remote',
    datasetVersion: envValue('SMART_SUGGEST_RUIAN_DATASET_VERSION'),
    execute,
    feedId: envValue('SMART_SUGGEST_RUIAN_FEED_ID') ?? 'RUIAN-CSV-ADR-ST',
    fileKind: 'baseline',
    jsonOut: execute ? defaultExecuteReportPath : defaultSeedReportPath,
    maxImportAgeHours: '999999',
    modificationNote: envValue('SMART_SUGGEST_RUIAN_MODIFICATION_NOTE'),
    municipalityRegionMapSnapshotChecksumSha256: envValue(
      'SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_CHECKSUM_SHA256',
    ),
    municipalityRegionMapSnapshotEntry: undefined,
    municipalityRegionMapSnapshotPath: envValue('SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH'),
    optimizeJsonOut: defaultOptimizeReportPath,
    persistTo: undefined,
    preflightJsonOut: defaultPreflightReportPath,
    routerD1Binding:
      envValue('SMART_SUGGEST_D1_ROUTER_BINDING') ?? envValue('SMART_SUGGEST_ROUTER_D1_BINDING'),
    routerD1BindingSource:
      envValue('SMART_SUGGEST_D1_ROUTER_BINDING') !== undefined ||
      envValue('SMART_SUGGEST_ROUTER_D1_BINDING') !== undefined
        ? 'environment'
        : undefined,
    shardBindingPrefix: defaultShardBindingPrefix,
    shardBindings: envValue('SMART_SUGGEST_D1_SHARD_BINDINGS'),
    shardBindingsSource:
      envValue('SMART_SUGGEST_D1_SHARD_BINDINGS') !== undefined ? 'environment' : undefined,
    shardRegionMapJson: envValue('SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON'),
    shardRegionMapSource:
      envValue('SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON') !== undefined ? 'environment' : undefined,
    shardMaxRows: undefined,
    snapshotChecksumSha256: envValue('SMART_SUGGEST_RUIAN_SNAPSHOT_CHECKSUM_SHA256'),
    skipD1Preflight: false,
    snapshotEntry: undefined,
    snapshotFormat: 'auto',
    snapshotPath: envValue('SMART_SUGGEST_RUIAN_SNAPSHOT_PATH'),
    snapshotUri: envValue('SMART_SUGGEST_RUIAN_SNAPSHOT_URI'),
    sourceGeneratedAt: envValue('SMART_SUGGEST_RUIAN_SOURCE_GENERATED_AT'),
    sourceId: 'ruian-cz',
    sourceUri: envValue('SMART_SUGGEST_RUIAN_SOURCE_URI'),
    sourceValidAt: envValue('SMART_SUGGEST_RUIAN_SOURCE_VALID_AT'),
    sourceVersion: envValue('SMART_SUGGEST_RUIAN_SOURCE_VERSION'),
    statusJsonOut: defaultStatusReportPath,
    wranglerConfig: defaultWranglerConfigPath,
  };
}

function readRequiredOption(argv, index, arg) {
  const value = argv[index + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${arg} requires a value.`);
  }

  return value;
}

function parseArgs(argv) {
  const parsed = defaultArgs();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--execute') {
      parsed.execute = true;
      parsed.jsonOut =
        parsed.jsonOut === defaultSeedReportPath ? defaultExecuteReportPath : parsed.jsonOut;
      continue;
    }
    if (arg === '--allow-partial-shards') {
      parsed.allowPartialShards = true;
      continue;
    }
    if (arg === '--skip-d1-preflight') {
      parsed.skipD1Preflight = true;
      continue;
    }
    if (arg === '--no-apply-migrations') {
      parsed.applyMigrations = false;
      continue;
    }

    const field = stringOptionFields[arg];

    if (field === undefined) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    parsed[field] = readRequiredOption(argv, index, arg);
    if (field === 'routerD1Binding') {
      parsed.routerD1BindingSource = 'cli';
    }
    if (field === 'shardBindings') {
      parsed.shardBindingsSource = 'cli';
    }
    if (field === 'shardRegionMapJson') {
      parsed.shardRegionMapSource = 'cli';
    }
    index += 1;
  }

  if (parsed.help) {
    return parsed;
  }
  if (!d1Targets.has(parsed.d1Target)) {
    throw new Error('--d1-target must be local or remote.');
  }

  return parsed;
}

function parseCommaSeparated(value) {
  if (value === undefined) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseJsonObject(value, label) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = JSON.parse(value);

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed;
}

function parseShardRegionBindingMap(mapJson) {
  const parsed = parseJsonObject(mapJson, 'SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON');
  const map = new Map();

  if (parsed === undefined) {
    return map;
  }

  for (const [regionCode, bindingName] of Object.entries(parsed)) {
    const normalizedRegionCode = regionCode.trim();

    if (!/^\d+$/u.test(normalizedRegionCode)) {
      throw new Error(`Shard region map key must be a numeric VUSC code: ${regionCode}`);
    }
    if (typeof bindingName !== 'string' || bindingName.trim().length === 0) {
      throw new Error(`Shard region map value for ${regionCode} must be a binding name string.`);
    }

    map.set(normalizedRegionCode, bindingName.trim());
  }

  return map;
}

function sortRegionCodes(codes) {
  return [...new Set(codes)].toSorted(
    (left, right) => Number(left) - Number(right) || left.localeCompare(right),
  );
}

function resolveWorkspacePath(inputPath) {
  const absolutePath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(workspaceRoot, inputPath);

  if (absolutePath !== workspaceRoot && !absolutePath.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error(`Path must stay inside apps/smart-suggest: ${inputPath}`);
  }

  return absolutePath;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readOptionalWranglerConfig(configPath) {
  const absoluteConfigPath = resolveWorkspacePath(configPath);

  if (!fs.existsSync(absoluteConfigPath)) {
    return undefined;
  }

  return JSON.parse(fs.readFileSync(absoluteConfigPath, 'utf8'));
}

function databaseEntries(config) {
  return isRecord(config) && Array.isArray(config.d1_databases)
    ? config.d1_databases.filter(isRecord)
    : [];
}

function readConfigVar(config, name) {
  return isRecord(config?.vars) && typeof config.vars[name] === 'string'
    ? config.vars[name]
    : undefined;
}

function inferShardBindingsFromConfig(config, args) {
  const configured = readConfigVar(config, 'SMART_SUGGEST_D1_SHARD_BINDINGS');

  if (configured !== undefined) {
    return {
      shardBindings: configured,
      source: 'wrangler-config-var',
    };
  }

  const inferredBindings = databaseEntries(config)
    .map((entry) => entry.binding)
    .filter((binding) => typeof binding === 'string' && binding.startsWith(args.shardBindingPrefix))
    .toSorted((left, right) => left.localeCompare(right));

  if (inferredBindings.length === 0) {
    return undefined;
  }

  return {
    shardBindings: inferredBindings.join(','),
    source: 'wrangler-d1-bindings',
  };
}

function inferShardRegionMapFromConfig(config) {
  const configured = readConfigVar(config, 'SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON');

  if (configured === undefined) {
    return undefined;
  }

  return {
    shardRegionMapJson: configured,
    source: 'wrangler-config-var',
  };
}

function resolveD1BindingsFromConfig(args) {
  const config = readOptionalWranglerConfig(args.wranglerConfig);

  if (config === undefined) {
    return {
      ...args,
      routerD1Binding: args.routerD1Binding ?? 'SMART_SUGGEST_ROUTER_D1',
      routerD1BindingSource: args.routerD1BindingSource ?? 'default',
    };
  }

  const routerD1Binding =
    args.routerD1Binding ??
    readConfigVar(config, 'SMART_SUGGEST_D1_ROUTER_BINDING') ??
    'SMART_SUGGEST_ROUTER_D1';
  const routerD1BindingSource =
    args.routerD1BindingSource ??
    (readConfigVar(config, 'SMART_SUGGEST_D1_ROUTER_BINDING') === undefined
      ? 'default'
      : 'wrangler-config-var');
  const inferredShardBindings =
    args.shardBindings === undefined ? inferShardBindingsFromConfig(config, args) : undefined;
  const inferredShardRegionMap =
    args.shardRegionMapJson === undefined ? inferShardRegionMapFromConfig(config) : undefined;

  return {
    ...args,
    routerD1Binding,
    routerD1BindingSource,
    shardBindings: args.shardBindings ?? inferredShardBindings?.shardBindings,
    shardBindingsSource: args.shardBindingsSource ?? inferredShardBindings?.source,
    shardRegionMapJson: args.shardRegionMapJson ?? inferredShardRegionMap?.shardRegionMapJson,
    shardRegionMapSource: args.shardRegionMapSource ?? inferredShardRegionMap?.source,
  };
}

function resolveExternalPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}

function reportPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(workspaceRoot, inputPath);
}

function writeReport(report, outPath) {
  if (outPath === undefined) {
    return;
  }

  const absoluteOut = reportPath(outPath);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, `${JSON.stringify(report, null, 2)}\n`);
}

function shellQuote(value) {
  const stringValue = value === undefined || value === null ? '<missing>' : String(value);

  if (/^[A-Za-z0-9_./:=-]+$/u.test(stringValue)) {
    return stringValue;
  }

  return `'${stringValue.replaceAll("'", "'\"'\"'")}'`;
}

function commandToShell(command) {
  return command.map((part) => shellQuote(part)).join(' ');
}

function normalizeSha256(value) {
  if (value === undefined) {
    return undefined;
  }

  const match = value.trim().match(/^(?:sha256:)?([a-f0-9]{64})$/iu);

  return match === null ? undefined : match[1].toLowerCase();
}

function hashFileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(1024 * 1024);

  try {
    for (;;) {
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);

      if (bytesRead === 0) {
        break;
      }

      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fd);
  }

  return hash.digest('hex');
}

function hashTextSha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeAttributionUrl(value) {
  return value.trim().replace(/\/+$/u, '');
}

function requireText(value, id, label) {
  if (value === undefined || value.trim().length === 0) {
    return {
      id,
      message: `${label} is required.`,
      status: 'error',
    };
  }

  return {
    id: `${id.replace(/^missing-/u, '')}-present`,
    status: 'ok',
  };
}

function validateSourceAttribution(args) {
  const expected = expectedSourceAttributions.get(args.sourceId);

  if (expected === undefined) {
    return {
      id: 'unsupported-production-source-attribution',
      message: `No strict attribution contract is configured for source ${args.sourceId}.`,
      status: 'error',
    };
  }

  if (
    args.attributionLabel === undefined ||
    args.attributionLicense === undefined ||
    args.attributionUrl === undefined
  ) {
    return {
      id: 'source-attribution-catalog-match-skipped',
      status: 'ok',
    };
  }

  const mismatches = [];

  if (args.attributionLabel.trim() !== expected.label) {
    mismatches.push('label');
  }
  if (args.attributionLicense.trim() !== expected.license) {
    mismatches.push('license');
  }
  if (normalizeAttributionUrl(args.attributionUrl) !== normalizeAttributionUrl(expected.url)) {
    mismatches.push('url');
  }

  if (mismatches.length > 0) {
    return {
      expected,
      id: 'source-attribution-catalog-mismatch',
      message: `Source attribution does not match the strict ${args.sourceId} catalog contract.`,
      mismatches,
      status: 'error',
    };
  }

  return {
    id: 'source-attribution-catalog-match',
    sourceId: args.sourceId,
    status: 'ok',
  };
}

function validateSnapshot(args) {
  const required = requireText(args.snapshotPath, 'missing-snapshot-path', '--snapshot-path');

  if (required.status === 'error') {
    return required;
  }

  const absoluteSnapshotPath = resolveExternalPath(args.snapshotPath);

  if (!fs.existsSync(absoluteSnapshotPath)) {
    return {
      id: 'snapshot-path-not-found',
      message: 'The external official snapshot path does not exist.',
      snapshotFileName: path.basename(absoluteSnapshotPath),
      status: 'error',
    };
  }

  return {
    id: 'snapshot-path-readable',
    snapshotFileName: path.basename(absoluteSnapshotPath),
    status: 'ok',
  };
}

function validateSnapshotChecksum(args) {
  const required = requireText(
    args.snapshotChecksumSha256,
    'missing-snapshot-checksum-sha256',
    '--snapshot-checksum-sha256',
  );

  if (required.status === 'error') {
    return required;
  }

  const expectedSha256 = normalizeSha256(args.snapshotChecksumSha256);

  if (expectedSha256 === undefined) {
    return {
      id: 'invalid-snapshot-checksum-sha256',
      message: '--snapshot-checksum-sha256 must be a SHA-256 hex value.',
      status: 'error',
    };
  }
  if (args.snapshotPath === undefined || args.snapshotPath.trim().length === 0) {
    return {
      expectedSha256,
      id: 'snapshot-checksum-not-computed',
      message: '--snapshot-checksum-sha256 requires --snapshot-path.',
      status: 'error',
    };
  }

  const absoluteSnapshotPath = resolveExternalPath(args.snapshotPath);

  if (!fs.existsSync(absoluteSnapshotPath)) {
    return {
      expectedSha256,
      id: 'snapshot-checksum-not-computed',
      message: 'The external official snapshot path does not exist.',
      snapshotFileName: path.basename(absoluteSnapshotPath),
      status: 'error',
    };
  }

  const actualSha256 = hashFileSha256(absoluteSnapshotPath);

  if (actualSha256 !== expectedSha256) {
    return {
      actualSha256,
      expectedSha256,
      id: 'snapshot-checksum-mismatch',
      message: 'The external official snapshot checksum does not match the expected value.',
      snapshotFileName: path.basename(absoluteSnapshotPath),
      status: 'error',
    };
  }

  return {
    checksumSha256: actualSha256,
    expectedSha256,
    id: 'snapshot-checksum-verified',
    snapshotFileName: path.basename(absoluteSnapshotPath),
    status: 'ok',
  };
}

function validateRegionMapSnapshot(args) {
  const required = requireText(
    args.municipalityRegionMapSnapshotPath,
    'missing-region-map-snapshot-path',
    '--municipality-region-map-snapshot-path',
  );

  if (required.status === 'error') {
    return required;
  }

  const absoluteSnapshotPath = resolveExternalPath(args.municipalityRegionMapSnapshotPath);

  if (!fs.existsSync(absoluteSnapshotPath)) {
    return {
      id: 'region-map-snapshot-path-not-found',
      message: 'The external official hierarchy snapshot path does not exist.',
      snapshotFileName: path.basename(absoluteSnapshotPath),
      status: 'error',
    };
  }

  return {
    id: 'region-map-snapshot-path-readable',
    snapshotFileName: path.basename(absoluteSnapshotPath),
    status: 'ok',
  };
}

function validateRegionMapSnapshotChecksum(args) {
  const required = requireText(
    args.municipalityRegionMapSnapshotChecksumSha256,
    'missing-region-map-snapshot-checksum-sha256',
    '--municipality-region-map-snapshot-checksum-sha256',
  );

  if (required.status === 'error') {
    return required;
  }

  const expectedSha256 = normalizeSha256(args.municipalityRegionMapSnapshotChecksumSha256);

  if (expectedSha256 === undefined) {
    return {
      id: 'invalid-region-map-snapshot-checksum-sha256',
      message: '--municipality-region-map-snapshot-checksum-sha256 must be a SHA-256 hex value.',
      status: 'error',
    };
  }
  if (
    args.municipalityRegionMapSnapshotPath === undefined ||
    args.municipalityRegionMapSnapshotPath.trim().length === 0
  ) {
    return {
      expectedSha256,
      id: 'region-map-snapshot-checksum-not-computed',
      message:
        '--municipality-region-map-snapshot-checksum-sha256 requires --municipality-region-map-snapshot-path.',
      status: 'error',
    };
  }

  const absoluteSnapshotPath = resolveExternalPath(args.municipalityRegionMapSnapshotPath);

  if (!fs.existsSync(absoluteSnapshotPath)) {
    return {
      expectedSha256,
      id: 'region-map-snapshot-checksum-not-computed',
      message: 'The external official hierarchy snapshot path does not exist.',
      snapshotFileName: path.basename(absoluteSnapshotPath),
      status: 'error',
    };
  }

  const actualSha256 = hashFileSha256(absoluteSnapshotPath);

  if (actualSha256 !== expectedSha256) {
    return {
      actualSha256,
      expectedSha256,
      id: 'region-map-snapshot-checksum-mismatch',
      message:
        'The external official hierarchy snapshot checksum does not match the expected value.',
      snapshotFileName: path.basename(absoluteSnapshotPath),
      status: 'error',
    };
  }

  return {
    checksumSha256: actualSha256,
    expectedSha256,
    id: 'region-map-snapshot-checksum-verified',
    snapshotFileName: path.basename(absoluteSnapshotPath),
    status: 'ok',
  };
}

function regionCodeFromBinding(binding, prefix) {
  if (!binding.startsWith(prefix)) {
    return undefined;
  }

  const suffix = binding.slice(prefix.length);

  return /^\d+$/u.test(suffix) ? suffix : undefined;
}

function logicalCzVuscCoverage(args, bindings) {
  const shardRegionBindingMap = parseShardRegionBindingMap(args.shardRegionMapJson);
  const bindingSet = new Set(bindings);
  const missingMappedBindings = [
    ...new Set([...shardRegionBindingMap.values()].filter((binding) => !bindingSet.has(binding))),
  ].toSorted((left, right) => left.localeCompare(right));
  const directRegionCodes = bindings
    .map((binding) => regionCodeFromBinding(binding, args.shardBindingPrefix))
    .filter((code) => code !== undefined);
  const mappedRegionCodes =
    missingMappedBindings.length === 0 ? [...shardRegionBindingMap.keys()] : [];

  return {
    logicalRegionCodes: sortRegionCodes([...directRegionCodes, ...mappedRegionCodes]),
    missingMappedBindings,
    shardRegionBindingMap,
  };
}

function validateShardBindings(args) {
  const bindings = parseCommaSeparated(args.shardBindings);

  if (bindings.length === 0) {
    return {
      id: 'missing-shard-bindings',
      message:
        '--shard-bindings, SMART_SUGGEST_D1_SHARD_BINDINGS, or generated Wrangler shard config is required.',
      status: 'error',
    };
  }

  const coverage = logicalCzVuscCoverage(args, bindings);

  if (coverage.missingMappedBindings.length > 0) {
    return {
      configuredShardCount: bindings.length,
      id: 'missing-shard-region-map-bindings',
      message: 'Shard region map references bindings that are not configured.',
      missingBindings: coverage.missingMappedBindings,
      status: 'error',
    };
  }

  const regionCodes = new Set(coverage.logicalRegionCodes);
  const missingRegionCodes = expectedCzVuscCodes.filter((code) => !regionCodes.has(code));

  if (!args.allowPartialShards && missingRegionCodes.length > 0) {
    return {
      configuredShardCount: bindings.length,
      id: 'missing-expected-cz-vusc-shards',
      logicalRegionCodes: coverage.logicalRegionCodes,
      message: 'Production seeding requires all 14 CZ VUSC regions to be covered.',
      missingRegionCodes,
      status: 'error',
    };
  }

  return {
    configuredShardCount: bindings.length,
    id: 'shard-bindings-ready',
    logicalRegionCodes: coverage.logicalRegionCodes,
    logicalRegionCount: coverage.logicalRegionCodes.length,
    partialShardProof: args.allowPartialShards,
    source: args.shardBindingsSource ?? 'unknown',
    status: 'ok',
  };
}

function validationChecks(args) {
  return [
    validateSnapshot(args),
    validateSnapshotChecksum(args),
    requireText(args.sourceUri, 'missing-source-uri', '--source-uri'),
    requireText(args.snapshotUri, 'missing-snapshot-uri', '--snapshot-uri'),
    requireText(args.datasetVersion, 'missing-dataset-version', '--dataset-version'),
    requireText(args.sourceVersion, 'missing-source-version', '--source-version'),
    requireText(args.sourceGeneratedAt, 'missing-source-generated-at', '--source-generated-at'),
    requireText(args.sourceValidAt, 'missing-source-valid-at', '--source-valid-at'),
    requireText(args.atomEntryId, 'missing-atom-entry-id', '--atom-entry-id'),
    validateRegionMapSnapshot(args),
    validateRegionMapSnapshotChecksum(args),
    requireText(args.attributionLabel, 'missing-attribution-label', '--attribution-label'),
    requireText(args.attributionLicense, 'missing-attribution-license', '--attribution-license'),
    requireText(args.attributionUrl, 'missing-attribution-url', '--attribution-url'),
    validateSourceAttribution(args),
    requireText(args.modificationNote, 'missing-modification-note', '--modification-note'),
    requireText(args.routerD1Binding, 'missing-router-d1-binding', '--router-d1-binding'),
    validateShardBindings(args),
  ];
}

function hasErrors(checks) {
  return checks.some((check) => check.status === 'error');
}

function commonD1Args(args) {
  const command = [
    '--d1-target',
    args.d1Target,
    '--wrangler-config',
    args.wranglerConfig,
    '--router-d1-binding',
    args.routerD1Binding,
    '--shard-bindings',
    args.shardBindings,
  ];

  if (args.shardRegionMapJson !== undefined) {
    command.push('--shard-region-map-json', args.shardRegionMapJson);
  }
  if (args.persistTo !== undefined) {
    command.push('--persist-to', args.persistTo);
  }

  return command;
}

function preflightCommand(args) {
  const command = [
    process.execPath,
    './scripts/smart-suggest-d1-operations.mjs',
    'preflight',
    ...commonD1Args(args),
    '--json-out',
    args.preflightJsonOut,
  ];

  if (!args.allowPartialShards) {
    command.push('--require-14-cz-shards', '--require-cloudflare-ids');
  }

  return command;
}

function statusCommand(args) {
  const command = [
    process.execPath,
    './scripts/smart-suggest-d1-operations.mjs',
    'status',
    ...commonD1Args(args),
    '--execute-readonly',
    '--require-size-estimates',
    '--max-import-age-hours',
    args.maxImportAgeHours,
    '--json-out',
    args.statusJsonOut,
  ];

  if (!args.allowPartialShards) {
    command.push('--require-14-cz-shards', '--require-cloudflare-ids');
  }

  return command;
}

function optimizeCommand(args) {
  const command = [
    process.execPath,
    './scripts/smart-suggest-d1-operations.mjs',
    'optimize',
    ...commonD1Args(args),
    '--execute',
    '--json-out',
    args.optimizeJsonOut,
  ];

  if (!args.allowPartialShards) {
    command.push('--require-14-cz-shards', '--require-cloudflare-ids');
  }

  return command;
}

function importCommand(args) {
  const command = [
    process.execPath,
    './scripts/smart-suggest-owned-import.mjs',
    'import-sharded-d1',
    '--d1-target',
    args.d1Target,
    '--wrangler-config',
    args.wranglerConfig,
    '--router-d1-binding',
    args.routerD1Binding,
    '--shard-bindings',
    args.shardBindings,
    '--snapshot-path',
    args.snapshotPath,
    '--snapshot-format',
    args.snapshotFormat,
    '--expected-checksum-sha256',
    args.snapshotChecksumSha256,
    '--source-uri',
    args.sourceUri,
    '--snapshot-uri',
    args.snapshotUri,
    '--source-id',
    args.sourceId,
    '--dataset-version',
    args.datasetVersion,
    '--source-version',
    args.sourceVersion,
    '--source-generated-at',
    args.sourceGeneratedAt,
    '--source-valid-at',
    args.sourceValidAt,
    '--atom-entry-id',
    args.atomEntryId,
    '--municipality-region-map-snapshot-path',
    args.municipalityRegionMapSnapshotPath,
    '--municipality-region-map-snapshot-checksum-sha256',
    args.municipalityRegionMapSnapshotChecksumSha256,
    '--feed-id',
    args.feedId,
    '--file-kind',
    args.fileKind,
    '--csv-delimiter',
    args.csvDelimiter,
    '--csv-encoding',
    args.csvEncoding,
    '--chunk-size',
    args.chunkSize,
  ];

  if (args.shardRegionMapJson !== undefined) {
    command.push('--shard-region-map-json', args.shardRegionMapJson);
  }
  if (args.applyMigrations) {
    command.push('--apply-migrations');
  }
  if (args.persistTo !== undefined) {
    command.push('--persist-to', args.persistTo);
  }
  if (args.snapshotEntry !== undefined) {
    command.push('--snapshot-entry', args.snapshotEntry);
  }
  if (args.municipalityRegionMapSnapshotEntry !== undefined) {
    command.push(
      '--municipality-region-map-snapshot-entry',
      args.municipalityRegionMapSnapshotEntry,
    );
  }
  if (args.shardMaxRows !== undefined) {
    command.push('--shard-max-rows', args.shardMaxRows);
  }
  if (args.modificationNote !== undefined) {
    command.push('--modification-note-sha256', hashTextSha256(args.modificationNote));
  }

  return command;
}

function redactReportCommand(command) {
  const redacted = [...command];

  if (redacted[0] === process.execPath) {
    redacted[0] = 'node';
  }

  const snapshotIndex = redacted.indexOf('--snapshot-path');

  if (snapshotIndex >= 0 && redacted[snapshotIndex + 1] !== undefined) {
    redacted[snapshotIndex + 1] = '$SMART_SUGGEST_RUIAN_SNAPSHOT_PATH';
  }

  const regionMapSnapshotIndex = redacted.indexOf('--municipality-region-map-snapshot-path');

  if (regionMapSnapshotIndex >= 0 && redacted[regionMapSnapshotIndex + 1] !== undefined) {
    redacted[regionMapSnapshotIndex + 1] = '$SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH';
  }

  const persistIndex = redacted.indexOf('--persist-to');

  if (persistIndex >= 0 && redacted[persistIndex + 1] !== undefined) {
    redacted[persistIndex + 1] = '$SMART_SUGGEST_D1_PERSIST_TO';
  }

  return redacted;
}

function runCommand(command, label) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });

  if (result.error !== undefined) {
    return {
      error: result.error.message,
      exitCode: null,
      label,
      ok: false,
      signal: result.signal ?? null,
    };
  }

  return {
    exitCode: result.status,
    label,
    ok: result.status === 0,
    signal: result.signal ?? null,
  };
}

function missingOperatorInputs(checks) {
  return checks
    .filter((check) => check.status === 'error')
    .map((check) => {
      const contract = checkInputContracts.get(check.id);

      return {
        category: contract?.category ?? 'seed',
        env: contract?.env ?? null,
        id: check.id,
        message: check.message ?? 'Operator input is invalid or missing.',
        option: contract?.option ?? null,
      };
    });
}

function operatorBlockingStages(stage, execution) {
  const stages = [];

  if (execution.preflight?.ok === false) {
    stages.push({
      category: 'd1-config',
      id: 'd1-preflight-failed',
      message:
        'Production D1 preflight did not pass. Inspect the D1 preflight report before importing.',
      reportPath: execution.preflight.reportPath ?? null,
    });
  }
  if (execution.import?.ok === false) {
    stages.push({
      category: 'import',
      id: 'import-failed',
      message: 'The sharded production import failed before post-import optimization.',
    });
  }
  if (execution.optimize?.ok === false) {
    stages.push({
      category: 'd1-optimization',
      id: 'optimize-failed',
      message: 'Post-import D1 optimization failed.',
      reportPath: execution.optimize.reportPath ?? null,
    });
  }
  if (execution.status?.ok === false) {
    stages.push({
      category: 'd1-status',
      id: 'status-failed',
      message: 'Strict post-import D1 status checks failed.',
      reportPath: execution.status.reportPath ?? null,
    });
  }
  if (stage === 'd1-preflight-failed' && stages.length === 0) {
    stages.push({
      category: 'd1-config',
      id: 'd1-preflight-failed',
      message: 'Production D1 preflight failed before import.',
      reportPath: null,
    });
  }

  return stages;
}

function operatorReadinessStatus({ blockingStages, missingInputs, stage }) {
  if (missingInputs.length > 0 || blockingStages.length > 0) {
    return 'blocked';
  }
  if (stage === 'executed') {
    return 'completed';
  }

  return 'ready';
}

function createOperatorReadiness(args, checks, stage, execution) {
  const blockingStages = operatorBlockingStages(stage, execution);
  const missingInputs = missingOperatorInputs(checks);

  return {
    blockingStages,
    commandMatrix: {
      buildGeneratedConfig: 'pnpm cloudflare:build',
      d1ProvisionPlan: 'pnpm smart-suggest:d1:provision-plan',
      d1ShardEnvTemplate: 'pnpm smart-suggest:d1:cz-shards:template',
      optimizeProduction: 'pnpm smart-suggest:d1:optimize:production',
      seedExecute: 'pnpm smart-suggest:seed:production:execute',
      seedPlan: 'pnpm smart-suggest:seed:production',
      statusProduction: 'pnpm smart-suggest:d1:status:production',
      strictD1Preflight: 'pnpm smart-suggest:d1:preflight:production',
    },
    d1Target: args.d1Target,
    missingInputs,
    optionalEnvironment: productionSeedOptionalEnvironment,
    profile: 'smart-suggest-production-seed-readiness-v1',
    requiredEnvironment: productionSeedRequiredEnvironment,
    status: operatorReadinessStatus({
      blockingStages,
      missingInputs,
      stage,
    }),
  };
}

function createReport(args, checks, stage, execution = {}) {
  const snapshotPath =
    args.snapshotPath === undefined ? undefined : resolveExternalPath(args.snapshotPath);
  const regionMapSnapshotPath =
    args.municipalityRegionMapSnapshotPath === undefined
      ? undefined
      : resolveExternalPath(args.municipalityRegionMapSnapshotPath);
  const importCommandValue = importCommand(args);
  const expectedChecksumSha256 = normalizeSha256(args.snapshotChecksumSha256) ?? null;
  const expectedRegionMapChecksumSha256 =
    normalizeSha256(args.municipalityRegionMapSnapshotChecksumSha256) ?? null;
  const checksumCheck = checks.find((check) =>
    ['snapshot-checksum-mismatch', 'snapshot-checksum-verified'].includes(check.id),
  );
  const regionMapChecksumCheck = checks.find((check) =>
    ['region-map-snapshot-checksum-mismatch', 'region-map-snapshot-checksum-verified'].includes(
      check.id,
    ),
  );
  const actualChecksumSha256 = checksumCheck?.actualSha256 ?? checksumCheck?.checksumSha256 ?? null;
  const actualRegionMapChecksumSha256 =
    regionMapChecksumCheck?.actualSha256 ?? regionMapChecksumCheck?.checksumSha256 ?? null;
  const commandFailed = Object.values(execution).some((result) => result?.ok === false);
  const shardBindings = parseCommaSeparated(args.shardBindings);
  const shardCoverage = logicalCzVuscCoverage(args, shardBindings);

  return {
    allowPartialShards: args.allowPartialShards,
    applyMigrations: args.applyMigrations,
    checks,
    commands: {
      import: commandToShell(redactReportCommand(importCommandValue)),
      optimize: commandToShell(redactReportCommand(optimizeCommand(args))),
      preflight: commandToShell(redactReportCommand(preflightCommand(args))),
      status: commandToShell(redactReportCommand(statusCommand(args))),
    },
    d1Target: args.d1Target,
    execute: args.execute,
    execution,
    generatedAt: new Date().toISOString(),
    operatorReadiness: createOperatorReadiness(args, checks, stage, execution),
    shardBindingCount: shardBindings.length,
    shardBindingsSource: args.shardBindingsSource ?? null,
    shardLogicalCzVuscCodes: shardCoverage.logicalRegionCodes,
    shardLogicalCzVuscCount: shardCoverage.logicalRegionCodes.length,
    shardRegionBindingMap: Object.fromEntries(shardCoverage.shardRegionBindingMap.entries()),
    shardRegionMapSource: args.shardRegionMapSource ?? null,
    routerD1BindingSource: args.routerD1BindingSource ?? null,
    snapshot: {
      exists: snapshotPath === undefined ? false : fs.existsSync(snapshotPath),
      fileName: snapshotPath === undefined ? null : path.basename(snapshotPath),
      pathRedacted: snapshotPath === undefined ? false : true,
      checksumSha256: actualChecksumSha256 ?? expectedChecksumSha256,
      checksumVerified: checksumCheck?.id === 'snapshot-checksum-verified',
      snapshotUri: args.snapshotUri ?? null,
      sourceUri: args.sourceUri ?? null,
    },
    municipalityRegionMapSnapshot: {
      checksumSha256: actualRegionMapChecksumSha256 ?? expectedRegionMapChecksumSha256,
      checksumVerified: regionMapChecksumCheck?.id === 'region-map-snapshot-checksum-verified',
      exists: regionMapSnapshotPath === undefined ? false : fs.existsSync(regionMapSnapshotPath),
      fileName: regionMapSnapshotPath === undefined ? null : path.basename(regionMapSnapshotPath),
      pathRedacted: regionMapSnapshotPath === undefined ? false : true,
      selectedEntryName: args.municipalityRegionMapSnapshotEntry ?? null,
    },
    source: {
      atomEntryId: args.atomEntryId ?? null,
      attribution: {
        label: args.attributionLabel ?? null,
        license: args.attributionLicense ?? null,
        url: args.attributionUrl ?? null,
      },
      datasetVersion: args.datasetVersion ?? null,
      feedId: args.feedId,
      fileKind: args.fileKind,
      modificationNote:
        args.modificationNote === undefined
          ? {
              present: false,
              redacted: true,
            }
          : {
              present: true,
              redacted: true,
              sha256: hashTextSha256(args.modificationNote),
            },
      sourceGeneratedAt: args.sourceGeneratedAt ?? null,
      sourceId: args.sourceId,
      sourceValidAt: args.sourceValidAt ?? null,
      sourceVersion: args.sourceVersion ?? null,
    },
    stage,
    status:
      hasErrors(checks) || commandFailed ? 'blocked' : stage === 'executed' ? 'completed' : 'ready',
    strictProductionChecks: !args.allowPartialShards,
  };
}

function run() {
  const parsedArgs = parseArgs(process.argv.slice(2));

  if (parsedArgs.help) {
    printHelp();
    return;
  }

  resolveWorkspacePath(parsedArgs.wranglerConfig);
  const args = resolveD1BindingsFromConfig(parsedArgs);
  const checks = validationChecks(args);
  const report = createReport(args, checks, 'planned');

  if (hasErrors(checks)) {
    writeReport(report, args.jsonOut);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const execution = {};

  if (!args.skipD1Preflight) {
    execution.preflight = {
      ...runCommand(preflightCommand(args), 'D1 production seed preflight'),
      reportPath: args.preflightJsonOut,
    };

    if (!execution.preflight.ok) {
      const preflightFailedReport = createReport(args, checks, 'd1-preflight-failed', execution);
      writeReport(preflightFailedReport, args.jsonOut);
      process.stdout.write(`${JSON.stringify(preflightFailedReport, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
  }

  if (!args.execute) {
    const plannedReport = createReport(args, checks, 'planned', execution);
    writeReport(plannedReport, args.jsonOut);
    process.stdout.write(`${JSON.stringify(plannedReport, null, 2)}\n`);
    return;
  }

  execution.import = runCommand(
    importCommand(args),
    'Smart Suggest sharded production seed import',
  );
  if (!execution.import.ok) {
    const importFailedReport = createReport(args, checks, 'import-failed', execution);
    writeReport(importFailedReport, args.jsonOut);
    process.stdout.write(`${JSON.stringify(importFailedReport, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  execution.optimize = runCommand(
    optimizeCommand(args),
    'Smart Suggest sharded production seed optimize',
  );
  execution.optimize.reportPath = args.optimizeJsonOut;
  if (!execution.optimize.ok) {
    const optimizeFailedReport = createReport(args, checks, 'optimize-failed', execution);
    writeReport(optimizeFailedReport, args.jsonOut);
    process.stdout.write(`${JSON.stringify(optimizeFailedReport, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  execution.status = runCommand(
    statusCommand(args),
    'Smart Suggest sharded production seed status',
  );
  execution.status.reportPath = args.statusJsonOut;
  if (!execution.status.ok) {
    const statusFailedReport = createReport(args, checks, 'status-failed', execution);
    writeReport(statusFailedReport, args.jsonOut);
    process.stdout.write(`${JSON.stringify(statusFailedReport, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const completedReport = createReport(args, checks, 'executed', execution);
  writeReport(completedReport, args.jsonOut);
  process.stdout.write(`${JSON.stringify(completedReport, null, 2)}\n`);
}

try {
  run();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
