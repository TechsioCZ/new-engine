#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appScriptsDirectory = resolve(scriptDirectory, '..');
const corpusPath = resolve(appScriptsDirectory, 'fixtures/smart-suggest-benchmark-corpus-v1.json');
const metricsSchemaPath = resolve(scriptDirectory, 'smart-suggest-benchmark-metrics.schema.json');

const requiredScenarioTags = [
  'ambiguous-city',
  'diacritic',
  'k-louzi-house-orientation',
  'no-diacritic',
  'no-match',
  'postal-code',
  'result-volume',
  'typo',
  'weak-query',
  'wrong-city',
];

const requiredAggregateMetricNames = [
  'latencyMs.p50',
  'latencyMs.p95',
  'latencyMs.p99',
  'timeoutRate',
  'top1CorrectRate',
  'top5CorrectRate',
  'resultCount.mean',
  'providerEvents.total',
  'providerEvents.timeout',
  'd1Fanout.mean',
  'd1QueryCount.mean',
  'bytesTransferred.total',
  'costEstimateUsd.per1kRequestsUsd',
  'freshnessDeltaSeconds.p95',
  'cacheHitRate.overall',
  'cacheHitRate.edgeCache',
  'cacheHitRate.ownedDb',
];

const privateDataPatterns = [
  /(?:\+?\d[\d\s().-]{8,}\d)/u,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
  /(?:api[_-]?key|token|secret|bearer)\s*[:=]/iu,
];

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) {
    fail(message);
  }
};

const assertString = (value, field) => {
  assert(typeof value === 'string' && value.length > 0, `${field} is required`);
};

const assertUnique = (values, field) => {
  const seen = new Set();

  for (const value of values) {
    assert(!seen.has(value), `${field} contains duplicate value ${value}`);
    seen.add(value);
  }
};

const collectExpectedResultIds = (expected) => [
  ...(expected.top1ResultIds ?? []),
  ...(expected.top5ResultIds ?? []),
  ...(expected.requiredResultIds ?? []),
  ...(expected.forbiddenTop1ResultIds ?? []),
  ...(expected.expectedLabels ?? []).map((label) => label.resultId),
];

const validateExpectedResultReferences = (scenario, resultIds, sourceIds) => {
  const { expected } = scenario;

  assert(expected && typeof expected === 'object', `${scenario.id} expected is required`);
  assert(
    Array.isArray(expected.expectedSourceIds),
    `${scenario.id} expected.expectedSourceIds must be an array`,
  );
  assert(
    Array.isArray(expected.top1ResultIds),
    `${scenario.id} expected.top1ResultIds must be an array`,
  );
  assert(
    Array.isArray(expected.top5ResultIds),
    `${scenario.id} expected.top5ResultIds must be an array`,
  );
  assert(
    Array.isArray(expected.requiredResultIds),
    `${scenario.id} expected.requiredResultIds must be an array`,
  );
  assert(
    Array.isArray(expected.expectedLabels),
    `${scenario.id} expected.expectedLabels must be an array`,
  );

  for (const sourceId of expected.expectedSourceIds) {
    assert(sourceIds.has(sourceId), `${scenario.id} references unknown source ${sourceId}`);
  }

  for (const resultId of collectExpectedResultIds(expected)) {
    assert(resultIds.has(resultId), `${scenario.id} references unknown result ${resultId}`);
  }

  for (const label of expected.expectedLabels) {
    assertString(label.resultId, `${scenario.id} expectedLabels.resultId`);
    assertString(label.label, `${scenario.id} expectedLabels.label`);
  }

  assert(
    expected.resultCount &&
      Number.isInteger(expected.resultCount.min) &&
      Number.isInteger(expected.resultCount.max) &&
      expected.resultCount.min >= 0 &&
      expected.resultCount.max >= expected.resultCount.min,
    `${scenario.id} expected.resultCount must define a non-negative min/max range`,
  );
  assertString(expected.resultCount.bucket, `${scenario.id} expected.resultCount.bucket`);
};

