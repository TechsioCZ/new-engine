#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInflateRaw } from 'node:zlib';
import {
  applyWranglerD1Migrations,
  createWranglerD1Binding,
} from './smart-suggest-wrangler-d1-binding.mjs';
import { runCliEffectAsPromise } from './effect-runtime.mjs';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(workspaceRoot, '../..');
const lineSplitPattern = /\r?\n/u;
const defaultFixturePath = 'scripts/fixtures/synthetic-k-louzi-1258-12.jsonl';
const defaultWranglerConfigPath = 'apps/shell-super-app/.output/wrangler.json';
const defaultScenarioId = 'k-louzi-1258-12';
const defaultScenarioQuery = 'K Louži 1258/12';
const defaultExpectedLabel = 'K Louži 1258/12';
const smartSuggestD1MigrationsSource = path.resolve(
  repositoryRoot,
  'libs/smart-suggest/storage/drizzle',
);
const d1Targets = new Set(['local', 'preview', 'remote']);
const officialSnapshotFormats = new Set(['auto', 'csv', 'zip']);
const ruianFeedIds = new Set(['RUIAN-CSV-ADR-ST', 'RUIAN-S-ZA-U', 'RUIAN-S-ZA-Z']);
const ruianFileKinds = new Set(['baseline', 'delta']);
const d1SearchIndexModes = new Set(['fts-and-prefix', 'fts-only']);
const shardRouteStrategies = new Set(['hash', 'vusc']);
const zipEndOfCentralDirectorySignature = 0x06_05_4b_50;
const zipCentralDirectorySignature = 0x02_01_4b_50;
const zipLocalFileHeaderSignature = 0x04_03_4b_50;
const maxZipEndOfCentralDirectorySearchBytes = 66_000;
const shardStorageEstimateFloorBytes = 64 * 1024;
const shardStorageEstimateMultiplier = 4;
const shardStorageEstimateRowFloorBytes = 512;
const ftsOnlyShardStorageEstimateRowBytes = 1_100;
const shardHashModulus = 2_147_483_647;
const rawSqlFailureDetailPattern = /Failed query:|params:/u;
const csvZipEntryPattern = /\.(csv|txt)$/iu;
const xmlZipEntryPattern = /\.xml$/iu;
const vfrVuscRecordBlockPattern = /<vf:Vusc\b[^>]*gml:id="VC\.[^"]+"[\s\S]*?<\/vf:Vusc>/gu;
const vfrOkresBlockPattern = /<vf:Okres\b[\s\S]*?<\/vf:Okres>/gu;
const vfrObecBlockPattern = /<vf:Obec\b[\s\S]*?<\/vf:Obec>/gu;
const xmlEntityPattern = /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/giu;
const addressPartKeys = new Set([
  'city',
  'countryCode',
  'district',
  'houseNumber',
  'line1',
  'line2',
  'orientationNumber',
  'postalCode',
  'region',
  'street',
]);
const addressRowKeys = new Set(['id', 'latitude', 'longitude', 'parts', 'quality']);

function sanitizeCliErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (rawSqlFailureDetailPattern.test(message)) {
    return 'Smart Suggest import failed during D1 SQL execution.';
  }

  return message.length > 1_000 ? `${message.slice(0, 1_000)}...` : message;
}

const stringOptionFields = {
  '--country': 'country',
  '--dataset-version': 'datasetVersion',
  '--d1-binding': 'd1Binding',
  '--d1-target': 'd1Target',
  '--expected-checksum-sha256': 'expectedChecksumSha256',
  '--expect-label-contains': 'expectedLabel',
  '--fixture': 'fixture',
  '--atom-entry-id': 'atomEntryId',
  '--csv-delimiter': 'csvDelimiter',
  '--csv-encoding': 'csvEncoding',
  '--feed-id': 'feedId',
  '--file-kind': 'fileKind',
  '--modification-note-sha256': 'modificationNoteSha256',
  '--municipality-region-map-path': 'municipalityRegionMapPath',
  '--municipality-region-map-snapshot-checksum-sha256':
    'municipalityRegionMapSnapshotChecksumSha256',
  '--municipality-region-map-snapshot-entry': 'municipalityRegionMapSnapshotEntry',
  '--municipality-region-map-snapshot-path': 'municipalityRegionMapSnapshotPath',
  '--out': 'out',
  '--persist-to': 'persistTo',
  '--previous-atom-entry-id': 'previousAtomEntryId',
  '--query': 'query',
  '--artifact-out-dir': 'artifactOutDir',
  '--region': 'region',
  '--repository': 'repository',
  '--router-d1-binding': 'routerD1Binding',
  '--scenario-id': 'scenarioId',
  '--search-index-mode': 'searchIndexMode',
  '--shard-route-strategy': 'shardRouteStrategy',
  '--shard-binding-prefix': 'shardBindingPrefix',
  '--shard-bindings': 'shardBindings',
  '--shard-region-map-json': 'shardRegionMapJson',
  '--snapshot-entry': 'snapshotEntry',
  '--snapshot-format': 'snapshotFormat',
  '--snapshot-path': 'snapshotPath',
  '--snapshot-uri': 'snapshotUri',
  '--source-generated-at': 'sourceGeneratedAt',
  '--source-id': 'sourceId',
  '--source-name': 'sourceName',
  '--source-uri': 'sourceUri',
  '--source-valid-at': 'sourceValidAt',
  '--source-version': 'sourceVersion',
  '--wrangler-config': 'wranglerConfig',
};
const numberOptionFields = {
  '--artifact-max-file-size-bytes': 'artifactMaxFileSizeBytes',
  '--artifact-max-token-length': 'artifactMaxTokenLength',
  '--artifact-min-token-length': 'artifactMinTokenLength',
  '--artifact-page-size': 'artifactPageSize',
  '--artifact-record-shard-count': 'artifactRecordShardCount',
  '--artifact-token-bucket-count': 'artifactTokenBucketCount',
  '--chunk-size': 'chunkSize',
  '--limit': 'limit',
  '--max-rows': 'maxRows',
  '--shard-max-estimated-size-bytes': 'shardMaxEstimatedSizeBytes',
  '--shard-max-rows': 'shardMaxRows',
};
const booleanOptionFields = {
  '--allow-partial-artifact': 'allowPartialArtifact',
  '--apply-migrations': 'applyMigrations',
  '--route-plan-only': 'routePlanOnly',
};

function printHelp() {
  process.stdout.write(`Usage:
	  node scripts/smart-suggest-owned-import.mjs import-local [--fixture fixture.jsonl] [--out proof.json]
	  node scripts/smart-suggest-owned-import.mjs proof-offline [--fixture fixture.jsonl] [--out proof.json]
	  node scripts/smart-suggest-owned-import.mjs import-d1 [--d1-target local|remote|preview] [--apply-migrations]
	  node scripts/smart-suggest-owned-import.mjs import-sharded-d1 --snapshot-path file.csv [--apply-migrations]
	  node scripts/smart-suggest-owned-import.mjs build-artifacts --snapshot-path file.zip --artifact-out-dir .codex/artifacts/smart-suggest-owned-data

Imports normalized AddressSnapshotRow JSON or JSONL fixtures, or streams an
external official RUIAN-style CSV/ZIP snapshot into an in-memory Smart Suggest
repository or the configured Cloudflare D1 database. Production snapshots must
stay outside git and be referenced with --source-uri and optional --snapshot-uri.
The proof mode searches the imported fixture or snapshot without calling live
providers.

Options:
  --repository memory           Repository mode for import-local/proof-offline
  --source-id ruian-cz          Source catalog id for permanent import policy
  --dataset-version local-proof Dataset version for import run metadata
  --country CZ                 Import shard country
  --region value               Optional source region
  --source-name value          Optional source display name override
  --snapshot-uri value         Optional source snapshot URI metadata
  --snapshot-path path         External official RUIAN CSV/ZIP snapshot path
  --snapshot-format auto       Snapshot format: auto, csv, or zip
  --snapshot-entry name        ZIP entry name or suffix to read when ZIP has many files
  --source-uri value           Official source file/feed URI recorded in import lineage
  --expected-checksum-sha256 value
                               Optional expected SHA-256 for the official snapshot
  --source-version value       Official source version recorded in import lineage
  --source-generated-at value  Official source generated timestamp metadata
  --source-valid-at value      Official source valid-at date metadata
  --modification-note-sha256 value
                               SHA-256 of the Smart Suggest normalization modification note
  --municipality-region-map-snapshot-path path
                               External official RUIAN ST_UZSZ XML/ZIP hierarchy snapshot path
  --municipality-region-map-snapshot-checksum-sha256 value
                               Optional expected SHA-256 for the hierarchy snapshot
  --municipality-region-map-snapshot-entry name
                               Optional XML ZIP entry name or suffix for the hierarchy snapshot
  --municipality-region-map-path path
                               External JSON map of municipality code to VUSC code
  --atom-entry-id value        Atom entry id for the discovered official source file
  --previous-atom-entry-id value
                               Expected previous Atom entry id for delta continuity
  --feed-id RUIAN-CSV-ADR-ST   Feed id for official CSV baseline imports
  --file-kind baseline         Import file kind metadata: baseline or delta
  --csv-delimiter ";"          CSV delimiter for official snapshots
  --csv-encoding utf-8         CSV text encoding for official snapshots
  --max-rows value             Optional bounded proof import row limit
  --chunk-size 500             Import chunk size
  --limit 5                    Proof search result limit
  --scenario-id value          Proof scenario id
  --query value                Proof query; never written to output artifacts
  --expect-label-contains text Required label fragment for proof mode
	  --out path                   Optional JSON output path
	  --artifact-out-dir path      App-relative output directory for static owned-data artifacts
	  --artifact-max-file-size-bytes 26214400
	                             Abort when one generated artifact exceeds this byte ceiling
	  --artifact-page-size 50      Address-token artifact records per page
	  --artifact-min-token-length 2
	  --artifact-max-token-length 8
	  --artifact-record-shard-count 2048
	  --artifact-token-bucket-count 4096
	  --allow-partial-artifact     Allow --max-rows artifact proofs; never use for production

D1 options:
  --d1-target local             Cloudflare D1 target: local, remote, or preview
  --d1-binding SMART_SUGGEST_D1 Wrangler D1 binding/name from generated config
  --wrangler-config path        Defaults to apps/shell-super-app/.output/wrangler.json
  --persist-to path             Optional Wrangler local D1 persistence directory
  --apply-migrations            Sync and apply configured D1 migrations before import
  --search-index-mode value     D1 address index mode: fts-and-prefix or fts-only
  --shard-route-strategy value  Sharded import route strategy: vusc or hash
  --router-d1-binding value     Router D1 binding for shard metadata
  --shard-bindings value        Comma-separated shard binding allowlist
  --shard-binding-prefix value  Defaults to SMART_SUGGEST_CZ_VUSC_
  --shard-region-map-json value JSON object mapping VUSC region codes to shard bindings
  --shard-max-estimated-size-bytes value
                               Abort if one shard route exceeds this estimated D1 storage size
  --shard-max-rows value        Abort sharded import if one shard route exceeds this row count
  --route-plan-only             Parse and route the snapshot, then report shard sizes without D1 writes
`);
}

function envValue(name) {
  const value = process.env[name]?.trim();

  return value === undefined || value === '' ? undefined : value;
}

function hashTextSha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function envModificationNoteSha256() {
  const explicitHash = envValue('SMART_SUGGEST_RUIAN_MODIFICATION_NOTE_SHA256');

  if (explicitHash !== undefined) {
    return explicitHash;
  }

  const note = envValue('SMART_SUGGEST_RUIAN_MODIFICATION_NOTE');

  return note === undefined ? undefined : hashTextSha256(note);
}

