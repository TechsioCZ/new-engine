#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..');
const defaultReportPath = '.codex/reports/smart-suggest-search-quality-proof/search-quality.json';
const defaultBenchmarkReportDirectory = '.codex/reports/smart-suggest-search-quality-proof';
const targetModes = new Set(['local', 'http', 'both']);
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
  node scripts/smart-suggest-search-quality-proof.mjs [options]

Runs the public-safe Smart Suggest quality matrix through the benchmark runner
and emits a compact proof report with scenario ids, top result ids, correctness,
and provider-event counts. Local proof is provider-free by default. HTTP proof
requires a deployed or local Smart Suggest API base URL.

Options:
  --target local                local, http, or both. Defaults to local.
  --api-base https://...        Required for --target http or both.
  --scenario id                 Scenario id to include. Repeatable.
  --scenario-ids a,b            Comma-separated scenario ids.
  --iterations 1                Measured iterations per scenario.
  --warmup 1                    Warmup iterations.
  --timeout-ms 1000             Per-search timeout budget.
  --min-top1 1                  Minimum top-1 correctness per path.
  --min-top5 1                  Minimum top-5 correctness per path.
  --max-error-rate 0            Maximum error rate per path.
  --max-timeout-rate 0          Maximum timeout rate per path.
  --max-provider-events 0       Maximum provider events per path.
  --min-http-network-requests 1 Minimum HTTP network requests when target includes http.
  --out path                    Proof JSON output path.
  --format summary              summary or json stdout.
`);
}

function envValue(name) {
  const value = process.env[name]?.trim();

  return value === undefined || value === '' ? undefined : value;
}

function envBoolean(name) {
  const value = envValue(name)?.toLowerCase();

  return value === undefined ? undefined : booleanEnvValues.get(value);
}

function defaultArgs() {
  return {
    apiBase: envValue('SMART_SUGGEST_BENCHMARK_API_BASE_URL') ?? envValue('SMART_SUGGEST_BASE_URL'),
    format: 'summary',
    help: false,
    iterations: 1,
    maxErrorRate: 0,
    maxProviderEvents: 0,
    maxTimeoutRate: 0,
    minHttpNetworkRequests: 1,
    minTop1: 1,
    minTop5: 1,
    out: defaultReportPath,
    scenarioIds: [],
    target: 'local',
    timeoutMs: 1000,
    warmup: 1,
  };
}

function fail(message) {
  throw new Error(message);
}

function readRequiredOption(argv, index, arg) {
  const value = argv[index + 1];

  if (value === undefined || value.startsWith('--')) {
    fail(`${arg} requires a value.`);
  }

  return value;
}

function parseNonNegativeNumber(value, label) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    fail(`${label} must be a non-negative number.`);
  }

  return parsed;
}

function parseNonNegativeInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    fail(`${label} must be a non-negative integer.`);
  }

  return parsed;
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    fail(`${label} must be a positive integer.`);
  }

  return parsed;
}

function parseScenarioList(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

function parseArgs(argv) {
  const parsed = defaultArgs();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    if (arg === '--target') {
      parsed.target = readRequiredOption(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--api-base') {
      parsed.apiBase = readRequiredOption(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--scenario') {
      parsed.scenarioIds.push(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--scenario-ids') {
      parsed.scenarioIds.push(...parseScenarioList(readRequiredOption(argv, index, arg)));
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

    if (arg === '--timeout-ms') {
      parsed.timeoutMs = parsePositiveInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--min-top1') {
      parsed.minTop1 = parseNonNegativeNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--min-top5') {
      parsed.minTop5 = parseNonNegativeNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-error-rate') {
      parsed.maxErrorRate = parseNonNegativeNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-timeout-rate') {
      parsed.maxTimeoutRate = parseNonNegativeNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-provider-events') {
      parsed.maxProviderEvents = parseNonNegativeInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--min-http-network-requests') {
      parsed.minHttpNetworkRequests = parseNonNegativeInteger(
        readRequiredOption(argv, index, arg),
        arg,
      );
      index += 1;
      continue;
    }

    if (arg === '--out') {
      parsed.out = readRequiredOption(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--format') {
      parsed.format = readRequiredOption(argv, index, arg);
      index += 1;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  if (!targetModes.has(parsed.target)) {
    fail('--target must be local, http, or both.');
  }

  if (!['json', 'summary'].includes(parsed.format)) {
    fail('--format must be json or summary.');
  }

  if ((parsed.target === 'http' || parsed.target === 'both') && parsed.apiBase === undefined) {
    fail('--api-base or SMART_SUGGEST_BENCHMARK_API_BASE_URL is required for HTTP proof.');
  }

  return parsed;
}

function resolveAppPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(appRoot, inputPath);
}

function reportPathForTarget(target) {
  return resolveAppPath(path.join(defaultBenchmarkReportDirectory, `${target}-benchmark.json`));
}

function benchmarkArgsForTarget(target, args) {
  const command = [
    path.join(scriptDirectory, 'benchmark/run-local-owned-benchmark.mjs'),
    '--paths',
    target === 'local' ? 'in-memory,sqlite-local' : 'http-api-all-caches',
    '--iterations',
    String(args.iterations),
    '--warmup',
    String(args.warmup),
    '--timeout-ms',
    String(args.timeoutMs),
    '--json-out',
    reportPathForTarget(target),
    '--format',
    'json',
    '--environment-label',
    target === 'local' ? 'local-search-quality-proof' : 'http-search-quality-proof',
    '--operator',
    'smart-suggest-search-quality-proof',
  ];

  if (target === 'http') {
    command.push('--api-base', args.apiBase);
  }

  for (const scenarioId of args.scenarioIds) {
    command.push('--scenario', scenarioId);
  }

  return command;
}

function runBenchmark(target, args) {
  const command = benchmarkArgsForTarget(target, args);
  const result = spawnSync(process.execPath, command, {
    cwd: appRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout]
      .filter((value) => value !== undefined && value.trim() !== '')
      .join('\n')
      .slice(0, 4000);
    fail(`Search-quality benchmark failed for ${target}.${detail === '' ? '' : `\n${detail}`}`);
  }

  const benchmarkReportPath = reportPathForTarget(target);

  try {
    return JSON.parse(fs.readFileSync(benchmarkReportPath, 'utf8'));
  } catch (error) {
    fail(
      `Failed to read benchmark report for ${target}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function networkRequestCount(results) {
  return results.reduce((sum, result) => sum + (result.network?.requestCount ?? 0), 0);
}

