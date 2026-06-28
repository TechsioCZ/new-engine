#!/usr/bin/env node
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  finalBossApiBaseConfigCheckId,
  finalBossRequiredPreflightCheckIds,
} from './final-boss-preflight-contract.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..', '..');
const reportDir = path.resolve(appRoot, '.codex/reports/smart-suggest-benchmark');
const proofCorpusRelativePath =
  '.codex/reports/smart-suggest-benchmark/final-boss-assertion-proof-corpus.json';
const missingApiBaseRunnerPreflightReportPath =
  '.codex/reports/smart-suggest-benchmark/final-boss-runner-missing-api-base-preflight.json';
const mismatchedApiBaseRunnerPreflightReportPath =
  '.codex/reports/smart-suggest-benchmark/final-boss-runner-mismatched-api-base-preflight.json';
const scenarioIds = ['addr-k-louzi-slash-diacritic-exact', 'addr-k-louzi-house-number-first'];
const scenarioId = scenarioIds[0];
const measuredIterations = 3;
const resultId = 'ruian-cz:1203603';
const providers = [
  'ruian-geocode',
  'mapy-cz',
  'here-discover',
  'managed-nominatim',
  'radar-autocomplete',
];
const requiredPreflightCheckIds = finalBossRequiredPreflightCheckIds(providers);

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`;

    throw new Error(`${message}${suffix}`);
  }
}

function writeJson(appRelativePath, value) {
  const filePath = path.resolve(appRoot, appRelativePath);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readText(appRelativePath) {
  return fs.readFileSync(path.resolve(appRoot, appRelativePath), 'utf8');
}

function quantiles(value) {
  return {
    max: value,
    mean: value,
    min: value,
    p50: value,
    p95: value,
    p99: value,
  };
}

function roundMetric(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 1000) / 1000;
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
    return quantiles(0);
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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function cacheLevels(enabled, status) {
  return {
    browserMemory: { enabled, status },
    d1ReadThrough: { enabled, status },
    edgeCache: { enabled, status },
    ownedDb: { enabled, status },
    workerMemory: { enabled, status },
  };
}

function disabledCache() {
  return {
    levels: cacheLevels(false, 'disabled'),
    status: 'disabled',
  };
}

function ownedCache(iteration) {
  if (iteration === 0) {
    return {
      levels: {
        browserMemory: { enabled: true, status: 'miss' },
        d1ReadThrough: { enabled: true, status: 'written' },
        edgeCache: { enabled: true, status: 'written' },
        ownedDb: { enabled: true, status: 'hit' },
        workerMemory: { enabled: true, status: 'written' },
      },
      status: 'written',
    };
  }

  if (iteration === 1) {
    return {
      levels: {
        browserMemory: { enabled: true, status: 'miss' },
        d1ReadThrough: { enabled: true, status: 'miss' },
        edgeCache: { enabled: true, status: 'hit' },
        ownedDb: { enabled: true, status: 'hit' },
        workerMemory: { enabled: true, status: 'miss' },
      },
      status: 'hit',
    };
  }

  return {
    levels: {
      browserMemory: { enabled: true, status: 'hit' },
      d1ReadThrough: { enabled: true, status: 'miss' },
      edgeCache: { enabled: true, status: 'miss' },
      ownedDb: { enabled: true, status: 'miss' },
      workerMemory: { enabled: true, status: 'miss' },
    },
    status: 'hit',
  };
}

function providerEvent(providerId) {
  return {
    costEstimateUsd: 0.00025,
    durationMs: 42,
    providerId,
    resultCount: 1,
    status: 'success',
  };
}

function baseResult(pathId, resultScenarioId = scenarioId, iteration) {
  const result = {
    cache: disabledCache(),
    correctness: {
      forbiddenTop1Violated: false,
      requiredResultRecall: 1,
      resultVolumeMatches: true,
      top1Correct: true,
      top5Correct: true,
    },
    freshness: {
      datasetVersion: '20260628-proof',
      freshnessDeltaSeconds: 3600,
      sourceUpdatedAt: '2026-06-28',
    },
    latencyMs: 42,
    network: {
      bytesTransferred: 2048,
      requestCount: 1,
    },
    pathId,
    providerEvents: [],
    resultCount: 1,
    scenarioId: resultScenarioId,
    status: 'success',
    storage: {
      d1Fanout: 0,
      d1QueryCount: 0,
      indexStrategy: 'fts5',
      rowsRead: 1,
    },
    topResultIds: [resultId],
  };

  if (Number.isInteger(iteration)) {
    result.iteration = iteration;
  }

  return result;
}

function ownedResult(resultScenarioId = scenarioId, iteration = 0) {
  const browserMemoryPass = iteration >= 2;

  return {
    ...baseResult('owned-db-all-caches', resultScenarioId, iteration),
    cache: ownedCache(iteration),
    latencyMs: browserMemoryPass ? 0 : 18,
    network: {
      bytesTransferred: browserMemoryPass ? 0 : 1024,
      requestCount: browserMemoryPass ? 0 : 1,
    },
    providerEvents: [],
    storage: {
      d1Fanout: browserMemoryPass ? 0 : 1,
      d1QueryCount: browserMemoryPass ? 0 : 2,
      indexStrategy: 'fts5',
      rowsRead: browserMemoryPass ? 0 : 1,
    },
  };
}

function externalResult(providerId, resultScenarioId = scenarioId, iteration) {
  return {
    ...baseResult(`external-live-baseline:${providerId}`, resultScenarioId, iteration),
    providerEvents: [providerEvent(providerId)],
  };
}

function naiveResult(resultScenarioId = scenarioId, iteration) {
  return {
    ...baseResult('naive-live-provider-no-cache', resultScenarioId, iteration),
    latencyMs: 58,
    network: {
      bytesTransferred: 2048 * providers.length,
      requestCount: providers.length,
    },
    providerEvents: providers.map(providerEvent),
  };
}

function cacheHitRateForResults(results, level) {
  return rate(
    results.filter((result) => result.cache?.levels?.[level]?.status === 'hit').length,
    results.length,
  );
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

function aggregateForPathResults(results) {
  const successfulResults = results.filter((result) => result.status === 'success');

  return {
    bytesTransferred: byteAggregate(results),
    cacheHitRate: {
      browserMemory: cacheHitRateForResults(results, 'browserMemory'),
      d1ReadThrough: cacheHitRateForResults(results, 'd1ReadThrough'),
      edgeCache: cacheHitRateForResults(results, 'edgeCache'),
      overall: rate(
        results.filter((result) =>
          Object.values(result.cache?.levels ?? {}).some((level) => level?.status === 'hit'),
        ).length,
        results.length,
      ),
      ownedDb: cacheHitRateForResults(results, 'ownedDb'),
      workerMemory: cacheHitRateForResults(results, 'workerMemory'),
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
    scenarioCount: scenarioIds.length,
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

function aggregateMetricsForProof(comparisonPaths, scenarioResults) {
  const aggregatePaths = comparisonPaths.map((comparisonPath) => ({
    metrics: aggregateForPathResults(
      scenarioResults.filter((result) => result.pathId === comparisonPath.pathId),
    ),
    pathId: comparisonPath.pathId,
  }));
  const baseline = aggregatePaths.find(
    (entry) => entry.pathId === 'naive-live-provider-no-cache',
  )?.metrics;
  const candidate = aggregatePaths.find((entry) => entry.pathId === 'owned-db-all-caches')?.metrics;

  assert(baseline !== undefined, 'Proof report must include naive baseline metrics.');
  assert(candidate !== undefined, 'Proof report must include owned candidate metrics.');

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
  const comparisonDeltas = Object.fromEntries(
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
      baselinePathId: 'naive-live-provider-no-cache',
      candidatePathId: 'owned-db-all-caches',
      deltas: comparisonDeltas,
    },
    paths: aggregatePaths,
  };
}

function pathEntry({
  cacheMode,
  kind,
  label,
  liveProviderCallsAllowed,
  ownedDataMode,
  pathId,
  providerIds = [],
}) {
  return {
    benchmarkControls: {
      cacheMode,
      concurrency: 1,
      delayMs: 0,
      liveProviderCallsAllowed,
      noCache: cacheMode === 'none',
      rateLimitMs: liveProviderCallsAllowed ? 250 : 0,
      timeoutMs: 1000,
      warmupIterations: 0,
    },
    cacheMode,
    kind,
    label,
    ownedDataMode,
    pathId,
    providerIds,
  };
}

function createPositiveReport() {
  const externalPaths = providers.map((provider) =>
    pathEntry({
      cacheMode: 'none',
      kind: 'live-provider',
      label: `${provider} no-cache live baseline proof`,
      liveProviderCallsAllowed: true,
      ownedDataMode: 'disabled',
      pathId: `external-live-baseline:${provider}`,
      providerIds: [provider],
    }),
  );
  const ownedPath = pathEntry({
    cacheMode: 'all-levels',
    kind: 'hybrid',
    label: 'Smart Suggest HTTP API with owned DB and all cache levels',
    liveProviderCallsAllowed: false,
    ownedDataMode: 'd1-deployed',
    pathId: 'owned-db-all-caches',
  });
  const naivePath = pathEntry({
    cacheMode: 'none',
    kind: 'live-provider',
    label: 'Naive live-provider API fanout with every cache disabled',
    liveProviderCallsAllowed: true,
    ownedDataMode: 'disabled',
    pathId: 'naive-live-provider-no-cache',
    providerIds: providers,
  });
  const measuredEntries = Array.from({ length: measuredIterations }).flatMap((_, iteration) =>
    scenarioIds.map((resultScenarioId) => ({ iteration, resultScenarioId })),
  );
  const scenarioResults = measuredEntries.flatMap(({ iteration, resultScenarioId }) => [
    ownedResult(resultScenarioId, iteration),
    ...providers.map((provider) => externalResult(provider, resultScenarioId, iteration)),
    naiveResult(resultScenarioId, iteration),
  ]);
  const comparisonPaths = [ownedPath, ...externalPaths, naivePath];

  return {
    aggregateMetrics: aggregateMetricsForProof(comparisonPaths, scenarioResults),
    comparisonPaths,
    corpus: {
      fixturePath: 'scripts/fixtures/smart-suggest-benchmark-corpus-v1.json',
      id: 'smart-suggest-final-boss-assertion-proof-corpus-v1',
      scenarioCount: scenarioIds.length,
      schemaVersion: 'smart-suggest-benchmark-corpus/v1',
      selection: scenarioIds,
    },
    run: {
      apiBaseSha256: sha256('https://smart-suggest-proof.example.invalid'),
      completedAt: '2026-06-28T00:00:01.000Z',
      environmentLabel: 'proof',
      fairnessControls: {
        cacheMode: 'mixed',
        externalProviderConcurrency: 1,
        externalProviderDelayMs: 0,
        liveProviderOptIn: true,
        measuredIterations,
        missingProviderBehavior: 'fail',
        noCache: false,
        providerRateLimitMs: 250,
        providerRateLimitMsById: Object.fromEntries(providers.map((provider) => [provider, 250])),
        timeoutMs: 1000,
        warmupIterations: 0,
      },
      finalBossPreflight: {
        apiBaseSha256: sha256('https://smart-suggest-proof.example.invalid'),
        apiStatus: {
          configured: true,
          ok: true,
          statusCode: 200,
        },
        checkedAt: '2026-06-28T00:00:00.000Z',
        checkCount: requiredPreflightCheckIds.length,
        checkIds: requiredPreflightCheckIds,
        providers,
        reportPath: '.codex/reports/smart-suggest-benchmark/final-boss-preflight-proof.json',
        status: 'ready',
      },
      id: 'smart-suggest-final-boss-assertion-proof',
      liveProvidersEnabled: true,
      notes: [
        'Synthetic assertion proof only; no live providers were called.',
        'Raw queries stay only in the public-safe benchmark corpus fixture.',
      ],
      operator: 'smart-suggest-final-boss-assertion-proof',
      startedAt: '2026-06-28T00:00:00.000Z',
    },
    scenarioResults,
    schemaVersion: 'smart-suggest-benchmark-metrics/v1',
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeProofCorpus() {
  writeJson(proofCorpusRelativePath, {
    id: 'smart-suggest-final-boss-assertion-proof-corpus-v1',
    schemaVersion: 'smart-suggest-benchmark-corpus/v1',
    scenarios: scenarioIds.map((id) => ({
      id,
      publicSafe: true,
      query: `proof query ${id}`,
    })),
  });
}

function runAssertion(reportPath, expected) {
  const result = spawnSync(
    process.execPath,
    [
      './scripts/benchmark/assert-smart-suggest-final-boss-report.mjs',
      '--report',
      reportPath,
      '--corpus',
      proofCorpusRelativePath,
    ],
    {
      cwd: appRoot,
      encoding: 'utf8',
    },
  );

  if (expected.ok) {
    assert(result.status === 0, 'Expected final-boss assertion proof to pass.', {
      reportPath,
      stderr: result.stderr,
      stdout: result.stdout,
    });
    return result;
  }

  assert(result.status !== 0, 'Expected final-boss assertion proof to fail.', {
    reportPath,
    stderr: result.stderr,
    stdout: result.stdout,
  });
  assert(
    result.stderr.includes(expected.stderrIncludes),
    'Final-boss assertion failed for an unexpected reason.',
    {
      expected: expected.stderrIncludes,
      reportPath,
      stderr: result.stderr,
      stdout: result.stdout,
    },
  );

  return result;
}

function writeAndAssertCase(name, report, expected) {
  const reportPath = `.codex/reports/smart-suggest-benchmark/${name}.json`;
  const outputPath = `.codex/reports/smart-suggest-benchmark/${name}.out`;

  writeJson(reportPath, report);
  const result = runAssertion(reportPath, expected);
  writeJson(outputPath, {
    exitCode: result.status,
    stderr: result.stderr.trim(),
    stdout: result.stdout.trim(),
  });

  return {
    outputPath,
    reportPath,
  };
}

function withMissingAggregateProviderId(report) {
  const next = cloneJson(report);
  const naivePath = next.comparisonPaths.find(
    (entry) => entry.pathId === 'naive-live-provider-no-cache',
  );

  naivePath.providerIds = naivePath.providerIds.filter((provider) => provider !== providers[0]);

  return next;
}

function withWrongAggregateProviderEvent(report) {
  const next = cloneJson(report);
  const naive = next.scenarioResults.find(
    (result) => result.pathId === 'naive-live-provider-no-cache',
  );

  naive.providerEvents = naive.providerEvents.map((event) =>
    event.providerId === providers[0] ? { ...event, providerId: 'wrong-provider' } : event,
  );

  return next;
}

function withWrongExternalPathProviderId(report) {
  const next = cloneJson(report);
  const pathEntry = next.comparisonPaths.find(
    (entry) => entry.pathId === `external-live-baseline:${providers[1]}`,
  );

  pathEntry.providerIds = [providers[0]];

  return next;
}

function withWrongExternalResultProviderEvent(report) {
  const next = cloneJson(report);
  const external = next.scenarioResults.find(
    (result) => result.pathId === `external-live-baseline:${providers[1]}`,
  );

  external.providerEvents = external.providerEvents.map((event) => ({
    ...event,
    providerId: providers[0],
  }));

  return next;
}

function withOwnedAggregateTop1Drift(report) {
  const next = cloneJson(report);
  const ownedMetrics = next.aggregateMetrics.paths.find(
    (entry) => entry.pathId === 'owned-db-all-caches',
  )?.metrics;

  ownedMetrics.top1CorrectRate = 0.95;

  return next;
}

function withExternalAggregateByteDrift(report) {
  const next = cloneJson(report);
  const externalMetrics = next.aggregateMetrics.paths.find(
    (entry) => entry.pathId === `external-live-baseline:${providers[0]}`,
  )?.metrics;

  externalMetrics.bytesTransferred.total = 999;

  return next;
}

function withNaiveAggregateCostDrift(report) {
  const next = cloneJson(report);
  const naiveMetrics = next.aggregateMetrics.paths.find(
    (entry) => entry.pathId === 'naive-live-provider-no-cache',
  )?.metrics;

  naiveMetrics.costEstimateUsd.totalUsd = 0;

  return next;
}

function withExternalAggregateNetworkDrift(report) {
  const next = cloneJson(report);
  const externalMetrics = next.aggregateMetrics.paths.find(
    (entry) => entry.pathId === `external-live-baseline:${providers[0]}`,
  )?.metrics;

  externalMetrics.networkRequests.total = 999;

  return next;
}

function withOwnedAggregateFreshnessDrift(report) {
  const next = cloneJson(report);
  const ownedMetrics = next.aggregateMetrics.paths.find(
    (entry) => entry.pathId === 'owned-db-all-caches',
  )?.metrics;

  ownedMetrics.freshnessDeltaSeconds.max = 1;

  return next;
}

function withNaiveAggregateTimeoutDrift(report) {
  const next = cloneJson(report);
  const naiveMetrics = next.aggregateMetrics.paths.find(
    (entry) => entry.pathId === 'naive-live-provider-no-cache',
  )?.metrics;

  naiveMetrics.timeoutRate = 0.5;

  return next;
}

function withExternalAggregateRecallDrift(report) {
  const next = cloneJson(report);
  const externalMetrics = next.aggregateMetrics.paths.find(
    (entry) => entry.pathId === `external-live-baseline:${providers[0]}`,
  )?.metrics;

  externalMetrics.requiredResultRecallRate = 0.5;

  return next;
}

function withComparisonDeltaDrift(report) {
  const next = cloneJson(report);

  next.aggregateMetrics.comparison.deltas['providerEvents.total'] = 0;

  return next;
}

function withComparisonLatencyDeltaDrift(report) {
  const next = cloneJson(report);

  next.aggregateMetrics.comparison.deltas['latencyMs.p95'] = 0;

  return next;
}

function withComparisonCostDeltaDrift(report) {
  const next = cloneJson(report);

  next.aggregateMetrics.comparison.deltas['costEstimateUsd.totalUsd'] = 0;

  return next;
}

function withComparisonCacheDeltaDrift(report) {
  const next = cloneJson(report);

  next.aggregateMetrics.comparison.deltas['cacheHitRate.overall'] = 0;

  return next;
}

function withComparisonNetworkDeltaDrift(report) {
  const next = cloneJson(report);

  next.aggregateMetrics.comparison.deltas['networkRequests.total'] = 0;

  return next;
}

function withCachedExternalBaseline(report) {
  const next = cloneJson(report);
  const external = next.scenarioResults.find(
    (result) => result.pathId === `external-live-baseline:${providers[0]}`,
  );

  external.cache = {
    levels: {
      ...external.cache.levels,
      edgeCache: { enabled: true, status: 'hit' },
    },
    status: 'hit',
  };

  return next;
}

function withMissingOwnedCacheLevelCoverage(report) {
  const next = cloneJson(report);
  const ownedResults = next.scenarioResults.filter(
    (result) => result.pathId === 'owned-db-all-caches',
  );
  const ownedMetrics = next.aggregateMetrics.paths.find(
    (entry) => entry.pathId === 'owned-db-all-caches',
  )?.metrics;

  for (const owned of ownedResults) {
    owned.cache.levels.edgeCache = { enabled: true, status: 'miss' };
  }
  if (ownedMetrics !== undefined) {
    ownedMetrics.cacheHitRate.edgeCache = 0;
  }

  return next;
}

function withBrowserMemoryLowerLayerAttribution(report) {
  const next = cloneJson(report);
  const browserMemoryResult = next.scenarioResults.find(
    (result) => result.pathId === 'owned-db-all-caches' && result.iteration === 2,
  );

  browserMemoryResult.cache.levels.edgeCache = { enabled: true, status: 'hit' };

  return next;
}

function withSingleProviderComparisonBaseline(report) {
  const next = cloneJson(report);

  next.aggregateMetrics.comparison.baselinePathId = `external-live-baseline:${providers[0]}`;

  return next;
}

function withTooFewMeasuredIterations(report) {
  const next = cloneJson(report);

  next.run.fairnessControls.measuredIterations = 2;

  return next;
}

function withMismatchedMeasuredIterations(report) {
  const next = cloneJson(report);

  next.run.fairnessControls.measuredIterations = 4;

  return next;
}

function withExtraScenarioResultOutsideSelection(report) {
  const next = cloneJson(report);
  const external = next.scenarioResults.find(
    (result) => result.pathId === `external-live-baseline:${providers[0]}`,
  );

  next.scenarioResults.push({
    ...cloneJson(external),
    scenarioId: 'addr-outside-final-boss-selection',
  });

  return next;
}

function withPartialCorpusSelection(report) {
  const next = cloneJson(report);

  next.corpus.scenarioCount = 1;
  next.corpus.selection = [scenarioIds[0]];
  next.scenarioResults = next.scenarioResults.filter(
    (result) => result.scenarioId === scenarioIds[0],
  );

  return next;
}

function withMissingPreflightCheck(report, checkId) {
  const next = cloneJson(report);

  next.run.finalBossPreflight.checkIds = next.run.finalBossPreflight.checkIds.filter(
    (id) => id !== checkId,
  );
  next.run.finalBossPreflight.checkCount = next.run.finalBossPreflight.checkIds.length;

  return next;
}

function withMissingSourceProvenancePreflight(report) {
  return withMissingPreflightCheck(report, 'owned-source-provenance-present');
}

function withMissingPreflightApiStatus(report) {
  const next = cloneJson(report);

  delete next.run.finalBossPreflight.apiStatus;

  return next;
}

function withMissingPreflightApiBaseFingerprint(report) {
  const next = cloneJson(report);

  delete next.run.finalBossPreflight.apiBaseSha256;

  return next;
}

function withMismatchedRunApiBaseFingerprint(report) {
  const next = cloneJson(report);

  next.run.apiBaseSha256 = sha256('https://different-smart-suggest-report.example.invalid');

  return next;
}

function withStalePreflightTimestamp(report) {
  const next = cloneJson(report);

  next.run.startedAt = '2026-06-28T00:00:00.000Z';
  next.run.finalBossPreflight.checkedAt = '2026-06-27T23:40:00.000Z';

  return next;
}

function withFuturePreflightTimestamp(report) {
  const next = cloneJson(report);

  next.run.startedAt = '2026-06-28T00:00:00.000Z';
  next.run.finalBossPreflight.checkedAt = '2026-06-28T00:02:01.000Z';

  return next;
}

function finalBossRunnerArgs(preflightReportPath, outputReportPath) {
  return [
    './scripts/benchmark/run-local-owned-benchmark.mjs',
    '--paths',
    'http-api-all-caches',
    '--api-base',
    'http://127.0.0.1:9',
    '--external-baseline',
    providers[0],
    '--live-providers',
    '--iterations',
    '1',
    '--warmup',
    '0',
    '--final-boss-preflight-report',
    preflightReportPath,
    '--json-out',
    outputReportPath,
    '--format',
    'json',
  ];
}

function runnerPreflightReport(overrides = {}) {
  return {
    apiBaseSha256: sha256('http://127.0.0.1:9'),
    apiStatus: {
      configured: true,
      ok: true,
      statusCode: 200,
    },
    checkedAt: new Date().toISOString(),
    checks: requiredPreflightCheckIds.map((id) => ({
      id,
      ok: true,
      severity: 'info',
    })),
    providers: providers.slice(0, 1),
    schemaVersion: 'smart-suggest-final-boss-preflight/v1',
    status: 'ready',
    ...overrides,
  };
}

function assertRunnerRejectsMissingApiBasePreflight() {
  writeJson(
    missingApiBaseRunnerPreflightReportPath,
    runnerPreflightReport({
      checks: requiredPreflightCheckIds
        .filter((id) => id !== finalBossApiBaseConfigCheckId)
        .map((id) => ({
          id,
          ok: true,
          severity: 'info',
        })),
    }),
  );

  const result = spawnSync(
    process.execPath,
    finalBossRunnerArgs(
      missingApiBaseRunnerPreflightReportPath,
      '.codex/reports/smart-suggest-benchmark/final-boss-runner-missing-api-base-output.json',
    ),
    {
      cwd: appRoot,
      encoding: 'utf8',
    },
  );

  assert(result.status !== 0, 'Expected final-boss runner to reject missing api-base preflight.', {
    stderr: result.stderr,
    stdout: result.stdout,
  });
  assert(
    result.stderr.includes(
      `Final-boss preflight report is missing required check(s): ${finalBossApiBaseConfigCheckId}.`,
    ),
    'Final-boss runner rejected malformed preflight for an unexpected reason.',
    {
      stderr: result.stderr,
      stdout: result.stdout,
    },
  );
}

function assertRunnerRejectsMismatchedApiBasePreflight() {
  writeJson(
    mismatchedApiBaseRunnerPreflightReportPath,
    runnerPreflightReport({
      apiBaseSha256: sha256('https://different-smart-suggest.example.invalid'),
    }),
  );

  const result = spawnSync(
    process.execPath,
    finalBossRunnerArgs(
      mismatchedApiBaseRunnerPreflightReportPath,
      '.codex/reports/smart-suggest-benchmark/final-boss-runner-mismatched-api-base-output.json',
    ),
    {
      cwd: appRoot,
      encoding: 'utf8',
    },
  );

  assert(
    result.status !== 0,
    'Expected final-boss runner to reject mismatched api-base preflight.',
    {
      stderr: result.stderr,
      stdout: result.stdout,
    },
  );
  assert(
    result.stderr.includes('Final-boss preflight report API base fingerprint does not match'),
    'Final-boss runner rejected mismatched API base for an unexpected reason.',
    {
      stderr: result.stderr,
      stdout: result.stdout,
    },
  );
}

function runProof() {
  fs.mkdirSync(reportDir, { recursive: true });
  writeProofCorpus();
  assertRunnerRejectsMissingApiBasePreflight();
  assertRunnerRejectsMismatchedApiBasePreflight();

  const positive = createPositiveReport();
  const cases = [
    [
      'final-boss-assertion-positive-proof',
      positive,
      {
        ok: true,
      },
    ],
    [
      'final-boss-assertion-missing-aggregate-provider-id-negative-proof',
      withMissingAggregateProviderId(positive),
      {
        ok: false,
        stderrIncludes:
          'naive-live-provider-no-cache is missing required provider id(s): ruian-geocode.',
      },
    ],
    [
      'final-boss-assertion-wrong-aggregate-provider-event-negative-proof',
      withWrongAggregateProviderEvent(positive),
      {
        ok: false,
        stderrIncludes:
          'naive-live-provider-no-cache/addr-k-louzi-slash-diacritic-exact is missing active provider event(s): ruian-geocode.',
      },
    ],
    [
      'final-boss-assertion-wrong-external-path-provider-id-negative-proof',
      withWrongExternalPathProviderId(positive),
      {
        ok: false,
        stderrIncludes: 'external-live-baseline:mapy-cz must record providerIds including mapy-cz.',
      },
    ],
    [
      'final-boss-assertion-wrong-external-result-provider-event-negative-proof',
      withWrongExternalResultProviderEvent(positive),
      {
        ok: false,
        stderrIncludes:
          'external-live-baseline:mapy-cz/addr-k-louzi-slash-diacritic-exact must record active provider event mapy-cz.',
      },
    ],
    [
      'final-boss-assertion-cached-external-baseline-negative-proof',
      withCachedExternalBaseline(positive),
      {
        ok: false,
        stderrIncludes:
          'external-live-baseline:ruian-geocode/addr-k-louzi-slash-diacritic-exact must disable every cache level.',
      },
    ],
    [
      'final-boss-assertion-owned-aggregate-top1-drift-negative-proof',
      withOwnedAggregateTop1Drift(positive),
      {
        ok: false,
        stderrIncludes: 'owned-db-all-caches top1CorrectRate 0.95 must match scenario results 1.',
      },
    ],
    [
      'final-boss-assertion-external-aggregate-byte-drift-negative-proof',
      withExternalAggregateByteDrift(positive),
      {
        ok: false,
        stderrIncludes:
          'external-live-baseline:ruian-geocode bytesTransferred.total 999 must match scenario results 12288.',
      },
    ],
    [
      'final-boss-assertion-naive-aggregate-cost-drift-negative-proof',
      withNaiveAggregateCostDrift(positive),
      {
        ok: false,
        stderrIncludes:
          'naive-live-provider-no-cache costEstimateUsd.totalUsd 0 must match scenario results 0.008.',
      },
    ],
    [
      'final-boss-assertion-external-aggregate-network-drift-negative-proof',
      withExternalAggregateNetworkDrift(positive),
      {
        ok: false,
        stderrIncludes:
          'external-live-baseline:ruian-geocode networkRequests.total 999 must match scenario results 6.',
      },
    ],
    [
      'final-boss-assertion-owned-aggregate-freshness-drift-negative-proof',
      withOwnedAggregateFreshnessDrift(positive),
      {
        ok: false,
        stderrIncludes:
          'owned-db-all-caches freshnessDeltaSeconds.max 1 must match scenario results 3600.',
      },
    ],
    [
      'final-boss-assertion-naive-aggregate-timeout-drift-negative-proof',
      withNaiveAggregateTimeoutDrift(positive),
      {
        ok: false,
        stderrIncludes:
          'naive-live-provider-no-cache timeoutRate 0.5 must match scenario results 0.',
      },
    ],
    [
      'final-boss-assertion-external-aggregate-recall-drift-negative-proof',
      withExternalAggregateRecallDrift(positive),
      {
        ok: false,
        stderrIncludes:
          'external-live-baseline:ruian-geocode requiredResultRecallRate 0.5 must match scenario results 1.',
      },
    ],
    [
      'final-boss-assertion-comparison-delta-drift-negative-proof',
      withComparisonDeltaDrift(positive),
      {
        ok: false,
        stderrIncludes: 'comparison.deltas.providerEvents.total 0 must match scenario results -30.',
      },
    ],
    [
      'final-boss-assertion-comparison-latency-delta-drift-negative-proof',
      withComparisonLatencyDeltaDrift(positive),
      {
        ok: false,
        stderrIncludes: 'comparison.deltas.latencyMs.p95 0 must match scenario results -40.',
      },
    ],
    [
      'final-boss-assertion-comparison-cost-delta-drift-negative-proof',
      withComparisonCostDeltaDrift(positive),
      {
        ok: false,
        stderrIncludes:
          'comparison.deltas.costEstimateUsd.totalUsd 0 must match scenario results -0.008.',
      },
    ],
    [
      'final-boss-assertion-comparison-cache-delta-drift-negative-proof',
      withComparisonCacheDeltaDrift(positive),
      {
        ok: false,
        stderrIncludes: 'comparison.deltas.cacheHitRate.overall 0 must match scenario results 1.',
      },
    ],
    [
      'final-boss-assertion-comparison-network-delta-drift-negative-proof',
      withComparisonNetworkDeltaDrift(positive),
      {
        ok: false,
        stderrIncludes:
          'comparison.deltas.networkRequests.total 0 must match scenario results -26.',
      },
    ],
    [
      'final-boss-assertion-owned-cache-level-coverage-negative-proof',
      withMissingOwnedCacheLevelCoverage(positive),
      {
        ok: false,
        stderrIncludes: 'owned-db-all-caches must prove hit/write coverage for every cache level',
      },
    ],
    [
      'final-boss-assertion-browser-memory-lower-layer-negative-proof',
      withBrowserMemoryLowerLayerAttribution(positive),
      {
        ok: false,
        stderrIncludes:
          'owned-db-all-caches/addr-k-louzi-slash-diacritic-exact iteration 2 must not attribute browser-memory hits to lower cache layer(s): edgeCache.',
      },
    ],
    [
      'final-boss-assertion-single-provider-baseline-negative-proof',
      withSingleProviderComparisonBaseline(positive),
      {
        ok: false,
        stderrIncludes: 'Comparison baseline must be naive-live-provider-no-cache.',
      },
    ],
    [
      'final-boss-assertion-too-few-iterations-negative-proof',
      withTooFewMeasuredIterations(positive),
      {
        ok: false,
        stderrIncludes:
          'Final-boss report must use at least 3 measured iterations to prove API, server-cache, and browser-memory passes; found 2.',
      },
    ],
    [
      'final-boss-assertion-mismatched-iterations-negative-proof',
      withMismatchedMeasuredIterations(positive),
      {
        ok: false,
        stderrIncludes:
          'owned-db-all-caches/addr-k-louzi-slash-diacritic-exact is missing measured iteration 3.',
      },
    ],
    [
      'final-boss-assertion-extra-scenario-negative-proof',
      withExtraScenarioResultOutsideSelection(positive),
      {
        ok: false,
        stderrIncludes:
          'external-live-baseline:ruian-geocode must include 3 measured result(s) for each of 2 selected scenario(s); found 7.',
      },
    ],
    [
      'final-boss-assertion-partial-corpus-selection-negative-proof',
      withPartialCorpusSelection(positive),
      {
        ok: false,
        stderrIncludes:
          'Final-boss report must include every benchmark corpus scenario exactly once in corpus.selection; missing=addr-k-louzi-house-number-first; extra=<none>.',
      },
    ],
    [
      'final-boss-assertion-missing-api-status-preflight-negative-proof',
      withMissingPreflightApiStatus(positive),
      {
        ok: false,
        stderrIncludes:
          'Final-boss preflight evidence must include a reachable configured API status.',
      },
    ],
    [
      'final-boss-assertion-missing-api-base-fingerprint-negative-proof',
      withMissingPreflightApiBaseFingerprint(positive),
      {
        ok: false,
        stderrIncludes: 'Final-boss preflight evidence must include an API base fingerprint.',
      },
    ],
    [
      'final-boss-assertion-mismatched-api-base-fingerprint-negative-proof',
      withMismatchedRunApiBaseFingerprint(positive),
      {
        ok: false,
        stderrIncludes: 'Final-boss benchmark API base fingerprint must match preflight evidence.',
      },
    ],
    [
      'final-boss-assertion-stale-preflight-negative-proof',
      withStalePreflightTimestamp(positive),
      {
        ok: false,
        stderrIncludes: 'Final-boss preflight evidence is stale (1200s old at benchmark start',
      },
    ],
    [
      'final-boss-assertion-future-preflight-negative-proof',
      withFuturePreflightTimestamp(positive),
      {
        ok: false,
        stderrIncludes:
          'Final-boss preflight checkedAt must not be more than 60s after benchmark startedAt.',
      },
    ],
    [
      'final-boss-assertion-missing-api-base-preflight-negative-proof',
      withMissingPreflightCheck(positive, finalBossApiBaseConfigCheckId),
      {
        ok: false,
        stderrIncludes: `Final-boss preflight evidence is missing required check(s): ${finalBossApiBaseConfigCheckId}.`,
      },
    ],
    [
      'final-boss-assertion-missing-source-provenance-preflight-negative-proof',
      withMissingSourceProvenancePreflight(positive),
      {
        ok: false,
        stderrIncludes:
          'Final-boss preflight evidence is missing required check(s): owned-source-provenance-present.',
      },
    ],
  ];
  const artifacts = cases.map(([name, report, expected]) =>
    writeAndAssertCase(name, report, expected),
  );
  const positiveOutput = readText(artifacts[0].outputPath);

  assert(
    positiveOutput.includes('Final-boss benchmark gate passed'),
    'Positive proof output must include the final-boss gate success message.',
  );

  process.stdout.write('Smart Suggest final-boss assertion proof passed:\n');
  for (const artifact of artifacts) {
    process.stdout.write(`- ${artifact.reportPath}\n`);
  }
}

try {
  runProof();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