function defaultArgs(command) {
  return {
    allowPartialArtifact: false,
    applyMigrations: false,
    artifactMaxFileSizeBytes: 25 * 1024 * 1024,
    artifactMaxTokenLength: 8,
    artifactMinTokenLength: 2,
    artifactOutDir: '.codex/artifacts/smart-suggest-owned-data',
    artifactPageSize: 50,
    artifactRecordShardCount: 2048,
    artifactTokenBucketCount: 4096,
    chunkSize: 500,
    command,
    country: 'CZ',
    d1Binding: envValue('SMART_SUGGEST_D1_BINDING') ?? 'SMART_SUGGEST_D1',
    d1Target: 'local',
    datasetVersion: envValue('SMART_SUGGEST_RUIAN_DATASET_VERSION') ?? 'local-proof',
    expectedChecksumSha256: envValue('SMART_SUGGEST_RUIAN_SNAPSHOT_CHECKSUM_SHA256'),
    expectedLabel: defaultExpectedLabel,
    fixture: defaultFixturePath,
    atomEntryId: envValue('SMART_SUGGEST_RUIAN_ATOM_ENTRY_ID'),
    csvDelimiter: envValue('SMART_SUGGEST_RUIAN_CSV_DELIMITER') ?? ';',
    csvEncoding: envValue('SMART_SUGGEST_RUIAN_CSV_ENCODING') ?? 'utf-8',
    feedId: envValue('SMART_SUGGEST_RUIAN_FEED_ID'),
    fileKind: 'baseline',
    limit: 5,
    maxRows: undefined,
    modificationNoteSha256: envModificationNoteSha256(),
    municipalityRegionMapPath: envValue('SMART_SUGGEST_RUIAN_MUNICIPALITY_REGION_MAP_PATH'),
    municipalityRegionMapSnapshotChecksumSha256: envValue(
      'SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_CHECKSUM_SHA256',
    ),
    municipalityRegionMapSnapshotEntry: undefined,
    municipalityRegionMapSnapshotPath: envValue('SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH'),
    out: undefined,
    persistTo: undefined,
    previousAtomEntryId: undefined,
    query: defaultScenarioQuery,
    region: undefined,
    repository: ['import-d1', 'import-sharded-d1'].includes(command) ? 'd1' : 'memory',
    routePlanOnly: false,
    routerD1Binding:
      envValue('SMART_SUGGEST_D1_ROUTER_BINDING') ??
      envValue('SMART_SUGGEST_ROUTER_D1_BINDING') ??
      'SMART_SUGGEST_ROUTER_D1',
    scenarioId: defaultScenarioId,
    searchIndexMode: envValue('SMART_SUGGEST_D1_SEARCH_INDEX_MODE') ?? 'fts-and-prefix',
    shardRouteStrategy: envValue('SMART_SUGGEST_D1_SHARD_ROUTE_STRATEGY') ?? 'vusc',
    shardBindingPrefix: 'SMART_SUGGEST_CZ_VUSC_',
    shardBindings: envValue('SMART_SUGGEST_D1_SHARD_BINDINGS'),
    shardMaxEstimatedSizeBytes: undefined,
    shardRegionMapJson: envValue('SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON'),
    shardMaxRows: undefined,
    snapshotEntry: undefined,
    snapshotFormat: 'auto',
    snapshotPath: envValue('SMART_SUGGEST_RUIAN_SNAPSHOT_PATH'),
    snapshotUri: envValue('SMART_SUGGEST_RUIAN_SNAPSHOT_URI'),
    sourceGeneratedAt: envValue('SMART_SUGGEST_RUIAN_SOURCE_GENERATED_AT'),
    sourceId: 'ruian-cz',
    sourceName: envValue('SMART_SUGGEST_RUIAN_SOURCE_NAME'),
    sourceUri: envValue('SMART_SUGGEST_RUIAN_SOURCE_URI'),
    sourceValidAt: envValue('SMART_SUGGEST_RUIAN_SOURCE_VALID_AT'),
    sourceVersion: envValue('SMART_SUGGEST_RUIAN_SOURCE_VERSION'),
    wranglerConfig: defaultWranglerConfigPath,
  };
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function normalizeSha256(value) {
  if (value === undefined) {
    return undefined;
  }

  const match = value.trim().match(/^(?:sha256:)?([a-f0-9]{64})$/iu);

  return match === null ? undefined : match[1].toLowerCase();
}

function applyOption(parsed, arg, next) {
  const stringField = stringOptionFields[arg];
  const numberField = numberOptionFields[arg];
  const booleanField = booleanOptionFields[arg];

  if (booleanField !== undefined) {
    parsed[booleanField] = true;
    return false;
  }
  if (stringField === undefined && numberField === undefined) {
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (next === undefined || next.startsWith('--')) {
    throw new Error(`${arg} requires a value.`);
  }
  if (stringField !== undefined) {
    parsed[stringField] = next;
    if (stringField === 'fixture') {
      parsed.atomEntryId = undefined;
      parsed.expectedChecksumSha256 = undefined;
      parsed.feedId = undefined;
      parsed.modificationNoteSha256 = undefined;
      parsed.snapshotPath = undefined;
      parsed.sourceGeneratedAt = undefined;
      parsed.sourceUri = undefined;
      parsed.sourceValidAt = undefined;
      parsed.sourceVersion = undefined;
    }
  }
  if (numberField !== undefined) {
    parsed[numberField] = parsePositiveInteger(next, arg);
  }

  return true;
}

function assertOfficialSnapshotArgs(parsed) {
  if (!officialSnapshotFormats.has(parsed.snapshotFormat)) {
    throw new Error('--snapshot-format must be auto, csv, or zip.');
  }
  if (parsed.feedId !== undefined && !ruianFeedIds.has(parsed.feedId)) {
    throw new Error('--feed-id must be RUIAN-CSV-ADR-ST, RUIAN-S-ZA-U, or RUIAN-S-ZA-Z.');
  }
  if (!ruianFileKinds.has(parsed.fileKind)) {
    throw new Error('--file-kind must be baseline or delta.');
  }
  if (parsed.csvDelimiter.length !== 1) {
    throw new Error('--csv-delimiter must be exactly one character.');
  }
  if (parsed.snapshotPath !== undefined && parsed.sourceUri === undefined) {
    throw new Error('--snapshot-path requires --source-uri for import-run source lineage.');
  }
  if (parsed.expectedChecksumSha256 !== undefined) {
    if (parsed.snapshotPath === undefined) {
      throw new Error('--expected-checksum-sha256 requires --snapshot-path.');
    }
    if (normalizeSha256(parsed.expectedChecksumSha256) === undefined) {
      throw new Error('--expected-checksum-sha256 must be a SHA-256 hex value.');
    }
  }
  if (
    parsed.modificationNoteSha256 !== undefined &&
    normalizeSha256(parsed.modificationNoteSha256) === undefined
  ) {
    throw new Error('--modification-note-sha256 must be a SHA-256 hex value.');
  }
  if (
    parsed.municipalityRegionMapPath !== undefined &&
    parsed.municipalityRegionMapSnapshotPath !== undefined
  ) {
    throw new Error(
      '--municipality-region-map-path and --municipality-region-map-snapshot-path are mutually exclusive.',
    );
  }
  if (parsed.municipalityRegionMapSnapshotChecksumSha256 !== undefined) {
    if (parsed.municipalityRegionMapSnapshotPath === undefined) {
      throw new Error(
        '--municipality-region-map-snapshot-checksum-sha256 requires --municipality-region-map-snapshot-path.',
      );
    }
    if (normalizeSha256(parsed.municipalityRegionMapSnapshotChecksumSha256) === undefined) {
      throw new Error(
        '--municipality-region-map-snapshot-checksum-sha256 must be a SHA-256 hex value.',
      );
    }
  }
}

function assertParsedArgs(parsed) {
  if (parsed.help) {
    return;
  }
  if (
    ![
      'build-artifacts',
      'import-d1',
      'import-local',
      'import-sharded-d1',
      'proof-offline',
    ].includes(parsed.command ?? '')
  ) {
    throw new Error(
      'Command must be import-local, proof-offline, import-d1, import-sharded-d1, or build-artifacts.',
    );
  }

  assertOfficialSnapshotArgs(parsed);

  if (parsed.command === 'import-d1' || parsed.command === 'import-sharded-d1') {
    if (parsed.repository !== 'd1') {
      throw new Error(`${parsed.command} requires --repository d1.`);
    }
    if (!d1Targets.has(parsed.d1Target)) {
      throw new Error('--d1-target must be local, remote, or preview.');
    }
    if (!d1SearchIndexModes.has(parsed.searchIndexMode)) {
      throw new Error('--search-index-mode must be fts-and-prefix or fts-only.');
    }
    if (!shardRouteStrategies.has(parsed.shardRouteStrategy)) {
      throw new Error('--shard-route-strategy must be vusc or hash.');
    }
    if (parsed.command === 'import-sharded-d1' && parsed.snapshotPath === undefined) {
      throw new Error('import-sharded-d1 requires --snapshot-path.');
    }
    return;
  }
  if (parsed.command === 'build-artifacts') {
    if (
      parsed.snapshotPath !== undefined &&
      parsed.maxRows !== undefined &&
      !parsed.allowPartialArtifact
    ) {
      throw new Error(
        'build-artifacts refuses --max-rows for official snapshots unless --allow-partial-artifact is set.',
      );
    }
    if (parsed.artifactMinTokenLength > parsed.artifactMaxTokenLength) {
      throw new Error(
        '--artifact-min-token-length must be less than or equal to --artifact-max-token-length.',
      );
    }
    return;
  }
  if (parsed.repository !== 'memory') {
    throw new Error('Only --repository memory is supported by the local proof CLI.');
  }
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const parsed = defaultArgs(command);

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else {
      const consumedValue = applyOption(parsed, arg, rest[index + 1]);

      if (consumedValue) {
        index += 1;
      }
    }
  }

  assertParsedArgs(parsed);
  return parsed;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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

function resolveInputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(workspaceRoot, inputPath);
}

async function hashFileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

function assertExpectedSnapshotChecksum(args, actualChecksumSha256) {
  const expectedChecksumSha256 = normalizeSha256(args.expectedChecksumSha256);

  if (expectedChecksumSha256 === undefined) {
    return;
  }
  if (expectedChecksumSha256 !== actualChecksumSha256) {
    throw new Error(
      `Snapshot checksum mismatch: expected ${expectedChecksumSha256}, got ${actualChecksumSha256}.`,
    );
  }
}

async function readFileSlice(filePath, start, length) {
  const handle = await fs.promises.open(filePath, 'r');

  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, start);

    return bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function readZipTail(filePath) {
  const stat = await fs.promises.stat(filePath);
  const length = Math.min(stat.size, maxZipEndOfCentralDirectorySearchBytes);
  const start = stat.size - length;
  const buffer = await readFileSlice(filePath, start, length);

  return { buffer, fileSize: stat.size, start };
}

function findZipEndOfCentralDirectory(buffer) {
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === zipEndOfCentralDirectorySignature) {
      return index;
    }
  }

  throw new Error('ZIP end of central directory was not found.');
}

function assertSupportedZipSize(value, label) {
  if (value === 0xff_ff_ff_ff) {
    throw new Error(
      `ZIP64 ${label} is not supported; extract the CSV and pass --snapshot-format csv.`,
    );
  }
}

