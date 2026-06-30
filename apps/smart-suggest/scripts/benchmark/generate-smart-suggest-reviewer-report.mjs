#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  fakeExternalBaselineId,
  supportedExternalBaselineIds,
} from './external-baseline-adapters.mjs';

const scriptDirectory = import.meta.dirname;
const appRoot = path.resolve(scriptDirectory, '..', '..');
const repositoryRoot = path.resolve(appRoot, '..', '..');
const correctnessRunner = path.resolve(
  scriptDirectory,
  'run-smart-suggest-correctness-benchmark.mjs',
);
const localBenchmarkRunner = path.resolve(scriptDirectory, 'run-local-owned-benchmark.mjs');
const defaultFixturePath = path.resolve(
  appRoot,
  'scripts/fixtures/smart-suggest-correctness-scenarios-v1.json',
);
const defaultCorpusPath = path.resolve(
  appRoot,
  'scripts/fixtures/smart-suggest-benchmark-corpus-v1.json',
);
const productionProviderBaselineIds = [
  'ruian-geocode',
  'mapy-cz',
  'here-discover',
  'managed-nominatim',
  'radar-autocomplete',
];
const activeProviderStatuses = new Set(['success', 'timeout', 'error']);
const terminalStatuses = new Set(['pass', 'fail', 'blocked']);
const secretLikePatterns = [
  /(?:api[_-]?key|token|secret|bearer)\s*[:=]\s*[^"',\s]+/giu,
  /(?<queryPrefix>[?&](?:api[_-]?key|token|secret|access[_-]?token)=)[^&#\s"']+/giu,
  /bearer\s+[a-z0-9._~+/=-]+/giu,
];
const unsafePathLeakPatterns = [
  /file:\/\/[^\s"',)]+/giu,
  /(?:^|["'\s])~\/[^\s"',)]+/gu,
  /\/(?:Users|home|tmp|private|var\/folders)\/[^\s"',)]+/gu,
  /[A-Z]:\\(?:Users|Temp|Windows\\Temp)\\[^\s"',)]+/giu,
];
const urlLikePattern = /https?:\/\/[^\s"',)]+/giu;

const defaultThresholds = Object.freeze({
  localCorrectness: Object.freeze({
    maxFailures: 0,
  }),
  providerComparison: Object.freeze({
    maxOwnedErrorRate: 0,
    maxOwnedP50Ms: 150,
    maxOwnedP95Ms: 500,
    maxOwnedP99Ms: 1000,
    maxOwnedProviderEvents: 0,
    maxOwnedTimeoutRate: 0,
    minExternalActiveProviderEvents: 1,
    minExternalNetworkRequests: 1,
    minOwnedCacheHitRate: 0.5,
    minOwnedNetworkRequests: 1,
    minOwnedTop1CorrectRate: 0.9,
    minOwnedTop5CorrectRate: 0.9,
    requireNaiveLiveBaseline: true,
    requireProductionCandidate: true,
  }),
});

const printHelp = () => {
  process.stdout.write(`Usage:
  node scripts/benchmark/generate-smart-suggest-reviewer-report.mjs [options]

Generates public-safe JSON and Markdown reviewer evidence from local correctness
and optional production/provider benchmark runs. Live-provider execution is never
performed unless --run-provider-baseline and --live-providers are both set.

Options:
  --local-correctness-proof path       Existing correctness proof JSON.
  --provider-benchmark-report path     Existing provider/final-boss benchmark JSON.
  --run-provider-baseline              Attempt the provider benchmark run.
  --live-providers                     Required with --run-provider-baseline to call providers.
  --api-base https://...               Required to run the production API candidate.
  --external-baseline id               Required provider baseline. Repeatable.
  --external-baselines a,b             Required provider baselines. Defaults to production set.
  --final-boss-preflight-report path   Ready preflight report for live production run.
  --provider-json-out path             Keep provider benchmark JSON at this path.
  --provider-markdown-out path         Keep provider benchmark Markdown at this path.
  --json-out path                      Write reviewer JSON report.
  --markdown-out path                  Write reviewer Markdown report.
  --format summary                     summary, json, or markdown stdout.
  --fail-on-blocked                    Exit non-zero when provider evidence is blocked.

Provider run controls:
  --provider-iterations 3              Measured iterations for provider run.
  --provider-warmup 1                  Warmup iterations for provider run.
  --provider-concurrency 1             External provider concurrency.
  --provider-rate-limit-ms 250         Default provider rate limit.
  --provider-rate provider=ms          Provider-specific rate limit. Repeatable.
  --timeout-ms 1000                    Request timeout for local/provider runs.

Threshold controls:
  --max-local-failures 0
  --min-external-network-requests 1
  --min-external-active-provider-events 1
  --min-owned-top1 0.9
  --min-owned-top5 0.9
  --max-owned-p50-ms 150
  --max-owned-p95-ms 500
  --max-owned-p99-ms 1000
  --max-owned-timeout-rate 0
  --max-owned-error-rate 0
  --max-owned-provider-events 0
  --min-owned-network-requests 1
  --min-owned-cache-hit-rate 0.5
`);
};

const envValue = (name) => {
  const value = process.env[name]?.trim();

  return value === undefined || value.length === 0 ? undefined : value;
};

const defaultArgs = () => ({
  apiBase: envValue('SMART_SUGGEST_BENCHMARK_API_BASE_URL'),
  corpus: defaultCorpusPath,
  environmentLabel: envValue('SMART_SUGGEST_BENCHMARK_ENVIRONMENT') ?? 'production-reviewer',
  externalBaselineIds: [],
  failOnBlocked: false,
  finalBossPreflightReport: undefined,
  fixture: defaultFixturePath,
  format: 'summary',
  help: false,
  jsonOut: undefined,
  liveProviders: false,
  localCorrectnessProof: undefined,
  markdownOut: undefined,
  operator: envValue('SMART_SUGGEST_BENCHMARK_OPERATOR') ?? 'smart-suggest-reviewer-report',
  providerBenchmarkReport: undefined,
  providerConcurrency: 1,
  providerIterations: 3,
  providerJsonOut: undefined,
  providerMarkdownOut: undefined,
  providerRateLimitMs: undefined,
  providerRateLimitMsById: {},
  providerWarmup: 1,
  runProviderBaseline: false,
  thresholds: structuredClone(defaultThresholds),
  timeoutMs: 1000,
});

const readRequiredOption = (argv, index, arg) => {
  const value = argv[index + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${arg} requires a value.`);
  }

  return value;
};

const parseNonNegativeInteger = (value, label) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return parsed;
};

const parsePositiveInteger = (value, label) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
};

const parseNonNegativeNumber = (value, label) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  return parsed;
};

const parseCommaSeparated = (value) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const parseProviderList = (value, label) => {
  const providerIds = parseCommaSeparated(value);

  if (providerIds.length === 0) {
    throw new Error(`${label} must name at least one provider baseline.`);
  }

  for (const providerId of providerIds) {
    if (!supportedExternalBaselineIds.includes(providerId)) {
      throw new Error(
        `${label} contains unsupported provider baseline "${providerId}". Supported baselines: ${supportedExternalBaselineIds.join(', ')}.`,
      );
    }
    if (providerId === fakeExternalBaselineId) {
      throw new Error(`${label} cannot use ${fakeExternalBaselineId} for reviewer evidence.`);
    }
  }

  return providerIds;
};

const parseProviderRate = (value) => {
  const separatorIndex = value.indexOf('=');

  if (separatorIndex <= 0) {
    throw new Error('--provider-rate must use provider=milliseconds.');
  }

  const providerId = value.slice(0, separatorIndex).trim();
  const rateLimitMs = parseNonNegativeInteger(value.slice(separatorIndex + 1), '--provider-rate');

  if (!supportedExternalBaselineIds.includes(providerId) || providerId === fakeExternalBaselineId) {
    throw new Error(`--provider-rate contains unsupported provider baseline "${providerId}".`);
  }

  return { providerId, rateLimitMs };
};

const resolveInputPath = (inputPath) =>
  path.isAbsolute(inputPath) ? inputPath : path.resolve(appRoot, inputPath);

const resolveOutputPath = (inputPath) =>
  path.isAbsolute(inputPath) ? inputPath : path.resolve(appRoot, inputPath);

const parseInputOutputOption = (arg, value, parsed) => {
  switch (arg) {
    case '--api-base': {
      parsed.apiBase = value;
      return true;
    }
    case '--corpus': {
      parsed.corpus = resolveInputPath(value);
      return true;
    }
    case '--environment-label': {
      parsed.environmentLabel = value;
      return true;
    }
    case '--fixture': {
      parsed.fixture = resolveInputPath(value);
      return true;
    }
    case '--format': {
      parsed.format = value;
      return true;
    }
    case '--json-out': {
      parsed.jsonOut = resolveOutputPath(value);
      return true;
    }
    case '--local-correctness-proof':
    case '--local-proof': {
      parsed.localCorrectnessProof = resolveInputPath(value);
      return true;
    }
    case '--markdown-out': {
      parsed.markdownOut = resolveOutputPath(value);
      return true;
    }
    case '--operator': {
      parsed.operator = value;
      return true;
    }
    default: {
      return false;
    }
  }
};

const parseProviderRunOption = (arg, value, parsed) => {
  switch (arg) {
    case '--external-baseline': {
      parsed.externalBaselineIds.push(value);
      return true;
    }
    case '--external-baselines': {
      parsed.externalBaselineIds.push(...parseProviderList(value, arg));
      return true;
    }
    case '--final-boss-preflight-report': {
      parsed.finalBossPreflightReport = resolveInputPath(value);
      return true;
    }
    case '--provider-benchmark-report':
    case '--provider-report': {
      parsed.providerBenchmarkReport = resolveInputPath(value);
      return true;
    }
    case '--provider-concurrency': {
      parsed.providerConcurrency = parsePositiveInteger(value, arg);
      return true;
    }
    case '--provider-iterations': {
      parsed.providerIterations = parsePositiveInteger(value, arg);
      return true;
    }
    case '--provider-json-out': {
      parsed.providerJsonOut = resolveOutputPath(value);
      return true;
    }
    case '--provider-markdown-out': {
      parsed.providerMarkdownOut = resolveOutputPath(value);
      return true;
    }
    case '--provider-rate': {
      const rate = parseProviderRate(value);
      parsed.providerRateLimitMsById[rate.providerId] = rate.rateLimitMs;
      return true;
    }
    case '--provider-rate-limit-ms': {
      parsed.providerRateLimitMs = parseNonNegativeInteger(value, arg);
      return true;
    }
    case '--provider-warmup': {
      parsed.providerWarmup = parseNonNegativeInteger(value, arg);
      return true;
    }
    case '--timeout-ms': {
      parsed.timeoutMs = parsePositiveInteger(value, arg);
      return true;
    }
    default: {
      return false;
    }
  }
};

const parseThresholdOption = (arg, value, parsed) => {
  const local = parsed.thresholds.localCorrectness;
  const provider = parsed.thresholds.providerComparison;

  switch (arg) {
    case '--max-local-failures': {
      local.maxFailures = parseNonNegativeInteger(value, arg);
      return true;
    }
    case '--max-owned-error-rate': {
      provider.maxOwnedErrorRate = parseNonNegativeNumber(value, arg);
      return true;
    }
    case '--max-owned-p95-ms': {
      provider.maxOwnedP95Ms = parseNonNegativeNumber(value, arg);
      return true;
    }
    case '--max-owned-p50-ms': {
      provider.maxOwnedP50Ms = parseNonNegativeNumber(value, arg);
      return true;
    }
    case '--max-owned-p99-ms': {
      provider.maxOwnedP99Ms = parseNonNegativeNumber(value, arg);
      return true;
    }
    case '--max-owned-provider-events': {
      provider.maxOwnedProviderEvents = parseNonNegativeInteger(value, arg);
      return true;
    }
    case '--max-owned-timeout-rate': {
      provider.maxOwnedTimeoutRate = parseNonNegativeNumber(value, arg);
      return true;
    }
    case '--min-external-active-provider-events': {
      provider.minExternalActiveProviderEvents = parseNonNegativeInteger(value, arg);
      return true;
    }
    case '--min-external-network-requests': {
      provider.minExternalNetworkRequests = parseNonNegativeInteger(value, arg);
      return true;
    }
    case '--min-owned-cache-hit-rate': {
      provider.minOwnedCacheHitRate = parseNonNegativeNumber(value, arg);
      return true;
    }
    case '--min-owned-network-requests': {
      provider.minOwnedNetworkRequests = parseNonNegativeInteger(value, arg);
      return true;
    }
    case '--min-owned-top1': {
      provider.minOwnedTop1CorrectRate = parseNonNegativeNumber(value, arg);
      return true;
    }
    case '--min-owned-top5': {
      provider.minOwnedTop5CorrectRate = parseNonNegativeNumber(value, arg);
      return true;
    }
    default: {
      return false;
    }
  }
};

const parseOptionArgument = (arg, value, parsed) =>
  parseInputOutputOption(arg, value, parsed) ||
  parseProviderRunOption(arg, value, parsed) ||
  parseThresholdOption(arg, value, parsed);

const parseArgs = (argv) => {
  const parsed = defaultArgs();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--fail-on-blocked') {
      parsed.failOnBlocked = true;
      continue;
    }
    if (arg === '--live-providers') {
      parsed.liveProviders = true;
      continue;
    }
    if (arg === '--run-provider-baseline') {
      parsed.runProviderBaseline = true;
      continue;
    }

    if (!parseOptionArgument(arg, readRequiredOption(argv, index, arg), parsed)) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    index += 1;
  }

  if (!['json', 'markdown', 'summary'].includes(parsed.format)) {
    throw new Error('--format must be summary, json, or markdown.');
  }

  parsed.externalBaselineIds = [
    ...new Set(
      (parsed.externalBaselineIds.length === 0
        ? productionProviderBaselineIds
        : parsed.externalBaselineIds
      ).flatMap((entry) => parseProviderList(entry, '--external-baseline')),
    ),
  ];

  return parsed;
};

const readJson = (filePath, label) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(
      `Failed to read ${label} at ${appRelativeReference(filePath)}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
};

const writeText = (filePath, content) => {
  if (filePath === undefined) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const appRelativeReference = (filePath) => {
  if (filePath === undefined) {
    return null;
  }

  const relative = path.relative(appRoot, filePath);

  return relative.startsWith('..') || path.isAbsolute(relative)
    ? path.basename(filePath)
    : relative.split(path.sep).join('/');
};

const tempPath = (name) => path.join(os.tmpdir(), `${name}-${process.pid}-${Date.now()}.json`);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const apiBaseSha256 = (value) =>
  typeof value === 'string' && value.trim().length > 0
    ? sha256(value.trim().replaceAll(/\/+$/gu, ''))
    : null;

const redactText = (value) => {
  let redacted = String(value ?? '');
  redacted = redacted.replaceAll(repositoryRoot, '<repo>');
  redacted = redacted.replaceAll(appRoot, '<app>');
  redacted = redacted.replaceAll(os.tmpdir(), '<tmp>');
  redacted = redacted.replaceAll(urlLikePattern, '[redacted-url]');

  for (const pattern of secretLikePatterns) {
    redacted = redacted.replaceAll(pattern, (match, prefix) =>
      typeof prefix === 'string' && prefix.length > 0 ? `${prefix}[redacted]` : '[redacted]',
    );
  }

  return redacted;
};

const processSummary = (result) =>
  redactText([result.stderr, result.stdout].filter(Boolean).join('\n')).slice(0, 3000);

const statusCounts = (assertions) => {
  const counts = { blocked: 0, fail: 0, pass: 0, skip: 0 };

  for (const assertion of assertions ?? []) {
    const status = assertion?.status;
    if (status === 'pass' || status === 'fail' || status === 'skip' || status === 'blocked') {
      counts[status] += 1;
    }
  }

  return counts;
};

const localFailureSummaries = (assertions) =>
  (assertions ?? [])
    .filter((assertion) => assertion?.status === 'fail')
    .slice(0, 25)
    .map((assertion) => ({
      id: String(assertion.id ?? 'unknown-assertion'),
      message: String(assertion.message ?? 'Failed assertion.'),
    }));

const runLocalCorrectness = (args) => {
  if (args.localCorrectnessProof !== undefined) {
    const proof = readJson(args.localCorrectnessProof, 'local correctness proof');
    return {
      proof,
      proofPath: appRelativeReference(args.localCorrectnessProof),
      runAttempted: false,
    };
  }

  const proofPath = tempPath('smart-suggest-reviewer-local-correctness');
  const command = [
    correctnessRunner,
    '--target',
    'local',
    '--fixture',
    args.fixture,
    '--corpus',
    args.corpus,
    '--timeout-ms',
    String(args.timeoutMs),
    '--out',
    proofPath,
    '--format',
    'json',
  ];
  const result = spawnSync(process.execPath, command, {
    cwd: appRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    return {
      errorSummary: processSummary(result),
      proof: undefined,
      proofPath: 'generated-temp-local-correctness-proof',
      runAttempted: true,
    };
  }

  const proof = readJson(proofPath, 'generated local correctness proof');
  fs.rmSync(proofPath, { force: true });

  return {
    proof,
    proofPath: 'generated-temp-local-correctness-proof',
    runAttempted: true,
  };
};

const evaluateLocalCorrectness = (args, localRun) => {
  if (localRun.proof === undefined) {
    return {
      failures: [
        {
          id: 'local-correctness-run',
          message: 'Local correctness proof did not complete.',
        },
      ],
      proofPath: localRun.proofPath,
      runAttempted: localRun.runAttempted,
      status: 'fail',
      summary: {
        blocked: 0,
        fail: 1,
        pass: 0,
        skip: 0,
      },
      toolError: localRun.errorSummary,
    };
  }

  const counts = statusCounts(localRun.proof.assertions);
  const failedAssertions = localFailureSummaries(localRun.proof.assertions);
  const status = counts.fail <= args.thresholds.localCorrectness.maxFailures ? 'pass' : 'fail';

  return {
    failures: failedAssertions,
    generatedAt: localRun.proof.generatedAt,
    proofPath: localRun.proofPath,
    runAttempted: localRun.runAttempted,
    runs: (localRun.proof.runs ?? []).map((run) => ({
      scenarioCount: run.scenarioCount ?? 0,
      target: String(run.target ?? 'unknown-target'),
    })),
    status,
    summary: counts,
  };
};

const providerRunBlockers = (args) => {
  const blockers = [];

  if (!args.runProviderBaseline) {
    blockers.push('provider-baseline-not-run');
  }
  if (args.runProviderBaseline && !args.liveProviders) {
    blockers.push('live-provider-opt-in-missing');
  }
  if (args.runProviderBaseline && args.apiBase === undefined) {
    blockers.push('api-base-missing');
  }

  return blockers;
};

const runProviderBenchmark = (args) => {
  if (args.providerBenchmarkReport !== undefined) {
    return {
      report: readJson(args.providerBenchmarkReport, 'provider benchmark report'),
      reportPath: appRelativeReference(args.providerBenchmarkReport),
      runAttempted: false,
    };
  }

  const precheckBlockers = providerRunBlockers(args);
  if (precheckBlockers.length > 0) {
    return {
      blockers: precheckBlockers,
      report: undefined,
      reportPath: undefined,
      runAttempted: args.runProviderBaseline,
    };
  }

  const shouldRemoveJson = args.providerJsonOut === undefined;
  const providerJsonPath =
    args.providerJsonOut ?? tempPath('smart-suggest-reviewer-provider-benchmark');
  const command = [
    localBenchmarkRunner,
    '--paths',
    'http-api-all-caches',
    '--external-baselines',
    args.externalBaselineIds.join(','),
    '--live-providers',
    '--api-base',
    args.apiBase,
    '--iterations',
    String(args.providerIterations),
    '--warmup',
    String(args.providerWarmup),
    '--timeout-ms',
    String(args.timeoutMs),
    '--provider-concurrency',
    String(args.providerConcurrency),
    '--json-out',
    providerJsonPath,
    '--format',
    'json',
    '--environment-label',
    args.environmentLabel,
    '--operator',
    args.operator,
  ];

  if (args.finalBossPreflightReport !== undefined) {
    command.push('--final-boss-preflight-report', args.finalBossPreflightReport);
  }
  if (args.providerMarkdownOut !== undefined) {
    command.push('--markdown-out', args.providerMarkdownOut);
  }
  if (args.providerRateLimitMs !== undefined) {
    command.push('--provider-rate-limit-ms', String(args.providerRateLimitMs));
  }
  for (const [providerId, rateLimitMs] of Object.entries(args.providerRateLimitMsById)) {
    command.push('--provider-rate', `${providerId}=${rateLimitMs}`);
  }

  const result = spawnSync(process.execPath, command, {
    cwd: appRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    return {
      blockers: ['provider-baseline-run-failed'],
      errorSummary: processSummary(result),
      report: undefined,
      reportPath: appRelativeReference(providerJsonPath),
      runAttempted: true,
    };
  }

  const report = readJson(providerJsonPath, 'generated provider benchmark report');
  if (shouldRemoveJson) {
    fs.rmSync(providerJsonPath, { force: true });
  }

  return {
    report,
    reportPath: shouldRemoveJson
      ? 'generated-temp-provider-benchmark-report'
      : appRelativeReference(providerJsonPath),
    runAttempted: true,
  };
};

const metricValue = (metrics, metricPath) => {
  let value = metrics;

  for (const key of metricPath.split('.')) {
    value = value?.[key];
  }

  return value;
};

const aggregateMetricsByPath = (report) =>
  new Map((report.aggregateMetrics?.paths ?? []).map((entry) => [entry.pathId, entry.metrics]));

const pathEntriesById = (report) =>
  new Map((report.comparisonPaths ?? []).map((entry) => [entry.pathId, entry]));

const resultsForPath = (report, pathId) =>
  (report.scenarioResults ?? []).filter((result) => result.pathId === pathId);

const networkRequests = (results) => {
  let count = 0;

  for (const result of results) {
    count += result.network?.requestCount ?? 0;
  }

  return count;
};

const activeProviderEvents = (results) =>
  results
    .flatMap((result) => result.providerEvents ?? [])
    .filter((event) => activeProviderStatuses.has(event.status)).length;

const skippedProviderReasons = (results) => {
  const reasons = new Set();

  for (const result of results) {
    if (result.status === 'skipped' && typeof result.errorCode === 'string') {
      reasons.add(result.errorCode);
    }
    for (const event of result.providerEvents ?? []) {
      if (event.status === 'skipped' && typeof event.errorCode === 'string') {
        reasons.add(event.errorCode);
      }
    }
  }

  return [...reasons].toSorted((left, right) => left.localeCompare(right));
};

const evaluateThreshold = (value, threshold, comparator) => {
  if (!Number.isFinite(Number(value))) {
    return false;
  }
  if (comparator === 'gte') {
    return Number(value) >= threshold;
  }

  return Number(value) <= threshold;
};

const thresholdFailure = (id, actual, comparator, expected) => ({
  actual,
  comparator,
  expected,
  id,
});

const ownedCandidateSummary = (report, metricsByPath, thresholds) => {
  const pathId = 'owned-db-all-caches';
  const metrics = metricsByPath.get(pathId);
  const results = resultsForPath(report, pathId);

  if (metrics === undefined) {
    return {
      blockers: ['owned-db-all-caches-missing'],
      failures: [],
      pathId,
      present: false,
    };
  }

  const checks = [
    ['top1CorrectRate', metrics.top1CorrectRate, 'gte', thresholds.minOwnedTop1CorrectRate],
    ['top5CorrectRate', metrics.top5CorrectRate, 'gte', thresholds.minOwnedTop5CorrectRate],
    ['latencyMs.p50', metricValue(metrics, 'latencyMs.p50'), 'lte', thresholds.maxOwnedP50Ms],
    ['latencyMs.p95', metricValue(metrics, 'latencyMs.p95'), 'lte', thresholds.maxOwnedP95Ms],
    ['latencyMs.p99', metricValue(metrics, 'latencyMs.p99'), 'lte', thresholds.maxOwnedP99Ms],
    ['timeoutRate', metrics.timeoutRate, 'lte', thresholds.maxOwnedTimeoutRate],
    ['errorRate', metrics.errorRate, 'lte', thresholds.maxOwnedErrorRate],
    [
      'providerEvents.total',
      metricValue(metrics, 'providerEvents.total'),
      'lte',
      thresholds.maxOwnedProviderEvents,
    ],
    ['networkRequests.total', networkRequests(results), 'gte', thresholds.minOwnedNetworkRequests],
    [
      'cacheHitRate.overall',
      metricValue(metrics, 'cacheHitRate.overall'),
      'gte',
      thresholds.minOwnedCacheHitRate,
    ],
  ];
  const failures = checks
    .filter(([, actual, comparator, expected]) => !evaluateThreshold(actual, expected, comparator))
    .map(([id, actual, comparator, expected]) =>
      thresholdFailure(`owned-db-all-caches.${id}`, actual, comparator, expected),
    );

  return {
    blockers: [],
    failures,
    metrics: {
      cacheHitRateOverall: metricValue(metrics, 'cacheHitRate.overall') ?? 0,
      errorRate: metrics.errorRate ?? 0,
      networkRequests: networkRequests(results),
      p50Ms: metricValue(metrics, 'latencyMs.p50') ?? 0,
      p95Ms: metricValue(metrics, 'latencyMs.p95') ?? 0,
      p99Ms: metricValue(metrics, 'latencyMs.p99') ?? 0,
      providerEvents: metricValue(metrics, 'providerEvents.total') ?? 0,
      timeoutRate: metrics.timeoutRate ?? 0,
      top1CorrectRate: metrics.top1CorrectRate ?? 0,
      top5CorrectRate: metrics.top5CorrectRate ?? 0,
    },
    pathId,
    present: true,
  };
};

const externalProviderSummary = (report, providerId, pathById, thresholds) => {
  const pathId = `external-live-baseline:${providerId}`;
  const pathEntry = pathById.get(pathId);
  const results = resultsForPath(report, pathId);
  const requestCount = networkRequests(results);
  const activeEventCount = activeProviderEvents(results);
  const blockers = [];
  const failures = [];

  if (pathEntry === undefined) {
    blockers.push('provider-path-missing');
  }
  if (pathEntry?.providerIds?.includes(fakeExternalBaselineId)) {
    blockers.push('fake-provider-baseline');
  }
  if (requestCount < thresholds.minExternalNetworkRequests) {
    blockers.push('provider-network-evidence-missing');
  }
  if (activeEventCount < thresholds.minExternalActiveProviderEvents) {
    blockers.push('provider-active-event-evidence-missing');
  }

  return {
    activeProviderEvents: activeEventCount,
    blockers: [...new Set(blockers)],
    failures,
    networkRequests: requestCount,
    pathId,
    providerId,
    skippedReasons: skippedProviderReasons(results),
  };
};

const missingProviderComparison = (args, providerRun) => ({
  blockers: providerRun.blockers ?? ['provider-benchmark-report-missing'],
  errorSummary: providerRun.errorSummary,
  providerBaselines: args.externalBaselineIds.map((providerId) => ({
    activeProviderEvents: 0,
    blockers: ['provider-benchmark-report-missing'],
    networkRequests: 0,
    pathId: `external-live-baseline:${providerId}`,
    providerId,
    skippedReasons: [],
  })),
  reportPath: providerRun.reportPath,
  runAttempted: providerRun.runAttempted,
  status: 'blocked',
});

const reportShapeFindings = (report, pathById) => {
  const blockers = [];
  const failures = [];

  if (report.schemaVersion !== 'smart-suggest-benchmark-metrics/v1') {
    failures.push({
      id: 'provider-report.schemaVersion',
      message: 'Provider benchmark report schemaVersion is not current.',
    });
  }
  if (report.run?.liveProvidersEnabled !== true) {
    blockers.push('live-provider-opt-in-not-recorded');
  }
  if (pathById.has(`external-live-baseline:${fakeExternalBaselineId}`)) {
    blockers.push('fake-provider-baseline-present');
  }

  return { blockers, failures };
};

const comparisonBlockers = (comparison, thresholds) => {
  const blockers = [];

  if (
    thresholds.requireNaiveLiveBaseline &&
    comparison.baselinePathId !== 'naive-live-provider-no-cache'
  ) {
    blockers.push('naive-live-provider-baseline-missing');
  }
  if (
    thresholds.requireProductionCandidate &&
    comparison.candidatePathId !== 'owned-db-all-caches'
  ) {
    blockers.push('production-owned-candidate-missing');
  }

  return blockers;
};

const providerBaselineBlockers = (providerBaselines) => {
  const blockers = [];

  for (const provider of providerBaselines) {
    blockers.push(...provider.blockers.map((blocker) => `${provider.providerId}:${blocker}`));
  }

  return blockers;
};

const providerComparisonStatus = (failures, blockers) => {
  if (failures.length > 0) {
    return 'fail';
  }
  if (blockers.length > 0) {
    return 'blocked';
  }

  return 'pass';
};

const providerRunSummary = (report) => ({
  apiBaseSha256: report.run?.apiBaseSha256 ?? null,
  environmentLabel: report.run?.environmentLabel ?? null,
  liveProvidersEnabled: report.run?.liveProvidersEnabled === true,
  measuredIterations: report.run?.fairnessControls?.measuredIterations ?? null,
  providerConcurrency: report.run?.fairnessControls?.externalProviderConcurrency ?? null,
  providerRateLimitMs: report.run?.fairnessControls?.providerRateLimitMs ?? null,
  providerRateLimitMsById: report.run?.fairnessControls?.providerRateLimitMsById ?? {},
});

const evaluateProviderComparison = (args, providerRun) => {
  if (providerRun.report === undefined) {
    return missingProviderComparison(args, providerRun);
  }

  const { report } = providerRun;
  const thresholds = args.thresholds.providerComparison;
  const pathById = pathEntriesById(report);
  const metricsByPath = aggregateMetricsByPath(report);
  const shapeFindings = reportShapeFindings(report, pathById);
  const ownedCandidate = ownedCandidateSummary(report, metricsByPath, thresholds);
  const providerBaselines = args.externalBaselineIds.map((providerId) =>
    externalProviderSummary(report, providerId, pathById, thresholds),
  );
  const comparison = report.aggregateMetrics?.comparison ?? {};
  const blockers = [
    ...shapeFindings.blockers,
    ...ownedCandidate.blockers,
    ...providerBaselineBlockers(providerBaselines),
    ...comparisonBlockers(comparison, thresholds),
  ];
  const failures = [...shapeFindings.failures, ...ownedCandidate.failures];

  return {
    blockers: [...new Set(blockers)].toSorted((left, right) => left.localeCompare(right)),
    comparison: {
      baselinePathId: comparison.baselinePathId ?? null,
      candidatePathId: comparison.candidatePathId ?? null,
      deltas: comparison.deltas ?? {},
    },
    failures,
    ownedCandidate,
    providerBaselines,
    reportPath: providerRun.reportPath,
    run: providerRunSummary(report),
    runAttempted: providerRun.runAttempted,
    status: providerComparisonStatus(failures, blockers),
  };
};

const overallStatus = (localCorrectness, providerComparison) => {
  if (localCorrectness.status === 'fail' || providerComparison.status === 'fail') {
    return 'fail';
  }
  if (providerComparison.status === 'blocked') {
    return 'blocked';
  }

  return 'pass';
};

const assertNoReportLeaks = (report, fixture, corpus) => {
  const serialized = JSON.stringify(report);

  for (const scenario of [...(fixture.scenarios ?? []), ...(corpus.scenarios ?? [])]) {
    if (
      typeof scenario.query === 'string' &&
      scenario.query.length > 6 &&
      serialized.includes(scenario.query)
    ) {
      throw new Error(`Reviewer report leaked raw query for ${scenario.id}.`);
    }
  }

  for (const pattern of [...secretLikePatterns, ...unsafePathLeakPatterns]) {
    pattern.lastIndex = 0;
    if (pattern.test(serialized)) {
      throw new Error(
        `Reviewer report appears to contain unsafe data matching ${String(pattern)}.`,
      );
    }
  }
};

const buildReviewerReport = ({ args, localCorrectness, providerComparison }) => {
  const status = overallStatus(localCorrectness, providerComparison);

  return {
    apiBaseSha256: apiBaseSha256(args.apiBase),
    generatedAt: new Date().toISOString(),
    inputs: {
      corpus: appRelativeReference(args.corpus),
      fixture: appRelativeReference(args.fixture),
      providerBaselines: args.externalBaselineIds,
      providerExecutionRequested: args.runProviderBaseline,
    },
    localCorrectness,
    providerComparison,
    schemaVersion: 'smart-suggest-benchmark-reviewer-report/v1',
    status,
    thresholds: args.thresholds,
  };
};

const markdownValue = (value) => {
  if (Array.isArray(value)) {
    return value.length === 0 ? '-' : value.join(', ');
  }
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  return String(value);
};

const thresholdRows = (thresholds) => [
  ['local.maxFailures', thresholds.localCorrectness.maxFailures],
  ['provider.minExternalNetworkRequests', thresholds.providerComparison.minExternalNetworkRequests],
  [
    'provider.minExternalActiveProviderEvents',
    thresholds.providerComparison.minExternalActiveProviderEvents,
  ],
  ['provider.minOwnedTop1CorrectRate', thresholds.providerComparison.minOwnedTop1CorrectRate],
  ['provider.minOwnedTop5CorrectRate', thresholds.providerComparison.minOwnedTop5CorrectRate],
  ['provider.maxOwnedP50Ms', thresholds.providerComparison.maxOwnedP50Ms],
  ['provider.maxOwnedP95Ms', thresholds.providerComparison.maxOwnedP95Ms],
  ['provider.maxOwnedP99Ms', thresholds.providerComparison.maxOwnedP99Ms],
  ['provider.maxOwnedTimeoutRate', thresholds.providerComparison.maxOwnedTimeoutRate],
  ['provider.maxOwnedErrorRate', thresholds.providerComparison.maxOwnedErrorRate],
  ['provider.maxOwnedProviderEvents', thresholds.providerComparison.maxOwnedProviderEvents],
  ['provider.minOwnedNetworkRequests', thresholds.providerComparison.minOwnedNetworkRequests],
  ['provider.minOwnedCacheHitRate', thresholds.providerComparison.minOwnedCacheHitRate],
];

const markdownReport = (report) => {
  const lines = [
    '# Smart Suggest Reviewer Benchmark Report',
    '',
    `Status: ${report.status}`,
    `Generated: ${report.generatedAt}`,
    `API base fingerprint: ${report.apiBaseSha256 ?? 'not configured'}`,
    '',
    '## Evidence',
    '',
    '| Surface | Status | Notes |',
    '| --- | --- | --- |',
    `| Local correctness | ${report.localCorrectness.status} | pass=${report.localCorrectness.summary.pass} fail=${report.localCorrectness.summary.fail} skip=${report.localCorrectness.summary.skip} |`,
    `| Provider comparison | ${report.providerComparison.status} | ${(report.providerComparison.blockers ?? []).join(', ') || 'no blockers'} |`,
    '',
    '## Thresholds',
    '',
    '| Threshold | Value |',
    '| --- | ---: |',
  ];

  for (const [label, value] of thresholdRows(report.thresholds)) {
    lines.push(`| ${label} | ${value} |`);
  }

  lines.push(
    '',
    '## Provider Baselines',
    '',
    '| Provider | Network requests | Active provider events | Skipped reasons | Blockers |',
    '| --- | ---: | ---: | --- | --- |',
  );

  for (const provider of report.providerComparison.providerBaselines ?? []) {
    lines.push(
      `| ${provider.providerId} | ${provider.networkRequests} | ${provider.activeProviderEvents} | ${markdownValue(provider.skippedReasons)} | ${markdownValue(provider.blockers)} |`,
    );
  }

  lines.push('', '## Production Candidate', '');

  if (report.providerComparison.ownedCandidate?.present === true) {
    const { metrics } = report.providerComparison.ownedCandidate;
    lines.push(
      '| Path | Top-1 | Top-5 | P50 ms | P95 ms | P99 ms | Timeout rate | Error rate | Provider events | Network requests | Cache hit |',
      '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
      `| ${report.providerComparison.ownedCandidate.pathId} | ${metrics.top1CorrectRate} | ${metrics.top5CorrectRate} | ${metrics.p50Ms} | ${metrics.p95Ms} | ${metrics.p99Ms} | ${metrics.timeoutRate} | ${metrics.errorRate} | ${metrics.providerEvents} | ${metrics.networkRequests} | ${metrics.cacheHitRateOverall} |`,
    );
  } else {
    lines.push('No owned-db-all-caches production candidate evidence was available.');
  }

  if ((report.localCorrectness.failures ?? []).length > 0) {
    lines.push('', '## Local Failures', '');
    for (const failure of report.localCorrectness.failures) {
      lines.push(`- ${failure.id}: ${failure.message}`);
    }
  }

  if ((report.providerComparison.failures ?? []).length > 0) {
    lines.push('', '## Provider Threshold Failures', '');
    for (const failure of report.providerComparison.failures) {
      lines.push(
        `- ${failure.id}: actual=${markdownValue(failure.actual)} ${failure.comparator} expected=${markdownValue(failure.expected)}`,
      );
    }
  }

  if (report.providerComparison.errorSummary !== undefined) {
    lines.push('', '## Provider Run Error', '', report.providerComparison.errorSummary);
  }

  return `${lines.join('\n')}\n`;
};

const printSummary = (report) => {
  const providerBlockers = report.providerComparison.blockers ?? [];
  const lines = [
    `Smart Suggest reviewer benchmark ${report.status}`,
    `- local correctness: ${report.localCorrectness.status} pass=${report.localCorrectness.summary.pass} fail=${report.localCorrectness.summary.fail} skip=${report.localCorrectness.summary.skip}`,
    `- provider comparison: ${report.providerComparison.status}${
      providerBlockers.length === 0 ? '' : ` blockers=${providerBlockers.join(',')}`
    }`,
  ];

  process.stdout.write(`${lines.join('\n')}\n`);
};

const main = (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return;
  }

  const fixture = readJson(args.fixture, 'correctness fixture');
  const corpus = readJson(args.corpus, 'benchmark corpus');
  const localRun = runLocalCorrectness(args);
  const localCorrectness = evaluateLocalCorrectness(args, localRun);
  const providerRun = runProviderBenchmark(args);
  const providerComparison = evaluateProviderComparison(args, providerRun);
  const report = buildReviewerReport({ args, localCorrectness, providerComparison });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = markdownReport(report);

  assertNoReportLeaks(report, fixture, corpus);
  writeText(args.jsonOut, json);
  writeText(args.markdownOut, markdown);

  if (args.format === 'json') {
    process.stdout.write(json);
  } else if (args.format === 'markdown') {
    process.stdout.write(markdown);
  } else {
    printSummary(report);
  }

  if (report.status === 'fail' || (args.failOnBlocked && report.status === 'blocked')) {
    process.exitCode = 1;
  }
  if (!terminalStatuses.has(report.status)) {
    process.exitCode = 1;
  }
};

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
