#!/usr/bin/env node
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  createExternalBaselineContexts,
  createExternalResultNormalizer,
  externalBaselineLabel,
  fakeExternalBaselineId,
  supportedExternalBaselineIds,
} from './external-baseline-adapters.mjs';
import { finalBossRequiredPreflightCheckIds } from './final-boss-preflight-contract.mjs';
import { runCliEffectAsPromise } from '../effect-runtime.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..', '..');
const repositoryRoot = path.resolve(appRoot, '..', '..');
const defaultCorpusPath = path.resolve(
  appRoot,
  'scripts/fixtures/smart-suggest-benchmark-corpus-v1.json',
);
const defaultFinalBossPreflightReportPath = path.resolve(
  appRoot,
  '.codex/reports/smart-suggest-benchmark/final-boss-preflight.json',
);
const smartSuggestD1MigrationsSource = path.resolve(
  repositoryRoot,
  'libs/smart-suggest/storage/drizzle',
);
const smartSuggestIntegrationsDistPath = path.resolve(
  repositoryRoot,
  'libs/smart-suggest/integrations/dist/integrations.js',
);
const allowedPathKeys = new Set(['in-memory', 'sqlite-local', 'http-api-all-caches']);
const defaultPathKeys = ['in-memory', 'sqlite-local'];
const naiveLiveProviderPathId = 'naive-live-provider-no-cache';
const providerEventStatuses = new Set(['success', 'timeout', 'error', 'skipped']);
const cacheStatuses = new Set(['disabled', 'hit', 'miss', 'stale', 'written']);
const correctnessFailureOrder = [
  'storage-error',
  'timeout',
  'provider-error',
  'missing-required-result',
  'top1-mismatch',
  'top5-mismatch',
  'forbidden-top1',
  'wrong-source',
  'result-volume-too-low',
  'result-volume-too-high',
];
const secretLikePatterns = [
  /(?:api[_-]?key|token|secret|bearer)\s*[:=]\s*[^"',\s]+/giu,
  /([?&](?:api[_-]?key|token|secret|access[_-]?token)=)[^&#\s"']+/giu,
  /bearer\s+[a-z0-9._~+/=-]+/giu,
];
const unsafePathLeakPatterns = [
  /file:\/\/[^\s"',)]+/giu,
  /(?:^|["'\s])~\/[^\s"',)]+/gu,
  /\/(?:Users|home|tmp|private|var\/folders)\/[^\s"',)]+/gu,
  /[A-Z]:\\(?:Users|Temp|Windows\\Temp)\\[^\s"',)]+/giu,
];
const booleanEnvValues = new Map([
  ['1', true],
  ['true', true],
  ['yes', true],
  ['on', true],
  ['0', false],
  ['false', false],
  ['no', false],
  ['off', false],
]);

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/benchmark/run-local-owned-benchmark.mjs [options]

Runs the public-safe Smart Suggest benchmark corpus against local owned-search
paths by default. External live providers are never called unless
--live-providers or SMART_SUGGEST_BENCHMARK_LIVE_PROVIDERS=true is set.

Options:
  --paths in-memory,sqlite-local  Paths to run. Defaults to local owned paths.
  --path in-memory                Add one local owned path. Repeatable.
                                  Supported paths: ${[...allowedPathKeys].join(', ')}.
  --api-base https://...          Smart Suggest API base for http-api-all-caches.
  --external-baseline fake-noop   Add one external baseline. Repeatable.
  --external-baselines a,b        Add comma-separated external baselines.
                                  Supported: ${supportedExternalBaselineIds.join(', ')}.
  --live-providers                Allow configured external baselines to call live providers.
  --final-boss-preflight-report path
                                  Required ready preflight report for final-boss live runs.
  --max-final-boss-preflight-age-seconds 900
                                  Maximum age for the final-boss preflight report.
  --provider-concurrency 1        Max concurrent external baseline requests.
  --provider-rate-limit-ms 250    Default min start interval for live provider requests.
  --provider-rate provider=ms     Provider-specific min start interval. Repeatable.
  --provider-delay-ms 0           Extra delay after each external provider request.
  --corpus path                   Benchmark corpus JSON path.
  --scenario id                   Run one scenario id. Repeatable.
  --scenario-ids id,id            Run a comma-separated scenario subset.
  --iterations 1                  Measured iterations per scenario.
  --warmup 1                      Warmup iterations per scenario, not reported.
  --limit 5                       Override corpus default request limit.
  --timeout-ms 1000               Per-search timeout budget.
  --json-out path                 Write JSON report.
  --markdown-out path             Write markdown report.
  --format json                   Print json or markdown to stdout.
  --environment-label local       Redacted report environment label.
  --operator local-runner         Redacted operator label.
`);
}

function envValue(name) {
  const value = process.env[name]?.trim();

  return value === undefined || value.length === 0 ? undefined : value;
}

function envBoolean(name) {
  const value = envValue(name)?.toLowerCase();

  return value === undefined ? undefined : booleanEnvValues.get(value);
}

function envNumber(name) {
  const value = envValue(name);

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function defaultArgs() {
  return {
    corpus: defaultCorpusPath,
    environmentLabel: envValue('SMART_SUGGEST_BENCHMARK_ENVIRONMENT') ?? 'local',
    externalBaselineIds: [],
    finalBossPreflightReport: resolveInputPath(
      envValue('SMART_SUGGEST_BENCHMARK_FINAL_BOSS_PREFLIGHT_REPORT') ??
        defaultFinalBossPreflightReportPath,
    ),
    format: 'json',
    help: false,
    apiBase: envValue('SMART_SUGGEST_BENCHMARK_API_BASE_URL'),
    iterations: 1,
    jsonOut: undefined,
    limit: undefined,
    liveProvidersEnabled: envBoolean('SMART_SUGGEST_BENCHMARK_LIVE_PROVIDERS') === true,
    markdownOut: undefined,
    maxFinalBossPreflightAgeSeconds:
      envNumber('SMART_SUGGEST_BENCHMARK_MAX_FINAL_BOSS_PREFLIGHT_AGE_SECONDS') ?? 900,
    operator: envValue('SMART_SUGGEST_BENCHMARK_OPERATOR') ?? 'local-benchmark-runner',
    pathKeys: [...defaultPathKeys],
    providerConcurrency: envNumber('SMART_SUGGEST_BENCHMARK_PROVIDER_CONCURRENCY') ?? 1,
    providerDelayMs: envNumber('SMART_SUGGEST_BENCHMARK_PROVIDER_DELAY_MS') ?? 0,
    providerRateLimitMs: envNumber('SMART_SUGGEST_BENCHMARK_PROVIDER_RATE_LIMIT_MS'),
    providerRateLimitMsById: {},
    scenarioIds: [],
    timeoutMs: 1000,
    warmup: 1,
  };
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function parseNonNegativeInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return parsed;
}

function parseCommaSeparated(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseExternalBaselineList(value, label) {
  const providerIds = parseCommaSeparated(value);

  if (providerIds.length === 0) {
    throw new Error(`${label} must name at least one external baseline.`);
  }

  for (const providerId of providerIds) {
    if (!supportedExternalBaselineIds.includes(providerId)) {
      throw new Error(
        `${label} contains unsupported external baseline "${providerId}". Supported baselines: ${supportedExternalBaselineIds.join(', ')}.`,
      );
    }
  }

  return providerIds;
}

function parsePathList(value, label) {
  const pathKeys = parseCommaSeparated(value);

  if (pathKeys.length === 0) {
    throw new Error(`${label} must name at least one path.`);
  }

  for (const pathKey of pathKeys) {
    if (!allowedPathKeys.has(pathKey)) {
      throw new Error(`${label} contains unsupported path "${pathKey}".`);
    }
  }

  return pathKeys;
}

function parseProviderRateLimit(value) {
  const separatorIndex = value.indexOf('=');

  if (separatorIndex <= 0) {
    throw new Error('--provider-rate must use provider=milliseconds.');
  }

  const providerId = value.slice(0, separatorIndex).trim();
  const rateLimitMs = parseNonNegativeInteger(value.slice(separatorIndex + 1), '--provider-rate');

  if (!supportedExternalBaselineIds.includes(providerId)) {
    throw new Error(`--provider-rate contains unsupported external baseline "${providerId}".`);
  }

  return {
    providerId,
    rateLimitMs,
  };
}

function readRequiredOption(rest, index, arg) {
  const value = rest[index + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${arg} requires a value.`);
  }

  return value;
}

function parseArgs(argv) {
  const parsed = defaultArgs();
  let explicitPathKeys = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    if (arg === '--path') {
      explicitPathKeys.push(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--paths') {
      explicitPathKeys = parsePathList(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--external-baseline') {
      parsed.externalBaselineIds.push(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--api-base') {
      parsed.apiBase = readRequiredOption(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--external-baselines') {
      parsed.externalBaselineIds.push(
        ...parseExternalBaselineList(readRequiredOption(argv, index, arg), arg),
      );
      index += 1;
      continue;
    }

    if (arg === '--live-providers' || arg === '--allow-live-providers') {
      parsed.liveProvidersEnabled = true;
      continue;
    }

    if (arg === '--final-boss-preflight-report') {
      parsed.finalBossPreflightReport = resolveInputPath(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--max-final-boss-preflight-age-seconds') {
      parsed.maxFinalBossPreflightAgeSeconds = parsePositiveInteger(
        readRequiredOption(argv, index, arg),
        arg,
      );
      index += 1;
      continue;
    }

    if (arg === '--provider-concurrency') {
      parsed.providerConcurrency = parsePositiveInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--provider-rate-limit-ms') {
      parsed.providerRateLimitMs = parseNonNegativeInteger(
        readRequiredOption(argv, index, arg),
        arg,
      );
      index += 1;
      continue;
    }

    if (arg === '--provider-rate') {
      const rateLimit = parseProviderRateLimit(readRequiredOption(argv, index, arg));
      parsed.providerRateLimitMsById[rateLimit.providerId] = rateLimit.rateLimitMs;
      index += 1;
      continue;
    }

    if (arg === '--provider-delay-ms') {
      parsed.providerDelayMs = parseNonNegativeInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--scenario') {
      parsed.scenarioIds.push(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--scenario-ids') {
      parsed.scenarioIds.push(...parseCommaSeparated(readRequiredOption(argv, index, arg)));
      index += 1;
      continue;
    }

    if (arg === '--corpus') {
      parsed.corpus = resolveInputPath(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--iterations') {
      parsed.iterations = parsePositiveInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--warmup') {
      parsed.warmup = parseNonNegativeInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--limit') {
      parsed.limit = parsePositiveInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--timeout-ms') {
      parsed.timeoutMs = parsePositiveInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--json-out') {
      parsed.jsonOut = resolveOutputPath(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--markdown-out') {
      parsed.markdownOut = resolveOutputPath(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--format') {
      parsed.format = readRequiredOption(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--environment-label') {
      parsed.environmentLabel = readRequiredOption(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--operator') {
      parsed.operator = readRequiredOption(argv, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (explicitPathKeys.length > 0) {
    parsed.pathKeys = [
      ...new Set(explicitPathKeys.flatMap((entry) => parsePathList(entry, '--path'))),
    ];
  }

  parsed.externalBaselineIds = [
    ...new Set(
      parsed.externalBaselineIds.flatMap((entry) =>
        parseExternalBaselineList(entry, '--external-baseline'),
      ),
    ),
  ];

  if (!Number.isInteger(parsed.providerConcurrency) || parsed.providerConcurrency < 1) {
    throw new Error('--provider-concurrency must be a positive integer.');
  }
  if (!Number.isInteger(parsed.providerDelayMs) || parsed.providerDelayMs < 0) {
    throw new Error('--provider-delay-ms must be a non-negative integer.');
  }
  if (
    parsed.providerRateLimitMs !== undefined &&
    (!Number.isInteger(parsed.providerRateLimitMs) || parsed.providerRateLimitMs < 0)
  ) {
    throw new Error('--provider-rate-limit-ms must be a non-negative integer.');
  }
  if (
    !Number.isInteger(parsed.maxFinalBossPreflightAgeSeconds) ||
    parsed.maxFinalBossPreflightAgeSeconds < 1
  ) {
    throw new Error('--max-final-boss-preflight-age-seconds must be a positive integer.');
  }

  if (!['json', 'markdown'].includes(parsed.format)) {
    throw new Error('--format must be json or markdown.');
  }
  if (parsed.pathKeys.includes('http-api-all-caches') && parsed.apiBase === undefined) {
    throw new Error(
      '--api-base or SMART_SUGGEST_BENCHMARK_API_BASE_URL is required for http-api-all-caches.',
    );
  }

  parsed.environmentLabel = redactText(parsed.environmentLabel);
  parsed.operator = redactText(parsed.operator);

  return parsed;
}

function resolveInputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(appRoot, inputPath);
}

function resolveOutputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(appRoot, inputPath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function appRelativeReference(filePath) {
  const relativePath = path.relative(appRoot, filePath);
  const isInsideApp =
    relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

  return isInsideApp ? relativePath.split(path.sep).join('/') : path.basename(filePath);
}

function liveExternalBaselineIds(args) {
  return args.externalBaselineIds.filter((providerId) => providerId !== fakeExternalBaselineId);
}

function requiresFinalBossPreflight(args) {
  return (
    args.liveProvidersEnabled &&
    args.pathKeys.includes('http-api-all-caches') &&
    args.externalBaselineIds.length > 0
  );
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function apiBaseFingerprintInput(value) {
  return String(value).trim().replaceAll(/\/+$/gu, '');
}

function apiBaseSha256(value) {
  return typeof value === 'string' && value.trim().length > 0
    ? sha256(apiBaseFingerprintInput(value))
    : null;
}

function assertFinalBossPreflightReport(args) {
  if (!requiresFinalBossPreflight(args)) {
    return;
  }

  if (!fs.existsSync(args.finalBossPreflightReport)) {
    throw new Error(
      `Final-boss live benchmark requires a ready preflight report at ${appRelativeReference(args.finalBossPreflightReport)}. Run pnpm smart-suggest:benchmark:preflight-final-boss first.`,
    );
  }

  const report = readJson(args.finalBossPreflightReport);

  if (report.schemaVersion !== 'smart-suggest-final-boss-preflight/v1') {
    throw new Error('Final-boss preflight report has an unexpected schemaVersion.');
  }
  if (
    report.status !== 'ready' ||
    report.apiStatus?.configured !== true ||
    report.apiStatus?.ok !== true
  ) {
    throw new Error('Final-boss preflight report is not ready.');
  }
  if (!Number.isInteger(report.apiStatus?.statusCode)) {
    throw new Error('Final-boss preflight report is missing an API status code.');
  }

  const expectedApiBaseSha256 = apiBaseSha256(args.apiBase);

  if (typeof report.apiBaseSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(report.apiBaseSha256)) {
    throw new Error('Final-boss preflight report is missing an API base fingerprint.');
  }
  if (report.apiBaseSha256 !== expectedApiBaseSha256) {
    throw new Error(
      'Final-boss preflight report API base fingerprint does not match --api-base. Run pnpm smart-suggest:benchmark:preflight-final-boss for this deployment.',
    );
  }

  const checks = Array.isArray(report.checks) ? report.checks : [];
  const failedChecks = checks.filter((entry) => entry?.ok !== true);

  if (failedChecks.length > 0 || checks.length === 0) {
    throw new Error(
      `Final-boss preflight report has failing or missing checks: ${failedChecks.map((entry) => entry?.id ?? 'unknown').join(', ') || 'none recorded'}.`,
    );
  }

  const checkIds = checks
    .map((entry) => entry?.id)
    .filter((entry) => typeof entry === 'string' && entry.length > 0);
  const passedCheckIds = new Set(checkIds);
  const requiredCheckIds = finalBossRequiredPreflightCheckIds(liveExternalBaselineIds(args));
  const missingRequiredChecks = requiredCheckIds.filter((checkId) => !passedCheckIds.has(checkId));

  if (missingRequiredChecks.length > 0) {
    throw new Error(
      `Final-boss preflight report is missing required check(s): ${missingRequiredChecks.join(', ')}.`,
    );
  }

  const checkedAtMs = Date.parse(report.checkedAt);

  if (!Number.isFinite(checkedAtMs)) {
    throw new Error('Final-boss preflight report has an invalid checkedAt timestamp.');
  }

  const ageSeconds = Math.max(0, (Date.now() - checkedAtMs) / 1000);

  if (ageSeconds > args.maxFinalBossPreflightAgeSeconds) {
    throw new Error(
      `Final-boss preflight report is stale (${Math.round(ageSeconds)}s old; max ${args.maxFinalBossPreflightAgeSeconds}s).`,
    );
  }
  if (checkedAtMs - Date.now() > 60_000) {
    throw new Error('Final-boss preflight report checkedAt is too far in the future.');
  }

  const reportProviders = new Set(Array.isArray(report.providers) ? report.providers : []);
  const missingProviders = liveExternalBaselineIds(args).filter(
    (providerId) => !reportProviders.has(providerId),
  );

  if (missingProviders.length > 0) {
    throw new Error(
      `Final-boss preflight report did not cover live baseline(s): ${missingProviders.join(', ')}.`,
    );
  }

  args.finalBossPreflight = {
    apiBaseSha256: report.apiBaseSha256,
    apiStatus: {
      configured: report.apiStatus.configured,
      ok: report.apiStatus.ok,
      statusCode: report.apiStatus.statusCode,
    },
    checkedAt: report.checkedAt,
    checkCount: checks.length,
    checkIds: [...passedCheckIds].sort((left, right) => left.localeCompare(right)),
    providers: [...reportProviders].sort((left, right) => left.localeCompare(right)),
    reportPath: appRelativeReference(args.finalBossPreflightReport),
    status: report.status,
  };
}

function redactText(value) {
  let redacted = String(value);

  for (const pattern of secretLikePatterns) {
    redacted = redacted.replaceAll(pattern, (match, prefix) =>
      typeof prefix === 'string' && prefix.length > 0 ? `${prefix}[redacted]` : '[redacted]',
    );
  }

  return redacted;
}

function stableCorpusFixtureReference(corpusPath, corpus) {
  const relativePath = path.relative(appRoot, corpusPath);
  const isInsideApp =
    relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

  if (isInsideApp) {
    return relativePath.split(path.sep).join('/');
  }

  return `external-corpus:${redactText(corpus.id ?? path.basename(corpusPath))}`;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
}

function assertCorpus(corpus) {
  if (corpus.schemaVersion !== 'smart-suggest-benchmark-corpus/v1') {
    throw new Error('Unexpected benchmark corpus schemaVersion.');
  }
  if (corpus.publicSafety?.safeToCommit !== true) {
    throw new Error('Benchmark corpus must be public-safe.');
  }
  if (corpus.publicSafety?.containsRawCustomerQueries !== false) {
    throw new Error('Benchmark corpus must not contain raw customer queries.');
  }
  if (corpus.publicSafety?.containsPrivateProviderPayloads !== false) {
    throw new Error('Benchmark corpus must not contain private provider payloads.');
  }

  assertArray(corpus.canonicalResults, 'corpus.canonicalResults');
  assertArray(corpus.scenarios, 'corpus.scenarios');
}

async function loadSmartSuggestModules() {
  const datasetsPath = path.resolve(repositoryRoot, 'libs/smart-suggest/datasets/dist/datasets.js');
  const storagePath = path.resolve(repositoryRoot, 'libs/smart-suggest/storage/dist/storage.js');

  if (!(fs.existsSync(datasetsPath) && fs.existsSync(storagePath))) {
    throw new Error(
      'Smart Suggest package dist files are missing. Run pnpm --dir apps/smart-suggest build:packages first.',
    );
  }

  const [datasets, storage] = await Promise.all([
    import(pathToFileURL(datasetsPath).href),
    import(pathToFileURL(storagePath).href),
  ]);

  return {
    createAddressImportRunId: datasets.createAddressImportRunId,
    createAuthoritativeAddressImportSource: datasets.createAuthoritativeAddressImportSource,
    createD1SmartSuggestRepositories: storage.createD1SmartSuggestRepositories,
    createInMemorySmartSuggestRepositories: storage.createInMemorySmartSuggestRepositories,
    runAddressDatasetImport: (options) =>
      runCliEffectAsPromise(datasets.runAddressDatasetImportEffect(options)),
  };
}

function canonicalResultsToRows(corpus) {
  return corpus.canonicalResults.map((result) => {
    const address = result.address ?? {};
    const rowId = String(result.id);
    const sourceRecordId = rowId.includes(':') ? rowId.split(':').at(-1) : rowId;

    return {
      id: rowId,
      parts: {
        city: address.city,
        countryCode: address.countryCode ?? 'CZ',
        district: address.district,
        houseNumber: address.houseNumber,
        orientationNumber: address.orientationNumber,
        postalCode: address.postalCode,
        street: address.street,
      },
      quality: 0.98,
      ruian: {
        addressPlaceCode: sourceRecordId,
        stableAddressId: rowId,
      },
      sourceLineage: {
        datasetVersion: corpus.id,
        fileKind: 'baseline',
        sourceId: result.sourceId,
        sourceRecordId,
        sourceRecordType: 'address-place',
        sourceRowId: sourceRecordId,
        sourceUri: `fixture://${corpus.id}`,
      },
      visibility: {
        replicationStatus: 'active',
        searchVisibility: 'searchable',
      },
    };
  });
}

function listMigrationSqlFiles(directory) {
  return fs
    .readdirSync(directory)
    .filter((entry) => entry.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => path.join(directory, entry));
}

function normalizeSqliteParams(params) {
  return params.map((param) => (param === undefined ? null : param));
}

function createObservableSqliteD1Binding() {
  const database = new DatabaseSync(':memory:');
  const stats = {
    queryCount: 0,
    rowsReturned: 0,
    reset() {
      this.queryCount = 0;
      this.rowsReturned = 0;
    },
    snapshot() {
      return {
        queryCount: this.queryCount,
        rowsReturned: this.rowsReturned,
      };
    },
  };

  database.exec('PRAGMA foreign_keys = ON;');
  for (const migrationPath of listMigrationSqlFiles(smartSuggestD1MigrationsSource)) {
    database.exec(fs.readFileSync(migrationPath, 'utf8'));
  }

  const executeRows = (sql, params) => {
    const startedAt = performance.now();
    const statement = database.prepare(sql);
    const results = statement.all(...normalizeSqliteParams(params));
    const duration = performance.now() - startedAt;
    stats.queryCount += 1;
    stats.rowsReturned += results.length;

    return {
      meta: {
        duration,
        rows_read: results.length,
        rows_written: 0,
      },
      results,
      success: true,
    };
  };

  const executeRun = (sql, params) => {
    if (/\breturning\b/iu.test(sql)) {
      return executeRows(sql, params);
    }

    const startedAt = performance.now();
    const statement = database.prepare(sql);
    const result = statement.run(...normalizeSqliteParams(params));
    const duration = performance.now() - startedAt;
    stats.queryCount += 1;

    return {
      meta: {
        changes: result.changes,
        duration,
        last_row_id: result.lastInsertRowid,
        rows_read: 0,
        rows_written: result.changes,
      },
      results: [],
      success: true,
    };
  };

  const createStatement = (sql, params = []) => ({
    all: async () => executeRows(sql, params),
    bind: (...nextParams) => createStatement(sql, nextParams),
    first: async (columnName) => {
      const result = executeRows(sql, params);
      const [row] = result.results;

      if (row === undefined || columnName === undefined) {
        return row;
      }

      return row[columnName];
    },
    raw: async () => {
      const result = executeRows(sql, params);

      return result.results.map((row) => Object.values(row));
    },
    run: async () => executeRun(sql, params),
  });

  return {
    binding: {
      batch: async (statements) => {
        const results = [];

        for (const statement of statements) {
          results.push(await statement.run());
        }

        return results;
      },
      prepare: (sql) => createStatement(sql),
    },
    close: () => database.close(),
    stats,
  };
}

function pathDefinition(pathKey) {
  if (pathKey === 'in-memory') {
    return {
      cacheMode: 'none',
      indexStrategy: 'prefix-token',
      kind: 'owned',
      label: 'In-memory owned repository',
      ownedDataMode: 'in-memory',
      pathId: 'owned-memory-no-cache',
    };
  }

  if (pathKey === 'http-api-all-caches') {
    return {
      cacheMode: 'all-levels',
      indexStrategy: 'fts5',
      kind: 'hybrid',
      label: 'Smart Suggest HTTP API with owned DB and caches',
      ownedDataMode: 'd1-deployed',
      pathId: 'owned-db-all-caches',
    };
  }

  return {
    cacheMode: 'none',
    indexStrategy: 'fts5',
    kind: 'owned',
    label: 'Local SQLite D1-compatible owned repository',
    ownedDataMode: 'sqlite-local',
    pathId: 'owned-sqlite-local-no-cache',
  };
}

async function createPathContext(pathKey, modules) {
  const definition = pathDefinition(pathKey);

  if (pathKey === 'http-api-all-caches') {
    return createHttpApiPathContext(definition);
  }

  if (pathKey === 'in-memory') {
    return {
      ...definition,
      close: () => {},
      repositories: modules.createInMemorySmartSuggestRepositories(),
      resetStorageStats: () => {},
      storageSnapshot: () => ({ queryCount: 0, rowsReturned: 0 }),
    };
  }

  const sqlite = createObservableSqliteD1Binding();
  const repositories = modules.createD1SmartSuggestRepositories(sqlite.binding);
  const health = await runCliEffectAsPromise(repositories.health.check());

  if (!health.ok) {
    sqlite.close();
    throw new Error(`SQLite D1-compatible health check failed: ${health.error ?? 'unknown'}`);
  }

  return {
    ...definition,
    close: sqlite.close,
    repositories,
    resetStorageStats: () => sqlite.stats.reset(),
    storageSnapshot: () => sqlite.stats.snapshot(),
  };
}

function normalizeApiBaseUrl(value) {
  const url = new URL(value);
  url.hash = '';
  return url;
}

function joinApiRoute(baseUrl, routePath) {
  const normalizedBase = String(baseUrl).endsWith('/') ? String(baseUrl) : `${baseUrl}/`;
  const normalizedRoute = routePath.startsWith('/') ? routePath.slice(1) : routePath;

  return new URL(normalizedRoute, normalizedBase);
}

function createHttpApiPathContext(definition) {
  return {
    ...definition,
    apiBase: undefined,
    browserMemoryCache: new Map(),
    close: () => {},
    providerIds: [],
    requiresLiveProviderOptIn: false,
    resetStorageStats: () => {},
    storageSnapshot: () => ({ queryCount: 0, rowsReturned: 0 }),
  };
}

async function seedRepositories(context, modules, corpus, rows) {
  const metadata = {
    datasetVersion: corpus.id,
    shardCountryCode: corpus.defaultRequest?.countryCode ?? 'CZ',
    snapshotUri: `fixture://${corpus.id}`,
    sourceId: 'ruian-cz',
    sourceName: 'Smart Suggest benchmark corpus',
  };
  const source = modules.createAuthoritativeAddressImportSource(metadata);
  const result = await modules.runAddressDatasetImport({
    chunkSize: Math.max(1, rows.length),
    repositories: context.repositories,
    rows,
    runId: `${modules.createAddressImportRunId(metadata)}-${context.ownedDataMode}`,
    source,
  });

  if (result.errors.length > 0) {
    throw new Error(`Benchmark fixture import rejected ${result.errors.length} row(s).`);
  }

  return result;
}

function selectScenarios(corpus, scenarioIds) {
  if (scenarioIds.length === 0) {
    return corpus.scenarios;
  }

  const scenarioById = new Map(corpus.scenarios.map((scenario) => [scenario.id, scenario]));
  const selected = [];

  for (const scenarioId of scenarioIds) {
    const scenario = scenarioById.get(scenarioId);

    if (scenario === undefined) {
      throw new Error(`Unknown scenario id: ${scenarioId}`);
    }

    selected.push(scenario);
  }

  return selected;
}

async function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('benchmark-timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeProviderEvent(event) {
  const normalized = {
    providerId: redactText(event.providerId ?? 'unknown-provider'),
    status: providerEventStatuses.has(event.status) ? event.status : 'error',
  };

  if (Number.isFinite(event.latencyMs)) {
    normalized.latencyMs = Math.max(0, Number(event.latencyMs));
  }
  if (Number.isInteger(event.bytesTransferred) && event.bytesTransferred >= 0) {
    normalized.bytesTransferred = event.bytesTransferred;
  }
  if (Number.isFinite(event.costEstimateUsd) && event.costEstimateUsd >= 0) {
    normalized.costEstimateUsd = roundMetric(event.costEstimateUsd);
  }
  if (typeof event.errorCode === 'string' && event.errorCode.length > 0) {
    normalized.errorCode = redactText(event.errorCode);
  }

  return normalized;
}

function topResultIds(records) {
  return records.map((record) => String(record.id));
}

function canonicalSourceIdByResultId(corpus) {
  return new Map((corpus.canonicalResults ?? []).map((result) => [result.id, result.sourceId]));
}

function recordFromResultId(resultId, sourceByResultId, fallbackSourceId) {
  return {
    id: resultId,
    sourceId: sourceByResultId.get(resultId) ?? fallbackSourceId,
  };
}

function sourceIds(records) {
  return [...new Set(records.map((record) => String(record.sourceId)))];
}

function collectFailureReasons(
  correctness,
  expected,
  resultCount,
  expectedSourceIds,
  actualSourceIds,
) {
  const failures = new Set();

  if (!correctness.top1Correct) {
    failures.add('top1-mismatch');
  }
  if (!correctness.top5Correct) {
    failures.add('top5-mismatch');
  }
  if (correctness.requiredResultRecall < 1) {
    failures.add('missing-required-result');
  }
  if (correctness.forbiddenTop1Violated) {
    failures.add('forbidden-top1');
  }

  const minimum = expected.resultCount?.min ?? 0;
  const maximum = expected.resultCount?.max ?? Number.POSITIVE_INFINITY;

  if (resultCount < minimum) {
    failures.add('result-volume-too-low');
  }
  if (resultCount > maximum) {
    failures.add('result-volume-too-high');
  }
  if (
    expectedSourceIds.length > 0 &&
    actualSourceIds.length > 0 &&
    actualSourceIds.some((sourceId) => !expectedSourceIds.includes(sourceId))
  ) {
    failures.add('wrong-source');
  }

  return correctnessFailureOrder.filter((reason) => failures.has(reason));
}

function evaluateCorrectness(scenario, records) {
  const expected = scenario.expected ?? {};
  const resultIds = topResultIds(records);
  const firstResultId = resultIds[0];
  const firstFiveIds = resultIds.slice(0, 5);
  const expectedTop1 = expected.top1ResultIds ?? [];
  const expectedTop5 = expected.top5ResultIds ?? [];
  const required = expected.requiredResultIds ?? [];
  const forbiddenTop1 = expected.forbiddenTop1ResultIds ?? [];
  const resultCount = resultIds.length;
  const expectedSourceIds = expected.expectedSourceIds ?? [];
  const actualSourceIds = sourceIds(records);
  const requiredHits = required.filter((resultId) => resultIds.includes(resultId)).length;
  const requiredResultRecall = required.length === 0 ? 1 : requiredHits / required.length;
  const top1Correct =
    expectedTop1.length === 0
      ? firstResultId === undefined
      : firstResultId !== undefined && expectedTop1.includes(firstResultId);
  const top5Correct =
    expectedTop5.length === 0
      ? resultIds.length === 0
      : expectedTop5.some((resultId) => firstFiveIds.includes(resultId));
  const minimum = expected.resultCount?.min ?? 0;
  const maximum = expected.resultCount?.max ?? Number.POSITIVE_INFINITY;
  const forbiddenTop1Violated =
    firstResultId !== undefined && forbiddenTop1.includes(firstResultId);
  const correctness = {
    forbiddenTop1Violated,
    requiredResultRecall,
    resultVolumeMatches: resultCount >= minimum && resultCount <= maximum,
    top1Correct,
    top5Correct,
  };
  const failureReasons = collectFailureReasons(
    correctness,
    expected,
    resultCount,
    expectedSourceIds,
    actualSourceIds,
  );

  if (failureReasons.length > 0) {
    correctness.failureReasons = failureReasons;
  }

  return correctness;
}

function disabledCacheMetrics(ownedDbEnabled = true) {
  const disabled = { enabled: false, status: 'disabled' };

  return {
    levels: {
      browserMemory: disabled,
      d1ReadThrough: disabled,
      edgeCache: disabled,
      ownedDb: ownedDbEnabled ? { enabled: true, status: 'miss' } : disabled,
      workerMemory: disabled,
    },
    status: 'disabled',
  };
}

function normalizeCacheStatus(value) {
  return cacheStatuses.has(value) ? value : 'miss';
}

function normalizeCacheLevel(value, fallback) {
  if (value === undefined || value === null || typeof value !== 'object') {
    return fallback;
  }

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : fallback.enabled,
    status: normalizeCacheStatus(value.status ?? fallback.status),
  };
}

function httpApiCacheMetrics(
  body,
  records,
  browserMemoryLevel = { enabled: false, status: 'disabled' },
) {
  const cacheStatus = normalizeCacheStatus(body?.cacheStatus);
  const cacheLevel = { enabled: true, status: cacheStatus };
  const ownedDbStatus = records.some((record) => record.sourceId === 'ruian-cz') ? 'hit' : 'miss';
  const bodyCacheLevels = body?.cacheLevels ?? body?.cache?.levels ?? {};

  return {
    levels: {
      browserMemory: browserMemoryLevel,
      d1ReadThrough: normalizeCacheLevel(bodyCacheLevels.d1ReadThrough, cacheLevel),
      edgeCache: normalizeCacheLevel(bodyCacheLevels.edgeCache, { enabled: true, status: 'miss' }),
      ownedDb: normalizeCacheLevel(bodyCacheLevels.ownedDb, {
        enabled: true,
        status: ownedDbStatus,
      }),
      workerMemory: normalizeCacheLevel(bodyCacheLevels.workerMemory, cacheLevel),
    },
    status: cacheStatus,
  };
}

function storageMetrics(context, storageSnapshot, resultCount) {
  const d1QueryCount = storageSnapshot.queryCount;

  return {
    d1Fanout: d1QueryCount > 0 ? 1 : 0,
    d1QueryCount,
    indexStrategy: context.indexStrategy,
    rowsRead: context.ownedDataMode === 'in-memory' ? resultCount : storageSnapshot.rowsReturned,
  };
}

async function runScenario(context, scenario, args, requestLimit) {
  context.resetStorageStats();
  const startedAt = performance.now();
  let records = [];
  let status = 'success';
  let errorCode;

  try {
    records = await withTimeout(
      runCliEffectAsPromise(
        context.repositories.addressRecords.searchAddressRecords({
          countryCode: scenario.countryCode ?? 'CZ',
          limit: requestLimit,
          query: scenario.query,
        }),
      ),
      args.timeoutMs,
    );
  } catch (error) {
    status = error instanceof Error && error.message === 'benchmark-timeout' ? 'timeout' : 'error';
    errorCode = status === 'timeout' ? 'timeout' : 'storage-error';
  }

  const latencyMs = performance.now() - startedAt;
  const searchStorageSnapshot = context.storageSnapshot();
  const providerEvents = (
    await runCliEffectAsPromise(context.repositories.providerEvents.listProviderEvents(scenario.id))
  ).map((event) => normalizeProviderEvent(event));
  const correctness =
    status === 'success'
      ? evaluateCorrectness(scenario, records)
      : {
          failureReasons: [status === 'timeout' ? 'timeout' : 'storage-error'],
          forbiddenTop1Violated: false,
          requiredResultRecall: 0,
          resultVolumeMatches: false,
          top1Correct: false,
          top5Correct: false,
        };
  const result = {
    cache: disabledCacheMetrics(),
    correctness,
    freshness: {
      datasetVersion: 'smart-suggest-public-safe-corpus-v1',
      freshnessDeltaSeconds: null,
      sourceUpdatedAt: null,
    },
    latencyMs: roundMetric(latencyMs),
    network: {
      bytesTransferred: 0,
      requestCount: 0,
    },
    pathId: context.pathId,
    providerEvents,
    resultCount: records.length,
    scenarioId: scenario.id,
    status,
    storage: storageMetrics(context, searchStorageSnapshot, records.length),
    topResultIds: topResultIds(records).slice(0, requestLimit),
  };

  if (errorCode !== undefined) {
    result.errorCode = errorCode;
  }

  return result;
}

function providerOnlyStorageMetrics() {
  return {
    d1Fanout: 0,
    d1QueryCount: 0,
    indexStrategy: 'provider-only',
    rowsRead: 0,
  };
}

function activeProviderStatusRank(status) {
  if (status === 'success') {
    return 0;
  }
  if (status === 'timeout') {
    return 1;
  }
  if (status === 'error') {
    return 2;
  }

  return 3;
}

function aggregateNaiveStatus(results) {
  if (results.some((result) => result.status === 'success')) {
    return 'success';
  }
  if (results.some((result) => result.status === 'timeout')) {
    return 'timeout';
  }
  if (results.some((result) => result.status === 'error')) {
    return 'error';
  }

  return 'skipped';
}

function isRealExternalBaselinePathId(pathId) {
  return (
    pathId.startsWith('external-live-baseline:') &&
    pathId !== `external-live-baseline:${fakeExternalBaselineId}`
  );
}

function createNaiveLiveProviderPath(realExternalPaths, args) {
  return {
    benchmarkControls: {
      cacheMode: 'none',
      concurrency: args.providerConcurrency,
      delayMs: args.providerDelayMs,
      liveProviderCallsAllowed: args.liveProvidersEnabled,
      noCache: true,
      rateLimitMs: args.providerRateLimitMs ?? 0,
      timeoutMs: args.timeoutMs,
      warmupIterations: args.warmup,
    },
    cacheMode: 'none',
    kind: 'live-provider',
    label: 'Naive live-provider API fanout with every cache disabled',
    ownedDataMode: 'disabled',
    pathId: naiveLiveProviderPathId,
    providerIds: [
      ...new Set(realExternalPaths.flatMap((pathEntry) => pathEntry.providerIds ?? [])),
    ].toSorted((left, right) => left.localeCompare(right)),
  };
}

function groupResultsByPathAndScenario(results) {
  const grouped = new Map();

  for (const result of results) {
    let byScenario = grouped.get(result.pathId);

    if (byScenario === undefined) {
      byScenario = new Map();
      grouped.set(result.pathId, byScenario);
    }

    const scenarioResults = byScenario.get(result.scenarioId) ?? [];
    scenarioResults.push(result);
    byScenario.set(result.scenarioId, scenarioResults);
  }

  return grouped;
}

function createNaiveLiveProviderScenarioResult({ componentResults, scenario, sourceByResultId }) {
  const status = aggregateNaiveStatus(componentResults);
  const providerEvents = componentResults
    .flatMap((result) => result.providerEvents ?? [])
    .toSorted((left, right) => {
      const statusDelta =
        activeProviderStatusRank(left.status) - activeProviderStatusRank(right.status);

      return statusDelta === 0
        ? String(left.providerId).localeCompare(String(right.providerId))
        : statusDelta;
    });
  const topResultIdsValue = [
    ...new Set(componentResults.flatMap((result) => result.topResultIds ?? [])),
  ];
  const records = topResultIdsValue.map((resultId) =>
    recordFromResultId(resultId, sourceByResultId, 'live-provider:naive-no-cache'),
  );
  const correctness =
    status === 'success'
      ? evaluateCorrectness(scenario, records)
      : failedCorrectness(status === 'timeout' ? 'timeout' : 'provider-error');
  const network = componentResults.reduce(
    (summary, result) => ({
      bytesTransferred: summary.bytesTransferred + (result.network?.bytesTransferred ?? 0),
      requestCount: summary.requestCount + (result.network?.requestCount ?? 0),
    }),
    {
      bytesTransferred: 0,
      requestCount: 0,
    },
  );

  return {
    cache: disabledCacheMetrics(false),
    correctness,
    freshness: {
      datasetVersion: null,
      freshnessDeltaSeconds: null,
      sourceUpdatedAt: null,
    },
    latencyMs: roundMetric(Math.max(...componentResults.map((result) => result.latencyMs))),
    network,
    pathId: naiveLiveProviderPathId,
    providerEvents,
    resultCount: records.length,
    scenarioId: scenario.id,
    status,
    storage: providerOnlyStorageMetrics(),
    topResultIds: topResultIds(records),
  };
}

function appendNaiveLiveProviderBaseline({
  args,
  comparisonPaths,
  corpus,
  scenarioResults,
  selectedScenarios,
}) {
  const realExternalPaths = comparisonPaths.filter((pathEntry) =>
    isRealExternalBaselinePathId(pathEntry.pathId),
  );

  if (!args.liveProvidersEnabled || realExternalPaths.length === 0) {
    return;
  }

  const grouped = groupResultsByPathAndScenario(scenarioResults);
  const sourceByResultId = canonicalSourceIdByResultId(corpus);
  const aggregateResults = [];

  for (const scenario of selectedScenarios) {
    for (let iteration = 0; iteration < args.iterations; iteration += 1) {
      const componentResults = realExternalPaths.map((pathEntry) => {
        const result = grouped.get(pathEntry.pathId)?.get(scenario.id)?.[iteration];

        if (result === undefined) {
          throw new Error(
            `Missing external baseline result for ${pathEntry.pathId}/${scenario.id} iteration ${iteration}.`,
          );
        }

        return result;
      });

      aggregateResults.push(
        createNaiveLiveProviderScenarioResult({
          componentResults,
          scenario,
          sourceByResultId,
        }),
      );
    }
  }

  comparisonPaths.push(createNaiveLiveProviderPath(realExternalPaths, args));
  scenarioResults.push(...aggregateResults);
}

function failedCorrectness(reason) {
  return {
    failureReasons: [reason],
    forbiddenTop1Violated: false,
    requiredResultRecall: 0,
    resultVolumeMatches: false,
    top1Correct: false,
    top5Correct: false,
  };
}

async function runExternalScenario(context, normalizer, scenario, args, requestLimit) {
  const startedAt = performance.now();
  let normalizedRecords = [];
  let providerEvents = [];
  let status;
  let errorCode;
  let network = {
    bytesTransferred: 0,
    requestCount: 0,
  };

  try {
    const providerResult = await context.suggest({
      countryCode: scenario.countryCode ?? 'CZ',
      kind: scenario.kind ?? 'address',
      language: scenario.language ?? 'cs-CZ',
      limit: requestLimit,
      query: scenario.query,
    });

    status = providerResult.status ?? 'success';
    providerEvents = (providerResult.providerEvents ?? []).map((event) =>
      normalizeProviderEvent(event),
    );
    network = providerResult.network ?? network;

    if (status === 'success') {
      normalizedRecords = normalizer
        .normalizeSuggestions(
          context.baselineProviderId ?? context.providerIds[0] ?? context.pathId,
          providerResult.suggestions ?? [],
        )
        .slice(0, requestLimit);
    } else {
      errorCode = providerResult.errorCode ?? 'provider-error';
    }
  } catch {
    status = 'error';
    errorCode = 'provider-error';
  }

  const latencyMs = performance.now() - startedAt;
  const correctness =
    status === 'success'
      ? evaluateCorrectness(scenario, normalizedRecords)
      : failedCorrectness('provider-error');
  const result = {
    cache: disabledCacheMetrics(false),
    correctness,
    freshness: {
      datasetVersion: null,
      freshnessDeltaSeconds: null,
      sourceUpdatedAt: null,
    },
    latencyMs: roundMetric(latencyMs),
    network,
    pathId: context.pathId,
    providerEvents,
    resultCount: normalizedRecords.length,
    scenarioId: scenario.id,
    status,
    storage: providerOnlyStorageMetrics(),
    topResultIds: topResultIds(normalizedRecords).slice(0, requestLimit),
  };

  if (errorCode !== undefined) {
    result.errorCode = redactText(errorCode);
  }

  return result;
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new DOMException('Smart Suggest HTTP benchmark timed out.', 'TimeoutError'));
  }, timeoutMs);

  try {
    const startedAt = performance.now();
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'x-smart-suggest-benchmark': 'owned-api-all-caches',
      },
      signal: controller.signal,
    });
    const bodyText = await response.text();

    return {
      bodyText,
      json: bodyText.trim() === '' ? undefined : JSON.parse(bodyText),
      latencyMs: performance.now() - startedAt,
      network: {
        bytesTransferred: Buffer.byteLength(bodyText, 'utf8'),
        requestCount: 1,
      },
      ok: response.ok,
      statusCode: response.status,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function httpSuggestUrl(apiBase, scenario, requestLimit) {
  const params = new URLSearchParams();

  params.set('countryCode', scenario.countryCode ?? 'CZ');
  params.set('kind', scenario.kind ?? 'address');
  params.set('language', scenario.language ?? 'cs-CZ');
  params.set('limit', String(requestLimit));
  params.set('q', scenario.query);

  return joinApiRoute(apiBase, `/v1/suggest?${params.toString()}`);
}

function emptyFreshnessMetrics() {
  return {
    datasetVersion: null,
    freshnessDeltaSeconds: null,
    sourceUpdatedAt: null,
  };
}

function freshnessFromStatusBody(body) {
  const freshness = body?.imports?.freshness;
  const latestRun = freshness?.latestDelta ?? freshness?.latestBaseline;
  const ageHours = freshness?.sla?.ageHours;
  const sourceUpdatedAt = latestRun?.sourceValidAt ?? latestRun?.completedAt ?? null;

  return {
    datasetVersion: latestRun?.sourceVersion ?? latestRun?.sourceFeedId ?? latestRun?.runId ?? null,
    freshnessDeltaSeconds: Number.isFinite(ageHours) ? roundMetric(Number(ageHours) * 3600) : null,
    sourceUpdatedAt,
  };
}

async function fetchHttpApiFreshness(apiBase, timeoutMs) {
  try {
    const response = await fetchJsonWithTimeout(joinApiRoute(apiBase, '/v1/status'), timeoutMs);

    if (!response.ok) {
      return emptyFreshnessMetrics();
    }

    return freshnessFromStatusBody(response.json);
  } catch {
    return emptyFreshnessMetrics();
  }
}

function httpApiBrowserMemoryKey(scenario, requestLimit) {
  return `${scenario.id}:${requestLimit}`;
}

function cloneJsonValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function browserMemoryHitBody(cached) {
  const body = cloneJsonValue(cached.responseBody) ?? {};
  const cacheLevels = cloneJsonValue(body.cacheLevels ?? body.cache?.levels ?? {});
  const untouchedServerLevel = { enabled: true, status: 'miss' };

  cacheLevels.browserMemory = { enabled: true, status: 'hit' };
  cacheLevels.d1ReadThrough = untouchedServerLevel;
  cacheLevels.edgeCache = untouchedServerLevel;
  cacheLevels.ownedDb = untouchedServerLevel;
  cacheLevels.workerMemory = untouchedServerLevel;
  body.cacheLevels = cacheLevels;
  body.cacheStatus = 'hit';

  if (Array.isArray(body.suggestions)) {
    body.suggestions = body.suggestions.map((suggestion) => ({
      ...suggestion,
      cacheStatus: 'hit',
    }));
  }

  return body;
}

async function runHttpApiScenario(context, normalizer, scenario, args, requestLimit, options = {}) {
  const apiBase = normalizeApiBaseUrl(args.apiBase);
  const browserMemoryKey = httpApiBrowserMemoryKey(scenario, requestLimit);
  const cachedBrowserResponse = options.readBrowserMemory
    ? context.browserMemoryCache.get(browserMemoryKey)
    : undefined;
  let normalizedRecords = [];
  let providerEvents = [];
  let status = 'success';
  let errorCode;
  let latencyMs = 0;
  let network = {
    bytesTransferred: 0,
    requestCount: 0,
  };
  let responseBody;
  let browserMemoryLevel = { enabled: true, status: 'miss' };

  if (cachedBrowserResponse !== undefined) {
    responseBody = browserMemoryHitBody(cachedBrowserResponse);
    normalizedRecords = cloneJsonValue(cachedBrowserResponse.normalizedRecords) ?? [];
    providerEvents = cloneJsonValue(cachedBrowserResponse.providerEvents) ?? [];
    browserMemoryLevel = { enabled: true, status: 'hit' };
  } else {
    try {
      const response = await fetchJsonWithTimeout(
        httpSuggestUrl(apiBase, scenario, requestLimit),
        args.timeoutMs,
      );

      latencyMs = response.latencyMs;
      network = response.network;
      responseBody = response.json;

      if (!response.ok) {
        status = 'error';
        errorCode = `http-${response.statusCode}`;
      } else {
        providerEvents = (responseBody?.providerEvents ?? []).map((event) =>
          normalizeProviderEvent(event),
        );
        normalizedRecords = normalizer
          .normalizeSuggestions(context.pathId, responseBody?.suggestions ?? [])
          .slice(0, requestLimit);

        if (options.writeBrowserMemory === true) {
          context.browserMemoryCache.set(browserMemoryKey, {
            normalizedRecords: cloneJsonValue(normalizedRecords),
            providerEvents: cloneJsonValue(providerEvents),
            responseBody: cloneJsonValue(responseBody),
          });
        }
      }
    } catch (error) {
      status = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'error';
      errorCode = status === 'timeout' ? 'timeout' : 'http-api-error';
    }
  }

  const correctness =
    status === 'success'
      ? evaluateCorrectness(scenario, normalizedRecords)
      : failedCorrectness(status === 'timeout' ? 'timeout' : 'storage-error');
  const result = {
    cache: httpApiCacheMetrics(responseBody, normalizedRecords, browserMemoryLevel),
    correctness,
    freshness: context.freshness ?? emptyFreshnessMetrics(),
    latencyMs: roundMetric(latencyMs),
    network,
    pathId: context.pathId,
    providerEvents,
    resultCount: normalizedRecords.length,
    scenarioId: scenario.id,
    status,
    storage: {
      d1Fanout: 0,
      d1QueryCount: 0,
      indexStrategy: context.indexStrategy,
      rowsRead: 0,
    },
    topResultIds: topResultIds(normalizedRecords).slice(0, requestLimit),
  };

  if (errorCode !== undefined) {
    result.errorCode = redactText(errorCode);
  }
  if (Number.isInteger(options.iteration)) {
    result.iteration = options.iteration;
  }

  return result;
}

async function runWarmup(context, scenarios, args, requestLimit) {
  for (let iteration = 0; iteration < args.warmup; iteration += 1) {
    for (const scenario of scenarios) {
      context.resetStorageStats();
      await withTimeout(
        runCliEffectAsPromise(
          context.repositories.addressRecords.searchAddressRecords({
            countryCode: scenario.countryCode ?? 'CZ',
            limit: requestLimit,
            query: scenario.query,
          }),
        ),
        args.timeoutMs,
      );
    }
  }
}

async function runExternalWarmup(context, scenarios, args, requestLimit) {
  for (let iteration = 0; iteration < args.warmup; iteration += 1) {
    for (const scenario of scenarios) {
      await context.suggest({
        countryCode: scenario.countryCode ?? 'CZ',
        kind: scenario.kind ?? 'address',
        language: scenario.language ?? 'cs-CZ',
        limit: requestLimit,
        query: scenario.query,
      });
    }
  }
}

async function runHttpApiWarmup(context, normalizer, scenarios, args, requestLimit) {
  for (let iteration = 0; iteration < args.warmup; iteration += 1) {
    for (const scenario of scenarios) {
      await runHttpApiScenario(context, normalizer, scenario, args, requestLimit, {
        readBrowserMemory: false,
        writeBrowserMemory: false,
      });
    }
  }
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), Math.max(1, items.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index], index);
    }
  });

  await Promise.all(workers);

  return results;
}

function measuredScenarioEntries(selectedScenarios, iterations) {
  const entries = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const scenario of selectedScenarios) {
      entries.push({
        iteration,
        scenario,
      });
    }
  }

  return entries;
}

function roundMetric(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 1000) / 1000;
}

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return roundMetric(sorted[lower]);
  }

  return roundMetric(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}

function distribution(values) {
  if (values.length === 0) {
    return { max: 0, mean: 0, min: 0, p50: 0, p95: 0, p99: 0 };
  }

  const sum = values.reduce((total, value) => total + value, 0);

  return {
    max: roundMetric(Math.max(...values)),
    mean: roundMetric(sum / values.length),
    min: roundMetric(Math.min(...values)),
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
  };
}

function rate(count, total) {
  return total === 0 ? 0 : roundMetric(count / total);
}

function providerEventAggregate(results) {
  const events = results.flatMap((result) => result.providerEvents);

  return {
    error: events.filter((event) => event.status === 'error').length,
    skipped: events.filter((event) => event.status === 'skipped').length,
    success: events.filter((event) => event.status === 'success').length,
    timeout: events.filter((event) => event.status === 'timeout').length,
    total: events.length,
  };
}

function byteAggregate(results) {
  const values = results.map((result) => result.network.bytesTransferred);
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    mean: values.length === 0 ? 0 : roundMetric(total / values.length),
    p95: percentile(values, 0.95),
    total,
  };
}

function networkRequestAggregate(results) {
  const values = results.map((result) => result.network.requestCount);

  return {
    ...distribution(values),
    total: values.reduce((sum, value) => sum + value, 0),
  };
}

function costAggregate(results) {
  const totalUsd = results
    .flatMap((result) => result.providerEvents)
    .reduce((sum, event) => sum + (event.costEstimateUsd ?? 0), 0);

  return {
    per1kRequestsUsd: results.length === 0 ? 0 : roundMetric((totalUsd / results.length) * 1000),
    totalUsd: roundMetric(totalUsd),
  };
}

function cacheHitRate(results, level) {
  return rate(
    results.filter((result) => result.cache.levels[level]?.status === 'hit').length,
    results.length,
  );
}

function aggregateForPath(pathId, results, scenarioCount) {
  const requestCount = results.length;
  const successfulResults = results.filter((result) => result.status === 'success');

  return {
    metrics: {
      bytesTransferred: byteAggregate(results),
      cacheHitRate: {
        browserMemory: cacheHitRate(results, 'browserMemory'),
        d1ReadThrough: cacheHitRate(results, 'd1ReadThrough'),
        edgeCache: cacheHitRate(results, 'edgeCache'),
        overall: rate(
          results.filter((result) =>
            Object.values(result.cache.levels).some((level) => level.status === 'hit'),
          ).length,
          requestCount,
        ),
        ownedDb: cacheHitRate(results, 'ownedDb'),
        workerMemory: cacheHitRate(results, 'workerMemory'),
      },
      costEstimateUsd: costAggregate(results),
      d1Fanout: distribution(results.map((result) => result.storage.d1Fanout)),
      d1QueryCount: distribution(results.map((result) => result.storage.d1QueryCount)),
      emptyResponseRate: rate(
        results.filter((result) => result.resultCount === 0).length,
        requestCount,
      ),
      errorRate: rate(results.filter((result) => result.status === 'error').length, requestCount),
      expectedResultVolumePassRate: rate(
        successfulResults.filter((result) => result.correctness.resultVolumeMatches).length,
        requestCount,
      ),
      forbiddenTop1ViolationRate: rate(
        successfulResults.filter((result) => result.correctness.forbiddenTop1Violated).length,
        requestCount,
      ),
      freshnessDeltaSeconds: distribution(
        results
          .map((result) => result.freshness.freshnessDeltaSeconds)
          .filter((value) => Number.isFinite(value)),
      ),
      latencyMs: distribution(results.map((result) => result.latencyMs)),
      networkRequests: networkRequestAggregate(results),
      providerEvents: providerEventAggregate(results),
      requestCount,
      requiredResultRecallRate: rate(
        successfulResults.filter((result) => result.correctness.requiredResultRecall >= 1).length,
        requestCount,
      ),
      resultCount: distribution(results.map((result) => result.resultCount)),
      scenarioCount,
      staleResultRate: 0,
      timeoutRate: rate(
        results.filter((result) => result.status === 'timeout').length,
        requestCount,
      ),
      top1CorrectRate: rate(
        successfulResults.filter((result) => result.correctness.top1Correct).length,
        requestCount,
      ),
      top5CorrectRate: rate(
        successfulResults.filter((result) => result.correctness.top5Correct).length,
        requestCount,
      ),
    },
    pathId,
  };
}

function aggregateMetrics(comparisonPaths, scenarioResults, scenarioCount) {
  const paths = comparisonPaths.map((comparisonPath) =>
    aggregateForPath(
      comparisonPath.pathId,
      scenarioResults.filter((result) => result.pathId === comparisonPath.pathId),
      scenarioCount,
    ),
  );
  const hasActiveProviderEvidence = (pathEntry) => {
    const pathResults = scenarioResults.filter((result) => result.pathId === pathEntry.pathId);
    const networkRequestCount = pathResults.reduce(
      (sum, result) => sum + (result.network?.requestCount ?? 0),
      0,
    );
    const activeProviderEventCount = pathResults
      .flatMap((result) => result.providerEvents ?? [])
      .filter((event) => ['success', 'timeout', 'error'].includes(event.status)).length;

    return networkRequestCount > 0 || activeProviderEventCount > 0;
  };
  const externalBaselinePath =
    comparisonPaths.find(
      (pathEntry) =>
        pathEntry.pathId === naiveLiveProviderPathId && hasActiveProviderEvidence(pathEntry),
    ) ??
    comparisonPaths.find(
      (pathEntry) =>
        pathEntry.pathId.startsWith('external-live-baseline:') &&
        hasActiveProviderEvidence(pathEntry),
    ) ??
    comparisonPaths.find((pathEntry) => pathEntry.pathId.startsWith('external-live-baseline:')) ??
    comparisonPaths.find((pathEntry) => pathEntry.pathId === naiveLiveProviderPathId);
  const optimizedCandidatePath =
    comparisonPaths.find((pathEntry) => pathEntry.pathId === 'owned-db-all-caches') ??
    comparisonPaths.find((pathEntry) => pathEntry.pathId === 'owned-sqlite-local-no-cache') ??
    comparisonPaths.find((pathEntry) => pathEntry.pathId === 'owned-memory-no-cache') ??
    comparisonPaths.at(-1);
  const baselinePathId =
    externalBaselinePath?.pathId ?? comparisonPaths[0]?.pathId ?? 'owned-memory-no-cache';
  const candidatePathId = optimizedCandidatePath?.pathId ?? baselinePathId;
  const baseline = paths.find((entry) => entry.pathId === baselinePathId)?.metrics;
  const candidate = paths.find((entry) => entry.pathId === candidatePathId)?.metrics;
  const comparisonDeltaPaths = [
    'bytesTransferred.mean',
    'bytesTransferred.total',
    'cacheHitRate.browserMemory',
    'cacheHitRate.d1ReadThrough',
    'cacheHitRate.edgeCache',
    'cacheHitRate.overall',
    'cacheHitRate.ownedDb',
    'cacheHitRate.workerMemory',
    'costEstimateUsd.per1kRequestsUsd',
    'costEstimateUsd.totalUsd',
    'd1Fanout.mean',
    'd1QueryCount.mean',
    'emptyResponseRate',
    'errorRate',
    'latencyMs.p50',
    'latencyMs.p95',
    'networkRequests.mean',
    'networkRequests.total',
    'providerEvents.total',
    'resultCount.mean',
    'timeoutRate',
    'top1CorrectRate',
    'top5CorrectRate',
  ];

  const metricValue = (metrics, metricPath) =>
    metricPath.split('.').reduce((value, key) => value?.[key], metrics);
  const comparisonDeltas =
    baseline === undefined || candidate === undefined
      ? {}
      : Object.fromEntries(
          comparisonDeltaPaths.map((metricPath) => [
            metricPath,
            roundMetric(
              Number(metricValue(candidate, metricPath) ?? 0) -
                Number(metricValue(baseline, metricPath) ?? 0),
            ),
          ]),
        );

  return {
    comparison: {
      baselinePathId,
      candidatePathId,
      deltas: comparisonDeltas,
    },
    paths,
  };
}

function gitMetadata() {
  try {
    return {
      branch: execGit(['rev-parse', '--abbrev-ref', 'HEAD']),
      commit: execGit(['rev-parse', 'HEAD']),
      dirty: execGit(['status', '--short']).length > 0,
    };
  } catch {
    return undefined;
  }
}

function execGit(args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function fairnessControls(args) {
  const hasCachedPath = args.pathKeys.includes('http-api-all-caches');

  return {
    cacheMode: hasCachedPath ? 'mixed' : 'none',
    externalProviderConcurrency: args.providerConcurrency,
    externalProviderDelayMs: args.providerDelayMs,
    liveProviderOptIn: args.liveProvidersEnabled,
    measuredIterations: args.iterations,
    missingProviderBehavior: 'skipped',
    noCache: !hasCachedPath,
    providerRateLimitMs: args.providerRateLimitMs ?? null,
    providerRateLimitMsById: Object.fromEntries(
      Object.entries(args.providerRateLimitMsById).toSorted(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    timeoutMs: args.timeoutMs,
    warmupIterations: args.warmup,
  };
}

function pathBenchmarkControls(context, args) {
  const isExternal = context.kind === 'live-provider';

  return {
    cacheMode: context.cacheMode,
    concurrency: isExternal ? args.providerConcurrency : 1,
    delayMs: isExternal ? args.providerDelayMs : 0,
    liveProviderCallsAllowed:
      isExternal && context.requiresLiveProviderOptIn === true ? args.liveProvidersEnabled : false,
    noCache: context.cacheMode === 'none',
    rateLimitMs: isExternal ? (context.rateLimitMs ?? 0) : 0,
    timeoutMs: args.timeoutMs,
    warmupIterations: args.warmup,
  };
}

function comparisonPath(context, args) {
  const providerSuffix =
    context.kind === 'live-provider'
      ? ` (${context.configured ? 'configured' : `skipped: ${context.skipReason}`})`
      : ' (providers disabled)';

  return {
    benchmarkControls: pathBenchmarkControls(context, args),
    cacheMode: context.cacheMode,
    kind: context.kind,
    label: `${context.label}${providerSuffix}`,
    ownedDataMode: context.ownedDataMode,
    pathId: context.pathId,
    providerIds: context.providerIds ?? [],
  };
}

function buildReport({
  args,
  comparisonPaths,
  completedAt,
  corpus,
  scenarioResults,
  selectedScenarios,
  startedAt,
}) {
  const corpusPath = stableCorpusFixtureReference(args.corpus, corpus);
  const run = {
    apiBaseSha256: apiBaseSha256(args.apiBase),
    completedAt,
    environmentLabel: args.environmentLabel,
    fairnessControls: fairnessControls(args),
    finalBossPreflight: args.finalBossPreflight,
    id: `smart-suggest-benchmark-${startedAt.replaceAll(/[:.]/gu, '-')}`,
    liveProvidersEnabled: args.liveProvidersEnabled,
    notes: [
      'Local owned-search paths run by default.',
      args.liveProvidersEnabled
        ? 'External live-provider baselines were explicitly enabled for configured providers.'
        : 'External live-provider calls were disabled; configured external baselines are skipped or deterministic fake/no-op only.',
      'Report stores scenario ids and normalized result ids; raw queries remain only in the public-safe corpus fixture.',
      'Corpus fixture references are app-relative or stable public-safe labels only.',
    ],
    operator: args.operator,
    startedAt,
  };
  const git = gitMetadata();

  if (git !== undefined) {
    run.git = git;
  }

  return {
    aggregateMetrics: aggregateMetrics(comparisonPaths, scenarioResults, selectedScenarios.length),
    comparisonPaths,
    corpus: {
      fixturePath: corpusPath,
      id: corpus.id,
      scenarioCount: selectedScenarios.length,
      schemaVersion: corpus.schemaVersion,
      selection: selectedScenarios.map((scenario) => scenario.id),
    },
    run,
    scenarioResults,
    schemaVersion: 'smart-suggest-benchmark-metrics/v1',
  };
}

function assertReportIsSafe(report, corpus) {
  const serialized = JSON.stringify(report);

  for (const scenario of corpus.scenarios) {
    if (
      typeof scenario.query === 'string' &&
      scenario.query.length > 6 &&
      serialized.includes(scenario.query)
    ) {
      throw new Error(`Report leaked raw query for scenario ${scenario.id}.`);
    }
  }

  for (const pattern of secretLikePatterns) {
    pattern.lastIndex = 0;

    if (pattern.test(serialized)) {
      throw new Error('Report appears to contain a secret-like value.');
    }
  }

  for (const pattern of unsafePathLeakPatterns) {
    pattern.lastIndex = 0;

    if (pattern.test(serialized)) {
      throw new Error('Report appears to contain an unsafe absolute filesystem path.');
    }
  }

  if (!report.run.liveProvidersEnabled) {
    const externalNetworkRequestCount = report.scenarioResults
      .filter((result) => result.pathId.startsWith('external-live-baseline:'))
      .reduce((sum, result) => sum + result.network.requestCount, 0);
    const liveProviderEventCount = report.scenarioResults
      .flatMap((result) => result.providerEvents)
      .filter(
        (event) =>
          event.status === 'success' || event.status === 'timeout' || event.status === 'error',
      ).length;

    if (externalNetworkRequestCount !== 0 || liveProviderEventCount !== 0) {
      throw new Error('Live provider activity was recorded without explicit live-provider opt-in.');
    }
  }
}

function writeTextFile(filePath, content) {
  if (filePath === undefined) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function markdownNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function markdownComparisonRows(report) {
  const comparison = report.aggregateMetrics.comparison;
  const deltas = comparison.deltas ?? {};
  const rows = [
    ['Network requests total', 'networkRequests.total'],
    ['Bytes transferred total', 'bytesTransferred.total'],
    ['Provider cost USD total', 'costEstimateUsd.totalUsd'],
    ['Provider cost USD per 1k', 'costEstimateUsd.per1kRequestsUsd'],
    ['Overall cache hit rate', 'cacheHitRate.overall'],
    ['Browser memory hit rate', 'cacheHitRate.browserMemory'],
    ['Owned DB hit rate', 'cacheHitRate.ownedDb'],
    ['Timeout rate', 'timeoutRate'],
    ['Error rate', 'errorRate'],
    ['Provider events total', 'providerEvents.total'],
    ['P95 latency ms', 'latencyMs.p95'],
    ['D1 fanout mean', 'd1Fanout.mean'],
    ['D1 queries mean', 'd1QueryCount.mean'],
    ['Top-1 correctness', 'top1CorrectRate'],
    ['Top-5 correctness', 'top5CorrectRate'],
  ];

  return {
    baselinePathId: comparison.baselinePathId,
    candidatePathId: comparison.candidatePathId,
    rows: rows.map(([label, metricPath]) => ({
      delta: markdownNumber(deltas[metricPath]),
      label,
      metricPath,
    })),
  };
}

function markdownReport(report) {
  const lines = [
    '# Smart Suggest Local Owned Benchmark',
    '',
    `Run: ${report.run.id}`,
    `Live providers enabled: ${report.run.liveProvidersEnabled}`,
    `Corpus: ${report.corpus.id} (${report.corpus.scenarioCount} scenarios)`,
    '',
    '## Fairness Controls',
    '',
    `Warmup iterations: ${report.run.fairnessControls.warmupIterations}`,
    `Measured iterations: ${report.run.fairnessControls.measuredIterations}`,
    `Timeout budget: ${report.run.fairnessControls.timeoutMs} ms`,
    `External provider concurrency: ${report.run.fairnessControls.externalProviderConcurrency}`,
    `External provider default rate limit: ${report.run.fairnessControls.providerRateLimitMs ?? 'provider default'} ms`,
    `External provider delay: ${report.run.fairnessControls.externalProviderDelayMs} ms`,
    `Missing provider behavior: ${report.run.fairnessControls.missingProviderBehavior}`,
    '',
    '## Path Summary',
    '',
    '| Path | Mode | Concurrency | Rate ms | Requests | p50 ms | p95 ms | Result mean | Top-1 | Top-5 | Provider events | Network requests | Bytes total | Cost USD | Cache hit | Browser hit | Owned DB hit | D1 fanout mean | D1 queries mean |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const aggregate of report.aggregateMetrics.paths) {
    const pathInfo = report.comparisonPaths.find((entry) => entry.pathId === aggregate.pathId);
    const metrics = aggregate.metrics;

    lines.push(
      [
        pathInfo?.label ?? aggregate.pathId,
        pathInfo?.ownedDataMode ?? 'unknown',
        pathInfo?.benchmarkControls?.concurrency ?? 1,
        pathInfo?.benchmarkControls?.rateLimitMs ?? 0,
        metrics.requestCount,
        metrics.latencyMs.p50,
        metrics.latencyMs.p95,
        metrics.resultCount.mean,
        metrics.top1CorrectRate,
        metrics.top5CorrectRate,
        metrics.providerEvents.total,
        metrics.networkRequests?.total ?? 0,
        metrics.bytesTransferred.total,
        metrics.costEstimateUsd.totalUsd,
        metrics.cacheHitRate.overall,
        metrics.cacheHitRate.browserMemory,
        metrics.cacheHitRate.ownedDb,
        metrics.d1Fanout.mean,
        metrics.d1QueryCount.mean,
      ]
        .join(' | ')
        .replace(/^/u, '| ')
        .replace(/$/u, ' |'),
    );
  }

  const comparison = markdownComparisonRows(report);

  lines.push(
    '',
    '## Comparison Deltas',
    '',
    `Baseline: ${comparison.baselinePathId}`,
    `Candidate: ${comparison.candidatePathId}`,
    '',
    '| Metric | Candidate minus baseline |',
    '| --- | ---: |',
  );

  for (const row of comparison.rows) {
    lines.push(`| ${row.label} | ${row.delta} |`);
  }

  const failingResults = report.scenarioResults.filter(
    (result) => (result.correctness.failureReasons ?? []).length > 0 || result.status !== 'success',
  );

  lines.push('', '## Failing Scenarios', '');

  if (failingResults.length === 0) {
    lines.push('No correctness, timeout, provider-event, or storage failures were recorded.');
  } else {
    lines.push(
      '| Scenario | Path | Status | Results | Top result ids | Failure reasons | Provider events | D1 fanout | D1 queries |',
      '| --- | --- | --- | ---: | --- | --- | ---: | ---: | ---: |',
    );

    for (const result of failingResults) {
      lines.push(
        [
          result.scenarioId,
          result.pathId,
          result.status,
          result.resultCount,
          result.topResultIds.join(', ') || '-',
          (result.correctness.failureReasons ?? []).join(', ') || '-',
          result.providerEvents.length,
          result.storage.d1Fanout,
          result.storage.d1QueryCount,
        ]
          .join(' | ')
          .replace(/^/u, '| ')
          .replace(/$/u, ' |'),
      );
    }
  }

  lines.push('', '## Safety', '');
  for (const note of report.run.notes ?? []) {
    lines.push(`- ${note}`);
  }

  return `${lines.join('\n')}\n`;
}

async function runBenchmark(args) {
  const corpus = readJson(args.corpus);
  assertCorpus(corpus);

  const modules = await loadSmartSuggestModules();
  const rows = canonicalResultsToRows(corpus);
  const selectedScenarios = selectScenarios(corpus, args.scenarioIds);
  const requestLimit = args.limit ?? corpus.defaultRequest?.limit ?? 5;
  const startedAt = new Date().toISOString();
  const comparisonPaths = [];
  const scenarioResults = [];
  const normalizer = createExternalResultNormalizer(corpus);

  for (const pathKey of args.pathKeys) {
    const context = await createPathContext(pathKey, modules);

    try {
      if (pathKey === 'http-api-all-caches') {
        context.freshness = await fetchHttpApiFreshness(args.apiBase, args.timeoutMs);
        await runHttpApiWarmup(context, normalizer, selectedScenarios, args, requestLimit);
        comparisonPaths.push(comparisonPath(context, args));

        const entries = measuredScenarioEntries(selectedScenarios, args.iterations);
        const results = await mapWithConcurrency(entries, 1, (entry) =>
          runHttpApiScenario(context, normalizer, entry.scenario, args, requestLimit, {
            iteration: entry.iteration,
            readBrowserMemory: entry.iteration > 1,
            writeBrowserMemory: true,
          }),
        );
        scenarioResults.push(...results);
        continue;
      }

      await seedRepositories(context, modules, corpus, rows);
      await runWarmup(context, selectedScenarios, args, requestLimit);
      comparisonPaths.push(comparisonPath(context, args));

      for (let iteration = 0; iteration < args.iterations; iteration += 1) {
        for (const scenario of selectedScenarios) {
          scenarioResults.push(await runScenario(context, scenario, args, requestLimit));
        }
      }
    } finally {
      context.close();
    }
  }

  const externalContexts = await createExternalBaselineContexts(args, {
    integrationsPath: smartSuggestIntegrationsDistPath,
  });

  for (const context of externalContexts) {
    try {
      await runExternalWarmup(context, selectedScenarios, args, requestLimit);
      comparisonPaths.push(comparisonPath(context, args));

      const entries = measuredScenarioEntries(selectedScenarios, args.iterations);
      const results = await mapWithConcurrency(entries, args.providerConcurrency, (entry) =>
        runExternalScenario(context, normalizer, entry.scenario, args, requestLimit),
      );
      scenarioResults.push(...results);
    } finally {
      context.close();
    }
  }

  appendNaiveLiveProviderBaseline({
    args,
    comparisonPaths,
    corpus,
    scenarioResults,
    selectedScenarios,
  });

  const completedAt = new Date().toISOString();
  const report = buildReport({
    args,
    comparisonPaths,
    completedAt,
    corpus,
    scenarioResults,
    selectedScenarios,
    startedAt,
  });
  assertReportIsSafe(report, corpus);

  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = markdownReport(report);

  writeTextFile(args.jsonOut, json);
  writeTextFile(args.markdownOut, markdown);

  process.stdout.write(args.format === 'json' ? json : markdown);

  const providerEventCount = report.aggregateMetrics.paths.reduce(
    (sum, aggregate) => sum + aggregate.metrics.providerEvents.total,
    0,
  );

  if (providerEventCount !== 0 && args.externalBaselineIds.length === 0) {
    throw new Error(`Local owned benchmark recorded ${providerEventCount} provider event(s).`);
  }
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return;
  }

  assertFinalBossPreflightReport(args);
  await runBenchmark(args);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
