#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..', '..');
const defaultReportPath = path.resolve(
  appRoot,
  '.codex/reports/smart-suggest-benchmark/local-owned.json',
);
const defaultCorpusPath = path.resolve(
  appRoot,
  'scripts/fixtures/smart-suggest-benchmark-corpus-v1.json',
);
const defaultRequiredPathIds = ['owned-memory-no-cache', 'owned-sqlite-local-no-cache'];
const secretLikePatterns = [
  /(?:api[_-]?key|token|secret|bearer)\s*[:=]\s*[^"',\s]+/giu,
  /([?&](?:api[_-]?key|token|secret|access[_-]?token)=)[^&#\s"']+/giu,
  /bearer\s+[a-z0-9._~+/=-]+/giu,
];
const unsafePathLeakPatterns = [
  /file:\/\/[^\s"']+/giu,
  /\/Users\/[^\s"']+/gu,
  /\/private\/[^\s"']+/gu,
  /\/var\/folders\/[^\s"']+/gu,
  /\/tmp\/[^\s"']+/gu,
  /[A-Z]:\\[^\s"']+/gu,
];

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/benchmark/assert-smart-suggest-benchmark-report.mjs [options]

Validates a Smart Suggest benchmark report as a CI-safe regression gate.
The default mode forbids live-provider activity and checks only owned local paths.

Options:
  --report path                  Report JSON path. Defaults to local benchmark report path.
  --corpus path                  Public-safe benchmark corpus path used for raw-query leak checks.
  --require-path pathId          Required path id. Repeatable. Defaults to local owned paths.
  --allow-live-providers         Allow reports where run.liveProvidersEnabled is true.
  --min-top1 0.9                 Minimum top-1 correctness for required paths.
  --min-top5 0.9                 Minimum top-5 correctness for required paths.
  --max-p95-ms 100               Maximum p95 latency for required paths.
  --max-timeout-rate 0           Maximum timeout rate for required paths.
  --max-error-rate 0             Maximum error rate for required paths.
  --max-provider-events 0        Maximum provider event count for required paths.
  --max-network-requests 0       Maximum network request count for required paths.
`);
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function readRequiredOption(argv, index, arg) {
  const value = argv[index + 1];

  if (value === undefined || value.startsWith('--')) {
    fail(`${arg} requires a value.`);
  }

  return value;
}

function parseNumber(value, label) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    fail(`${label} must be a non-negative number.`);
  }

  return parsed;
}

function resolveInputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(appRoot, inputPath);
}

function parseArgs(argv) {
  const parsed = {
    allowLiveProviders: false,
    corpusPath: defaultCorpusPath,
    help: false,
    maxErrorRate: 0,
    maxNetworkRequests: 0,
    maxP95Ms: 100,
    maxProviderEvents: 0,
    maxTimeoutRate: 0,
    minTop1: 0.9,
    minTop5: 0.9,
    reportPath: defaultReportPath,
    requiredPathIds: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    if (arg === '--report') {
      parsed.reportPath = resolveInputPath(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--corpus') {
      parsed.corpusPath = resolveInputPath(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--require-path') {
      parsed.requiredPathIds.push(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--allow-live-providers') {
      parsed.allowLiveProviders = true;
      continue;
    }

    if (arg === '--min-top1') {
      parsed.minTop1 = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--min-top5') {
      parsed.minTop5 = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-p95-ms') {
      parsed.maxP95Ms = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-timeout-rate') {
      parsed.maxTimeoutRate = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-error-rate') {
      parsed.maxErrorRate = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-provider-events') {
      parsed.maxProviderEvents = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-network-requests') {
      parsed.maxNetworkRequests = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  if (parsed.requiredPathIds.length === 0) {
    parsed.requiredPathIds = [...defaultRequiredPathIds];
  }

  return parsed;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(
      `Failed to read ${label} at ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function assertNoSerializedLeaks(report, corpus) {
  const serialized = JSON.stringify(report);

  for (const scenario of corpus.scenarios ?? []) {
    if (
      typeof scenario.query === 'string' &&
      scenario.query.length > 6 &&
      serialized.includes(scenario.query)
    ) {
      fail(`Report leaked raw query for scenario ${scenario.id}.`);
    }
  }

  for (const pattern of [...secretLikePatterns, ...unsafePathLeakPatterns]) {
    pattern.lastIndex = 0;

    if (pattern.test(serialized)) {
      fail(`Report appears to contain unsafe data matching ${String(pattern)}.`);
    }
  }
}

function assertReportShape(report, options) {
  assert(
    report.schemaVersion === 'smart-suggest-benchmark-metrics/v1',
    'Unexpected report schemaVersion.',
  );
  assert(report.run && typeof report.run === 'object', 'report.run is required.');
  assert(report.corpus && typeof report.corpus === 'object', 'report.corpus is required.');
  assert(Array.isArray(report.comparisonPaths), 'report.comparisonPaths must be an array.');
  assert(Array.isArray(report.scenarioResults), 'report.scenarioResults must be an array.');
  assert(
    report.aggregateMetrics?.paths !== undefined && Array.isArray(report.aggregateMetrics.paths),
    'report.aggregateMetrics.paths must be an array.',
  );
  assert(
    options.allowLiveProviders || report.run.liveProvidersEnabled === false,
    'Live-provider benchmark reports require --allow-live-providers.',
  );
  assert(
    report.run.fairnessControls && typeof report.run.fairnessControls === 'object',
    'report.run.fairnessControls is required.',
  );
}

function aggregateByPathId(report) {
  return new Map(report.aggregateMetrics.paths.map((entry) => [entry.pathId, entry.metrics]));
}

function scenarioResultsForPath(report, pathId) {
  return report.scenarioResults.filter((result) => result.pathId === pathId);
}

function countNetworkRequests(results) {
  return results.reduce((sum, result) => sum + (result.network?.requestCount ?? 0), 0);
}

function assertRequiredPath(report, metricsByPathId, pathId, options) {
  const metrics = metricsByPathId.get(pathId);

  assert(metrics !== undefined, `Missing aggregate metrics for required path ${pathId}.`);
  assert(
    metrics.top1CorrectRate >= options.minTop1,
    `${pathId} top1CorrectRate ${metrics.top1CorrectRate} is below ${options.minTop1}.`,
  );
  assert(
    metrics.top5CorrectRate >= options.minTop5,
    `${pathId} top5CorrectRate ${metrics.top5CorrectRate} is below ${options.minTop5}.`,
  );
  assert(
    metrics.latencyMs.p95 <= options.maxP95Ms,
    `${pathId} latencyMs.p95 ${metrics.latencyMs.p95} exceeds ${options.maxP95Ms}.`,
  );
  assert(
    metrics.timeoutRate <= options.maxTimeoutRate,
    `${pathId} timeoutRate ${metrics.timeoutRate} exceeds ${options.maxTimeoutRate}.`,
  );
  assert(
    metrics.errorRate <= options.maxErrorRate,
    `${pathId} errorRate ${metrics.errorRate} exceeds ${options.maxErrorRate}.`,
  );
  assert(
    metrics.providerEvents.total <= options.maxProviderEvents,
    `${pathId} providerEvents.total ${metrics.providerEvents.total} exceeds ${options.maxProviderEvents}.`,
  );

  const networkRequestCount = countNetworkRequests(scenarioResultsForPath(report, pathId));

  assert(
    networkRequestCount <= options.maxNetworkRequests,
    `${pathId} network request count ${networkRequestCount} exceeds ${options.maxNetworkRequests}.`,
  );
}

function assertNoDefaultLiveProviderActivity(report, options) {
  if (options.allowLiveProviders || report.run.liveProvidersEnabled) {
    return;
  }

  const liveActivity = report.scenarioResults.filter(
    (result) =>
      (result.pathId.startsWith('external-live-baseline:') &&
        (result.network?.requestCount ?? 0) > 0) ||
      (result.providerEvents ?? []).some((event) =>
        ['success', 'timeout', 'error'].includes(event.status),
      ),
  );

  assert(liveActivity.length === 0, 'Default report contains live-provider activity.');
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return;
  }

  const report = readJson(options.reportPath, 'benchmark report');
  const corpus = readJson(options.corpusPath, 'benchmark corpus');

  assertReportShape(report, options);
  assertNoSerializedLeaks(report, corpus);
  assertNoDefaultLiveProviderActivity(report, options);

  const metricsByPathId = aggregateByPathId(report);

  for (const pathId of options.requiredPathIds) {
    assertRequiredPath(report, metricsByPathId, pathId, options);
  }

  process.stdout.write(
    `Benchmark gate passed for ${options.requiredPathIds.length} path(s): ${options.requiredPathIds.join(', ')}\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