function providerEventCount(results) {
  return results.reduce((sum, result) => sum + (result.providerEvents?.length ?? 0), 0);
}

function scenarioRows(report) {
  return report.scenarioResults.map((result) => ({
    cacheStatus: result.cache?.status,
    correctness: {
      failureReasons: result.correctness?.failureReasons ?? [],
      requiredResultRecall: result.correctness?.requiredResultRecall ?? 0,
      resultVolumeMatches: result.correctness?.resultVolumeMatches === true,
      top1Correct: result.correctness?.top1Correct === true,
      top5Correct: result.correctness?.top5Correct === true,
    },
    networkRequestCount: result.network?.requestCount ?? 0,
    pathId: result.pathId,
    providerEventCount: result.providerEvents?.length ?? 0,
    resultCount: result.resultCount,
    scenarioId: result.scenarioId,
    status: result.status,
    storage: {
      d1Fanout: result.storage?.d1Fanout ?? 0,
      d1QueryCount: result.storage?.d1QueryCount ?? 0,
      indexStrategy: result.storage?.indexStrategy,
    },
    topResultIds: result.topResultIds ?? [],
  }));
}

function assertion(status, id, message, details = {}) {
  return { details, id, message, status };
}

function analyzePath(target, aggregate, report, args) {
  const metrics = aggregate.metrics;
  const pathResults = report.scenarioResults.filter((result) => result.pathId === aggregate.pathId);
  const assertions = [
    assertion(
      metrics.top1CorrectRate >= args.minTop1 ? 'pass' : 'fail',
      `${aggregate.pathId}:top1`,
      `top1CorrectRate ${metrics.top1CorrectRate} >= ${args.minTop1}`,
    ),
    assertion(
      metrics.top5CorrectRate >= args.minTop5 ? 'pass' : 'fail',
      `${aggregate.pathId}:top5`,
      `top5CorrectRate ${metrics.top5CorrectRate} >= ${args.minTop5}`,
    ),
    assertion(
      metrics.errorRate <= args.maxErrorRate ? 'pass' : 'fail',
      `${aggregate.pathId}:errors`,
      `errorRate ${metrics.errorRate} <= ${args.maxErrorRate}`,
    ),
    assertion(
      metrics.timeoutRate <= args.maxTimeoutRate ? 'pass' : 'fail',
      `${aggregate.pathId}:timeouts`,
      `timeoutRate ${metrics.timeoutRate} <= ${args.maxTimeoutRate}`,
    ),
    assertion(
      metrics.providerEvents.total <= args.maxProviderEvents ? 'pass' : 'fail',
      `${aggregate.pathId}:provider-events`,
      `providerEvents.total ${metrics.providerEvents.total} <= ${args.maxProviderEvents}`,
    ),
  ];

  if (target === 'http') {
    const requests = networkRequestCount(pathResults);
    assertions.push(
      assertion(
        requests >= args.minHttpNetworkRequests,
        `${aggregate.pathId}:http-network`,
        `network request count ${requests} >= ${args.minHttpNetworkRequests}`,
      ),
    );
  }

  const failingScenarios = pathResults.filter(
    (result) =>
      result.status !== 'success' || (result.correctness?.failureReasons ?? []).length > 0,
  );
  assertions.push(
    assertion(
      failingScenarios.length === 0 ? 'pass' : 'fail',
      `${aggregate.pathId}:scenario-failures`,
      `${failingScenarios.length} scenario failure(s)`,
      { scenarioIds: failingScenarios.map((result) => result.scenarioId) },
    ),
  );

  return {
    assertions,
    metrics: {
      cacheHitRate: metrics.cacheHitRate,
      d1Fanout: metrics.d1Fanout,
      d1QueryCount: metrics.d1QueryCount,
      errorRate: metrics.errorRate,
      latencyMs: metrics.latencyMs,
      networkRequestCount: networkRequestCount(pathResults),
      providerEvents: metrics.providerEvents,
      requestCount: metrics.requestCount,
      resultCount: metrics.resultCount,
      timeoutRate: metrics.timeoutRate,
      top1CorrectRate: metrics.top1CorrectRate,
      top5CorrectRate: metrics.top5CorrectRate,
    },
    pathId: aggregate.pathId,
  };
}