async function listZipEntries(filePath) {
  const tail = await readZipTail(filePath);
  const endOffset = findZipEndOfCentralDirectory(tail.buffer);
  const centralDirectorySize = tail.buffer.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = tail.buffer.readUInt32LE(endOffset + 16);

  assertSupportedZipSize(centralDirectorySize, 'central directory size');
  assertSupportedZipSize(centralDirectoryOffset, 'central directory offset');

  if (centralDirectoryOffset + centralDirectorySize > tail.fileSize) {
    throw new Error('ZIP central directory points outside the snapshot file.');
  }

  const centralDirectory = await readFileSlice(
    filePath,
    centralDirectoryOffset,
    centralDirectorySize,
  );
  const entries = [];
  let offset = 0;

  while (offset < centralDirectory.length) {
    if (centralDirectory.readUInt32LE(offset) !== zipCentralDirectorySignature) {
      throw new Error('ZIP central directory contains an unsupported entry.');
    }

    const flags = centralDirectory.readUInt16LE(offset + 8);
    const compressionMethod = centralDirectory.readUInt16LE(offset + 10);
    const compressedSize = centralDirectory.readUInt32LE(offset + 20);
    const fileNameLength = centralDirectory.readUInt16LE(offset + 28);
    const extraLength = centralDirectory.readUInt16LE(offset + 30);
    const commentLength = centralDirectory.readUInt16LE(offset + 32);
    const localHeaderOffset = centralDirectory.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    const name = centralDirectory.subarray(nameStart, nameEnd).toString('utf8');

    assertSupportedZipSize(compressedSize, `compressed size for ${name}`);
    assertSupportedZipSize(localHeaderOffset, `local header offset for ${name}`);

    entries.push({
      compressedSize,
      compressionMethod,
      encrypted: flags % 2 === 1,
      localHeaderOffset,
      name,
    });
    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

function isCsvZipEntry(entry) {
  return !entry.name.endsWith('/') && csvZipEntryPattern.test(entry.name);
}

function isXmlZipEntry(entry) {
  return !entry.name.endsWith('/') && xmlZipEntryPattern.test(entry.name);
}

function selectZipEntries(entries, requestedEntry, predicate, label) {
  if (requestedEntry !== undefined) {
    const selected = entries.filter(
      (entry) => entry.name === requestedEntry || entry.name.endsWith(`/${requestedEntry}`),
    );

    if (selected.length === 0) {
      throw new Error(`ZIP entry "${requestedEntry}" was not found.`);
    }
    if (selected.length > 1) {
      throw new Error(`ZIP entry "${requestedEntry}" matched more than one entry.`);
    }
    if (!predicate(selected[0])) {
      throw new Error(`ZIP entry "${requestedEntry}" is not a ${label} entry.`);
    }

    return selected;
  }

  const selectedEntries = entries
    .filter(predicate)
    .toSorted((left, right) => left.name.localeCompare(right.name));

  if (selectedEntries.length === 0) {
    throw new Error(`ZIP snapshot does not contain a ${label} entry.`);
  }

  return selectedEntries;
}

function selectSingleZipEntry(entries, requestedEntry, predicate, label) {
  const selectedEntries = selectZipEntries(entries, requestedEntry, predicate, label);

  if (selectedEntries.length > 1) {
    throw new Error(
      `ZIP snapshot contains multiple ${label} entries: ${selectedEntries
        .map((entry) => entry.name)
        .join(', ')}. Pass --snapshot-entry.`,
    );
  }

  return selectedEntries[0];
}

async function createZipEntryReadStream(filePath, entry) {
  if (entry.encrypted) {
    throw new Error(`ZIP entry "${entry.name}" is encrypted and cannot be imported.`);
  }
  if (![0, 8].includes(entry.compressionMethod)) {
    throw new Error(
      `ZIP entry "${entry.name}" uses unsupported compression method ${entry.compressionMethod}.`,
    );
  }

  const header = await readFileSlice(filePath, entry.localHeaderOffset, 30);

  if (header.readUInt32LE(0) !== zipLocalFileHeaderSignature) {
    throw new Error(`ZIP entry "${entry.name}" has an invalid local file header.`);
  }

  const fileNameLength = header.readUInt16LE(26);
  const extraLength = header.readUInt16LE(28);
  const dataStart = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize - 1;
  const stream = fs.createReadStream(filePath, {
    end: dataEnd,
    start: dataStart,
  });

  return entry.compressionMethod === 0 ? stream : stream.pipe(createInflateRaw());
}

function inferSnapshotFormat(snapshotPath, requestedFormat) {
  if (requestedFormat !== 'auto') {
    return requestedFormat;
  }

  return path.extname(snapshotPath).toLocaleLowerCase('en-US') === '.zip' ? 'zip' : 'csv';
}

async function openOfficialSnapshotEntries(args) {
  const snapshotPath = resolveInputPath(args.snapshotPath);
  const stat = await fs.promises.stat(snapshotPath);

  if (!stat.isFile()) {
    throw new Error(`Snapshot path must be a file: ${args.snapshotPath}`);
  }

  const snapshotFormat = inferSnapshotFormat(snapshotPath, args.snapshotFormat);

  if (snapshotFormat === 'csv') {
    return {
      entries: [
        {
          name: undefined,
          openStream: () => fs.createReadStream(snapshotPath),
        },
      ],
      snapshotPath,
      snapshotFormat,
    };
  }

  const entries = await listZipEntries(snapshotPath);
  const selectedEntries = selectZipEntries(entries, args.snapshotEntry, isCsvZipEntry, 'CSV/TXT');

  return {
    entries: selectedEntries.map((entry) => ({
      name: entry.name,
      openStream: () => createZipEntryReadStream(snapshotPath, entry),
    })),
    snapshotPath,
    snapshotFormat,
  };
}

async function readStreamText(stream, encoding = 'utf-8') {
  const decoder = new TextDecoder(encoding);
  let text = '';

  for await (const chunk of stream) {
    text += decoder.decode(typeof chunk === 'string' ? Buffer.from(chunk) : chunk, {
      stream: true,
    });
  }

  text += decoder.decode();
  return text;
}

async function readXmlSnapshotText(snapshotPathInput, requestedEntry) {
  const snapshotPath = resolveInputPath(snapshotPathInput);
  const stat = await fs.promises.stat(snapshotPath);

  if (!stat.isFile()) {
    throw new Error(`Hierarchy snapshot path must be a file: ${snapshotPathInput}`);
  }
  if (path.extname(snapshotPath).toLocaleLowerCase('en-US') !== '.zip') {
    return {
      selectedEntryName: undefined,
      snapshotPath,
      text: await fs.promises.readFile(snapshotPath, 'utf8'),
    };
  }

  const entries = await listZipEntries(snapshotPath);
  const selectedEntry = selectSingleZipEntry(entries, requestedEntry, isXmlZipEntry, 'XML');
  const stream = await createZipEntryReadStream(snapshotPath, selectedEntry);

  return {
    selectedEntryName: selectedEntry.name,
    snapshotPath,
    text: await readStreamText(stream),
  };
}

function decodeXmlText(value) {
  return value.replaceAll(xmlEntityPattern, (_match, entity) => {
    const normalized = String(entity).toLowerCase();

    if (normalized === 'amp') {
      return '&';
    }
    if (normalized === 'lt') {
      return '<';
    }
    if (normalized === 'gt') {
      return '>';
    }
    if (normalized === 'quot') {
      return '"';
    }
    if (normalized === 'apos') {
      return "'";
    }
    if (normalized.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }
    if (normalized.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }

    return _match;
  });
}

function readXmlElementText(block, qualifiedName) {
  const [prefix, localName] = qualifiedName.split(':');

  if (prefix === undefined || localName === undefined) {
    throw new Error(`XML element name must be namespace-qualified: ${qualifiedName}`);
  }

  const pattern = new RegExp(
    `<${prefix}:${localName}\\b[^>]*>([\\s\\S]*?)</${prefix}:${localName}>`,
    'u',
  );
  const match = block.match(pattern);

  if (match?.[1] === undefined) {
    return undefined;
  }

  return decodeXmlText(match[1].replace(/<[^>]+>/gu, '').trim());
}

function readXmlCode(block, qualifiedName, label) {
  const value = readXmlElementText(block, qualifiedName);

  if (value === undefined) {
    return undefined;
  }
  if (!/^\d+$/u.test(value)) {
    throw new Error(`RUIAN VFR hierarchy ${label} has non-numeric ${qualifiedName}: ${value}`);
  }

  return value;
}

function readRequiredXmlCode(block, qualifiedName, label) {
  const value = readXmlCode(block, qualifiedName, label);

  if (value === undefined || value.length === 0) {
    throw new Error(`RUIAN VFR hierarchy ${label} is missing ${qualifiedName}.`);
  }

  return value;
}

function upsertCodeMap(map, key, value, label) {
  const existing = map.get(key);

  if (existing !== undefined && existing !== value) {
    throw new Error(`RUIAN VFR hierarchy maps ${label} ${key} to both ${existing} and ${value}.`);
  }

  map.set(key, value);
}

function parseMunicipalityRegionMapFromRuianVfrXml(xml) {
  const regionCodes = new Set();

  for (const match of xml.matchAll(vfrVuscRecordBlockPattern)) {
    regionCodes.add(readRequiredXmlCode(match[0], 'vci:Kod', 'region'));
  }

  const districtRegionCodes = new Map();

  for (const match of xml.matchAll(vfrOkresBlockPattern)) {
    const block = match[0];
    const districtCode = readRequiredXmlCode(block, 'oki:Kod', 'district');
    const regionCode = readRequiredXmlCode(block, 'vci:Kod', `district ${districtCode}`);

    upsertCodeMap(districtRegionCodes, districtCode, regionCode, 'district');
  }
  if (districtRegionCodes.size === 0) {
    throw new Error('RUIAN VFR hierarchy did not contain any district records.');
  }

  const municipalityRegionCodes = new Map();
  const missingDistrictCodes = new Set();
  const missingRegionMunicipalityCodes = new Set();
  let directRegionMunicipalityCount = 0;

  for (const match of xml.matchAll(vfrObecBlockPattern)) {
    const block = match[0];
    const municipalityCode = readRequiredXmlCode(block, 'obi:Kod', 'municipality');
    const districtCode = readXmlCode(block, 'oki:Kod', `municipality ${municipalityCode}`);

    if (districtCode === undefined) {
      const directRegionCode = readXmlCode(block, 'vci:Kod', `municipality ${municipalityCode}`);
      const pouCode = readXmlCode(block, 'pui:Kod', `municipality ${municipalityCode}`);
      const regionCode =
        directRegionCode !== undefined && regionCodes.has(directRegionCode)
          ? directRegionCode
          : pouCode !== undefined && regionCodes.has(pouCode)
            ? pouCode
            : undefined;

      if (regionCode === undefined) {
        missingRegionMunicipalityCodes.add(municipalityCode);
        continue;
      }

      directRegionMunicipalityCount += 1;
      upsertCodeMap(municipalityRegionCodes, municipalityCode, regionCode, 'municipality');
      continue;
    }

    const regionCode = districtRegionCodes.get(districtCode);

    if (regionCode === undefined) {
      missingDistrictCodes.add(districtCode);
      continue;
    }

    upsertCodeMap(municipalityRegionCodes, municipalityCode, regionCode, 'municipality');
  }
  if (municipalityRegionCodes.size === 0) {
    throw new Error('RUIAN VFR hierarchy did not contain any municipality records.');
  }
  if (missingDistrictCodes.size > 0) {
    throw new Error(
      `RUIAN VFR hierarchy references municipality district(s) without VUSC mapping: ${[
        ...missingDistrictCodes,
      ].join(', ')}.`,
    );
  }
  if (missingRegionMunicipalityCodes.size > 0) {
    throw new Error(
      `RUIAN VFR hierarchy contains municipality record(s) without district or direct VUSC mapping: ${[
        ...missingRegionMunicipalityCodes,
      ].join(', ')}.`,
    );
  }

  return {
    directRegionMunicipalityCount,
    districtCount: districtRegionCodes.size,
    map: municipalityRegionCodes,
    municipalityCount: municipalityRegionCodes.size,
    regionCount: regionCodes.size,
  };
}

function normalizeMunicipalityRegionMapRecord(record, label) {
  const map = new Map();

  for (const [municipalityCode, regionCode] of Object.entries(record)) {
    const normalizedMunicipalityCode = municipalityCode.trim();

    if (!/^\d+$/u.test(normalizedMunicipalityCode)) {
      throw new Error(`${label} key must be a numeric municipality code: ${municipalityCode}`);
    }
    if (typeof regionCode !== 'string' || !/^\d+$/u.test(regionCode.trim())) {
      throw new Error(
        `${label} value for municipality ${municipalityCode} must be a numeric VUSC code string.`,
      );
    }

    map.set(normalizedMunicipalityCode, regionCode.trim());
  }
  if (map.size === 0) {
    throw new Error(`${label} must contain at least one municipality mapping.`);
  }

  return map;
}

async function loadMunicipalityRegionMap(args) {
  if (args.municipalityRegionMapPath !== undefined) {
    const mapPath = resolveInputPath(args.municipalityRegionMapPath);
    const map = normalizeMunicipalityRegionMapRecord(
      readJson(mapPath),
      '--municipality-region-map-path',
    );

    return {
      map,
      report: {
        municipalityCount: map.size,
        source: 'json-map',
        sourceFileName: path.basename(mapPath),
      },
    };
  }
  if (args.municipalityRegionMapSnapshotPath === undefined) {
    return undefined;
  }

  const checksumSha256 = await hashFileSha256(
    resolveInputPath(args.municipalityRegionMapSnapshotPath),
  );
  const expectedChecksumSha256 = normalizeSha256(args.municipalityRegionMapSnapshotChecksumSha256);

  if (expectedChecksumSha256 !== undefined && expectedChecksumSha256 !== checksumSha256) {
    throw new Error(
      `Hierarchy snapshot checksum mismatch: expected ${expectedChecksumSha256}, got ${checksumSha256}.`,
    );
  }

  const snapshot = await readXmlSnapshotText(
    args.municipalityRegionMapSnapshotPath,
    args.municipalityRegionMapSnapshotEntry,
  );
  const parsed = parseMunicipalityRegionMapFromRuianVfrXml(snapshot.text);

  return {
    map: parsed.map,
    report: {
      checksumSha256,
      directRegionMunicipalityCount: parsed.directRegionMunicipalityCount,
      districtCount: parsed.districtCount,
      municipalityCount: parsed.municipalityCount,
      regionCount: parsed.regionCount,
      selectedEntryName: snapshot.selectedEntryName,
      source: 'ruian-st-uzsz-vfr',
      sourceFileName: path.basename(snapshot.snapshotPath),
    },
  };
}

function readJsonFixture(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8').trim();

  if (text.length === 0) {
    return [];
  }
  if (text.startsWith('[')) {
    return JSON.parse(text);
  }
  if (text.startsWith('{') && !text.includes('\n')) {
    const parsed = JSON.parse(text);

    return isRecord(parsed) && Array.isArray(parsed.rows) ? parsed.rows : [parsed];
  }

  return text
    .split(lineSplitPattern)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function assertAllowedKeys(record, allowedKeys, label) {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${label} contains unsupported key "${key}". Import normalized rows only.`);
    }
  }
}

function finiteOptionalNumber(value, label) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number when present.`);
  }

  return value;
}

function optionalString(value, label) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string when present.`);
  }

  return value;
}

function normalizeAddressParts(partsValue, index) {
  if (!isRecord(partsValue)) {
    throw new Error(`Fixture row ${index} must have normalized address parts.`);
  }
  assertAllowedKeys(partsValue, addressPartKeys, `Fixture row ${index} parts`);

  const parts = {};
  for (const key of addressPartKeys) {
    const value = optionalString(partsValue[key], `Fixture row ${index} parts.${key}`);

    if (value !== undefined) {
      parts[key] = value;
    }
  }

  return parts;
}

function normalizeFixtureRow(entry, index) {
  if (!isRecord(entry)) {
    throw new Error(`Fixture row ${index} must be an object.`);
  }
  assertAllowedKeys(entry, addressRowKeys, `Fixture row ${index}`);

  if (typeof entry.id !== 'string') {
    throw new Error(`Fixture row ${index} must have a string id.`);
  }

  const row = {
    id: entry.id,
    parts: normalizeAddressParts(entry.parts, index),
  };
  const quality = finiteOptionalNumber(entry.quality, `Fixture row ${index} quality`);
  const latitude = finiteOptionalNumber(entry.latitude, `Fixture row ${index} latitude`);
  const longitude = finiteOptionalNumber(entry.longitude, `Fixture row ${index} longitude`);

  if (quality !== undefined) {
    row.quality = quality;
  }
  if (latitude !== undefined) {
    row.latitude = latitude;
  }
  if (longitude !== undefined) {
    row.longitude = longitude;
  }

  return row;
}

function normalizeFixtureRows(value) {
  if (!Array.isArray(value)) {
    throw new Error('Fixture must be a JSON array, JSONL rows, or an object with a rows array.');
  }

  return value.map((entry, index) => normalizeFixtureRow(entry, index));
}

async function loadSmartSuggestModules() {
  const datasetsPath = path.resolve(repositoryRoot, 'libs/smart-suggest/datasets/dist/datasets.js');
  const storagePath = path.resolve(repositoryRoot, 'libs/smart-suggest/storage/dist/storage.js');

  if (!(fs.existsSync(datasetsPath) && fs.existsSync(storagePath))) {
    throw new Error(
      'Smart Suggest package dist files are missing. Run pnpm --filter @techsio/smart-suggest-datasets --filter @techsio/smart-suggest-storage build first.',
    );
  }

  const [datasets, storage] = await Promise.all([
    import(pathToFileURL(datasetsPath).href),
    import(pathToFileURL(storagePath).href),
  ]);

  return {
    createD1SmartSuggestRepositories: storage.createD1SmartSuggestRepositories,
    createAddressImportRunId: datasets.createAddressImportRunId,
    createAuthoritativeAddressImportSource: datasets.createAuthoritativeAddressImportSource,
    createInMemorySmartSuggestRepositories: storage.createInMemorySmartSuggestRepositories,
    normalizeAddressSnapshotRowForImport: datasets.normalizeAddressSnapshotRowForImport,
    parseRuianOfficialCsvSnapshotChanges: datasets.parseRuianOfficialCsvSnapshotChanges,
    parseRuianOfficialCsvSnapshotRows: datasets.parseRuianOfficialCsvSnapshotRows,
    runAddressDatasetImport: (options) =>
      runCliEffectAsPromise(datasets.runAddressDatasetImportEffect(options)),
  };
}

function createImportMetadata(args) {
  const metadata = {
    datasetVersion: args.datasetVersion,
    shardCountryCode: args.country,
    sourceId: args.sourceId,
  };

  if (args.region !== undefined) {
    metadata.region = args.region;
  }
  if (args.snapshotUri !== undefined) {
    metadata.snapshotUri = args.snapshotUri;
  }
  if (args.modificationNoteSha256 !== undefined) {
    metadata.modificationNoteSha256 = normalizeSha256(args.modificationNoteSha256);
  }
  if (args.sourceName !== undefined) {
    metadata.sourceName = args.sourceName;
  }

  return metadata;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolvePersistToPath(persistTo) {
  if (persistTo === undefined) {
    return;
  }

  return path.isAbsolute(persistTo) ? persistTo : path.resolve(workspaceRoot, persistTo);
}

function resolveD1Database(args) {
  const configPath = resolveWorkspacePath(args.wranglerConfig);
  const config = readJson(configPath);
  const databases = Array.isArray(config.d1_databases) ? config.d1_databases : [];
  const database = databases.find(
    (entry) => entry?.binding === args.d1Binding || entry?.database_name === args.d1Binding,
  );

  if (database === undefined) {
    const knownBindings = databases
      .map((entry) => entry?.binding ?? entry?.database_name)
      .filter((entry) => typeof entry === 'string');
    const suffix =
      knownBindings.length === 0 ? '' : ` Configured D1 bindings: ${knownBindings.join(', ')}.`;

    throw new Error(
      `D1 binding/name "${args.d1Binding}" was not found in ${args.wranglerConfig}.${suffix}`,
    );
  }

  return {
    configPath,
    databaseName: database.binding ?? database.database_name,
    persistTo: resolvePersistToPath(args.persistTo),
  };
}

async function createRepositories(args, modules) {
  if (args.repository === 'memory') {
    return modules.createInMemorySmartSuggestRepositories();
  }

  const d1 = resolveD1Database(args);

  if (args.applyMigrations) {
    applyWranglerD1Migrations({
      configPath: d1.configPath,
      cwd: workspaceRoot,
      database: d1.databaseName,
      migrationsSource: smartSuggestD1MigrationsSource,
      persistTo: d1.persistTo,
      target: args.d1Target,
    });
  }

  const binding = createWranglerD1Binding({
    configPath: d1.configPath,
    cwd: workspaceRoot,
    database: d1.databaseName,
    persistTo: d1.persistTo,
    target: args.d1Target,
  });
  const repositories = modules.createD1SmartSuggestRepositories(binding, {
    searchIndexMode: args.searchIndexMode,
  });
  const health = await runCliEffectAsPromise(repositories.health.check());

  if (!health.ok) {
    throw new Error(`D1 health check failed: ${health.error ?? 'unknown error'}`);
  }

  return repositories;
}

function createSourceLineage(args, checksumSha256) {
  const sourceLineage = {
    checksumSha256,
    datasetVersion: args.datasetVersion,
    fileKind: args.fileKind,
    sourceId: args.sourceId,
    sourceRowId: args.fileKind === 'delta' ? 'ruian-official-delta' : 'ruian-official-baseline',
    sourceUri: args.sourceUri,
  };

  if (args.atomEntryId !== undefined) {
    sourceLineage.atomEntryId = args.atomEntryId;
  }
  if (args.feedId !== undefined) {
    sourceLineage.feedId = args.feedId;
  }
  if (args.previousAtomEntryId !== undefined) {
    sourceLineage.previousAtomEntryId = args.previousAtomEntryId;
  }
  if (args.sourceGeneratedAt !== undefined) {
    sourceLineage.sourceGeneratedAt = args.sourceGeneratedAt;
  }
  if (args.sourceValidAt !== undefined) {
    sourceLineage.sourceValidAt = args.sourceValidAt;
  }
  if (args.sourceVersion !== undefined) {
    sourceLineage.sourceVersion = args.sourceVersion;
  }
  if (args.snapshotUri !== undefined) {
    sourceLineage.snapshotUri = args.snapshotUri;
  }

  return sourceLineage;
}

function collectRowIds(rows, limit = 25) {
  const rowIds = [];

  async function* wrappedRows() {
    for await (const row of rows) {
      if (rowIds.length < limit) {
        rowIds.push(row.id);
      }

      yield row;
    }
  }

  return { rowIds, rows: wrappedRows() };
}

function collectImportChangeIds(changes, limit = 25) {
  const rowIds = [];
  const tombstoneIds = [];

  async function* wrappedChanges() {
    for await (const change of changes) {
      if (change.kind === 'address' && rowIds.length < limit) {
        rowIds.push(change.row.id);
      }
      if (change.kind === 'tombstone' && tombstoneIds.length < limit) {
        tombstoneIds.push(change.tombstone.id);
      }

      yield change;
    }
  }

  return { rowIds, rows: wrappedChanges(), tombstoneIds };
}

function parseCommaList(value) {
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

function parseShardRegionBindingMap(args) {
  const parsed = parseJsonObject(args.shardRegionMapJson, '--shard-region-map-json');
  const map = new Map();

  if (parsed === undefined) {
    return map;
  }

  const allowedBindings = parseCommaList(args.shardBindings);
  const allowedBindingSet = new Set(allowedBindings);

  for (const [regionCode, bindingName] of Object.entries(parsed)) {
    const normalizedRegionCode = regionCode.trim();

    if (!/^\d+$/u.test(normalizedRegionCode)) {
      throw new Error(`Shard region map key must be a numeric VUSC code: ${regionCode}`);
    }
    if (typeof bindingName !== 'string' || bindingName.trim().length === 0) {
      throw new Error(`Shard region map value for ${regionCode} must be a binding name string.`);
    }

    const normalizedBindingName = bindingName.trim();

    if (allowedBindings.length > 0 && !allowedBindingSet.has(normalizedBindingName)) {
      throw new Error(
        `Shard region map value ${normalizedBindingName} for region ${regionCode} is not in --shard-bindings.`,
      );
    }

    map.set(normalizedRegionCode, normalizedBindingName);
  }

  return map;
}

function hashStringToPositiveInteger(value) {
  let hash = 0;

  for (const character of value) {
    hash = (Math.imul(hash, 131) + (character.codePointAt(0) ?? 0)) % shardHashModulus;

    if (hash < 0) {
      hash += shardHashModulus;
    }
  }

  return hash;
}

function changeRuian(change) {
  return change.kind === 'address' ? change.row.ruian : change.tombstone.ruian;
}

function changeId(change) {
  return change.kind === 'address' ? change.row.id : change.tombstone.id;
}

function requireChangeRegionCode(change) {
  const regionCode = changeRuian(change)?.regionCode?.trim();

  if (regionCode === undefined || regionCode.length === 0) {
    throw new Error(
      `Sharded import row ${changeId(change)} is missing RUIAN regionCode/VUSC code.`,
    );
  }

  return regionCode;
}

function routeKeyForHashShard(change) {
  const ruian = changeRuian(change);

  return (
    ruian?.stableAddressId?.trim() || ruian?.addressPlaceCode?.trim() || changeId(change).trim()
  );
}

function shardBindingForRegion(args, regionCode) {
  const regionBindingMap = parseShardRegionBindingMap(args);
  const bindingName = regionBindingMap.get(regionCode) ?? `${args.shardBindingPrefix}${regionCode}`;
  const allowedBindings = parseCommaList(args.shardBindings);

  if (allowedBindings.length > 0 && !allowedBindings.includes(bindingName)) {
    throw new Error(
      `Shard binding ${bindingName} for region ${regionCode} is not in --shard-bindings.`,
    );
  }

  return bindingName;
}

function shardBindingForHashRoute(args, change) {
  const allowedBindings = parseCommaList(args.shardBindings);

  if (allowedBindings.length === 0) {
    throw new Error('--shard-bindings is required for hash sharded imports.');
  }

  const routeKey = routeKeyForHashShard(change);
  const shardIndex = hashStringToPositiveInteger(routeKey) % allowedBindings.length;

  return {
    bindingName: allowedBindings[shardIndex],
    regionCode: `hash-${String(shardIndex + 1).padStart(2, '0')}`,
    regionKind: 'country',
    regionName: `${args.country} address hash shard ${String(shardIndex + 1).padStart(2, '0')}`,
  };
}

function routeDescriptorForChange(args, change) {
  if (args.shardRouteStrategy === 'hash') {
    return shardBindingForHashRoute(args, change);
  }

  const regionCode = requireChangeRegionCode(change);

  return {
    bindingName: shardBindingForRegion(args, regionCode),
    regionCode,
    regionKind: 'vusc',
    regionName: `VUSC ${regionCode}`,
  };
}

function ensureShardRoute(routes, args, descriptor) {
  const routeId = `${descriptor.regionKind}:${descriptor.regionCode}`;
  const existing = routes.get(routeId);

  if (existing !== undefined) {
    return existing;
  }

  const route = {
    addressRows: 0,
    bindingName: descriptor.bindingName,
    filePath: path.join(
      args.routeTempDir,
      `${descriptor.bindingName}-${descriptor.regionCode}.jsonl`,
    ),
    logicalRegionCodes: new Set(),
    regionCode: descriptor.regionCode,
    regionKind: descriptor.regionKind,
    regionName: descriptor.regionName,
    routingStrategy: args.shardRouteStrategy,
    totalRows: 0,
    tombstoneRows: 0,
    stream: undefined,
  };
  routes.set(routeId, route);

  return route;
}

function writeImportChange(route, change) {
  const logicalRegionCode = changeRuian(change)?.regionCode?.trim();

  if (logicalRegionCode !== undefined && logicalRegionCode.length > 0) {
    route.logicalRegionCodes.add(logicalRegionCode);
  }

  route.stream ??= fs.createWriteStream(route.filePath, { flags: 'a' });
  route.stream.write(`${JSON.stringify(change)}\n`);
  route.totalRows += 1;

  if (change.kind === 'address') {
    route.addressRows += 1;
    return;
  }

  route.tombstoneRows += 1;
}

function estimateShardStorageBytes(args, route) {
  if (args.searchIndexMode === 'fts-only') {
    return Math.max(
      shardStorageEstimateFloorBytes,
      route.addressRows * ftsOnlyShardStorageEstimateRowBytes,
    );
  }

  const fileSizeBytes = fs.statSync(route.filePath).size;
  const sourcePayloadEstimateBytes = fileSizeBytes * shardStorageEstimateMultiplier;
  const addressRowFloorBytes = route.addressRows * shardStorageEstimateRowFloorBytes;

  return Math.max(
    shardStorageEstimateFloorBytes,
    Math.ceil(sourcePayloadEstimateBytes),
    addressRowFloorBytes,
  );
}

function storageEstimatePolicy(args) {
  if (args.searchIndexMode === 'fts-only') {
    return {
      bytesPerAddressRow: ftsOnlyShardStorageEstimateRowBytes,
      mode: 'fts-only-reviewed-row-estimate',
    };
  }

  return {
    fileSizeMultiplier: shardStorageEstimateMultiplier,
    mode: 'legacy-jsonl-source-payload-estimate',
    rowFloorBytes: shardStorageEstimateRowFloorBytes,
  };
}

async function closeShardRouteStreams(routes) {
  await Promise.all(
    [...routes.values()].map(
      (route) =>
        new Promise((resolve, reject) => {
          if (route.stream === undefined) {
            resolve();
            return;
          }

          route.stream.once('error', reject);
          route.stream.end(resolve);
        }),
    ),
  );
}

async function routeImportChangesToShardFiles(args, rows) {
  const routeTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smart-suggest-sharded-import-'));
  const routes = new Map();

  try {
    const routeArgs = { ...args, routeTempDir };

    for await (const change of rows) {
      if (change.kind !== 'address' && change.kind !== 'tombstone') {
        throw new Error('Sharded import requires official parsed address/tombstone changes.');
      }

      const descriptor = routeDescriptorForChange(routeArgs, change);
      const route = ensureShardRoute(routes, routeArgs, descriptor);
      writeImportChange(route, change);
    }

    await closeShardRouteStreams(routes);
  } catch (error) {
    await closeShardRouteStreams(routes);
    fs.rmSync(routeTempDir, { force: true, recursive: true });
    throw error;
  }

  return {
    routes: [...routes.values()].map(({ stream: _stream, ...route }) => ({
      ...route,
      estimatedSizeBytes: estimateShardStorageBytes(args, route),
      logicalRegionCodes: [...route.logicalRegionCodes],
    })),
    routeTempDir,
  };
}

function assertShardRouteBudgets(args, routes) {
  const budget = evaluateShardRouteBudgets(args, routes);

  if (budget.status === 'ok') {
    return;
  }

  const [violation] = budget.violations;

  if (violation?.kind === 'physical-shard') {
    throw new Error(
      `Physical shard ${violation.bindingName} routed ${violation.totalRows} row(s), exceeding --shard-max-rows ${violation.maxRows}.`,
    );
  }
  if (violation?.kind === 'logical-shard') {
    throw new Error(
      `Shard ${violation.bindingName} routed ${violation.totalRows} row(s), exceeding --shard-max-rows ${violation.maxRows}.`,
    );
  }
  if (violation?.kind === 'logical-shard-size') {
    throw new Error(
      `Shard ${violation.bindingName} estimated ${violation.estimatedSizeBytes} byte(s), exceeding --shard-max-estimated-size-bytes ${violation.maxEstimatedSizeBytes}.`,
    );
  }
  if (violation?.kind === 'physical-shard-size') {
    throw new Error(
      `Physical shard ${violation.bindingName} estimated ${violation.estimatedSizeBytes} byte(s), exceeding --shard-max-estimated-size-bytes ${violation.maxEstimatedSizeBytes}.`,
    );
  }

  throw new Error('Shard route budget failed.');
}

function compareRouteCodes(left, right) {
  const leftNumber = Number(left.regionCode);
  const rightNumber = Number(right.regionCode);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return left.regionCode.localeCompare(right.regionCode);
}

function sortRouteCodes(codes) {
  return [...new Set(codes)].toSorted((left, right) => {
    const leftNumber = Number(left);
    const rightNumber = Number(right);

    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber;
    }

    return left.localeCompare(right);
  });
}

function summarizeShardRoutes(routes) {
  return routes
    .map((route) => ({
      addressRows: route.addressRows,
      bindingName: route.bindingName,
      estimatedSizeBytes: route.estimatedSizeBytes,
      logicalRegionCodes: sortRouteCodes(route.logicalRegionCodes ?? []),
      regionCode: route.regionCode,
      regionKind: route.regionKind,
      regionName: route.regionName,
      routingStrategy: route.routingStrategy,
      tombstoneRows: route.tombstoneRows,
      totalRows: route.totalRows,
    }))
    .toSorted(compareRouteCodes);
}

function summarizePhysicalShardRoutes(routes) {
  const byBinding = new Map();

  for (const route of routes) {
    const existing = byBinding.get(route.bindingName) ?? {
      addressRows: 0,
      bindingName: route.bindingName,
      estimatedSizeBytes: 0,
      logicalRegionCodes: [],
      routeCodes: [],
      tombstoneRows: 0,
      totalRows: 0,
    };

    existing.addressRows += route.addressRows;
    existing.estimatedSizeBytes += route.estimatedSizeBytes;
    existing.logicalRegionCodes.push(...(route.logicalRegionCodes ?? [route.regionCode]));
    existing.routeCodes.push(route.regionCode);
    existing.tombstoneRows += route.tombstoneRows;
    existing.totalRows += route.totalRows;
    byBinding.set(route.bindingName, existing);
  }

  return [...byBinding.values()]
    .map((summary) => ({
      ...summary,
      logicalRegionCodes: sortRouteCodes(summary.logicalRegionCodes),
      routeCodes: sortRouteCodes(summary.routeCodes),
    }))
    .toSorted((left, right) => left.bindingName.localeCompare(right.bindingName));
}

function evaluateShardRouteBudgets(args, routes) {
  if (args.shardMaxRows === undefined && args.shardMaxEstimatedSizeBytes === undefined) {
    return {
      maxEstimatedSizeBytes: null,
      maxRows: null,
      status: 'ok',
      violations: [],
    };
  }

  const violations = [];

  for (const route of routes) {
    if (args.shardMaxRows !== undefined && route.totalRows > args.shardMaxRows) {
      violations.push({
        bindingName: route.bindingName,
        kind: 'logical-shard',
        maxRows: args.shardMaxRows,
        regionCode: route.regionCode,
        totalRows: route.totalRows,
      });
    }
    if (
      args.shardMaxEstimatedSizeBytes !== undefined &&
      route.estimatedSizeBytes > args.shardMaxEstimatedSizeBytes
    ) {
      violations.push({
        bindingName: route.bindingName,
        estimatedSizeBytes: route.estimatedSizeBytes,
        kind: 'logical-shard-size',
        maxEstimatedSizeBytes: args.shardMaxEstimatedSizeBytes,
        regionCode: route.regionCode,
      });
    }
  }

  for (const physicalShard of summarizePhysicalShardRoutes(routes)) {
    if (args.shardMaxRows !== undefined && physicalShard.totalRows > args.shardMaxRows) {
      violations.push({
        bindingName: physicalShard.bindingName,
        kind: 'physical-shard',
        logicalRegionCodes: physicalShard.logicalRegionCodes,
        maxRows: args.shardMaxRows,
        totalRows: physicalShard.totalRows,
      });
    }
    if (
      args.shardMaxEstimatedSizeBytes !== undefined &&
      physicalShard.estimatedSizeBytes > args.shardMaxEstimatedSizeBytes
    ) {
      violations.push({
        bindingName: physicalShard.bindingName,
        estimatedSizeBytes: physicalShard.estimatedSizeBytes,
        kind: 'physical-shard-size',
        maxEstimatedSizeBytes: args.shardMaxEstimatedSizeBytes,
        routeCodes: physicalShard.routeCodes,
      });
    }
  }

  return {
    maxEstimatedSizeBytes: args.shardMaxEstimatedSizeBytes ?? null,
    maxRows: args.shardMaxRows ?? null,
    status: violations.length === 0 ? 'ok' : 'failed',
    violations,
  };
}

function summarizeRouteTotals(routes) {
  return routes.reduce(
    (summary, route) => ({
      addressRows: summary.addressRows + route.addressRows,
      estimatedSizeBytes: summary.estimatedSizeBytes + route.estimatedSizeBytes,
      tombstoneRows: summary.tombstoneRows + route.tombstoneRows,
      totalRows: summary.totalRows + route.totalRows,
    }),
    {
      addressRows: 0,
      estimatedSizeBytes: 0,
      tombstoneRows: 0,
      totalRows: 0,
    },
  );
}

async function* readJsonlImportChanges(filePath) {
  const lines = createInterface({
    crlfDelay: Infinity,
    input: fs.createReadStream(filePath, 'utf8'),
  });

  for await (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.length > 0) {
      yield JSON.parse(trimmed);
    }
  }
}

function createOfficialParserOptions(args, checksumSha256, maxRows) {
  return {
    atomEntryId: args.atomEntryId,
    checksumSha256,
    datasetVersion: args.datasetVersion,
    delimiter: args.csvDelimiter,
    encoding: args.csvEncoding,
    feedId: args.feedId,
    fileKind: args.fileKind,
    maxRows,
    snapshotUri: args.snapshotUri,
    sourceGeneratedAt: args.sourceGeneratedAt,
    sourceId: args.sourceId,
    sourceUri: args.sourceUri,
    sourceValidAt: args.sourceValidAt,
    sourceVersion: args.sourceVersion,
  };
}

function addRegionCodeToChange(change, regionCode) {
  if (change.kind === 'address') {
    return {
      ...change,
      row: {
        ...change.row,
        ruian: {
          ...change.row.ruian,
          regionCode,
        },
      },
    };
  }

  return {
    ...change,
    tombstone: {
      ...change.tombstone,
      ruian: {
        ...change.tombstone.ruian,
        regionCode,
      },
    },
  };
}

function applyMunicipalityRegionMapToChange(change, municipalityRegionMap) {
  if (municipalityRegionMap === undefined) {
    return change;
  }

  const ruian = changeRuian(change);
  const existingRegionCode = ruian?.regionCode?.trim();

  if (existingRegionCode !== undefined && existingRegionCode.length > 0) {
    return change;
  }

  const municipalityCode = ruian?.municipalityCode?.trim();
  const rowId = change.kind === 'address' ? change.row.id : change.tombstone.id;

  if (municipalityCode === undefined || municipalityCode.length === 0) {
    throw new Error(
      `Official row ${rowId} is missing RUIAN municipalityCode; cannot derive VUSC regionCode.`,
    );
  }

  const regionCode = municipalityRegionMap.map.get(municipalityCode);

  if (regionCode === undefined) {
    throw new Error(
      `Official row ${rowId} references municipality ${municipalityCode}, which is missing from the supplied RUIAN VFR hierarchy map.`,
    );
  }

  return addRegionCodeToChange(change, regionCode);
}

async function* parseOfficialSnapshotChanges(
  args,
  modules,
  officialSnapshot,
  checksumSha256,
  municipalityRegionMap,
) {
  let emittedChanges = 0;

  for (const entry of officialSnapshot.entries) {
    const remainingMaxRows =
      args.maxRows === undefined ? undefined : Math.max(0, args.maxRows - emittedChanges);

    if (remainingMaxRows === 0) {
      return;
    }

    const stream = await entry.openStream();
    const parsedChanges = modules.parseRuianOfficialCsvSnapshotChanges(
      stream,
      createOfficialParserOptions(args, checksumSha256, remainingMaxRows),
    );

    try {
      for await (const change of parsedChanges) {
        yield applyMunicipalityRegionMapToChange(change, municipalityRegionMap);
        emittedChanges += 1;
      }
    } catch (error) {
      const entryLabel =
        entry.name === undefined ? path.basename(officialSnapshot.snapshotPath) : entry.name;
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`RUIAN snapshot entry ${entryLabel}: ${message}`);
    }
  }
}

function summarizeOfficialSnapshot(officialSnapshot, checksumSha256, args, municipalityRegionMap) {
  const entryNames = officialSnapshot.entries
    .map((entry) => entry.name)
    .filter((entryName) => entryName !== undefined);

  return {
    checksumSha256,
    municipalityRegionMap: municipalityRegionMap?.report,
    selectedEntryCount: officialSnapshot.entries.length,
    selectedEntryName: entryNames.length === 1 ? entryNames[0] : undefined,
    selectedEntryNamesSample: entryNames.slice(0, 10),
    snapshotFileName: path.basename(officialSnapshot.snapshotPath),
    snapshotFormat: officialSnapshot.snapshotFormat,
    sourceUri: args.sourceUri,
  };
}

async function createDatasetInput(args, modules) {
  if (args.snapshotPath === undefined) {
    const fixturePath = resolveInputPath(args.fixture);
    const rows = normalizeFixtureRows(readJsonFixture(fixturePath));

    return {
      officialSnapshot: undefined,
      rowIds: rows.map((row) => row.id),
      rows,
      sourceLineage: undefined,
      tombstoneIds: [],
    };
  }

  const checksumSha256 = await hashFileSha256(resolveInputPath(args.snapshotPath));
  assertExpectedSnapshotChecksum(args, checksumSha256);
  const officialSnapshot = await openOfficialSnapshotEntries(args);
  const municipalityRegionMap = await loadMunicipalityRegionMap(args);
  const sourceLineage = createSourceLineage(args, checksumSha256);
  const parsedChanges = parseOfficialSnapshotChanges(
    args,
    modules,
    officialSnapshot,
    checksumSha256,
    municipalityRegionMap,
  );
  const collected = collectImportChangeIds(parsedChanges);

  return {
    officialSnapshot: summarizeOfficialSnapshot(
      officialSnapshot,
      checksumSha256,
      args,
      municipalityRegionMap,
    ),
    rowIds: collected.rowIds,
    rows: collected.rows,
    sourceLineage,
    tombstoneIds: collected.tombstoneIds,
  };
}

async function importDataset(args, modules) {
  const datasetInput = await createDatasetInput(args, modules);
  const repositories = await createRepositories(args, modules);
  const metadata = createImportMetadata(args);
  const source = modules.createAuthoritativeAddressImportSource(metadata);
  const result = await modules.runAddressDatasetImport({
    chunkSize: args.chunkSize,
    repositories,
    rows: datasetInput.rows,
    runId: modules.createAddressImportRunId(metadata),
    source,
    sourceLineage: datasetInput.sourceLineage,
  });

  return {
    officialSnapshot: datasetInput.officialSnapshot,
    repositories,
    result,
    rowIds: datasetInput.rowIds,
    tombstoneIds: datasetInput.tombstoneIds,
  };
}

async function importShardRoute({ args, modules, route }) {
  const repositories = await createRepositories(
    {
      ...args,
      d1Binding: route.bindingName,
    },
    modules,
  );
  const metadata = {
    ...createImportMetadata(args),
    region: route.regionCode,
  };
  const source = modules.createAuthoritativeAddressImportSource(metadata);
  const result = await modules.runAddressDatasetImport({
    chunkSize: args.chunkSize,
    repositories,
    rows: readJsonlImportChanges(route.filePath),
    runId: modules.createAddressImportRunId(metadata),
    source,
    sourceLineage: createSourceLineage(args, route.checksumSha256),
  });

  return {
    bindingName: route.bindingName,
    regionKind: route.regionKind,
    regionName: route.regionName,
    regionCode: route.regionCode,
    result,
    route,
  };
}

async function updateRouterShardRegistry({ args, modules, shardResults }) {
  const repositories = await createRepositories(
    {
      ...args,
      d1Binding: args.routerD1Binding,
    },
    modules,
  );
  const existingRecords = await runCliEffectAsPromise(
    repositories.shardRegistry.listShardMetadata({
      countryCode: args.country,
    }),
  );
  const existingByRegion = new Map(
    existingRecords.map((record) => [
      `${record.countryCode}:${record.regionKind}:${record.regionCode}:${record.state}`,
      record,
    ]),
  );
  const updated = [];
  const nextActiveRegionKeys = new Set(
    shardResults.map(
      (shardResult) =>
        `${args.country}:${shardResult.route.regionKind ?? 'vusc'}:${shardResult.regionCode}`,
    ),
  );

  for (const shardResult of shardResults) {
    const regionKind = shardResult.route.regionKind ?? 'vusc';
    const previousRowCount =
      existingByRegion.get(`${args.country}:${regionKind}:${shardResult.regionCode}:active`)
        ?.rowCount ?? 0;
    const nextRowCount = Math.max(
      0,
      previousRowCount + shardResult.result.insertedRows - shardResult.result.tombstonedRows,
    );
    const record = await runCliEffectAsPromise(
      repositories.shardRegistry.upsertShardMetadata({
        bindingName: shardResult.bindingName,
        countryCode: args.country,
        estimatedSizeBytes: shardResult.route.estimatedSizeBytes,
        importVersion: args.datasetVersion,
        lastImportCompletedAt: shardResult.result.importRun.completedAt,
        regionCode: shardResult.regionCode,
        regionKind,
        regionName: shardResult.route.regionName ?? `VUSC ${shardResult.regionCode}`,
        rowCount: nextRowCount,
        shardId: `smart-suggest-${args.country.toLocaleLowerCase('en-US')}-${regionKind}-${
          shardResult.regionCode
        }`,
        sourceFreshnessAt: args.sourceValidAt,
        state: 'active',
      }),
    );
    updated.push(record);
  }

  for (const existingRecord of existingRecords) {
    const existingRegionKey = `${existingRecord.countryCode}:${existingRecord.regionKind}:${existingRecord.regionCode}`;

    if (existingRecord.state !== 'active' || nextActiveRegionKeys.has(existingRegionKey)) {
      continue;
    }

    const record = await runCliEffectAsPromise(
      repositories.shardRegistry.upsertShardMetadata({
        bindingName: existingRecord.bindingName,
        countryCode: existingRecord.countryCode,
        estimatedSizeBytes: existingRecord.estimatedSizeBytes,
        importVersion: existingRecord.importVersion,
        lastImportCompletedAt: existingRecord.lastImportCompletedAt,
        municipalityCodes: existingRecord.municipalityCodes,
        municipalityHints: existingRecord.municipalityHints,
        postalPrefixes: existingRecord.postalPrefixes,
        regionCode: existingRecord.regionCode,
        regionKind: existingRecord.regionKind,
        regionName: existingRecord.regionName,
        rowCount: existingRecord.rowCount,
        shardId: existingRecord.shardId,
        sourceFreshnessAt: existingRecord.sourceFreshnessAt,
        state: 'disabled',
      }),
    );
    updated.push(record);
  }

  return updated;
}

async function planShardedDataset(args, modules) {
  const datasetInput = await createDatasetInput(args, modules);

  if (datasetInput.officialSnapshot === undefined) {
    throw new Error('import-sharded-d1 route planning requires an external official snapshot.');
  }

  const routed = await routeImportChangesToShardFiles(args, datasetInput.rows);

  try {
    const routes = routed.routes;

    return {
      budget: evaluateShardRouteBudgets(args, routes),
      officialSnapshot: datasetInput.officialSnapshot,
      physicalShards: summarizePhysicalShardRoutes(routes),
      routes: summarizeShardRoutes(routes),
      routingStrategy: args.shardRouteStrategy,
      storageEstimatePolicy: storageEstimatePolicy(args),
      totals: summarizeRouteTotals(routes),
    };
  } finally {
    fs.rmSync(routed.routeTempDir, { force: true, recursive: true });
  }
}

const artifactTokenPattern = /[\p{L}\p{N}]+/gu;
const artifactHashModulus = 2_147_483_647;
const artifactBucketFlushBytes = 256 * 1024;
const artifactTotalFlushBytes = 16 * 1024 * 1024;

class ArtifactAppendBuckets {
  constructor(directory, extension) {
    this.buffers = new Map();
    this.directory = directory;
    this.extension = extension;
    this.totalBufferedBytes = 0;
  }

  append(bucketName, line) {
    const fileName = `${bucketName}.${this.extension}`;
    const text = `${line}\n`;
    const byteLength = Buffer.byteLength(text);
    const buffer = this.buffers.get(fileName) ?? {
      bytes: 0,
      chunks: [],
    };

    buffer.bytes += byteLength;
    buffer.chunks.push(text);
    this.buffers.set(fileName, buffer);
    this.totalBufferedBytes += byteLength;

    if (buffer.bytes >= artifactBucketFlushBytes) {
      this.flushFile(fileName);
    }
    if (this.totalBufferedBytes >= artifactTotalFlushBytes) {
      this.flushLargestFile();
    }
  }

  filePath(fileName) {
    return path.join(this.directory, fileName);
  }

  flushFile(fileName) {
    const buffer = this.buffers.get(fileName);

    if (buffer === undefined) {
      return;
    }

    fs.mkdirSync(this.directory, { recursive: true });
    fs.appendFileSync(this.filePath(fileName), buffer.chunks.join(''));
    this.totalBufferedBytes -= buffer.bytes;
    this.buffers.delete(fileName);
  }

  flushLargestFile() {
    let largestFileName;
    let largestBytes = 0;

    for (const [fileName, buffer] of this.buffers.entries()) {
      if (buffer.bytes > largestBytes) {
        largestBytes = buffer.bytes;
        largestFileName = fileName;
      }
    }

    if (largestFileName !== undefined) {
      this.flushFile(largestFileName);
    }
  }

  flushAll() {
    for (const fileName of [...this.buffers.keys()]) {
      this.flushFile(fileName);
    }
  }
}

function normalizeArtifactSearchText(value) {
  return value
    .normalize('NFKD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('cs-CZ')
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replaceAll(/\s+/gu, ' ');
}

function postalDigits(value) {
  return value?.replaceAll(/\D/gu, '') ?? '';
}

function hashArtifactKey(value) {
  let hash = 0;

  for (const character of value) {
    hash = (Math.imul(hash, 131) + (character.codePointAt(0) ?? 0)) % artifactHashModulus;

    if (hash < 0) {
      hash += artifactHashModulus;
    }
  }

  return hash;
}

function artifactBucketForKey(value, bucketCount) {
  return hashArtifactKey(value) % bucketCount;
}

function artifactBucketName(bucket) {
  return String(bucket).padStart(4, '0');
}

function artifactOrderedSearchTokens(value) {
  const normalized = normalizeArtifactSearchText(value);
  const seen = new Set();
  const tokens = [];

  for (const match of normalized.matchAll(artifactTokenPattern)) {
    const [token] = match;

    if (token.length === 0 || seen.has(token)) {
      continue;
    }

    seen.add(token);
    tokens.push(token);
  }

  return tokens;
}

function addArtifactTokenPrefixes(tokens, token, args) {
  const maxLength = Math.min(token.length, args.artifactMaxTokenLength);

  for (let length = args.artifactMinTokenLength; length <= maxLength; length += 1) {
    tokens.add(token.slice(0, length));
  }
}

function addArtifactSequenceTokenPrefixes(tokens, leftToken, rightToken, args) {
  const left = leftToken.slice(0, args.artifactMaxTokenLength);
  const maxLength = Math.min(rightToken.length, args.artifactMaxTokenLength);

  if (left.length === 0) {
    return;
  }

  for (let length = args.artifactMinTokenLength; length <= maxLength; length += 1) {
    tokens.add(`${left} ${rightToken.slice(0, length)}`);
  }
}

function artifactTokensForRecord(record, args) {
  const searchTokens = artifactOrderedSearchTokens(record.searchLabel);
  const tokens = new Set();
  const postalCode = postalDigits(record.parts.postalCode ?? record.ruian?.postalCode);
  const countryToken = normalizeArtifactSearchText(record.parts.countryCode ?? record.countryCode);

  for (const token of searchTokens) {
    addArtifactTokenPrefixes(tokens, token, args);
  }

  for (let index = 1; index < searchTokens.length; index += 1) {
    const left = searchTokens[index - 1];
    const right = searchTokens[index];

    if (left !== countryToken && right !== countryToken) {
      addArtifactSequenceTokenPrefixes(tokens, left, right, args);
    }
  }

  if (postalCode.length >= args.artifactMinTokenLength) {
    const maxLength = Math.min(postalCode.length, args.artifactMaxTokenLength);

    for (let length = args.artifactMinTokenLength; length <= maxLength; length += 1) {
      tokens.add(postalCode.slice(0, length));
    }
  }
  if (countryToken.length > 0) {
    tokens.delete(countryToken);
  }

  return [...tokens].toSorted();
}

function replicationStatusForArtifactRecord(record) {
  if (record.replicationStatus !== undefined) {
    return record.replicationStatus;
  }
  if (record.visibility?.replicationStatus !== undefined) {
    return record.visibility.replicationStatus;
  }

  return record.visibility?.invalid === true ? 'invalid' : 'active';
}

function searchVisibleForArtifactRecord(record, replicationStatus) {
  return record.searchVisible ?? record.visibility?.searchVisible ?? replicationStatus === 'active';
}

function toArtifactAddressRecord(record, timestamp) {
  const replicationStatus = replicationStatusForArtifactRecord(record);
  const searchVisible = searchVisibleForArtifactRecord(record, replicationStatus);

  return {
    ...record,
    createdAt: timestamp,
    replicationStatus,
    searchVisible,
    updatedAt: timestamp,
  };
}

function addMapValue(map, key, value) {
  const values = map.get(key);

  if (values === undefined) {
    map.set(key, [value]);
    return;
  }

  values.push(value);
}

async function* readNonEmptyLines(filePath) {
  const lines = createInterface({
    crlfDelay: Infinity,
    input: fs.createReadStream(filePath, 'utf8'),
  });

  for await (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.length > 0) {
      yield trimmed;
    }
  }
}

async function* readJsonArtifactLines(filePath) {
  for await (const line of readNonEmptyLines(filePath)) {
    yield JSON.parse(line);
  }
}

function compareArtifactRecords(left, right) {
  return (
    right.quality - left.quality ||
    left.displayLabel.localeCompare(right.displayLabel, 'cs-CZ') ||
    left.id.localeCompare(right.id, 'cs-CZ')
  );
}

function artifactPostalLocalityKey(record, postalCode) {
  const city = record.parts.city?.trim();

  if (city === undefined || city.length === 0) {
    return undefined;
  }

  const localityCountryCode = record.parts.countryCode ?? record.countryCode;

  return [
    localityCountryCode,
    postalCode,
    normalizeArtifactSearchText(city),
    normalizeArtifactSearchText(record.parts.region ?? ''),
  ].join('|');
}

function addArtifactPostalLocalityCandidate(bestByLocality, postalCode, record) {
  const key = artifactPostalLocalityKey(record, postalCode);

  if (key === undefined) {
    return;
  }

  const existing = bestByLocality.get(key);

  if (
    existing === undefined ||
    record.quality > existing.quality ||
    (record.quality === existing.quality &&
      record.displayLabel.localeCompare(existing.displayLabel, 'cs-CZ') < 0)
  ) {
    bestByLocality.set(key, record);
  }
}

function sortArtifactPostalLocalityRecords(records) {
  return records.toSorted((left, right) => {
    const leftCity = left.parts.city ?? '';
    const rightCity = right.parts.city ?? '';

    return (
      leftCity.localeCompare(rightCity, 'cs-CZ') ||
      (left.parts.region ?? '').localeCompare(right.parts.region ?? '', 'cs-CZ') ||
      right.quality - left.quality ||
      left.displayLabel.localeCompare(right.displayLabel, 'cs-CZ')
    );
  });
}

function writeJsonArtifact(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`);
}

