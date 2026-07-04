#!/usr/bin/env node
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const proofDir = path.join(appRoot, '.codex/reports/smart-suggest-production-seed-proof');
const seedReportPath = '.codex/reports/smart-suggest-production-seed/proof-blocked.json';
const missingGovernanceReportPath =
  '.codex/reports/smart-suggest-production-seed/proof-missing-governance.json';
const mismatchedAttributionReportPath =
  '.codex/reports/smart-suggest-production-seed/proof-mismatched-attribution.json';
const preflightReportPath =
  '.codex/reports/smart-suggest-d1-operations/preflight-production-seed-proof.json';
const optimizeReportPath =
  '.codex/reports/smart-suggest-d1-operations/optimize-production-seed-proof.json';
const statusReportPath =
  '.codex/reports/smart-suggest-d1-operations/status-production-seed-proof.json';
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
const shardBindings = freeTierShardGroups.map((group) => `SMART_SUGGEST_FREE_TIER_${group.index}`);
const routerBinding = 'SMART_SUGGEST_ROUTER_D1';
const unsafeReportPatternSources = [
  'file:\\/\\/',
  `/${'Users'}/`,
  `/${'private'}/`,
  `/${'var'}/folders/`,
  `/${'tmp'}/`,
  '[A-Z]:\\\\',
];
const unsafeReportPatterns = unsafeReportPatternSources.map((source) => new RegExp(source, 'u'));

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

