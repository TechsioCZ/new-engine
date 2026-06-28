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
const zipEndOfCentralDirectorySignature = 0x06_05_4b_50;
const zipCentralDirectorySignature = 0x02_01_4b_50;
const zipLocalFileHeaderSignature = 0x04_03_4b_50;
const maxZipEndOfCentralDirectorySearchBytes = 66_000;
const shardStorageEstimateFloorBytes = 64 * 1024;
const shardStorageEstimateMultiplier = 4;
const shardStorageEstimateRowFloorBytes = 512;
const csvZipEntryPattern = /\.(csv|txt)$/iu;
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
  '--out': 'out',
  '--persist-to': 'persistTo',
  '--previous-atom-entry-id': 'previousAtomEntryId',
  '--query': 'query',
  '--region': 'region',
  '--repository': 'repository',
  '--router-d1-binding': 'routerD1Binding',
  '--scenario-id': 'scenarioId',
  '--shard-binding-prefix': 'shardBindingPrefix',
  '--shard-bindings': 'shardBindings',
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
  '--chunk-size': 'chunkSize',
  '--limit': 'limit',
  '--max-rows': 'maxRows',
  '--shard-max-rows': 'shardMaxRows',
};
const booleanOptionFields = {
  '--apply-migrations': 'applyMigrations',
};

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/smart-suggest-owned-import.mjs import-local [--fixture fixture.jsonl] [--out proof.json]
  node scripts/smart-suggest-owned-import.mjs proof-offline [--fixture fixture.jsonl] [--out proof.json]
  node scripts/smart-suggest-owned-import.mjs import-d1 [--d1-target local|remote|preview] [--apply-migrations]
  node scripts/smart-suggest-owned-import.mjs import-sharded-d1 --snapshot-path file.csv [--apply-migrations]

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

D1 options:
  --d1-target local             Cloudflare D1 target: local, remote, or preview
  --d1-binding SMART_SUGGEST_D1 Wrangler D1 binding/name from generated config
  --wrangler-config path        Defaults to apps/shell-super-app/.output/wrangler.json
  --persist-to path             Optional Wrangler local D1 persistence directory
  --apply-migrations            Sync and apply configured D1 migrations before import
  --router-d1-binding value     Router D1 binding for shard metadata
  --shard-bindings value        Comma-separated shard binding allowlist
  --shard-binding-prefix value  Defaults to SMART_SUGGEST_CZ_VUSC_
  --shard-max-rows value        Abort sharded import if one shard route exceeds this row count