const validateCorpus = (corpus) => {
  assert(
    corpus.schemaVersion === 'smart-suggest-benchmark-corpus/v1',
    'Unexpected corpus schemaVersion',
  );
  assert(corpus.publicSafety?.safeToCommit === true, 'Corpus must be safe to commit');
  assert(
    corpus.publicSafety?.containsRawCustomerQueries === false,
    'Corpus must not contain raw customer queries',
  );
  assert(
    corpus.publicSafety?.containsPrivateProviderPayloads === false,
    'Corpus must not contain private provider payloads',
  );
  assert(Array.isArray(corpus.sources), 'Corpus sources must be an array');
  assert(Array.isArray(corpus.canonicalResults), 'Corpus canonicalResults must be an array');
  assert(Array.isArray(corpus.scenarios), 'Corpus scenarios must be an array');
  assert(corpus.scenarios.length >= 12, 'Corpus must include enough scenario coverage');

  const sourceIds = new Set(corpus.sources.map((source) => source.id));
  const resultIds = new Set(corpus.canonicalResults.map((result) => result.id));

  assertUnique([...sourceIds], 'sources.id');
  assertUnique([...resultIds], 'canonicalResults.id');

  for (const source of corpus.sources) {
    assertString(source.id, 'source.id');
    assertString(source.kind, `${source.id}.kind`);
    assert(source.publicSafe === true, `${source.id} must be publicSafe`);
  }

  for (const result of corpus.canonicalResults) {
    assertString(result.id, 'canonicalResult.id');
    assertString(result.sourceId, `${result.id}.sourceId`);
    assertString(result.label, `${result.id}.label`);
    assert(sourceIds.has(result.sourceId), `${result.id} references unknown source`);
  }

  const scenarioIds = corpus.scenarios.map((scenario) => scenario.id);
  assertUnique(scenarioIds, 'scenarios.id');

  const observedTags = new Set();
  let resultVolumeScenarioCount = 0;

  for (const scenario of corpus.scenarios) {
    assertString(scenario.id, 'scenario.id');
    assertString(scenario.description, `${scenario.id}.description`);
    assertString(scenario.query, `${scenario.id}.query`);
    assert(Array.isArray(scenario.tags), `${scenario.id}.tags must be an array`);
    assert(scenario.tags.length > 0, `${scenario.id}.tags must not be empty`);

    for (const pattern of privateDataPatterns) {
      assert(
        !pattern.test(scenario.query),
        `${scenario.id} query looks like private customer/provider data`,
      );
    }

    for (const tag of scenario.tags) {
      observedTags.add(tag);
    }

    validateExpectedResultReferences(scenario, resultIds, sourceIds);

    if (scenario.tags.includes('result-volume')) {
      resultVolumeScenarioCount += 1;
    }
  }

  for (const tag of requiredScenarioTags) {
    assert(observedTags.has(tag), `Corpus is missing required scenario tag ${tag}`);
  }

  assert(
    resultVolumeScenarioCount >= 3,
    'Corpus must include at least three result-volume scenarios',
  );
};

const findRequiredMetricNames = (schema) =>
  schema?.$defs?.pathAggregate?.properties?.metrics?.required ?? [];

const validateMetricsSchema = (schema) => {
  assert(
    schema.properties?.schemaVersion?.const === 'smart-suggest-benchmark-metrics/v1',
    'Unexpected metrics schemaVersion const',
  );
  assert(schema.$defs?.scenarioResult, 'Metrics schema must define scenarioResult');
  assert(schema.$defs?.aggregateMetrics, 'Metrics schema must define aggregateMetrics');

  const requiredMetricKeys = new Set(findRequiredMetricNames(schema));

  for (const key of [
    'latencyMs',
    'timeoutRate',
    'top1CorrectRate',
    'top5CorrectRate',
    'resultCount',
    'providerEvents',
    'd1Fanout',
    'd1QueryCount',
    'bytesTransferred',
    'costEstimateUsd',
    'freshnessDeltaSeconds',
    'cacheHitRate',
  ]) {
    assert(requiredMetricKeys.has(key), `Metrics schema is missing aggregate key ${key}`);
  }

  const aggregateMetricNames = schema['x-smartSuggestMetricContract']?.aggregateMetricNames ?? [];
  const aggregateMetricNameSet = new Set(aggregateMetricNames);

  for (const metricName of requiredAggregateMetricNames) {
    assert(
      aggregateMetricNameSet.has(metricName),
      `Metrics contract is missing aggregate metric name ${metricName}`,
    );
  }

  const comparisonPathIds = schema['x-smartSuggestMetricContract']?.comparisonPathIds ?? [];

  assert(
    comparisonPathIds.includes('naive-live-provider-no-cache'),
    'Metrics contract must name the naive no-cache live-provider baseline',
  );
  assert(
    comparisonPathIds.includes('owned-db-all-caches'),
    'Metrics contract must name the owned DB plus all cache levels path',
  );
};

const corpus = readJson(corpusPath);
const metricsSchema = readJson(metricsSchemaPath);

validateCorpus(corpus);
validateMetricsSchema(metricsSchema);

console.log(
  `Validated ${corpus.scenarios.length} benchmark scenarios and ${metricsSchema['x-smartSuggestMetricContract'].aggregateMetricNames.length} aggregate metric names.`,
);