function listArtifactBucketFiles(directory, extension) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(`.${extension}`))
    .map((entry) => ({
      bucketName: entry.name.slice(0, -1 * `.${extension}`.length),
      path: path.join(directory, entry.name),
    }))
    .toSorted((left, right) => left.bucketName.localeCompare(right.bucketName, 'cs-CZ'));
}

function summarizeArtifactFiles(outDir, maxFileSizeBytes) {
  const files = fs
    .readdirSync(outDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile());
  let totalSizeBytes = 0;
  let largestFile = {
    path: undefined,
    sizeBytes: 0,
  };
  const oversizedFiles = [];

  for (const entry of files) {
    const parentPath = entry.parentPath ?? outDir;
    const filePath = path.join(parentPath, entry.name);
    const sizeBytes = fs.statSync(filePath).size;
    const relativePath = path.relative(outDir, filePath);

    totalSizeBytes += sizeBytes;

    if (sizeBytes > largestFile.sizeBytes) {
      largestFile = {
        path: relativePath,
        sizeBytes,
      };
    }
    if (maxFileSizeBytes !== undefined && sizeBytes > maxFileSizeBytes) {
      oversizedFiles.push({
        path: relativePath,
        sizeBytes,
      });
    }
  }

  return {
    fileCount: files.length,
    largestFile,
    oversizedFiles: oversizedFiles.toSorted((left, right) => right.sizeBytes - left.sizeBytes),
    totalSizeBytes,
  };
}