function summarizeRun(target, report, args) {
  const paths = report.aggregateMetrics.paths.map((aggregate) =>
    analyzePath(target, aggregate, report, args),
  );
  const assertions = paths.flatMap((entry) => entry.assertions);
  const rows = scenarioRows(report);

  return {
    assertions,
    benchmarkReport: path.relative(appRoot, reportPathForTarget(target)),
    corpus: report.corpus,
    pathCount: paths.length,
    paths,
    providerEventCount: providerEventCount(report.scenarioResults),
    scenarioCount: report.corpus.scenarioCount,
    scenarios: rows,
    target,
  };
}

function targetList(target) {
  return target === 'both' ? ['local', 'http'] : [target];
}

function writeJson(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`);
}

function printSummary(proof) {
  const lines = [
    `Smart Suggest search-quality proof ${proof.status}: targets=${proof.targets.join(',')} scenarios=${proof.scenarioCount} providerEvents=${proof.providerEventCount}`,
    `Report: ${path.relative(appRoot, resolveAppPath(proof.reportPath))}`,
  ];

  for (const run of proof.runs) {
    for (const pathEntry of run.paths) {
      lines.push(
        `- ${run.target}/${pathEntry.pathId}: top1=${pathEntry.metrics.top1CorrectRate} top5=${pathEntry.metrics.top5CorrectRate} providers=${pathEntry.metrics.providerEvents.total} p95=${pathEntry.metrics.latencyMs.p95}ms`,
      );
    }
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return;
  }

  const runs = targetList(args.target).map((target) =>
    summarizeRun(target, runBenchmark(target, args), args),
  );
  const assertions = runs.flatMap((run) => run.assertions);
  const failedAssertions = assertions.filter((entry) => entry.status === 'fail');
  const reportPath = resolveAppPath(args.out);
  const proof = {
    assertions,
    generatedAt: new Date().toISOString(),
    providerEventCount: runs.reduce((sum, run) => sum + run.providerEventCount, 0),
    reportPath: args.out,
    runs,
    scenarioCount: runs.reduce((max, run) => Math.max(max, run.scenarioCount), 0),
    schemaVersion: 'smart-suggest-search-quality-proof/v1',
    status: failedAssertions.length === 0 ? 'pass' : 'fail',
    targets: targetList(args.target),
  };

  writeJson(reportPath, proof);

  if (args.format === 'json') {
    process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  } else {
    printSummary(proof);
  }

  if (proof.status !== 'pass') {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
