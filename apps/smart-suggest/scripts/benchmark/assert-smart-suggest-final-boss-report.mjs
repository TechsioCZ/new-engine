#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalBossRequiredPreflightCheckIds } from './final-boss-preflight-contract.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..', '..');
const defaultReportPath = path.resolve(
  appRoot,
  '.codex/reports/smart-suggest-benchmark/final-boss.json',
);
const defaultCorpusPath = path.resolve(
  appRoot,
  'scripts/fixtures/smart-suggest-benchmark-corpus-v1.json',
);
const defaultRequiredExternalBaselines = [
  'ruian-geocode',
  'mapy-cz',
  'here-discover',
  'managed-nominatim',
  'radar-autocomplete',
];
const naiveLiveProviderPathId = 'naive-live-provider-no-cache';
const requiredOwnedCacheLevels = [
  'browserMemory',
  'workerMemory',
  'edgeCache',
  'd1ReadThrough',
  'ownedDb',
];
const serverOwnedCacheLevels = ['workerMemory', 'edgeCache', 'd1ReadThrough'];
const lowerOwnedCacheLevels = ['workerMemory', 'edgeCache', 'd1ReadThrough', 'ownedDb'];
const aggregateMetricTolerance = 0.001;
const activeProviderStatuses = new Set(['success', 'timeout', 'error']);
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
  node scripts/benchmark/assert-smart-suggest-final-boss-report.mjs [options]

Validates the operator-only Smart Suggest final-boss benchmark report.
The report must compare a real no-cache external live baseline against the
optimized owned deployed D1/all-cache API path.

Options:
  --report path                         Report JSON path. Defaults to final-boss report path.
  --corpus path                         Public-safe benchmark corpus path used for leak checks.
  --require-external-baseline id        Required external baseline id. Repeatable.
                                       Defaults to RUIAN, Mapy, HERE, Nominatim, and Radar.
  --allow-fake-baseline                 Allow fake-noop baseline for local verifier fixture proof.
  --allow-missing-required-baselines    Do not require the default external baseline path entries.
  --min-owned-top1 0.9                  Minimum top-1 correctness for owned all-caches path.
  --min-owned-top5 0.9                  Minimum top-5 correctness for owned all-caches path.
  --max-owned-p95-ms 500                Maximum p95 latency for owned all-caches path.
  --max-owned-timeout-rate 0            Maximum timeout rate for owned all-caches path.
  --max-owned-error-rate 0              Maximum error rate for owned all-caches path.
  --max-owned-provider-events 0         Maximum provider events for owned all-caches path.
  --min-owned-network-requests 1        Minimum Smart Suggest API network requests.
  --min-owned-cache-hit-rate 0.5        Minimum owned all-cache overall hit rate.
  --min-owned-db-hit-rate 0.5           Minimum owned D1/DB hit rate.
                                       Every owned cache level must be enabled and have measured hit/write coverage.
  --max-owned-freshness-delta-seconds 172800
                                       Maximum owned data freshness delta.
  --allow-missing-owned-freshness       Allow missing owned freshness only for fixture proof.
  --min-external-network-requests 1     Minimum network requests for comparison baseline.
  --min-external-provider-events 1      Minimum active provider events for comparison baseline.
  --max-final-boss-preflight-age-seconds 900
                                       Maximum age of preflight evidence at benchmark start.
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

function parseInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    fail(`${label} must be a non-negative integer.`);
  }

  return parsed;
}

function resolveInputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(appRoot, inputPath);
}