function artifactSourceRecord(source, timestamp) {
  return {
    attribution: source.attribution,
    cachePolicy: source.cachePolicy,
    countryCode: source.countryCode,
    createdAt: timestamp,
    datasetVersion: source.datasetVersion,
    id: source.id,
    modificationNoteSha256: source.modificationNoteSha256,
    name: source.name,
    region: source.region,
    sourceKind: source.sourceKind,
    updatedAt: timestamp,
  };
}

function artifactImportRunRecord({ args, complete, runId, source, timestamp, totals }) {
  return {
    atomEntryId: args.atomEntryId,
    checksumSha256: normalizeSha256(args.expectedChecksumSha256),
    completedAt: timestamp,
    failedRows: totals.failedRows,
    id: runId,
    importKind: args.fileKind,
    insertedRows: totals.addressRows,
    shardCountryCode: source.shardCountryCode,
    skippedRows: totals.failedRows,
    sourceFeedId: args.feedId,
    sourceGeneratedAt: args.sourceGeneratedAt,
    sourceId: source.id,
    sourceUri: args.sourceUri,
    sourceValidAt: args.sourceValidAt,
    sourceVersion: args.sourceVersion ?? args.datasetVersion,
    startedAt: timestamp,
    status: complete && totals.failedRows === 0 ? 'completed' : 'failed',
    tombstonedRows: totals.tombstoneRows,
    totalRows: totals.totalRows,
    upsertedRows: totals.addressRows,
  };
}