`);
}

function envValue(name) {
  const value = process.env[name]?.trim();

  return value === undefined || value === '' ? undefined : value;
}

function defaultArgs(command) {
  return {
    applyMigrations: false,
    chunkSize: 500,
    command,
    country: 'CZ',
    d1Binding: envValue('SMART_SUGGEST_D1_BINDING') ?? 'SMART_SUGGEST_D1',
    d1Target: 'local',
    datasetVersion: 'local-proof',
    expectedChecksumSha256: undefined,
    expectedLabel: defaultExpectedLabel,
    fixture: defaultFixturePath,
    atomEntryId: undefined,
    csvDelimiter: ';',
    csvEncoding: 'utf-8',
    feedId: undefined,
    fileKind: 'baseline',
    limit: 5,
    maxRows: undefined,
    modificationNoteSha256: undefined,
    out: undefined,
    persistTo: undefined,
    previousAtomEntryId: undefined,
    query: defaultScenarioQuery,
    region: undefined,
    repository: ['import-d1', 'import-sharded-d1'].includes(command) ? 'd1' : 'memory',
    routerD1Binding:
      envValue('SMART_SUGGEST_D1_ROUTER_BINDING') ??
      envValue('SMART_SUGGEST_ROUTER_D1_BINDING') ??
      'SMART_SUGGEST_ROUTER_D1',
    scenarioId: defaultScenarioId,
    shardBindingPrefix: 'SMART_SUGGEST_CZ_VUSC_',
    shardBindings: envValue('SMART_SUGGEST_D1_SHARD_BINDINGS'),
    shardMaxRows: undefined,
    snapshotEntry: undefined,
    snapshotFormat: 'auto',
    snapshotPath: undefined,
    snapshotUri: undefined,
    sourceGeneratedAt: undefined,
    sourceId: 'ruian-cz',
    sourceName: undefined,
    sourceUri: undefined,
    sourceValidAt: undefined,
    sourceVersion: undefined,
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
}

function assertParsedArgs(parsed) {
  if (parsed.help) {
    return;
  }
  if (
    !['import-d1', 'import-local', 'import-sharded-d1', 'proof-offline'].includes(
      parsed.command ?? '',
    )
  ) {
    throw new Error(
      'Command must be import-local, proof-offline, import-d1, or import-sharded-d1.',
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
    if (parsed.command === 'import-sharded-d1' && parsed.snapshotPath === undefined) {
      throw new Error('import-sharded-d1 requires --snapshot-path.');
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

function selectZipEntry(entries, requestedEntry) {
  if (requestedEntry !== undefined) {
    const selected = entries.find(
      (entry) => entry.name === requestedEntry || entry.name.endsWith(`/${requestedEntry}`),
    );

    if (selected === undefined) {
      throw new Error(`ZIP entry "${requestedEntry}" was not found.`);
    }

    return selected;
  }

  const csvEntries = entries.filter(isCsvZipEntry);

  if (csvEntries.length === 0) {
    throw new Error('ZIP snapshot does not contain a CSV or TXT entry.');
  }
  if (csvEntries.length > 1) {
    throw new Error(
      `ZIP snapshot contains multiple CSV/TXT entries: ${csvEntries
        .map((entry) => entry.name)
        .join(', ')}. Pass --snapshot-entry.`,
    );
  }

  return csvEntries[0];
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

async function openOfficialSnapshotStream(args) {
  const snapshotPath = resolveInputPath(args.snapshotPath);
  const stat = await fs.promises.stat(snapshotPath);

  if (!stat.isFile()) {
    throw new Error(`Snapshot path must be a file: ${args.snapshotPath}`);
  }

  const snapshotFormat = inferSnapshotFormat(snapshotPath, args.snapshotFormat);

  if (snapshotFormat === 'csv') {
    return {
      selectedEntryName: undefined,
      snapshotPath,
      stream: fs.createReadStream(snapshotPath),
    };
  }

  const entries = await listZipEntries(snapshotPath);
  const selectedEntry = selectZipEntry(entries, args.snapshotEntry);
  const stream = await createZipEntryReadStream(snapshotPath, selectedEntry);

  return {
    selectedEntryName: selectedEntry.name,
    snapshotPath,
    stream,
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
  const datasetsPath = path.resolve(repositoryRoot, 'libs/smart-suggest/datasets/dist/index.js');
  const storagePath = path.resolve(repositoryRoot, 'libs/smart-suggest/storage/dist/index.js');

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
    parseRuianOfficialCsvSnapshotChanges: datasets.parseRuianOfficialCsvSnapshotChanges,
    parseRuianOfficialCsvSnapshotRows: datasets.parseRuianOfficialCsvSnapshotRows,
    runAddressDatasetImport: datasets.runAddressDatasetImport,
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
  const repositories = modules.createD1SmartSuggestRepositories(binding);
  const health = await repositories.health.check();

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

function changeRuian(change) {
  return change.kind === 'address' ? change.row.ruian : change.tombstone.ruian;
}

function requireChangeRegionCode(change) {
  const regionCode = changeRuian(change)?.regionCode?.trim();

  if (regionCode === undefined || regionCode.length === 0) {
    const id = change.kind === 'address' ? change.row.id : change.tombstone.id;

    throw new Error(`Sharded import row ${id} is missing RUIAN regionCode/VUSC code.`);
  }

  return regionCode;
}

function shardBindingForRegion(args, regionCode) {
  const bindingName = `${args.shardBindingPrefix}${regionCode}`;
  const allowedBindings = parseCommaList(args.shardBindings);

  if (allowedBindings.length > 0 && !allowedBindings.includes(bindingName)) {
    throw new Error(
      `Shard binding ${bindingName} for region ${regionCode} is not in --shard-bindings.`,
    );
  }

  return bindingName;
}

function ensureShardRoute(routes, args, regionCode) {
  const existing = routes.get(regionCode);

  if (existing !== undefined) {
    return existing;
  }

  const bindingName = shardBindingForRegion(args, regionCode);
  const route = {
    addressRows: 0,
    bindingName,
    filePath: path.join(args.routeTempDir, `${bindingName}.jsonl`),
    regionCode,
    totalRows: 0,
    tombstoneRows: 0,
    stream: undefined,
  };
  routes.set(regionCode, route);

  return route;
}

function writeImportChange(route, change) {
  route.stream ??= fs.createWriteStream(route.filePath, { flags: 'a' });
  route.stream.write(`${JSON.stringify(change)}\n`);
  route.totalRows += 1;

  if (change.kind === 'address') {
    route.addressRows += 1;
    return;
  }

  route.tombstoneRows += 1;
}

function estimateShardStorageBytes(route) {
  const fileSizeBytes = fs.statSync(route.filePath).size;
  const sourcePayloadEstimateBytes = fileSizeBytes * shardStorageEstimateMultiplier;
  const addressRowFloorBytes = route.addressRows * shardStorageEstimateRowFloorBytes;

  return Math.max(
    shardStorageEstimateFloorBytes,
    Math.ceil(sourcePayloadEstimateBytes),
    addressRowFloorBytes,
  );
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

      const regionCode = requireChangeRegionCode(change);
      const route = ensureShardRoute(routes, routeArgs, regionCode);
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
      estimatedSizeBytes: estimateShardStorageBytes(route),
    })),
    routeTempDir,
  };
}

function assertShardRouteBudgets(args, routes) {
  if (args.shardMaxRows === undefined) {
    return;
  }

  const oversizedRoute = routes.find((route) => route.totalRows > args.shardMaxRows);

  if (oversizedRoute === undefined) {
    return;
  }

  throw new Error(
    `Shard ${oversizedRoute.bindingName} routed ${oversizedRoute.totalRows} row(s), exceeding --shard-max-rows ${args.shardMaxRows}.`,
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
  const { selectedEntryName, snapshotPath, stream } = await openOfficialSnapshotStream(args);
  const sourceLineage = createSourceLineage(args, checksumSha256);
  const parsedChanges = modules.parseRuianOfficialCsvSnapshotChanges(stream, {
    atomEntryId: args.atomEntryId,
    checksumSha256,
    datasetVersion: args.datasetVersion,
    delimiter: args.csvDelimiter,
    encoding: args.csvEncoding,
    feedId: args.feedId,
    fileKind: args.fileKind,
    maxRows: args.maxRows,
    snapshotUri: args.snapshotUri,
    sourceGeneratedAt: args.sourceGeneratedAt,
    sourceId: args.sourceId,
    sourceUri: args.sourceUri,
    sourceValidAt: args.sourceValidAt,
    sourceVersion: args.sourceVersion,
  });
  const collected = collectImportChangeIds(parsedChanges);

  return {
    officialSnapshot: {
      checksumSha256,
      selectedEntryName,
      snapshotFileName: path.basename(snapshotPath),
      snapshotFormat: inferSnapshotFormat(snapshotPath, args.snapshotFormat),
      sourceUri: args.sourceUri,
    },
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
  const existingRecords = await repositories.shardRegistry.listShardMetadata({
    countryCode: args.country,
  });
  const existingByBinding = new Map(existingRecords.map((record) => [record.bindingName, record]));
  const updated = [];

  for (const shardResult of shardResults) {
    const previousRowCount = existingByBinding.get(shardResult.bindingName)?.rowCount ?? 0;
    const nextRowCount = Math.max(
      0,
      previousRowCount + shardResult.result.insertedRows - shardResult.result.tombstonedRows,
    );
    const record = await repositories.shardRegistry.upsertShardMetadata({
      bindingName: shardResult.bindingName,
      countryCode: args.country,
      estimatedSizeBytes: shardResult.route.estimatedSizeBytes,
      importVersion: args.datasetVersion,
      lastImportCompletedAt: shardResult.result.importRun.completedAt,
      regionCode: shardResult.regionCode,
      regionKind: 'vusc',
      regionName: `VUSC ${shardResult.regionCode}`,
      rowCount: nextRowCount,
      shardId: `smart-suggest-${args.country.toLocaleLowerCase('en-US')}-vusc-${
        shardResult.regionCode
      }`,
      sourceFreshnessAt: args.sourceValidAt,
      state: 'active',
    });
    updated.push(record);
  }

  return updated;
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

    for (const route of routed.routes.toSorted((left, right) =>
      left.regionCode.localeCompare(right.regionCode),
    )) {
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
    rowIds.map((rowId) => repositories.addressRecords.getAddressRecord(rowId)),
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
  const providerEvents = await repositories.providerEvents.listProviderEvents(args.scenarioId);
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
  const providerEvents = await repositories.providerEvents.listProviderEvents(result.importRun.id);
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
    scenarioId: `import-sharded-${args.sourceId}-${args.country}-${args.datasetVersion}`,
    sourceProvenance: {
      modificationNoteSha256: normalizeSha256(args.modificationNoteSha256) ?? null,
    },
    shardCount: shardResults.length,
    shards: shardResults.map((shardResult) => ({
      bindingName: shardResult.bindingName,
      failedRows: shardResult.result.errors.length,
      importRunId: shardResult.result.importRun.id,
      importedRows: shardResult.result.insertedRows,
      estimatedSizeBytes: shardResult.route.estimatedSizeBytes,
      regionCode: shardResult.regionCode,
      registryShardId:
        shardRegistry.find((record) => record.bindingName === shardResult.bindingName)?.shardId ??
        undefined,
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

async function runProofOffline(args, modules) {
  const { repositories } = await importDataset(args, modules);
  const records = await repositories.addressRecords.searchAddressRecords({
    countryCode: args.country,
    limit: args.limit,
    query: args.query,
  });
  const providerEvents = await repositories.providerEvents.listProviderEvents(args.scenarioId);
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

  await runProofOffline(args, modules);
  return 0;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