function parseArgs(argv) {
  const parsed = {
    allowFakeBaseline: false,
    allowMissingOwnedFreshness: false,
    allowMissingRequiredBaselines: false,
    corpusPath: defaultCorpusPath,
    help: false,
    maxOwnedErrorRate: 0,
    maxOwnedFreshnessDeltaSeconds: 172_800,
    maxOwnedP95Ms: 500,
    maxOwnedProviderEvents: 0,
    maxOwnedTimeoutRate: 0,
    maxFinalBossPreflightAgeSeconds: 900,
    minExternalNetworkRequests: 1,
    minExternalProviderEvents: 1,
    minOwnedCacheHitRate: 0.5,
    minOwnedDbHitRate: 0.5,
    minOwnedNetworkRequests: 1,
    minOwnedTop1: 0.9,
    minOwnedTop5: 0.9,
    reportPath: defaultReportPath,
    requiredExternalBaselines: [],
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

    if (arg === '--require-external-baseline') {
      parsed.requiredExternalBaselines.push(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--allow-fake-baseline') {
      parsed.allowFakeBaseline = true;
      continue;
    }

    if (arg === '--allow-missing-required-baselines') {
      parsed.allowMissingRequiredBaselines = true;
      continue;
    }

    if (arg === '--allow-missing-owned-freshness') {
      parsed.allowMissingOwnedFreshness = true;
      continue;
    }

    if (arg === '--min-owned-top1') {
      parsed.minOwnedTop1 = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--min-owned-top5') {
      parsed.minOwnedTop5 = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-owned-p95-ms') {
      parsed.maxOwnedP95Ms = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-owned-timeout-rate') {
      parsed.maxOwnedTimeoutRate = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-owned-error-rate') {
      parsed.maxOwnedErrorRate = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-owned-provider-events') {
      parsed.maxOwnedProviderEvents = parseInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-owned-freshness-delta-seconds') {
      parsed.maxOwnedFreshnessDeltaSeconds = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--min-owned-network-requests') {
      parsed.minOwnedNetworkRequests = parseInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--min-owned-cache-hit-rate') {
      parsed.minOwnedCacheHitRate = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--min-owned-db-hit-rate') {
      parsed.minOwnedDbHitRate = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--min-external-network-requests') {
      parsed.minExternalNetworkRequests = parseInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--min-external-provider-events') {
      parsed.minExternalProviderEvents = parseInteger(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === '--max-final-boss-preflight-age-seconds') {
      parsed.maxFinalBossPreflightAgeSeconds = parseInteger(
        readRequiredOption(argv, index, arg),
        arg,
      );
      index += 1;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  if (parsed.requiredExternalBaselines.length === 0) {
    parsed.requiredExternalBaselines = [...defaultRequiredExternalBaselines];
  }
  if (parsed.maxFinalBossPreflightAgeSeconds < 1) {
    fail('--max-final-boss-preflight-age-seconds must be a positive integer.');
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

function parseTimestampMs(value, label) {
  const timestampMs = Date.parse(value);

  assert(Number.isFinite(timestampMs), `${label} must be a valid timestamp.`);

  return timestampMs;
}

function roundMetric(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 1000) / 1000;
}

function rate(count, total) {
  return total === 0 ? 0 : roundMetric(count / total);
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(p * sorted.length) - 1;

  return roundMetric(sorted[Math.min(sorted.length - 1, Math.max(0, index))] ?? 0);
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

function assertMetricClose(actual, expected, label) {
  const numericActual = Number(actual);
  const roundedActual = roundMetric(numericActual);
  const roundedExpected = roundMetric(expected);

  assert(
    Number.isFinite(numericActual) &&
      Math.abs(roundedActual - roundedExpected) <= aggregateMetricTolerance,
    `${label} ${actual ?? 'missing'} must match scenario results ${roundedExpected}.`,
  );
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

function assertReportShape(report) {
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
    report.aggregateMetrics?.comparison && typeof report.aggregateMetrics.comparison === 'object',
    'report.aggregateMetrics.comparison is required.',
  );
  assert(report.run.liveProvidersEnabled === true, 'Final-boss report must enable live providers.');
  assert(
    report.run.fairnessControls?.liveProviderOptIn === true,
    'Final-boss report must record live provider opt-in.',
  );
  assert(
    report.run.fairnessControls?.cacheMode === 'mixed',
    'Final-boss report must compare mixed cache modes.',
  );
  assert(
    report.run.fairnessControls?.noCache === false,
    'Final-boss report must include the owned cached candidate path.',
  );
}

function assertFinalBossPreflight(report, options) {
  const preflight = report.run.finalBossPreflight;

  assert(
    preflight && typeof preflight === 'object',
    'Final-boss report must include validated preflight evidence.',
  );
  assert(preflight.status === 'ready', 'Final-boss preflight evidence must be ready.');
  assert(
    preflight.apiStatus?.configured === true && preflight.apiStatus?.ok === true,
    'Final-boss preflight evidence must include a reachable configured API status.',
  );
  assert(
    typeof preflight.apiBaseSha256 === 'string' && /^[a-f0-9]{64}$/u.test(preflight.apiBaseSha256),
    'Final-boss preflight evidence must include an API base fingerprint.',
  );
  assert(
    report.run.apiBaseSha256 === preflight.apiBaseSha256,
    'Final-boss benchmark API base fingerprint must match preflight evidence.',
  );
  assert(
    Number.isInteger(preflight.apiStatus.statusCode),
    'Final-boss preflight evidence must include an API status code.',
  );
  assert(
    Number.isInteger(preflight.checkCount) && preflight.checkCount > 0,
    'Final-boss preflight evidence must include passing check count.',
  );
  assert(
    Array.isArray(preflight.checkIds),
    'Final-boss preflight evidence must include passing check ids.',
  );
  assert(
    typeof preflight.checkedAt === 'string' && preflight.checkedAt.length > 0,
    'Final-boss preflight evidence must include checkedAt.',
  );
  const preflightCheckedAtMs = parseTimestampMs(
    preflight.checkedAt,
    'Final-boss preflight checkedAt',
  );
  const runStartedAtMs = parseTimestampMs(report.run.startedAt, 'Final-boss run startedAt');
  const preflightAgeSeconds = Math.max(0, (runStartedAtMs - preflightCheckedAtMs) / 1000);

  assert(
    preflightCheckedAtMs - runStartedAtMs <= 60_000,
    'Final-boss preflight checkedAt must not be more than 60s after benchmark startedAt.',
  );
  assert(
    preflightAgeSeconds <= options.maxFinalBossPreflightAgeSeconds,
    `Final-boss preflight evidence is stale (${Math.round(preflightAgeSeconds)}s old at benchmark start; max ${options.maxFinalBossPreflightAgeSeconds}s).`,
  );
  assert(
    typeof preflight.reportPath === 'string' && preflight.reportPath.length > 0,
    'Final-boss preflight evidence must include a report path reference.',
  );

  const preflightCheckIds = new Set(preflight.checkIds);
  const requiredCheckIds = finalBossRequiredPreflightCheckIds(options.requiredExternalBaselines, {
    includeProviderConfig: !options.allowMissingRequiredBaselines,
  });
  const missingRequiredChecks = requiredCheckIds.filter(
    (checkId) => !preflightCheckIds.has(checkId),
  );

  assert(
    missingRequiredChecks.length === 0,
    `Final-boss preflight evidence is missing required check(s): ${missingRequiredChecks.join(', ')}.`,
  );

  const preflightProviders = new Set(Array.isArray(preflight.providers) ? preflight.providers : []);
  if (options.allowMissingRequiredBaselines) {
    return;
  }

  const missingProviders = options.requiredExternalBaselines.filter(
    (providerId) => !preflightProviders.has(providerId),
  );

  assert(
    missingProviders.length === 0,
    `Final-boss preflight evidence is missing provider(s): ${missingProviders.join(', ')}.`,
  );
}

function pathEntriesById(report) {
  return new Map(report.comparisonPaths.map((entry) => [entry.pathId, entry]));
}

function aggregateByPathId(report) {
  return new Map(report.aggregateMetrics.paths.map((entry) => [entry.pathId, entry.metrics]));
}

function resultsForPath(report, pathId) {
  return report.scenarioResults.filter((result) => result.pathId === pathId);
}

function uniqueStringValues(values, label) {
  const seen = new Set();
  const duplicates = [];

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.push(value);
    }
    seen.add(value);
  }

  assert(
    duplicates.length === 0,
    `${label} contains duplicate value(s): ${duplicates.join(', ')}.`,
  );

  return [...seen];
}

function selectedScenarioIds(report) {
  const selection = report.corpus.selection;

  assert(
    Array.isArray(selection) && selection.length > 0,
    'Final-boss report must include corpus.selection for scenario parity checks.',
  );

  const scenarioIds = uniqueStringValues(
    selection.map((scenarioId) => String(scenarioId)),
    'corpus.selection',
  );

  assert(
    scenarioIds.every((scenarioId) => scenarioId.length > 0),
    'Final-boss report corpus.selection must not contain empty scenario ids.',
  );
  assert(
    report.corpus.scenarioCount === scenarioIds.length,
    `Final-boss report corpus.scenarioCount ${report.corpus.scenarioCount} must match corpus.selection length ${scenarioIds.length}.`,
  );

  return scenarioIds;
}

function corpusScenarioIds(corpus) {
  const scenarios = Array.isArray(corpus.scenarios)
    ? corpus.scenarios
    : Array.isArray(corpus)
      ? corpus
      : undefined;

  assert(
    scenarios !== undefined && scenarios.length > 0,
    'Benchmark corpus must include at least one scenario for final-boss coverage checks.',
  );

  const scenarioIds = uniqueStringValues(
    scenarios.map((scenario) => String(scenario.id ?? '')),
    'benchmark corpus scenario ids',
  );

  assert(
    scenarioIds.every((scenarioId) => scenarioId.length > 0),
    'Benchmark corpus scenarios must all have non-empty ids.',
  );

  return scenarioIds;
}

function assertFullCorpusSelection(report, corpus) {
  const selectedIds = selectedScenarioIds(report);
  const corpusIds = corpusScenarioIds(corpus);
  const selectedSet = new Set(selectedIds);
  const corpusSet = new Set(corpusIds);
  const missing = corpusIds.filter((scenarioId) => !selectedSet.has(scenarioId));
  const extra = selectedIds.filter((scenarioId) => !corpusSet.has(scenarioId));

  if (typeof corpus.id === 'string') {
    assert(
      report.corpus.id === corpus.id,
      `Final-boss report corpus.id ${report.corpus.id} must match benchmark corpus id ${corpus.id}.`,
    );
  }

  if (typeof corpus.schemaVersion === 'string') {
    assert(
      report.corpus.schemaVersion === corpus.schemaVersion,
      `Final-boss report corpus.schemaVersion ${report.corpus.schemaVersion} must match benchmark corpus schemaVersion ${corpus.schemaVersion}.`,
    );
  }

  assert(
    missing.length === 0 && extra.length === 0,
    `Final-boss report must include every benchmark corpus scenario exactly once in corpus.selection; missing=${missing.join(', ') || '<none>'}; extra=${extra.join(', ') || '<none>'}.`,
  );
  assert(
    report.corpus.scenarioCount === corpusIds.length,
    `Final-boss report corpus.scenarioCount ${report.corpus.scenarioCount} must match full benchmark corpus scenario count ${corpusIds.length}.`,
  );
}

function measuredIterations(report) {
  const iterations = report.run.fairnessControls?.measuredIterations;

  assert(
    Number.isInteger(iterations) && iterations > 0,
    'Final-boss report must record a positive measuredIterations value.',
  );

  return iterations;
}

function assertFinalBossMeasuredIterationDepth(report) {
  const iterations = measuredIterations(report);

  assert(
    iterations >= 3,
    `Final-boss report must use at least 3 measured iterations to prove API, server-cache, and browser-memory passes; found ${iterations}.`,
  );
}

function parityPathIds(report, options) {
  const pathIds = ['owned-db-all-caches'];
  const baselinePathId = report.aggregateMetrics.comparison?.baselinePathId;

  if (typeof baselinePathId === 'string' && baselinePathId.length > 0) {
    pathIds.push(baselinePathId);
  }

  if (!options.allowMissingRequiredBaselines) {
    for (const providerId of options.requiredExternalBaselines) {
      pathIds.push(`external-live-baseline:${providerId}`);
    }
  }

  return uniqueStringValues(pathIds, 'final-boss parity path ids');
}

function assertScenarioIterationParity(report, pathById, options) {
  const scenarioIds = selectedScenarioIds(report);
  const scenarioIdSet = new Set(scenarioIds);
  const expectedIterations = measuredIterations(report);
  const expectedResultCount = scenarioIds.length * expectedIterations;

  for (const pathId of parityPathIds(report, options)) {
    assert(pathById.has(pathId), `Missing comparison path ${pathId} for parity checks.`);

    const results = resultsForPath(report, pathId);

    assert(
      results.length === expectedResultCount,
      `${pathId} must include ${expectedIterations} measured result(s) for each of ${scenarioIds.length} selected scenario(s); found ${results.length}.`,
    );

    const countsByScenario = new Map(scenarioIds.map((scenarioId) => [scenarioId, 0]));
    const outsideSelection = [];

    for (const result of results) {
      const scenarioId = String(result.scenarioId ?? '');

      if (!scenarioIdSet.has(scenarioId)) {
        outsideSelection.push(scenarioId.length > 0 ? scenarioId : '<missing>');
        continue;
      }

      countsByScenario.set(scenarioId, (countsByScenario.get(scenarioId) ?? 0) + 1);
    }

    const uniqueOutsideSelection = uniqueStringValues(
      outsideSelection,
      `${pathId} outside-selection scenario ids`,
    );

    assert(
      uniqueOutsideSelection.length === 0,
      `${pathId} includes scenario result(s) outside corpus.selection: ${uniqueOutsideSelection.join(', ')}.`,
    );

    const mismatches = [...countsByScenario.entries()].filter(
      ([, count]) => count !== expectedIterations,
    );

    assert(
      mismatches.length === 0,
      `${pathId} scenario/iteration coverage mismatch: ${mismatches
        .map(([scenarioId, count]) => `${scenarioId} has ${count}/${expectedIterations}`)
        .join(', ')} measured iteration result(s).`,
    );
  }
}

function networkRequests(results) {
  return results.reduce((sum, result) => sum + (result.network?.requestCount ?? 0), 0);
}

function activeProviderEvents(results) {
  return results
    .flatMap((result) => result.providerEvents ?? [])
    .filter((event) => activeProviderStatuses.has(event.status)).length;
}

function providerEventAggregate(results) {
  const events = results.flatMap((result) => result.providerEvents ?? []);

  return {
    error: events.filter((event) => event.status === 'error').length,
    skipped: events.filter((event) => event.status === 'skipped').length,
    success: events.filter((event) => event.status === 'success').length,
    timeout: events.filter((event) => event.status === 'timeout').length,
    total: events.length,
  };
}

function byteAggregate(results) {
  const values = results.map((result) => Number(result.network?.bytesTransferred ?? 0));
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    mean: values.length === 0 ? 0 : roundMetric(total / values.length),
    p95: percentile(values, 0.95),
    total,
  };
}

function networkRequestAggregate(results) {
  const values = results.map((result) => Number(result.network?.requestCount ?? 0));

  return {
    ...distribution(values),
    total: values.reduce((sum, value) => sum + value, 0),
  };
}

function costAggregate(results) {
  const totalUsd = results
    .flatMap((result) => result.providerEvents ?? [])
    .reduce((sum, event) => sum + Number(event.costEstimateUsd ?? 0), 0);

  return {
    per1kRequestsUsd: results.length === 0 ? 0 : roundMetric((totalUsd / results.length) * 1000),
    totalUsd: roundMetric(totalUsd),
  };
}

function cacheHitRate(results, level) {
  return rate(
    results.filter((result) => result.cache?.levels?.[level]?.status === 'hit').length,
    results.length,
  );
}

function recomputedPathMetrics(results) {
  const successfulResults = results.filter((result) => result.status === 'success');

  return {
    bytesTransferred: byteAggregate(results),
    cacheHitRate: {
      browserMemory: cacheHitRate(results, 'browserMemory'),
      d1ReadThrough: cacheHitRate(results, 'd1ReadThrough'),
      edgeCache: cacheHitRate(results, 'edgeCache'),
      overall: rate(
        results.filter((result) =>
          Object.values(result.cache?.levels ?? {}).some((level) => level?.status === 'hit'),
        ).length,
        results.length,
      ),
      ownedDb: cacheHitRate(results, 'ownedDb'),
      workerMemory: cacheHitRate(results, 'workerMemory'),
    },
    costEstimateUsd: costAggregate(results),
    d1Fanout: distribution(results.map((result) => Number(result.storage?.d1Fanout ?? 0))),
    d1QueryCount: distribution(results.map((result) => Number(result.storage?.d1QueryCount ?? 0))),
    emptyResponseRate: rate(
      results.filter((result) => result.resultCount === 0).length,
      results.length,
    ),
    errorRate: rate(results.filter((result) => result.status === 'error').length, results.length),
    expectedResultVolumePassRate: rate(
      successfulResults.filter((result) => result.correctness?.resultVolumeMatches === true).length,
      results.length,
    ),
    forbiddenTop1ViolationRate: rate(
      successfulResults.filter((result) => result.correctness?.forbiddenTop1Violated === true)
        .length,
      results.length,
    ),
    freshnessDeltaSeconds: distribution(
      results
        .map((result) => result.freshness?.freshnessDeltaSeconds)
        .filter((value) => Number.isFinite(value)),
    ),
    latencyMs: distribution(results.map((result) => Number(result.latencyMs ?? 0))),
    networkRequests: networkRequestAggregate(results),
    providerEvents: providerEventAggregate(results),
    requestCount: results.length,
    requiredResultRecallRate: rate(
      successfulResults.filter((result) => result.correctness?.requiredResultRecall >= 1).length,
      results.length,
    ),
    resultCount: distribution(results.map((result) => Number(result.resultCount ?? 0))),
    staleResultRate: 0,
    timeoutRate: rate(
      results.filter((result) => result.status === 'timeout').length,
      results.length,
    ),
    top1CorrectRate: rate(
      successfulResults.filter((result) => result.correctness?.top1Correct === true).length,
      results.length,
    ),
    top5CorrectRate: rate(
      successfulResults.filter((result) => result.correctness?.top5Correct === true).length,
      results.length,
    ),
  };
}

function activeProviderEventsForResult(result) {
  return (result.providerEvents ?? []).filter((event) => activeProviderStatuses.has(event.status))
    .length;
}

function activeProviderIdsForResult(result) {
  return [
    ...new Set(
      (result.providerEvents ?? [])
        .filter((event) => activeProviderStatuses.has(event.status))
        .map((event) => String(event.providerId ?? ''))
        .filter((providerId) => providerId.length > 0),
    ),
  ].toSorted((left, right) => left.localeCompare(right));
}

function assertExternalResultNoCacheApiCalls(pathId, results, options = {}) {
  assert(results.length > 0, `${pathId} must include measured scenario results.`);

  for (const result of results) {
    const cacheLevels = Object.values(result.cache?.levels ?? {});
    const cacheDisabled =
      result.cache?.status === 'disabled' &&
      cacheLevels.length > 0 &&
      cacheLevels.every((level) => level?.enabled === false && level?.status === 'disabled');

    assert(
      cacheDisabled,
      `${pathId}/${result.scenarioId ?? 'unknown-scenario'} must disable every cache level.`,
    );

    if (options.allowMissingNetwork === true) {
      continue;
    }

    assert(
      (result.network?.requestCount ?? 0) >= 1,
      `${pathId}/${result.scenarioId ?? 'unknown-scenario'} must record a no-cache external API request.`,
    );
    assert(
      activeProviderEventsForResult(result) >= 1,
      `${pathId}/${result.scenarioId ?? 'unknown-scenario'} must record an active live-provider event.`,
    );
    if (typeof options.expectedProviderId === 'string') {
      const activeProviderIds = activeProviderIdsForResult(result);

      assert(
        activeProviderIds.includes(options.expectedProviderId),
        `${pathId}/${result.scenarioId ?? 'unknown-scenario'} must record active provider event ${options.expectedProviderId}.`,
      );
    }
  }
}

function requiredRuntimeProviderIds(pathById, options) {
  const providerIds = [];

  if (options.allowMissingRequiredBaselines) {
    return providerIds;
  }

  for (const providerId of options.requiredExternalBaselines) {
    const pathEntry = pathById.get(`external-live-baseline:${providerId}`);
    const pathProviderIds = pathEntry?.providerIds ?? [];

    assert(
      pathProviderIds.length > 0,
      `external-live-baseline:${providerId} must record providerIds.`,
    );
    providerIds.push(...pathProviderIds.map((pathProviderId) => String(pathProviderId)));
  }

  return [...new Set(providerIds)].toSorted((left, right) => left.localeCompare(right));
}

function assertNaiveBaselineProviderCoverage(pathById, baselinePath, baselineResults, options) {
  if (options.allowFakeBaseline || baselinePath.pathId !== naiveLiveProviderPathId) {
    return;
  }

  const requiredProviderIds = requiredRuntimeProviderIds(pathById, options);
  const aggregateProviderIds = new Set(
    (baselinePath.providerIds ?? []).map((providerId) => String(providerId)),
  );
  const missingAggregateProviders = requiredProviderIds.filter(
    (providerId) => !aggregateProviderIds.has(providerId),
  );

  assert(
    missingAggregateProviders.length === 0,
    `${naiveLiveProviderPathId} is missing required provider id(s): ${missingAggregateProviders.join(', ')}.`,
  );

  for (const result of baselineResults) {
    const activeEventProviderIds = new Set(
      (result.providerEvents ?? [])
        .filter((event) => activeProviderStatuses.has(event.status))
        .map((event) => String(event.providerId)),
    );
    const missingResultProviders = requiredProviderIds.filter(
      (providerId) => !activeEventProviderIds.has(providerId),
    );

    assert(
      missingResultProviders.length === 0,
      `${naiveLiveProviderPathId}/${result.scenarioId ?? 'unknown-scenario'} is missing active provider event(s): ${missingResultProviders.join(', ')}.`,
    );
    assert(
      (result.network?.requestCount ?? 0) >= requiredProviderIds.length,
      `${naiveLiveProviderPathId}/${result.scenarioId ?? 'unknown-scenario'} must record at least one API request per required provider.`,
    );
  }
}

function hasFreshnessEvidence(result) {
  return (
    typeof result.freshness?.datasetVersion === 'string' &&
    result.freshness.datasetVersion.length > 0 &&
    typeof result.freshness.sourceUpdatedAt === 'string' &&
    result.freshness.sourceUpdatedAt.length > 0 &&
    Number.isFinite(result.freshness.freshnessDeltaSeconds)
  );
}

function isActiveCacheCoverageStatus(status) {
  return status === 'hit' || status === 'written';
}

function cacheLevelStatus(result, level) {
  return result.cache?.levels?.[level]?.status;
}

function assertOwnedIterationResultShape(report, results) {
  const scenarioIds = selectedScenarioIds(report);
  const expectedIterations = measuredIterations(report);
  const byScenarioAndIteration = new Map(scenarioIds.map((scenarioId) => [scenarioId, new Map()]));

  for (const result of results) {
    const scenarioId = String(result.scenarioId ?? '');
    const iteration = result.iteration;

    assert(
      Number.isInteger(iteration) && iteration >= 0 && iteration < expectedIterations,
      `owned-db-all-caches/${scenarioId || 'unknown-scenario'} must record measured iteration 0..${expectedIterations - 1}; found ${iteration ?? '<missing>'}.`,
    );

    const byIteration = byScenarioAndIteration.get(scenarioId);

    if (byIteration === undefined) {
      continue;
    }

    assert(
      byIteration.get(iteration) === undefined,
      `owned-db-all-caches/${scenarioId} has duplicate measured iteration ${iteration}.`,
    );
    byIteration.set(iteration, result);
  }

  for (const [scenarioId, byIteration] of byScenarioAndIteration.entries()) {
    for (let iteration = 0; iteration < expectedIterations; iteration += 1) {
      assert(
        byIteration.has(iteration),
        `owned-db-all-caches/${scenarioId} is missing measured iteration ${iteration}.`,
      );
    }
  }

  return byScenarioAndIteration;
}

function assertOwnedAllCachePassSemantics(report, results) {
  const byScenarioAndIteration = assertOwnedIterationResultShape(report, results);
  let writeThroughProofCount = 0;

  for (const [scenarioId, byIteration] of byScenarioAndIteration.entries()) {
    const firstApiPass = byIteration.get(0);
    const secondApiPass = byIteration.get(1);

    assert(
      (firstApiPass?.network?.requestCount ?? 0) >= 1,
      `owned-db-all-caches/${scenarioId} iteration 0 must call the Smart Suggest API.`,
    );
    assert(
      cacheLevelStatus(firstApiPass, 'browserMemory') === 'miss',
      `owned-db-all-caches/${scenarioId} iteration 0 must miss browser memory.`,
    );

    if (
      serverOwnedCacheLevels.some((level) => cacheLevelStatus(firstApiPass, level) === 'written')
    ) {
      writeThroughProofCount += 1;
    }

    assert(
      (secondApiPass?.network?.requestCount ?? 0) >= 1,
      `owned-db-all-caches/${scenarioId} iteration 1 must call the Smart Suggest API.`,
    );
    assert(
      cacheLevelStatus(secondApiPass, 'browserMemory') === 'miss',
      `owned-db-all-caches/${scenarioId} iteration 1 must still miss browser memory.`,
    );
    assert(
      serverOwnedCacheLevels.some((level) => cacheLevelStatus(secondApiPass, level) === 'hit'),
      `owned-db-all-caches/${scenarioId} iteration 1 must prove a server-side cache hit.`,
    );

    for (let iteration = 2; iteration < measuredIterations(report); iteration += 1) {
      const browserPass = byIteration.get(iteration);

      assert(
        (browserPass?.network?.requestCount ?? 0) === 0,
        `owned-db-all-caches/${scenarioId} iteration ${iteration} must not call the Smart Suggest API.`,
      );
      assert(
        cacheLevelStatus(browserPass, 'browserMemory') === 'hit',
        `owned-db-all-caches/${scenarioId} iteration ${iteration} must hit browser memory.`,
      );

      const activeLowerLevels = lowerOwnedCacheLevels.filter((level) =>
        isActiveCacheCoverageStatus(cacheLevelStatus(browserPass, level)),
      );

      assert(
        activeLowerLevels.length === 0,
        `owned-db-all-caches/${scenarioId} iteration ${iteration} must not attribute browser-memory hits to lower cache layer(s): ${activeLowerLevels.join(', ')}.`,
      );
    }
  }

  assert(
    writeThroughProofCount > 0,
    'owned-db-all-caches must include at least one API pass with server cache write-through evidence.',
  );
}

function assertOwnedAllCacheCoverage(results) {
  const missingTelemetry = [];
  const disabledTelemetry = [];
  const missingActiveCoverage = [];

  for (const result of results) {
    for (const level of requiredOwnedCacheLevels) {
      const cacheLevel = result.cache?.levels?.[level];

      if (cacheLevel === undefined) {
        missingTelemetry.push({
          level,
          scenarioId: result.scenarioId ?? 'unknown-scenario',
        });
        continue;
      }

      if (cacheLevel.enabled !== true) {
        disabledTelemetry.push({
          enabled: cacheLevel?.enabled ?? null,
          level,
          scenarioId: result.scenarioId ?? 'unknown-scenario',
          status: cacheLevel?.status ?? null,
        });
      }
    }
  }

  assert(
    missingTelemetry.length === 0,
    `owned-db-all-caches must include telemetry for every cache level; first failure=${JSON.stringify(missingTelemetry[0] ?? null)}.`,
  );
  assert(
    disabledTelemetry.length === 0,
    `owned-db-all-caches must keep every required cache level enabled; first failure=${JSON.stringify(disabledTelemetry[0] ?? null)}.`,
  );

  for (const level of requiredOwnedCacheLevels) {
    const activeCount = results.filter((result) =>
      isActiveCacheCoverageStatus(result.cache?.levels?.[level]?.status),
    ).length;

    if (activeCount === 0) {
      missingActiveCoverage.push({
        activeCount,
        level,
      });
    }
  }

  assert(
    missingActiveCoverage.length === 0,
    `owned-db-all-caches must prove hit/write coverage for every cache level; first failure=${JSON.stringify(missingActiveCoverage[0] ?? null)}.`,
  );
}

function assertRequiredExternalBaselines(report, pathById, options) {
  if (options.allowMissingRequiredBaselines) {
    return;
  }

  for (const providerId of options.requiredExternalBaselines) {
    const pathId = `external-live-baseline:${providerId}`;
    const pathEntry = pathById.get(pathId);
    const results = resultsForPath(report, pathId);
    const pathProviderIds = new Set((pathEntry?.providerIds ?? []).map((id) => String(id)));

    assert(pathEntry !== undefined, `Missing required external baseline path ${pathId}.`);
    assert(pathEntry.kind === 'live-provider', `${pathId} must be live-provider kind.`);
    assert(
      pathProviderIds.has(providerId),
      `${pathId} must record providerIds including ${providerId}.`,
    );
    assert(pathEntry.cacheMode === 'none', `${pathId} must use no cache.`);
    assert(pathEntry.benchmarkControls?.noCache === true, `${pathId} must record noCache.`);
    assert(
      pathEntry.benchmarkControls?.liveProviderCallsAllowed === true,
      `${pathId} must allow live-provider calls.`,
    );
    assert(
      networkRequests(results) >= options.minExternalNetworkRequests,
      `${pathId} network requests are below ${options.minExternalNetworkRequests}.`,
    );
    assert(
      activeProviderEvents(results) >= options.minExternalProviderEvents,
      `${pathId} active provider events are below ${options.minExternalProviderEvents}.`,
    );
    assertExternalResultNoCacheApiCalls(pathId, results, { expectedProviderId: providerId });
  }
}

function assertNoFakeBaseline(pathById, options) {
  if (options.allowFakeBaseline) {
    return;
  }

  assert(
    !pathById.has('external-live-baseline:fake-noop'),
    'Final-boss report cannot include fake-noop baseline.',
  );
}

function assertOwnedCandidate(report, pathById, metricsById, options) {
  const pathId = 'owned-db-all-caches';
  const pathEntry = pathById.get(pathId);
  const metrics = metricsById.get(pathId);
  const results = resultsForPath(report, pathId);

  assert(pathEntry !== undefined, 'Missing owned-db-all-caches comparison path.');
  assert(metrics !== undefined, 'Missing owned-db-all-caches aggregate metrics.');
  assert(results.length > 0, 'Missing owned-db-all-caches scenario results.');
  assert(pathEntry.kind === 'hybrid', 'owned-db-all-caches must be a hybrid API path.');
  assert(
    pathEntry.cacheMode === 'all-levels',
    'owned-db-all-caches must use all-levels cache mode.',
  );
  assert(
    pathEntry.ownedDataMode === 'd1-deployed',
    'owned-db-all-caches must run against deployed D1 data.',
  );
  assert(
    pathEntry.benchmarkControls?.liveProviderCallsAllowed === false,
    'owned-db-all-caches benchmark controls must not allow direct live-provider calls.',
  );
  assert(
    metrics.top1CorrectRate >= options.minOwnedTop1,
    `owned-db-all-caches top1CorrectRate ${metrics.top1CorrectRate} is below ${options.minOwnedTop1}.`,
  );
  assert(
    metrics.top5CorrectRate >= options.minOwnedTop5,
    `owned-db-all-caches top5CorrectRate ${metrics.top5CorrectRate} is below ${options.minOwnedTop5}.`,
  );
  assert(
    metrics.latencyMs.p95 <= options.maxOwnedP95Ms,
    `owned-db-all-caches latencyMs.p95 ${metrics.latencyMs.p95} exceeds ${options.maxOwnedP95Ms}.`,
  );
  assert(
    metrics.timeoutRate <= options.maxOwnedTimeoutRate,
    `owned-db-all-caches timeoutRate ${metrics.timeoutRate} exceeds ${options.maxOwnedTimeoutRate}.`,
  );
  assert(
    metrics.errorRate <= options.maxOwnedErrorRate,
    `owned-db-all-caches errorRate ${metrics.errorRate} exceeds ${options.maxOwnedErrorRate}.`,
  );
  assert(
    metrics.providerEvents.total <= options.maxOwnedProviderEvents,
    `owned-db-all-caches providerEvents.total ${metrics.providerEvents.total} exceeds ${options.maxOwnedProviderEvents}.`,
  );
  assert(
    networkRequests(results) >= options.minOwnedNetworkRequests,
    `owned-db-all-caches network requests are below ${options.minOwnedNetworkRequests}.`,
  );
  assert(
    metrics.cacheHitRate?.overall >= options.minOwnedCacheHitRate,
    `owned-db-all-caches overall cache hit rate ${metrics.cacheHitRate?.overall ?? 'missing'} is below ${options.minOwnedCacheHitRate}.`,
  );
  assert(
    metrics.cacheHitRate?.ownedDb >= options.minOwnedDbHitRate,
    `owned-db-all-caches owned DB hit rate ${metrics.cacheHitRate?.ownedDb ?? 'missing'} is below ${options.minOwnedDbHitRate}.`,
  );
  assertOwnedAllCacheCoverage(results);
  assertOwnedAllCachePassSemantics(report, results);
  if (!options.allowMissingOwnedFreshness) {
    const missingFreshness = results.filter((result) => !hasFreshnessEvidence(result));

    assert(
      missingFreshness.length === 0,
      `owned-db-all-caches is missing dataset freshness evidence for ${missingFreshness.length} result(s).`,
    );
    assert(
      metrics.freshnessDeltaSeconds.max <= options.maxOwnedFreshnessDeltaSeconds,
      `owned-db-all-caches freshnessDeltaSeconds.max ${metrics.freshnessDeltaSeconds.max} exceeds ${options.maxOwnedFreshnessDeltaSeconds}.`,
    );
  }
}

function assertExternalBaseline(report, pathById, metricsById, options) {
  const comparison = report.aggregateMetrics.comparison;
  const baselinePathId = comparison.baselinePathId;
  const candidatePathId = comparison.candidatePathId;
  const baselinePath = pathById.get(baselinePathId);
  const baselineMetrics = metricsById.get(baselinePathId);
  const baselineResults = resultsForPath(report, baselinePathId);
  const fakeFixtureBaseline =
    options.allowFakeBaseline && baselinePathId === 'external-live-baseline:fake-noop';
  const externalPathIds = [...pathById.keys()].filter((pathId) =>
    pathId.startsWith('external-live-baseline:'),
  );

  assert(externalPathIds.length > 0, 'Final-boss report must include external live baselines.');
  assert(
    candidatePathId === 'owned-db-all-caches',
    'Comparison candidate must be owned-db-all-caches.',
  );
  assert(
    baselinePathId !== candidatePathId,
    'Comparison baseline and candidate must be different paths.',
  );
  assert(
    baselinePathId === naiveLiveProviderPathId ||
      baselinePathId.startsWith('external-live-baseline:'),
    'Comparison baseline must be a no-cache external live-provider path.',
  );
  if (!options.allowFakeBaseline) {
    assert(
      baselinePathId === naiveLiveProviderPathId,
      `Comparison baseline must be ${naiveLiveProviderPathId}.`,
    );
  }
  assert(baselinePath !== undefined, `Missing comparison baseline path ${baselinePathId}.`);
  assert(baselineMetrics !== undefined, `Missing aggregate metrics for ${baselinePathId}.`);
  assert(baselinePath.kind === 'live-provider', 'Comparison baseline must be live-provider kind.');
  assert(baselinePath.cacheMode === 'none', 'Comparison baseline must use no cache.');
  assert(
    baselinePath.benchmarkControls?.noCache === true,
    'Comparison baseline must record noCache.',
  );
  if (!fakeFixtureBaseline) {
    assert(
      baselinePath.benchmarkControls?.liveProviderCallsAllowed === true,
      'Comparison baseline must allow live-provider calls.',
    );
  }
  assert(
    networkRequests(baselineResults) >= options.minExternalNetworkRequests,
    `${baselinePathId} network requests are below ${options.minExternalNetworkRequests}.`,
  );
  assert(
    activeProviderEvents(baselineResults) >= options.minExternalProviderEvents,
    `${baselinePathId} active provider events are below ${options.minExternalProviderEvents}.`,
  );
  assertExternalResultNoCacheApiCalls(baselinePathId, baselineResults, {
    allowMissingNetwork: fakeFixtureBaseline,
  });
  assertNaiveBaselineProviderCoverage(pathById, baselinePath, baselineResults, options);
}

function assertAggregateMetricsMatchScenarioResults(report) {
  for (const aggregate of report.aggregateMetrics.paths) {
    const pathId = String(aggregate.pathId ?? '');
    const metrics = aggregate.metrics ?? {};
    const expected = recomputedPathMetrics(resultsForPath(report, pathId));

    assertMetricClose(metrics.requestCount, expected.requestCount, `${pathId} requestCount`);
    assertMetricClose(
      metrics.top1CorrectRate,
      expected.top1CorrectRate,
      `${pathId} top1CorrectRate`,
    );
    assertMetricClose(
      metrics.top5CorrectRate,
      expected.top5CorrectRate,
      `${pathId} top5CorrectRate`,
    );
    assertMetricClose(
      metrics.emptyResponseRate,
      expected.emptyResponseRate,
      `${pathId} emptyResponseRate`,
    );
    assertMetricClose(metrics.errorRate, expected.errorRate, `${pathId} errorRate`);
    assertMetricClose(
      metrics.expectedResultVolumePassRate,
      expected.expectedResultVolumePassRate,
      `${pathId} expectedResultVolumePassRate`,
    );
    assertMetricClose(
      metrics.forbiddenTop1ViolationRate,
      expected.forbiddenTop1ViolationRate,
      `${pathId} forbiddenTop1ViolationRate`,
    );
    assertMetricClose(
      metrics.requiredResultRecallRate,
      expected.requiredResultRecallRate,
      `${pathId} requiredResultRecallRate`,
    );
    assertMetricClose(
      metrics.staleResultRate,
      expected.staleResultRate,
      `${pathId} staleResultRate`,
    );
    assertMetricClose(metrics.timeoutRate, expected.timeoutRate, `${pathId} timeoutRate`);
    assertMetricClose(
      metrics.scenarioCount,
      report.corpus.scenarioCount,
      `${pathId} scenarioCount`,
    );

    for (const field of ['mean', 'p95', 'total']) {
      assertMetricClose(
        metrics.bytesTransferred?.[field],
        expected.bytesTransferred[field],
        `${pathId} bytesTransferred.${field}`,
      );
    }

    for (const field of ['per1kRequestsUsd', 'totalUsd']) {
      assertMetricClose(
        metrics.costEstimateUsd?.[field],
        expected.costEstimateUsd[field],
        `${pathId} costEstimateUsd.${field}`,
      );
    }

    for (const status of ['error', 'skipped', 'success', 'timeout', 'total']) {
      assertMetricClose(
        metrics.providerEvents?.[status],
        expected.providerEvents[status],
        `${pathId} providerEvents.${status}`,
      );
    }

    for (const level of [...requiredOwnedCacheLevels, 'overall']) {
      assertMetricClose(
        metrics.cacheHitRate?.[level],
        expected.cacheHitRate[level],
        `${pathId} cacheHitRate.${level}`,
      );
    }

    for (const metricName of [
      'd1Fanout',
      'd1QueryCount',
      'freshnessDeltaSeconds',
      'latencyMs',
      'networkRequests',
      'resultCount',
    ]) {
      for (const field of ['max', 'mean', 'min', 'p50', 'p95', 'p99']) {
        assertMetricClose(
          metrics[metricName]?.[field],
          expected[metricName][field],
          `${pathId} ${metricName}.${field}`,
        );
      }
    }
    assertMetricClose(
      metrics.networkRequests?.total,
      expected.networkRequests.total,
      `${pathId} networkRequests.total`,
    );
  }
}

function assertComparisonDeltasMatchAggregateMetrics(report, metricsById) {
  const comparison = report.aggregateMetrics.comparison;
  const baseline = metricsById.get(comparison.baselinePathId);
  const candidate = metricsById.get(comparison.candidatePathId);

  assert(baseline !== undefined, 'Comparison baseline aggregate metrics are missing.');
  assert(candidate !== undefined, 'Comparison candidate aggregate metrics are missing.');

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
  const expectedDeltas = Object.fromEntries(
    comparisonDeltaPaths.map((metricPath) => [
      metricPath,
      Number(metricValue(candidate, metricPath) ?? 0) -
        Number(metricValue(baseline, metricPath) ?? 0),
    ]),
  );

  for (const [deltaKey, expected] of Object.entries(expectedDeltas)) {
    assertMetricClose(comparison.deltas?.[deltaKey], expected, `comparison.deltas.${deltaKey}`);
  }
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.help) {
    printHelp();
    return;
  }

  const report = readJson(options.reportPath, 'final-boss benchmark report');
  const corpus = readJson(options.corpusPath, 'benchmark corpus');

  assertReportShape(report);
  assertNoSerializedLeaks(report, corpus);
  assertFinalBossPreflight(report, options);
  assertFullCorpusSelection(report, corpus);
  assertFinalBossMeasuredIterationDepth(report);

  const pathById = pathEntriesById(report);
  const metricsById = aggregateByPathId(report);

  assertRequiredExternalBaselines(report, pathById, options);
  assertNoFakeBaseline(pathById, options);
  assertOwnedCandidate(report, pathById, metricsById, options);
  assertExternalBaseline(report, pathById, metricsById, options);
  assertScenarioIterationParity(report, pathById, options);
  assertAggregateMetricsMatchScenarioResults(report);
  assertComparisonDeltasMatchAggregateMetrics(report, metricsById);

  process.stdout.write(
    `Final-boss benchmark gate passed: ${report.aggregateMetrics.comparison.baselinePathId} vs owned-db-all-caches\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