function artifactShardRecord({ args, complete, estimatedSizeBytes, rowCount, timestamp }) {
  return {
    bindingName: 'SMART_SUGGEST_OWNED_ARTIFACTS',
    countryCode: args.country,
    createdAt: timestamp,
    estimatedSizeBytes,
    importVersion: args.datasetVersion,
    lastImportCompletedAt: complete ? timestamp : undefined,
    municipalityCodes: [],
    municipalityHints: [],
    postalPrefixes: [],
    regionCode: args.country,
    regionKind: 'country',
    regionName: `${args.country} owned static artifact index`,
    rowCount,
    shardId: `smart-suggest-${args.country.toLocaleLowerCase('en-US')}-owned-artifacts`,
    sourceFreshnessAt: args.sourceValidAt,
    state: complete ? 'active' : 'standby',
    updatedAt: timestamp,
  };
}

async function writePostalArtifactsFromTemp({ args, datasetVersion, outDir, postalTempDir }) {
  const postalSummaries = [];

  for (const bucketFile of listArtifactBucketFiles(postalTempDir, 'jsonl')) {
    const postalCode = bucketFile.bucketName;
    const bestByLocality = new Map();

    for await (const record of readJsonArtifactLines(bucketFile.path)) {
      addArtifactPostalLocalityCandidate(bestByLocality, postalCode, record);
    }

    const sortedRecords = sortArtifactPostalLocalityRecords([...bestByLocality.values()]);
    const relativePath = `postal/${args.country}/${postalCode}.json`;

    writeJsonArtifact(path.join(outDir, relativePath), {
      complete: true,
      countryCode: args.country,
      datasetVersion,
      query: {
        kind: 'postal-code',
        value: postalCode,
      },
      records: sortedRecords,
      schemaVersion: 'smart-suggest-address-records/v1',
    });
    postalSummaries.push({
      path: relativePath,
      postalCode,
      recordCount: sortedRecords.length,
    });
  }

  return postalSummaries;
}