function appRelative(filePath) {
  return path.relative(appRoot, filePath).split(path.sep).join('/');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`;

    throw new Error(`${message}${suffix}`);
  }
}

function readJson(appRelativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(appRoot, appRelativePath), 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeSyntheticSnapshot() {
  const csv = [
    'Kod adresniho mista;Kod obce;Nazev obce;Nazev casti obce;Nazev ulice;Cislo domovni;Cislo orientacni;PSC',
    '1203603;554782;Praha 10;Vrsovice;K Louzi;1258;12;10100',
  ].join('\n');
  const snapshotPath = path.join(proofDir, 'synthetic-ruian-proof.csv');

  fs.mkdirSync(proofDir, { recursive: true });
  fs.writeFileSync(snapshotPath, `${csv}\n`);

  return {
    checksumSha256: sha256(`${csv}\n`),
    snapshotPath,
  };
}

function writeSyntheticRegionMapSnapshot() {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<vf:VymennyFormat xmlns:obi="urn:cz:isvs:ruian:schemas:ObecIntTypy:v1" xmlns:oki="urn:cz:isvs:ruian:schemas:OkresIntTypy:v1" xmlns:vci="urn:cz:isvs:ruian:schemas:VuscIntTypy:v1" xmlns:vf="urn:cz:isvs:ruian:schemas:VymennyFormatTypy:v1">',
    '<vf:Data>',
    '<vf:Okresy><vf:Okres><oki:Kod>3100</oki:Kod><oki:Vusc><vci:Kod>19</vci:Kod></oki:Vusc></vf:Okres></vf:Okresy>',
    '<vf:Obce><vf:Obec><obi:Kod>554782</obi:Kod><obi:Okres><oki:Kod>3100</oki:Kod></obi:Okres></vf:Obec></vf:Obce>',
    '</vf:Data>',
    '</vf:VymennyFormat>',
  ].join('');
  const snapshotPath = path.join(proofDir, 'synthetic-ruian-st-uzsz-proof.xml');

  fs.mkdirSync(proofDir, { recursive: true });
  fs.writeFileSync(snapshotPath, `${xml}\n`);

  return {
    checksumSha256: sha256(`${xml}\n`),
    snapshotPath,
  };
}

function writePlaceholderWranglerConfig() {
  const configPath = path.join(proofDir, 'wrangler-placeholder-d1.json');
  const migrationsDir = path.resolve(
    appRoot,
    'apps/shell-super-app/.output/migrations/smart-suggest',
  );
  const migrationsDirFromConfig = path
    .relative(path.dirname(configPath), migrationsDir)
    .split(path.sep)
    .join('/');
  const databaseEntry = (binding, databaseName) => ({
    binding,
    database_id: localD1DatabaseIdForBinding(binding),
    database_name: databaseName,
    migrations_dir: migrationsDirFromConfig,
  });

  writeJson(configPath, {
    d1_databases: [
      databaseEntry(routerBinding, 'smart-suggest-router-proof'),
      ...freeTierShardGroups.map((group) =>
        databaseEntry(
          `SMART_SUGGEST_FREE_TIER_${group.index}`,
          `smart-suggest-free-tier-${group.index}-proof`,
        ),
      ),
    ],
    vars: {
      SMART_SUGGEST_D1_ROUTER_BINDING: routerBinding,
      SMART_SUGGEST_D1_SHARD_BINDINGS: shardBindings.join(','),
      SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON: JSON.stringify(
        Object.fromEntries(
          freeTierShardGroups.flatMap((group) =>
            group.regionCodes.map((code) => [code, `SMART_SUGGEST_FREE_TIER_${group.index}`]),
          ),
        ),
      ),
    },
  });

  return configPath;
}

function resetOperatorEnv() {
  return {
    SMART_SUGGEST_D1_ROUTER_BINDING: '',
    SMART_SUGGEST_D1_SHARD_BINDINGS: '',
    SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON: '',
    SMART_SUGGEST_D1_TOPOLOGY: '',
    SMART_SUGGEST_D1_FREE_TIER_MAX_SHARDS_ENABLED: '',
    SMART_SUGGEST_ROUTER_D1_BINDING: '',
    SMART_SUGGEST_RUIAN_ATOM_ENTRY_ID: '',
    SMART_SUGGEST_RUIAN_ATTRIBUTION_LABEL: '',
    SMART_SUGGEST_RUIAN_ATTRIBUTION_LICENSE: '',
    SMART_SUGGEST_RUIAN_ATTRIBUTION_URL: '',
    SMART_SUGGEST_RUIAN_CSV_DELIMITER: '',
    SMART_SUGGEST_RUIAN_CSV_ENCODING: '',
    SMART_SUGGEST_RUIAN_DATASET_VERSION: '',
    SMART_SUGGEST_RUIAN_MODIFICATION_NOTE: '',
    SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_CHECKSUM_SHA256: '',
    SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH: '',
    SMART_SUGGEST_RUIAN_SNAPSHOT_CHECKSUM_SHA256: '',
    SMART_SUGGEST_RUIAN_SNAPSHOT_PATH: '',
    SMART_SUGGEST_RUIAN_SNAPSHOT_URI: '',
    SMART_SUGGEST_RUIAN_SOURCE_GENERATED_AT: '',
    SMART_SUGGEST_RUIAN_SOURCE_URI: '',
    SMART_SUGGEST_RUIAN_SOURCE_VALID_AT: '',
    SMART_SUGGEST_RUIAN_SOURCE_VERSION: '',
  };
}

function assertNoUnsafeReportPaths(label, value) {
  const serialized = JSON.stringify(value);
  const matchedPattern = unsafeReportPatterns.find((pattern) => pattern.test(serialized));

  assert(matchedPattern === undefined, `${label} leaked an unsafe local path.`, {
    matchedPattern: String(matchedPattern),
  });
}

function baseProductionSeedCommand({
  checksumSha256,
  jsonOut = seedReportPath,
  regionMapChecksumSha256,
  regionMapSnapshotPath,
  snapshotPath,
  includeGovernance = true,
  attributionLabel = 'CUZK RUIAN',
  wranglerConfig,
}) {
  const command = [
    process.execPath,
    './scripts/smart-suggest-production-seed.mjs',
    '--wrangler-config',
    appRelative(wranglerConfig),
    '--snapshot-path',
    snapshotPath,
    '--snapshot-checksum-sha256',
    checksumSha256,
    '--snapshot-uri',
    'r2://example-smart-suggest-snapshots/ruian/cz-proof.csv',
    '--source-uri',
    'https://example.invalid/smart-suggest/ruian-cz-proof.csv',
    '--dataset-version',
    'proof-2026-06-28',
    '--source-version',
    'proof-20260628',
    '--source-generated-at',
    '2026-06-28T00:00:00Z',
    '--source-valid-at',
    '2026-06-28',
    '--atom-entry-id',
    'tag:example.invalid,2026:smart-suggest-production-seed-proof',
    '--municipality-region-map-snapshot-path',
    regionMapSnapshotPath,
    '--municipality-region-map-snapshot-checksum-sha256',
    regionMapChecksumSha256,
    '--json-out',
    jsonOut,
    '--preflight-json-out',
    preflightReportPath,
    '--optimize-json-out',
    optimizeReportPath,
    '--status-json-out',
    statusReportPath,
  ];

  if (includeGovernance) {
    command.push(
      '--attribution-label',
      attributionLabel,
      '--attribution-license',
      'CC BY 4.0',
      '--attribution-url',
      'https://ruian.cuzk.cz/',
      '--modification-note',
      'Smart Suggest normalizes RUIAN source rows into runtime address suggestions.',
    );
  }

  return command;
}

function runProductionSeedProof() {
  const { checksumSha256, snapshotPath } = writeSyntheticSnapshot();
  const { checksumSha256: regionMapChecksumSha256, snapshotPath: regionMapSnapshotPath } =
    writeSyntheticRegionMapSnapshot();
  const wranglerConfig = writePlaceholderWranglerConfig();
  const command = baseProductionSeedCommand({
    checksumSha256,
    regionMapChecksumSha256,
    regionMapSnapshotPath,
    snapshotPath,
    wranglerConfig,
  });
  const result = spawnSync(command[0], command.slice(1), {
    cwd: appRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...resetOperatorEnv(),
    },
  });

  assert(result.status === 1, 'Production seed proof must require explicit shard bindings.', {
    exitCode: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  });

  const seedReport = readJson(seedReportPath);
  assert(seedReport.status === 'blocked', 'Seed report must be blocked.');
  assert(seedReport.stage === 'planned', 'Seed report must stop before D1 preflight.');
  assert(
    (seedReport.checks ?? []).some((check) => check.id === 'missing-shard-bindings'),
    'Seed report must name missing explicit shard bindings.',
  );
  assert(
    seedReport.operatorReadiness?.profile === 'smart-suggest-production-seed-readiness-v1',
    'Seed report must include operator readiness contract.',
  );
  assert(seedReport.operatorReadiness?.status === 'blocked', 'Readiness must be blocked.');
  assert(
    seedReport.operatorReadiness?.commandMatrix?.seedExecute ===
      'pnpm smart-suggest:seed:production:execute',
    'Readiness must include production seed execute command.',
  );
  assert(
    seedReport.operatorReadiness?.commandMatrix?.strictD1Preflight ===
      'pnpm smart-suggest:d1:preflight:production',
    'Readiness must include strict production D1 preflight command.',
  );
  assert(
    (seedReport.operatorReadiness?.missingInputs ?? []).some(
      (entry) => entry.id === 'missing-shard-bindings',
    ),
    'Readiness must point operators at missing explicit shard bindings.',
  );
  assert(
    (seedReport.operatorReadiness?.requiredEnvironment?.d1GeneratedConfig ?? []).some(
      (entry) =>
        entry.env ===
        'SMART_SUGGEST_D1_SHARDS_JSON or SMART_SUGGEST_D1_FREE_TIER_MAX_SHARDS_ENABLED',
    ),
    'Readiness must list free-tier shard configuration env contract.',
  );
  assert(seedReport.snapshot?.checksumVerified === true, 'Snapshot checksum must be verified.');
  assert(seedReport.snapshot?.pathRedacted === true, 'Snapshot path must be redacted.');
  assert(
    seedReport.municipalityRegionMapSnapshot?.checksumVerified === true,
    'Hierarchy snapshot checksum must be verified.',
  );
  assert(
    seedReport.municipalityRegionMapSnapshot?.pathRedacted === true,
    'Hierarchy snapshot path must be redacted.',
  );
  assert(seedReport.source?.attribution?.label === 'CUZK RUIAN', 'Attribution label is recorded.');
  assert(
    seedReport.source?.attribution?.license === 'CC BY 4.0',
    'Attribution license is recorded.',
  );
  assert(
    seedReport.source?.modificationNote?.present === true,
    'Modification note presence must be recorded.',
  );
  assert(
    typeof seedReport.source?.modificationNote?.sha256 === 'string',
    'Modification note hash must be recorded.',
  );
  assert(
    seedReport.commands?.import?.includes('--modification-note-sha256'),
    'Seed import command must pass modification-note hash into mutating importer.',
  );
  assert(
    seedReport.commands?.import?.includes('--shard-max-rows 400000'),
    'Free-tier seed import command must keep address D1 row guard.',
  );
  assert(
    seedReport.commands?.import?.includes('--search-index-mode fts-only'),
    'Free-tier seed import command must use FTS-only index mode by default.',
  );
  assert(
    seedReport.searchIndexMode === 'fts-only',
    'Free-tier seed report must expose FTS-only index mode.',
  );
  assert(seedReport.freeTierCapacityGuard?.enabled === true, 'Capacity guard must be enabled.');
  assert(
    seedReport.freeTierCapacityGuard?.effectiveMaxAddressShardRows === 400000,
    'Free-tier capacity guard must default reviewed address D1 row ceiling.',
  );
  assert(
    seedReport.freeTierCapacityGuard?.defaultFtsOnlyMaxAddressShardRows === 400000,
    'Free-tier capacity guard must document FTS-only row ceiling.',
  );
  assert(
    seedReport.freeTierCapacityGuard?.defaultLegacyPrefixMaxAddressShardRows === 125000,
    'Free-tier capacity guard must document legacy prefix row ceiling.',
  );
  assert(seedReport.d1Topology === 'free-tier', 'Seed proof must use free-tier D1 topology.');
  assert(seedReport.shardBindingCount === 0, 'Seed proof must not infer free-tier shards.');
  assert(
    seedReport.shardLogicalCzVuscCount === 14,
    'Seed proof must cover all 14 logical CZ VUSC regions.',
  );
  assert(seedReport.shardBindingsSource === null, 'Seed proof must require operator shard input.');
  assert(seedReport.execution?.preflight === undefined, 'Preflight must not run without shards.');
  assertNoUnsafeReportPaths('seed report', seedReport);

  process.stdout.write(
    [
      'Smart Suggest production seed proof passed:',
      `- seed report: ${seedReportPath}`,
      '- strict production mode requires explicit shard bindings before import',
    ].join('\n'),
  );
  process.stdout.write('\n');
}

function runMismatchedAttributionProof() {
  const { checksumSha256, snapshotPath } = writeSyntheticSnapshot();
  const { checksumSha256: regionMapChecksumSha256, snapshotPath: regionMapSnapshotPath } =
    writeSyntheticRegionMapSnapshot();
  const wranglerConfig = writePlaceholderWranglerConfig();
  const command = baseProductionSeedCommand({
    attributionLabel: 'Wrong attribution',
    checksumSha256,
    jsonOut: mismatchedAttributionReportPath,
    regionMapChecksumSha256,
    regionMapSnapshotPath,
    snapshotPath,
    wranglerConfig,
  });
  const result = spawnSync(command[0], command.slice(1), {
    cwd: appRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...resetOperatorEnv(),
    },
  });

  assert(result.status === 1, 'Seed wrapper must reject mismatched source attribution.', {
    exitCode: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  });

  const report = readJson(mismatchedAttributionReportPath);
  const checkIds = new Set((report.checks ?? []).map((check) => check.id));

  assert(report.status === 'blocked', 'Mismatched attribution report must be blocked.');
  assert(report.stage === 'planned', 'Mismatched attribution must stop before D1 preflight.');
  assert(
    checkIds.has('source-attribution-catalog-mismatch'),
    'Mismatched attribution must be detected against the source catalog contract.',
  );
  assert(
    (report.operatorReadiness?.missingInputs ?? []).some(
      (entry) =>
        entry.id === 'source-attribution-catalog-mismatch' &&
        entry.env === 'SMART_SUGGEST_RUIAN_ATTRIBUTION_LABEL',
    ),
    'Readiness must surface mismatched source attribution as operator input.',
  );
  assertNoUnsafeReportPaths('mismatched attribution report', report);
}

function runMissingGovernanceProof() {
  const { checksumSha256, snapshotPath } = writeSyntheticSnapshot();
  const { checksumSha256: regionMapChecksumSha256, snapshotPath: regionMapSnapshotPath } =
    writeSyntheticRegionMapSnapshot();
  const wranglerConfig = writePlaceholderWranglerConfig();
  const command = baseProductionSeedCommand({
    checksumSha256,
    includeGovernance: false,
    jsonOut: missingGovernanceReportPath,
    regionMapChecksumSha256,
    regionMapSnapshotPath,
    snapshotPath,
    wranglerConfig,
  });
  const result = spawnSync(command[0], command.slice(1), {
    cwd: appRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...resetOperatorEnv(),
    },
  });

  assert(result.status === 1, 'Seed wrapper must reject missing source governance inputs.', {
    exitCode: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  });

  const report = readJson(missingGovernanceReportPath);
  const checkIds = new Set((report.checks ?? []).map((check) => check.id));

  assert(report.status === 'blocked', 'Missing governance report must be blocked.');
  assert(report.stage === 'planned', 'Missing governance failure must stop before D1 preflight.');
  assert(checkIds.has('missing-attribution-label'), 'Attribution label must be required.');
  assert(checkIds.has('missing-attribution-license'), 'Attribution license must be required.');
  assert(checkIds.has('missing-attribution-url'), 'Attribution URL must be required.');
  assert(checkIds.has('missing-modification-note'), 'Modification note must be required.');
  const missingEnvVars = new Set(
    (report.operatorReadiness?.missingInputs ?? []).map((entry) => entry.env),
  );

  assert(
    missingEnvVars.has('SMART_SUGGEST_RUIAN_ATTRIBUTION_LABEL'),
    'Readiness must name the missing attribution label env var.',
  );
  assert(
    missingEnvVars.has('SMART_SUGGEST_RUIAN_ATTRIBUTION_LICENSE'),
    'Readiness must name the missing attribution license env var.',
  );
  assert(
    missingEnvVars.has('SMART_SUGGEST_RUIAN_ATTRIBUTION_URL'),
    'Readiness must name the missing attribution URL env var.',
  );
  assert(
    missingEnvVars.has('SMART_SUGGEST_RUIAN_MODIFICATION_NOTE'),
    'Readiness must name the missing modification-note env var.',
  );
  assert(
    (report.operatorReadiness?.requiredEnvironment?.sourceGovernance ?? []).some(
      (entry) => entry.env === 'SMART_SUGGEST_RUIAN_MODIFICATION_NOTE',
    ),
    'Readiness must document modification-note provenance requirements.',
  );
  assertNoUnsafeReportPaths('missing governance report', report);
}

try {
  runMissingGovernanceProof();
  runMismatchedAttributionProof();
  runProductionSeedProof();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
