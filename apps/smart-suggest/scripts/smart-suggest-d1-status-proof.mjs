#!/usr/bin/env node
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(appRoot, '../..');
const proofRunId = process.env.SMART_SUGGEST_D1_STATUS_PROOF_RUN_ID?.trim() || `run-${process.pid}`;
const proofReportRoot = `.codex/reports/smart-suggest-d1-status-proof/${proofRunId}`;
const proofRoot = path.join(appRoot, proofReportRoot);
const persistPath = path.join(proofRoot, 'wrangler-d1-state');
const snapshotPath = path.join(proofRoot, 'synthetic-two-shard-ruian.csv');
const wranglerConfigPath = path.join(proofRoot, 'wrangler-two-shard.json');
const importReportPath = `${proofReportRoot}/import-sharded.json`;
const optimizeReportPath = `${proofReportRoot}/optimize.json`;
const statusReportPath = `${proofReportRoot}/status.json`;
const missingProvenanceStatusReportPath = `${proofReportRoot}/status-missing-provenance-negative.json`;
const missingSizeStatusReportPath = `${proofReportRoot}/status-missing-size-negative.json`;
const blockedSizeStatusReportPath = `${proofReportRoot}/status-blocked-size-negative.json`;
const routerBinding = 'SMART_SUGGEST_ROUTER_D1';
const routerDatabaseName = 'smart-suggest-proof-router';
const shardBindings = ['SMART_SUGGEST_CZ_VUSC_19', 'SMART_SUGGEST_CZ_VUSC_27'];
const shardDatabaseNamesByBinding = new Map([
  ['SMART_SUGGEST_CZ_VUSC_19', 'smart-suggest-proof-cz-vusc-19'],
  ['SMART_SUGGEST_CZ_VUSC_27', 'smart-suggest-proof-cz-vusc-27'],
]);
const proofModificationNote = 'Smart Suggest normalizes RUIAN source rows for local D1 proof.';
const proofModificationNoteSha256 = sha256(proofModificationNote);
const shardSizeBlockBytes = 6 * 1024 * 1024 * 1024;
const unsafeReportPatternSources = [
  'file:\\/\\/',
  `/${'Users'}/`,
  `/${'private'}/`,
  `/${'var'}/folders/`,
  `/${'tmp'}/`,
  '[A-Z]:\\\\',
];
const unsafeReportPatterns = unsafeReportPatternSources.map((source) => new RegExp(source, 'u'));

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`;

    throw new Error(`${message}${suffix}`);
  }
}

function appRelative(filePath) {
  return path.relative(appRoot, filePath).split(path.sep).join('/');
}

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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readJson(appRelativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(appRoot, appRelativePath), 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
    maxBuffer: 20 * 1024 * 1024,
  });

  assert(result.status === 0, `${label} failed.`, {
    args: args.map(redactUnsafeText),
    exitCode: result.status,
    stderr: redactUnsafeText(result.stderr),
    stdout: redactUnsafeText(result.stdout),
  });

  return result;
}

function runExpectFailure(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
    maxBuffer: 20 * 1024 * 1024,
  });

  assert(result.status !== 0, `${label} must fail.`, {
    args: args.map(redactUnsafeText),
    exitCode: result.status,
    stderr: redactUnsafeText(result.stderr),
    stdout: redactUnsafeText(result.stdout),
  });

  return result;
}

function redactUnsafeText(value) {
  return String(value)
    .replaceAll(/file:\/\/[^\s"']+/giu, '[redacted-file-url]')
    .replaceAll(/\/Users\/[^\s"']+/gu, '[redacted-local-path]')
    .replaceAll(/\/private\/[^\s"']+/gu, '[redacted-local-path]')
    .replaceAll(/\/var\/folders\/[^\s"']+/gu, '[redacted-local-path]')
    .replaceAll(/\/tmp\/[^\s"']+/gu, '[redacted-local-path]')
    .replaceAll(/[A-Z]:\\[^\s"']+/gu, '[redacted-local-path]');
}

function assertNoUnsafeReportPaths(label, value) {
  const serialized = JSON.stringify(value);
  const matchedPattern = unsafeReportPatterns.find((pattern) => pattern.test(serialized));

  assert(matchedPattern === undefined, `${label} leaked an unsafe local path.`, {
    matchedPattern: String(matchedPattern),
  });
}

function writeSyntheticOfficialSnapshot() {
  const csv = [
    'kod_adresniho_mista;kod_kraje;nazev_obce;nazev_casti_obce;nazev_ulice;cislo_domovni;cislo_orientacni;psc',
    '1203603;19;Praha 10;Vrsovice;K Louzi;1258;12;10100',
    '2203603;27;Brno;Stred;Masarykova;12;34;60200',
  ].join('\n');

  fs.writeFileSync(snapshotPath, `${csv}\n`);

  return sha256(`${csv}\n`);
}

function writeProofWranglerConfig() {
  const migrationsDir = path.resolve(repositoryRoot, 'libs/smart-suggest/storage/drizzle');
  const migrationsDirFromConfig = path
    .relative(path.dirname(wranglerConfigPath), migrationsDir)
    .split(path.sep)
    .join('/');
  const database = (binding, databaseName) => ({
    binding,
    database_id: localD1DatabaseIdForBinding(binding),
    database_name: databaseName,
    migrations_dir: migrationsDirFromConfig,
  });

  writeJson(wranglerConfigPath, {
    d1_databases: [
      database(routerBinding, 'smart-suggest-proof-router'),
      database('SMART_SUGGEST_CZ_VUSC_19', 'smart-suggest-proof-cz-vusc-19'),
      database('SMART_SUGGEST_CZ_VUSC_27', 'smart-suggest-proof-cz-vusc-27'),
    ],
    vars: {
      SMART_SUGGEST_D1_ROUTER_BINDING: routerBinding,
      SMART_SUGGEST_D1_SHARD_BINDINGS: shardBindings.join(','),
    },
  });
}

function wranglerRouterExecuteArgs(sql) {
  return wranglerD1ExecuteArgs(routerDatabaseName, sql);
}

function wranglerD1ExecuteArgs(databaseName, sql) {
  return [
    'd1',
    'execute',
    databaseName,
    '--config',
    appRelative(wranglerConfigPath),
    '--local',
    '--persist-to',
    appRelative(persistPath),
    '--json',
    '--command',
    sql,
  ];
}

function d1ResultRows(stdout) {
  const parsed = JSON.parse(stdout);
  const entries = Array.isArray(parsed) ? parsed : [parsed];

  return entries.flatMap((entry) => (Array.isArray(entry?.results) ? entry.results : []));
}

function runD1Sql(databaseName, sql, label) {
  return d1ResultRows(run('wrangler', wranglerD1ExecuteArgs(databaseName, sql), label).stdout);
}

function runRouterSql(sql, label) {
  runD1Sql(routerDatabaseName, sql, label);
}

function statusCommandArgs(jsonOut) {
  return [
    './scripts/smart-suggest-d1-operations.mjs',
    'status',
    '--wrangler-config',
    appRelative(wranglerConfigPath),
    '--d1-target',
    'local',
    '--persist-to',
    appRelative(persistPath),
    '--router-d1-binding',
    routerBinding,
    '--shard-bindings',
    shardBindings.join(','),
    '--execute-readonly',
    '--require-size-estimates',
    '--json-out',
    jsonOut,
  ];
}

function assertImportReport(report) {
  assert(report.d1Target === 'local', 'D1 status proof import must target local D1.');
  assert(report.failedRows === 0, 'D1 status proof import must have zero failed rows.');
  assert(report.rawSnapshotStoredInD1 === false, 'Raw snapshot must not be stored in D1.');
  assert(report.restartable === true, 'Sharded import must be restartable.');
  assert(report.shardCount === 2, 'D1 status proof must import two shards.');
  assert(report.totalRows === 2, 'D1 status proof must import exactly two rows.');
  assert(report.importedRows === 2, 'D1 status proof must insert exactly two rows.');
  assert(
    report.sourceProvenance?.modificationNoteSha256 === proofModificationNoteSha256,
    'D1 status proof import report must carry the modification-note hash.',
  );

  for (const binding of shardBindings) {
    const shard = report.shards.find((entry) => entry.bindingName === binding);

    assert(shard !== undefined, `Missing imported shard ${binding}.`);
    assert(shard.failedRows === 0, `${binding} must have zero failed rows.`);
    assert(shard.totalRows === 1, `${binding} must route one row.`);
    assert(shard.importedRows === 1, `${binding} must import one row.`);
    assert(
      Number.isFinite(shard.estimatedSizeBytes) && shard.estimatedSizeBytes > 0,
      `${binding} must record an estimated D1 size.`,
    );
    assert(
      typeof shard.registryShardId === 'string' && shard.registryShardId.length > 0,
      `${binding} must be registered in the router shard registry.`,
    );
    assert(
      shard.sourceModificationNoteSha256 === proofModificationNoteSha256,
      `${binding} import result must include the source modification-note hash.`,
    );
  }
}

function assertOptimizeReport(report) {
  assert(report.status === 'ok', 'D1 optimize proof report must pass.');
  assert(report.command === 'optimize', 'D1 optimize proof report must be optimize.');
  assert(report.mutatingExecution === true, 'D1 optimize proof must execute local optimize SQL.');
  assert(report.databases.length === 3, 'D1 optimize proof must cover router plus two shards.');
  assert(
    report.optimizeOperations.length === 5,
    'D1 optimize proof must plan router/shard/FTS optimize.',
  );
  assert(
    report.optimizeResults.length === 5,
    'D1 optimize proof must execute every optimize operation.',
  );
  assert(
    report.optimizeResults.every((entry) => entry.ok === true),
    'Every local D1 optimize operation must pass.',
  );
}

function assertStatusReport(report) {
  assert(report.status === 'ok', 'D1 status proof report must pass.');
  assert(report.command === 'status', 'D1 status proof report must be status.');
  assert(report.target === 'local', 'D1 status proof must target local D1.');
  assert(report.databases.length === 3, 'D1 status proof must cover router plus two shards.');
  assert(
    report.thresholds?.requireSizeEstimates === true,
    'D1 status proof must require size estimates.',
  );
  assert(report.alerts.length === 0, 'D1 status proof must have zero alerts.');
  assert(
    report.readonlyResults.length === 8,
    'D1 status proof must execute eight read-only queries.',
  );
  assert(
    report.readonlyResults.every((entry) => entry.ok === true),
    'Every local D1 status read-only query must pass.',
  );

  const routerShards = report.readonlyResults.find((entry) => entry.id === 'router-shards');
  const latestImportRuns = report.readonlyResults.filter(
    (entry) => entry.id === 'latest-import-runs',
  );
  const sourceProvenance = report.readonlyResults.filter(
    (entry) => entry.id === 'source-provenance',
  );

  assert(routerShards?.results?.length === 2, 'Router status must expose two active shard rows.');
  assert(latestImportRuns.length === 2, 'Each shard must expose latest import run status.');
  assert(sourceProvenance.length === 2, 'Each shard must expose source provenance status.');

  for (const result of latestImportRuns) {
    const [latestRun] = result.results;

    assert(latestRun?.status === 'completed', `${result.binding} latest import must be completed.`);
    assert(
      Number(latestRun.failed_rows) === 0,
      `${result.binding} latest import must have zero failed rows.`,
    );
  }

  for (const result of sourceProvenance) {
    const source = result.results.find((row) => row.id === 'ruian-cz');

    assert(source !== undefined, `${result.binding} must expose the RUIAN source row.`);
    assert(
      source.attribution_label === 'CUZK RUIAN',
      `${result.binding} status must expose attribution label.`,
    );
    assert(
      source.attribution_license === 'CC BY 4.0',
      `${result.binding} status must expose attribution license.`,
    );
    assert(
      source.attribution_url === 'https://ruian.cuzk.cz/',
      `${result.binding} status must expose attribution URL.`,
    );
    assert(
      source.modification_note_sha256 === proofModificationNoteSha256,
      `${result.binding} status must expose the modification-note hash.`,
    );
  }
}

function assertStatusFailureReport(report, expectedAlertId) {
  assert(report.status === 'failed', 'D1 status negative proof report must fail.');
  assert(report.command === 'status', 'D1 status negative proof report must be status.');
  assert(report.target === 'local', 'D1 status negative proof must target local D1.');
  assert(
    report.readonlyResults.every((entry) => entry.ok === true),
    'D1 status negative proof should fail on alerts, not unreadable status queries.',
  );

  const matchingAlerts = report.alerts.filter((alert) => alert.id === expectedAlertId);

  assert(matchingAlerts.length > 0, `Expected D1 status alert ${expectedAlertId}.`);
  assert(
    matchingAlerts.some((alert) => alert.severity === 'error'),
    `Expected D1 status alert ${expectedAlertId} to be an error.`,
  );
}

function assertDataSourceProvenance() {
  for (const binding of shardBindings) {
    const databaseName = shardDatabaseNamesByBinding.get(binding);

    assert(databaseName !== undefined, `Missing proof database name for ${binding}.`);

    const rows = runD1Sql(
      databaseName,
      "select id, attribution_label, attribution_license, attribution_url, modification_note_sha256 from smart_suggest_data_sources where id = 'ruian-cz'",
      `Read ${binding} data-source provenance`,
    );
    const [source] = rows;

    assert(source !== undefined, `${binding} must persist the RUIAN data source.`);
    assert(source.attribution_label === 'CUZK RUIAN', `${binding} must persist attribution label.`);
    assert(
      source.attribution_license === 'CC BY 4.0',
      `${binding} must persist attribution license.`,
    );
    assert(
      source.attribution_url === 'https://ruian.cuzk.cz/',
      `${binding} must persist attribution URL.`,
    );
    assert(
      source.modification_note_sha256 === proofModificationNoteSha256,
      `${binding} must persist the modification-note hash.`,
    );
  }
}

function runProof() {
  fs.rmSync(proofRoot, { force: true, recursive: true });
  fs.mkdirSync(proofRoot, { recursive: true });
  const checksum = writeSyntheticOfficialSnapshot();
  const now = new Date().toISOString();
  const sourceValidAt = now.slice(0, 10);

  writeProofWranglerConfig();

  run(
    process.execPath,
    [
      './scripts/smart-suggest-owned-import.mjs',
      'import-sharded-d1',
      '--wrangler-config',
      appRelative(wranglerConfigPath),
      '--d1-target',
      'local',
      '--persist-to',
      appRelative(persistPath),
      '--apply-migrations',
      '--router-d1-binding',
      routerBinding,
      '--shard-bindings',
      shardBindings.join(','),
      '--snapshot-path',
      appRelative(snapshotPath),
      '--expected-checksum-sha256',
      checksum,
      '--source-uri',
      'https://example.invalid/smart-suggest/ruian-two-shard-proof.csv',
      '--snapshot-uri',
      'r2://example-smart-suggest-snapshots/ruian/two-shard-proof.csv',
      '--dataset-version',
      `d1-status-proof-${sourceValidAt}`,
      '--source-version',
      sourceValidAt.replaceAll('-', ''),
      '--source-generated-at',
      now,
      '--source-valid-at',
      sourceValidAt,
      '--feed-id',
      'RUIAN-CSV-ADR-ST',
      '--atom-entry-id',
      `tag:example.invalid,${sourceValidAt}:smart-suggest-d1-status-proof`,
      '--modification-note-sha256',
      proofModificationNoteSha256,
      '--out',
      importReportPath,
    ],
    'Synthetic sharded local D1 import',
  );
  run(
    process.execPath,
    [
      './scripts/smart-suggest-d1-operations.mjs',
      'optimize',
      '--wrangler-config',
      appRelative(wranglerConfigPath),
      '--d1-target',
      'local',
      '--persist-to',
      appRelative(persistPath),
      '--router-d1-binding',
      routerBinding,
      '--shard-bindings',
      shardBindings.join(','),
      '--execute',
      '--json-out',
      optimizeReportPath,
    ],
    'Synthetic sharded local D1 optimize',
  );
  run(process.execPath, statusCommandArgs(statusReportPath), 'Synthetic sharded local D1 status');
  const firstShardDatabaseName = shardDatabaseNamesByBinding.get('SMART_SUGGEST_CZ_VUSC_19');

  assert(
    firstShardDatabaseName !== undefined,
    'Missing first proof shard database for provenance negative proof.',
  );

  runD1Sql(
    firstShardDatabaseName,
    "update smart_suggest_data_sources set modification_note_sha256 = null where id = 'ruian-cz'",
    'Clear proof source modification-note hash',
  );
  runExpectFailure(
    process.execPath,
    statusCommandArgs(missingProvenanceStatusReportPath),
    'Synthetic sharded local D1 missing-provenance status',
  );
  runD1Sql(
    firstShardDatabaseName,
    `update smart_suggest_data_sources set modification_note_sha256 = '${proofModificationNoteSha256}' where id = 'ruian-cz'`,
    'Restore proof source modification-note hash',
  );
  runRouterSql(
    "update smart_suggest_shard_registry set estimated_size_bytes = null where binding_name = 'SMART_SUGGEST_CZ_VUSC_19'",
    'Clear proof shard size estimate',
  );
  runExpectFailure(
    process.execPath,
    statusCommandArgs(missingSizeStatusReportPath),
    'Synthetic sharded local D1 missing-size status',
  );
  runRouterSql(
    "update smart_suggest_shard_registry set estimated_size_bytes = 65536 where binding_name = 'SMART_SUGGEST_CZ_VUSC_19'",
    'Restore proof shard size estimate',
  );
  runRouterSql(
    `update smart_suggest_shard_registry set estimated_size_bytes = ${shardSizeBlockBytes} where binding_name = 'SMART_SUGGEST_CZ_VUSC_27'`,
    'Set proof shard size above block threshold',
  );
  runExpectFailure(
    process.execPath,
    statusCommandArgs(blockedSizeStatusReportPath),
    'Synthetic sharded local D1 blocked-size status',
  );

  const importReport = readJson(importReportPath);
  const optimizeReport = readJson(optimizeReportPath);
  const statusReport = readJson(statusReportPath);
  const missingProvenanceStatusReport = readJson(missingProvenanceStatusReportPath);
  const missingSizeStatusReport = readJson(missingSizeStatusReportPath);
  const blockedSizeStatusReport = readJson(blockedSizeStatusReportPath);

  assertImportReport(importReport);
  assertDataSourceProvenance();
  assertOptimizeReport(optimizeReport);
  assertStatusReport(statusReport);
  assertStatusFailureReport(missingProvenanceStatusReport, 'missing-source-modification-note-hash');
  assertStatusFailureReport(missingSizeStatusReport, 'missing-shard-size-estimate');
  assertStatusFailureReport(blockedSizeStatusReport, 'shard-size-block');
  assertNoUnsafeReportPaths('D1 import status proof report', importReport);
  assertNoUnsafeReportPaths('D1 optimize status proof report', optimizeReport);
  assertNoUnsafeReportPaths('D1 status proof report', statusReport);
  assertNoUnsafeReportPaths(
    'D1 missing-provenance status proof report',
    missingProvenanceStatusReport,
  );
  assertNoUnsafeReportPaths('D1 missing-size status proof report', missingSizeStatusReport);
  assertNoUnsafeReportPaths('D1 blocked-size status proof report', blockedSizeStatusReport);

  process.stdout.write('Smart Suggest D1 local status proof passed:\n');
  process.stdout.write(`- import report: ${importReportPath}\n`);
  process.stdout.write(`- optimize report: ${optimizeReportPath}\n`);
  process.stdout.write(`- status report: ${statusReportPath}\n`);
  process.stdout.write(
    `- missing-provenance negative report: ${missingProvenanceStatusReportPath}\n`,
  );
  process.stdout.write(`- missing-size negative report: ${missingSizeStatusReportPath}\n`);
  process.stdout.write(`- blocked-size negative report: ${blockedSizeStatusReportPath}\n`);
}

try {
  runProof();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