async function writeRecordArtifactsFromTemp({ args, datasetVersion, outDir, recordTempDir }) {
  const recordShardSummaries = [];

  for (const bucketFile of listArtifactBucketFiles(recordTempDir, 'jsonl')) {
    const bucketName = bucketFile.bucketName;
    const bucket = Number(bucketName);
    const records = [];

    for await (const record of readJsonArtifactLines(bucketFile.path)) {
      records.push(record);
    }

    const sortedRecords = records.toSorted((left, right) =>
      left.id.localeCompare(right.id, 'cs-CZ'),
    );
    const relativePath = `records/${args.country}/${bucketName}.json`;

    writeJsonArtifact(path.join(outDir, relativePath), {
      complete: true,
      countryCode: args.country,
      datasetVersion,
      query: {
        kind: 'address-record-bucket',
        value: bucketName,
      },
      records: sortedRecords,
      schemaVersion: 'smart-suggest-address-records/v1',
    });
    recordShardSummaries.push({
      bucket,
      path: relativePath,
      recordCount: sortedRecords.length,
    });
  }

  return recordShardSummaries;
}

function parseArtifactTokenReference(line) {
  const separatorIndex = line.indexOf('\t');

  if (separatorIndex < 1 || separatorIndex === line.length - 1) {
    throw new Error('Artifact token reference line is malformed.');
  }

  return {
    recordId: line.slice(separatorIndex + 1),
    token: line.slice(0, separatorIndex),
  };
}

function tokenBucketArtifact({ args, bucket, datasetVersion, tokens }) {
  return {
    bucket,
    complete: true,
    countryCode: args.country,
    datasetVersion,
    schemaVersion: 'smart-suggest-address-token-bucket/v1',
    tokens,
  };
}

function tokenBucketPageArtifact({ args, bucket, datasetVersion, page, tokens }) {
  return {
    bucket,
    complete: true,
    countryCode: args.country,
    datasetVersion,
    page,
    schemaVersion: 'smart-suggest-address-token-bucket-page/v1',
    tokens,
  };
}

function artifactJsonSizeBytes(value) {
  return Buffer.byteLength(`${JSON.stringify(value)}\n`);
}

function tokenEntriesToObject(entries) {
  return Object.fromEntries(
    entries.map(([token, recordIds]) => [
      token,
      {
        recordCount: recordIds.length,
        recordIds,
      },
    ]),
  );
}

function writePagedTokenBucketArtifacts({
  args,
  bucket,
  bucketName,
  datasetVersion,
  outDir,
  sortedTokenEntries,
}) {
  const pages = [];
  const tokenReferences = {};
  let pageEntries = [];

  const writePage = () => {
    if (pageEntries.length === 0) {
      return;
    }

    const page = pages.length;
    const pageName = String(page).padStart(4, '0');
    const relativePath = `token/${args.country}/bucket-${bucketName}/${pageName}.json`;
    const tokens = tokenEntriesToObject(pageEntries);
    const recordCount = pageEntries.reduce((count, [, recordIds]) => count + recordIds.length, 0);

    writeJsonArtifact(
      path.join(outDir, relativePath),
      tokenBucketPageArtifact({
        args,
        bucket,
        datasetVersion,
        page,
        tokens,
      }),
    );

    for (const [token, recordIds] of pageEntries) {
      tokenReferences[token] = {
        page,
        recordCount: recordIds.length,
      };
    }

    pages.push({
      page,
      path: relativePath,
      recordCount,
      tokenCount: pageEntries.length,
    });
    pageEntries = [];
  };

  for (const tokenEntry of sortedTokenEntries) {
    const oneTokenSizeBytes = artifactJsonSizeBytes(
      tokenBucketPageArtifact({
        args,
        bucket,
        datasetVersion,
        page: pages.length,
        tokens: tokenEntriesToObject([tokenEntry]),
      }),
    );

    if (oneTokenSizeBytes > args.artifactMaxFileSizeBytes) {
      throw new Error(
        `Artifact token "${tokenEntry[0]}" produces ${oneTokenSizeBytes} bytes, exceeding --artifact-max-file-size-bytes ${args.artifactMaxFileSizeBytes}.`,
      );
    }

    const nextEntries = [...pageEntries, tokenEntry];
    const nextSizeBytes = artifactJsonSizeBytes(
      tokenBucketPageArtifact({
        args,
        bucket,
        datasetVersion,
        page: pages.length,
        tokens: tokenEntriesToObject(nextEntries),
      }),
    );

    if (pageEntries.length > 0 && nextSizeBytes > args.artifactMaxFileSizeBytes) {
      writePage();
    }

    pageEntries.push(tokenEntry);
  }

  writePage();

  const relativePath = `token/${args.country}/bucket-${bucketName}/manifest.json`;

  writeJsonArtifact(path.join(outDir, relativePath), {
    bucket,
    complete: true,
    countryCode: args.country,
    datasetVersion,
    pageCount: pages.length,
    pages,
    schemaVersion: 'smart-suggest-address-token-bucket-manifest/v1',
    tokens: tokenReferences,
  });

  return {
    pageCount: pages.length,
    path: relativePath,
  };
}

async function writeTokenArtifactsFromTemp({ args, datasetVersion, outDir, tokenTempDir }) {
  const tokenBucketSummaries = [];
  let tokenIdReferenceCount = 0;
  let tokenShardCount = 0;

  for (const bucketFile of listArtifactBucketFiles(tokenTempDir, 'tsv')) {
    const bucketName = bucketFile.bucketName;
    const bucket = Number(bucketName);
    const bucketTokens = new Map();

    for await (const line of readNonEmptyLines(bucketFile.path)) {
      const reference = parseArtifactTokenReference(line);
      const recordIds = bucketTokens.get(reference.token) ?? new Set();

      recordIds.add(reference.recordId);
      bucketTokens.set(reference.token, recordIds);
    }

    const sortedTokenEntries = [...bucketTokens.entries()]
      .toSorted((left, right) => left[0].localeCompare(right[0], 'cs-CZ'))
      .map(([token, recordIdSet]) => {
        const recordIds = [...recordIdSet].toSorted((left, right) =>
          left.localeCompare(right, 'cs-CZ'),
        );

        tokenIdReferenceCount += recordIds.length;
        tokenShardCount += 1;

        return [token, recordIds];
      });
    const tokens = tokenEntriesToObject(sortedTokenEntries);
    const relativePath = `token/${args.country}/bucket-${bucketName}.json`;
    const artifact = tokenBucketArtifact({
      args,
      bucket,
      datasetVersion,
      tokens,
    });

    if (artifactJsonSizeBytes(artifact) <= args.artifactMaxFileSizeBytes) {
      writeJsonArtifact(path.join(outDir, relativePath), artifact);
      tokenBucketSummaries.push({
        bucket,
        pageCount: 1,
        path: relativePath,
        tokenCount: bucketTokens.size,
      });
    } else {
      const paged = writePagedTokenBucketArtifacts({
        args,
        bucket,
        bucketName,
        datasetVersion,
        outDir,
        sortedTokenEntries,
      });

      tokenBucketSummaries.push({
        bucket,
        pageCount: paged.pageCount,
        path: paged.path,
        tokenCount: bucketTokens.size,
      });
    }
  }

  return {
    tokenBucketSummaries,
    tokenIdReferenceCount,
    tokenShardCount,
  };
}

async function buildOwnedDataArtifacts(args, modules) {
  const datasetInput = await createDatasetInput(args, modules);
  const timestamp = new Date().toISOString();
  const metadata = createImportMetadata(args);
  const source = modules.createAuthoritativeAddressImportSource(metadata);
  const runId = modules.createAddressImportRunId(metadata);
  const complete = !(datasetInput.officialSnapshot !== undefined && args.maxRows !== undefined);
  const outDir = resolveWorkspacePath(args.artifactOutDir);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smart-suggest-owned-artifacts-'));
  const recordBuckets = new ArtifactAppendBuckets(path.join(tempDir, 'records'), 'jsonl');
  const tokenBuckets = new ArtifactAppendBuckets(path.join(tempDir, 'tokens'), 'tsv');
  const postalBuckets = new ArtifactAppendBuckets(path.join(tempDir, 'postal'), 'jsonl');
  const errors = [];
  const totals = {
    addressRows: 0,
    failedRows: 0,
    tombstoneRows: 0,
    totalRows: 0,
  };

  fs.rmSync(outDir, { force: true, recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  try {
    for await (const input of datasetInput.rows) {
      totals.totalRows += 1;

      if ('kind' in input && input.kind === 'tombstone') {
        totals.tombstoneRows += 1;
        continue;
      }

      const row = 'kind' in input && input.kind === 'address' ? input.row : input;
      const normalized = modules.normalizeAddressSnapshotRowForImport(
        row,
        source,
        totals.totalRows - 1,
        runId,
      );

      if ('message' in normalized) {
        totals.failedRows += 1;

        if (errors.length < 5) {
          errors.push(normalized);
        }

        continue;
      }

      const record = toArtifactAddressRecord(normalized, timestamp);

      if (record.replicationStatus !== 'active' || !record.searchVisible) {
        continue;
      }

      totals.addressRows += 1;

      const recordLine = JSON.stringify(record);
      const recordBucketName = artifactBucketName(
        artifactBucketForKey(record.id, args.artifactRecordShardCount),
      );

      recordBuckets.append(recordBucketName, recordLine);

      const recordPostalCode = postalDigits(record.parts.postalCode ?? record.ruian?.postalCode);

      if (recordPostalCode.length > 0) {
        postalBuckets.append(recordPostalCode, recordLine);
      }

      for (const token of artifactTokensForRecord(record, args)) {
        const tokenBucketName = artifactBucketName(
          artifactBucketForKey(token, args.artifactTokenBucketCount),
        );

        tokenBuckets.append(tokenBucketName, `${token}\t${record.id}`);
      }
    }

    recordBuckets.flushAll();
    tokenBuckets.flushAll();
    postalBuckets.flushAll();

    if (totals.failedRows > 0) {
      throw new Error(`Artifact build rejected ${totals.failedRows} address row(s).`);
    }

    const postalSummaries = await writePostalArtifactsFromTemp({
      args,
      datasetVersion: args.datasetVersion,
      outDir,
      postalTempDir: path.join(tempDir, 'postal'),
    });
    const recordShardSummaries = await writeRecordArtifactsFromTemp({
      args,
      datasetVersion: args.datasetVersion,
      outDir,
      recordTempDir: path.join(tempDir, 'records'),
    });
    const { tokenBucketSummaries, tokenIdReferenceCount, tokenShardCount } =
      await writeTokenArtifactsFromTemp({
        args,
        datasetVersion: args.datasetVersion,
        outDir,
        tokenTempDir: path.join(tempDir, 'tokens'),
      });
    const firstArtifactFileSummary = summarizeArtifactFiles(outDir, args.artifactMaxFileSizeBytes);
    const manifest = {
      dataset: {
        complete,
        countryCode: args.country,
        estimatedSizeBytes: firstArtifactFileSummary.totalSizeBytes,
        importRun: artifactImportRunRecord({
          args,
          complete,
          runId,
          source,
          timestamp,
          totals,
        }),
        rowCount: totals.addressRows,
        source: artifactSourceRecord(source, timestamp),
      },
      generatedAt: timestamp,
      indexes: {
        addressRecords: {
          bucketCount: args.artifactRecordShardCount,
          complete,
          pathTemplate: 'records/{countryCode}/{recordBucket}.json',
        },
        addressTokens: {
          bucketCount: args.artifactTokenBucketCount,
          bucketManifestPathTemplate: 'token/{countryCode}/bucket-{tokenBucket}/manifest.json',
          bucketPagePathTemplate: 'token/{countryCode}/bucket-{tokenBucket}/{page}.json',
          bucketPathTemplate: 'token/{countryCode}/bucket-{tokenBucket}.json',
          complete,
          maxFileSizeBytes: args.artifactMaxFileSizeBytes,
          manifestPathTemplate: 'token/{countryCode}/{token}/manifest.json',
          maxPagesPerQuery: 4,
          maxTokenLength: args.artifactMaxTokenLength,
          minTokenLength: args.artifactMinTokenLength,
          pagePathTemplate: 'token/{countryCode}/{token}/{page}.json',
          pageSize: args.artifactPageSize,
        },
        postalLocalities: {
          complete,
          pathTemplate: 'postal/{countryCode}/{postalCode}.json',
        },
      },
      schemaVersion: 'smart-suggest-owned-artifacts/v1',
      shards: [
        artifactShardRecord({
          args,
          complete,
          estimatedSizeBytes: firstArtifactFileSummary.totalSizeBytes,
          rowCount: totals.addressRows,
          timestamp,
        }),
      ],
    };
    const manifestPath = path.join(outDir, 'manifest.json');

    writeJsonArtifact(manifestPath, manifest);

    const artifactFileSummary = summarizeArtifactFiles(outDir, args.artifactMaxFileSizeBytes);

    if (artifactFileSummary.oversizedFiles.length > 0) {
      const [largestOversizedFile] = artifactFileSummary.oversizedFiles;

      throw new Error(
        `Artifact build produced ${artifactFileSummary.oversizedFiles.length} file(s) larger than ${args.artifactMaxFileSizeBytes} bytes. Largest: ${largestOversizedFile.path} (${largestOversizedFile.sizeBytes} bytes).`,
      );
    }

    return {
      artifactFileCount: artifactFileSummary.fileCount,
      artifactOutDir: path.relative(workspaceRoot, outDir),
      complete,
      estimatedSizeBytes: artifactFileSummary.totalSizeBytes,
      largestArtifactFile: artifactFileSummary.largestFile,
      manifestPath: path.relative(workspaceRoot, manifestPath),
      officialSnapshot: datasetInput.officialSnapshot,
      oversizedArtifactFiles: artifactFileSummary.oversizedFiles,
      postalShardCount: postalSummaries.length,
      recordShardCount: recordShardSummaries.length,
      rowCount: totals.addressRows,
      schemaVersion: manifest.schemaVersion,
      staticAssetMaxFileSizeBytes: args.artifactMaxFileSizeBytes,
      tokenBucketCount: tokenBucketSummaries.length,
      tokenIdReferenceCount,
      tokenShardCount,
      totals,
    };
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
}

async function importShardedDataset(args, modules) {
  const datasetInput = await createDatasetInput(args, modules);

  if (datasetInput.officialSnapshot === undefined) {
    throw new Error('import-sharded-d1 requires an external official snapshot.');
  }

  const routed = await routeImportChangesToShardFiles(args, datasetInput.rows);
  assertShardRouteBudgets(args, routed.routes);

  try {
    const shardResults = [];

    for (const route of routed.routes.toSorted(compareRouteCodes)) {
      shardResults.push(
        await importShardRoute({
          args,
          modules,
          route: {
            ...route,
            checksumSha256: datasetInput.officialSnapshot.checksumSha256,
          },
        }),
      );
    }

    const shardRegistry = await updateRouterShardRegistry({
      args,
      modules,
      shardResults,
    });
    const totals = shardResults.reduce(
      (summary, shardResult) => ({
        failedRows: summary.failedRows + shardResult.result.errors.length,
        importedRows: summary.importedRows + shardResult.result.insertedRows,
        tombstonedRows: summary.tombstonedRows + shardResult.result.tombstonedRows,
        totalRows: summary.totalRows + shardResult.result.totalRows,
        upsertedRows: summary.upsertedRows + shardResult.result.upsertedRows,
      }),
      {
        failedRows: 0,
        importedRows: 0,
        tombstonedRows: 0,
        totalRows: 0,
        upsertedRows: 0,
      },
    );

    return {
      officialSnapshot: datasetInput.officialSnapshot,
      shardRegistry,
      shardResults,
      totals,
    };
  } finally {
    fs.rmSync(routed.routeTempDir, { force: true, recursive: true });
  }
}

async function importedLabels(repositories, rowIds) {
  const records = await Promise.all(
    rowIds.map((rowId) =>
      runCliEffectAsPromise(repositories.addressRecords.getAddressRecord(rowId)),
    ),
  );

  return records
    .filter((record) => record !== undefined)
    .map((record) => ({
      label: record.displayLabel,
      sourceId: record.sourceId,
    }));
}

function summarizeSuggestions(suggestions) {
  return {
    sourceIds: [...new Set(suggestions.map((suggestion) => suggestion.sourceId))],
    suggestionLabels: suggestions.map((suggestion) => suggestion.label),
  };
}

function writeReport(report, outPath) {
  if (outPath === undefined) {
    return;
  }

  const absoluteOut = resolveWorkspacePath(outPath);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, `${JSON.stringify(report, null, 2)}\n`);
}

async function runImportLocal(args, modules) {
  const { officialSnapshot, repositories, result, rowIds } = await importDataset(args, modules);
  const providerEvents = await runCliEffectAsPromise(
    repositories.providerEvents.listProviderEvents(args.scenarioId),
  );
  const labels = officialSnapshot === undefined ? await importedLabels(repositories, rowIds) : [];
  const summary = summarizeSuggestions(labels);
  const report = {
    failedRows: result.errors.length,
    importedRows: result.insertedRows,
    officialSnapshot,
    providerEventCount: providerEvents.length,
    rawSnapshotStoredInD1: result.rawSnapshotStoredInD1,
    restartable: result.restartable,
    scenarioId: 'local-import',
    tombstonedRows: result.tombstonedRows,
    totalRows: result.totalRows,
    upsertedRows: result.upsertedRows,
  };

  if (officialSnapshot === undefined) {
    report.sourceIds = summary.sourceIds;
    report.suggestionLabels = summary.suggestionLabels;
  }
  if (result.errors.length > 0) {
    throw new Error(`Import completed with ${result.errors.length} rejected row(s).`);
  }

  writeReport(report, args.out);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function runImportD1(args, modules) {
  const { officialSnapshot, repositories, result, rowIds } = await importDataset(args, modules);
  const providerEvents = await runCliEffectAsPromise(
    repositories.providerEvents.listProviderEvents(result.importRun.id),
  );
  const labels = officialSnapshot === undefined ? await importedLabels(repositories, rowIds) : [];
  const summary = summarizeSuggestions(labels);
  const report = {
    d1Target: args.d1Target,
    failedRows: result.errors.length,
    importedRows: result.insertedRows,
    officialSnapshot,
    providerEventCount: providerEvents.length,
    rawSnapshotStoredInD1: result.rawSnapshotStoredInD1,
    restartable: result.restartable,
    scenarioId: result.importRun.id,
    searchIndexMode: args.searchIndexMode,
    tombstonedRows: result.tombstonedRows,
    totalRows: result.totalRows,
    upsertedRows: result.upsertedRows,
  };

  if (officialSnapshot === undefined) {
    report.sourceIds = summary.sourceIds;
    report.suggestionLabels = summary.suggestionLabels;
  }
  if (result.errors.length > 0) {
    throw new Error(`D1 import completed with ${result.errors.length} rejected row(s).`);
  }

  writeReport(report, args.out);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function runImportShardedD1(args, modules) {
  if (args.routePlanOnly) {
    const routePlan = await planShardedDataset(args, modules);
    const report = {
      budget: routePlan.budget,
      d1Target: args.d1Target,
      failedRows: 0,
      mode: 'route-plan-only',
      officialSnapshot: routePlan.officialSnapshot,
      physicalShardCount: routePlan.physicalShards.length,
      physicalShards: routePlan.physicalShards,
      rawSnapshotStoredInD1: false,
      restartable: true,
      routerBinding: args.routerD1Binding,
      routingStrategy: routePlan.routingStrategy,
      scenarioId: `route-plan-sharded-${args.sourceId}-${args.country}-${args.datasetVersion}`,
      searchIndexMode: args.searchIndexMode,
      shardCount: routePlan.routes.length,
      shards: routePlan.routes,
      status: routePlan.budget.status,
      storageEstimatePolicy: routePlan.storageEstimatePolicy,
      tombstonedRows: routePlan.totals.tombstoneRows,
      totalEstimatedSizeBytes: routePlan.totals.estimatedSizeBytes,
      totalRows: routePlan.totals.totalRows,
    };

    writeReport(report, args.out);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

    if (routePlan.budget.status !== 'ok') {
      throw new Error('Sharded route plan exceeds the configured shard row budget.');
    }

    return;
  }

  const { officialSnapshot, shardRegistry, shardResults, totals } = await importShardedDataset(
    args,
    modules,
  );
  const report = {
    d1Target: args.d1Target,
    failedRows: totals.failedRows,
    importedRows: totals.importedRows,
    officialSnapshot,
    rawSnapshotStoredInD1: false,
    restartable: true,
    routerBinding: args.routerD1Binding,
    routingStrategy: args.shardRouteStrategy,
    scenarioId: `import-sharded-${args.sourceId}-${args.country}-${args.datasetVersion}`,
    searchIndexMode: args.searchIndexMode,
    sourceProvenance: {
      modificationNoteSha256: normalizeSha256(args.modificationNoteSha256) ?? null,
    },
    storageEstimatePolicy: storageEstimatePolicy(args),
    shardCount: shardResults.length,
    shards: shardResults.map((shardResult) => ({
      bindingName: shardResult.bindingName,
      failedRows: shardResult.result.errors.length,
      importRunId: shardResult.result.importRun.id,
      importedRows: shardResult.result.insertedRows,
      estimatedSizeBytes: shardResult.route.estimatedSizeBytes,
      regionCode: shardResult.regionCode,
      regionKind: shardResult.regionKind,
      regionName: shardResult.regionName,
      routingStrategy: shardResult.route.routingStrategy,
      registryShardId:
        shardRegistry.find(
          (record) =>
            record.regionCode === shardResult.regionCode &&
            record.regionKind === shardResult.regionKind,
        )?.shardId ?? undefined,
      tombstonedRows: shardResult.result.tombstonedRows,
      totalRows: shardResult.result.totalRows,
      upsertedRows: shardResult.result.upsertedRows,
      sourceModificationNoteSha256: shardResult.result.source.modificationNoteSha256 ?? null,
    })),
    tombstonedRows: totals.tombstonedRows,
    totalRows: totals.totalRows,
    upsertedRows: totals.upsertedRows,
  };

  if (totals.failedRows > 0) {
    throw new Error(`Sharded D1 import completed with ${totals.failedRows} rejected row(s).`);
  }

  writeReport(report, args.out);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function runBuildArtifacts(args, modules) {
  const report = await buildOwnedDataArtifacts(args, modules);

  writeReport(report, args.out);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function runProofOffline(args, modules) {
  const { repositories } = await importDataset(args, modules);
  const records = await runCliEffectAsPromise(
    repositories.addressRecords.searchAddressRecords({
      countryCode: args.country,
      limit: args.limit,
      query: args.query,
    }),
  );
  const providerEvents = await runCliEffectAsPromise(
    repositories.providerEvents.listProviderEvents(args.scenarioId),
  );
  const suggestions = records.map((record) => ({
    label: record.displayLabel,
    sourceId: record.sourceId,
  }));
  const summary = summarizeSuggestions(suggestions);
  const report = {
    providerEventCount: providerEvents.length,
    scenarioId: args.scenarioId,
    sourceIds: summary.sourceIds,
    suggestionLabels: summary.suggestionLabels,
  };

  if (providerEvents.length !== 0) {
    throw new Error(`Offline proof recorded ${providerEvents.length} provider event(s).`);
  }
  if (!report.suggestionLabels.some((label) => label.includes(args.expectedLabel))) {
    throw new Error(`Offline proof did not find expected label fragment "${args.expectedLabel}".`);
  }

  writeReport(report, args.out);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return 0;
  }

  const modules = await loadSmartSuggestModules();

  if (args.command === 'import-local') {
    await runImportLocal(args, modules);
    return 0;
  }
  if (args.command === 'import-d1') {
    await runImportD1(args, modules);
    return 0;
  }
  if (args.command === 'import-sharded-d1') {
    await runImportShardedD1(args, modules);
    return 0;
  }
  if (args.command === 'build-artifacts') {
    await runBuildArtifacts(args, modules);
    return 0;
  }

  await runProofOffline(args, modules);
  return 0;
}

main().catch((error) => {
  process.stderr.write(`${sanitizeCliErrorMessage(error)}\n`);
  process.exitCode = 1;
});
