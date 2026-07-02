#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';

const scriptDirectory = import.meta.dirname;
const appScriptsDirectory = path.resolve(scriptDirectory, '..');
const corpusPath = path.resolve(
  appScriptsDirectory,
  'fixtures/smart-suggest-benchmark-corpus-v1.json',
);
const correctnessFixturePath = path.resolve(
  appScriptsDirectory,
  'fixtures/smart-suggest-correctness-scenarios-v1.json',
);
const metricsSchemaPath = path.resolve(
  scriptDirectory,
  'smart-suggest-benchmark-metrics.schema.json',
);

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

const requiredCorrectnessLabels = [
  'cold-cache',
  'diacritics',
  'full-address',
  'house-number-variants',
  'no-result',
  'provider-timeout',
  'street-fragment',
  'zip-only',
  'zip-plus-city',
];

const requiredCorrectnessEndpoints = ['suggest', 'validate-postal', 'status'];

const privateDataPatterns = [
  /(?:\+?\d[\d\s().-]{8,}\d)/u,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
  /(?:api[_-]?key|token|secret|bearer)\s*[:=]/iu,
];

const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf-8'));

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

const collectCorrectnessExpectedResultIds = (expected) => [
  ...(expected?.topResultIds ?? []),
  ...(expected?.top5ResultIds ?? []),
  ...(expected?.requiredResultIds ?? []),
  ...(expected?.forbiddenTop1ResultIds ?? []),
];

const isPostalResultId = (resultId) => /^ruian-cz:postal:[a-z0-9-]+:/u.test(resultId);

const assertPublicSafeLiteral = (value, field) => {
  if (typeof value !== 'string') {
    return;
  }

  for (const pattern of privateDataPatterns) {
    assert(!pattern.test(value), `${field} looks like private customer/provider data`);
  }
};

const validateCorrectnessFixtureHeader = (fixture, corpus) => {
  assert(
    fixture.schemaVersion === 'smart-suggest-correctness-scenarios/v1',
    'Unexpected correctness fixture schemaVersion',
  );
  assert(fixture.publicSafety?.safeToCommit === true, 'Correctness fixture must be safe to commit');
  assert(
    fixture.publicSafety?.containsRawCustomerQueries === false,
    'Correctness fixture must not contain raw customer queries',
  );
  assert(
    fixture.publicSafety?.containsPrivateProviderPayloads === false,
    'Correctness fixture must not contain private provider payloads',
  );
  assertString(fixture.apiDefaults?.pathPrefix, 'correctness.apiDefaults.pathPrefix');
  assert(
    fixture.benchmarkCorpus?.schemaVersion === corpus.schemaVersion,
    'Correctness fixture benchmark corpus schemaVersion must match the benchmark corpus',
  );
  assert(Array.isArray(fixture.scenarios), 'Correctness scenarios must be an array');
  assert(fixture.scenarios.length >= 10, 'Correctness fixture must include enough coverage');
};

const correctnessContext = (corpus) => ({
  benchmarkScenarioIds: new Set(corpus.scenarios.map((scenario) => scenario.id)),
  observedEndpoints: new Set(),
  observedLabels: new Set(),
  resultIds: new Set(corpus.canonicalResults.map((result) => result.id)),
  sourceIds: new Set(corpus.sources.map((source) => source.id)),
});

const validateCorrectnessScenarioBase = (scenario, context) => {
  assertString(scenario.id, 'correctness.scenario.id');
  assertString(scenario.description, `${scenario.id}.description`);
  assertString(scenario.endpoint, `${scenario.id}.endpoint`);
  context.observedEndpoints.add(scenario.endpoint);
  assert(Array.isArray(scenario.targetModes), `${scenario.id}.targetModes must be an array`);
  assert(scenario.targetModes.length > 0, `${scenario.id}.targetModes must not be empty`);
  assert(Array.isArray(scenario.labels), `${scenario.id}.labels must be an array`);
  assert(scenario.labels.length > 0, `${scenario.id}.labels must not be empty`);

  for (const label of scenario.labels) {
    context.observedLabels.add(label);
  }

  if (scenario.query !== undefined) {
    assertString(scenario.query, `${scenario.id}.query`);
    assertPublicSafeLiteral(scenario.query, `${scenario.id}.query`);
  }

  if (scenario.payload?.rawInput !== undefined) {
    assertPublicSafeLiteral(scenario.payload.rawInput, `${scenario.id}.payload.rawInput`);
  }

  if (scenario.benchmarkScenarioId !== undefined) {
    assert(
      context.benchmarkScenarioIds.has(scenario.benchmarkScenarioId),
      `${scenario.id} references unknown benchmark scenario ${scenario.benchmarkScenarioId}`,
    );
    assert(
      scenario.targetModes.includes('local-benchmark'),
      `${scenario.id} with benchmarkScenarioId must include local-benchmark target mode`,
    );
  }
};

const validateCorrectnessResultReferences = (scenario, context) => {
  for (const sourceId of scenario.expected.sourceIds) {
    assert(context.sourceIds.has(sourceId), `${scenario.id} references unknown source ${sourceId}`);
  }

  for (const resultId of collectCorrectnessExpectedResultIds(scenario.expected)) {
    assert(
      context.resultIds.has(resultId) || isPostalResultId(resultId),
      `${scenario.id} references unknown result ${resultId}`,
    );
  }
};

const validateCorrectnessResultCount = (scenario) => {
  const { resultCount } = scenario.expected;
  assert(
    resultCount &&
      Number.isInteger(resultCount.min) &&
      Number.isInteger(resultCount.max) &&
      resultCount.min >= 0 &&
      resultCount.max >= resultCount.min,
    `${scenario.id}.expected.resultCount must define a non-negative min/max range`,
  );

  if (resultCount.full !== undefined) {
    assert(
      Number.isInteger(resultCount.full) &&
        resultCount.full >= resultCount.min &&
        resultCount.full <= resultCount.max,
      `${scenario.id}.expected.resultCount.full must be inside min/max`,
    );
  }
};

const validateCorrectnessSuggestExpectations = (scenario, context) => {
  assertString(scenario.kind, `${scenario.id}.kind`);
  assertString(scenario.query, `${scenario.id}.query`);
  assert(scenario.expected && typeof scenario.expected === 'object', `${scenario.id}.expected`);
  assert(
    Array.isArray(scenario.expected.sourceIds),
    `${scenario.id}.expected.sourceIds must be an array`,
  );

  validateCorrectnessResultReferences(scenario, context);
  validateCorrectnessResultCount(scenario);

  assert(
    Number.isFinite(scenario.expected.duplicateRate?.max) &&
      scenario.expected.duplicateRate.max >= 0 &&
      scenario.expected.duplicateRate.max <= 1,
    `${scenario.id}.expected.duplicateRate.max must be between 0 and 1`,
  );
  assert(
    Array.isArray(scenario.expected.cache?.allowedStatuses),
    `${scenario.id}.expected.cache.allowedStatuses must be an array`,
  );

  if (scenario.labels.includes('provider-timeout')) {
    assert(
      scenario.expected.providerEvents?.requiresProviderFixture === true,
      `${scenario.id} provider-timeout scenario must mark requiresProviderFixture`,
    );
  }

  if (scenario.labels.includes('zip-locality-coverage')) {
    assert(
      Number.isInteger(scenario.expected.zipLocalityCoverage?.fullResultCount) &&
        scenario.expected.zipLocalityCoverage.fullResultCount > 0,
      `${scenario.id}.expected.zipLocalityCoverage.fullResultCount is required`,
    );
    assert(
      scenario.expected.zipLocalityCoverage.requiresSeededProductionData === true,
      `${scenario.id}.expected.zipLocalityCoverage must be marked seeded-production-only`,
    );
  }
};

const validateCorrectnessPostalExpectations = (scenario) => {
  assertString(scenario.payload?.countryCode, `${scenario.id}.payload.countryCode`);
  assertString(scenario.payload?.rawInput, `${scenario.id}.payload.rawInput`);
  assert(
    scenario.expected?.postalValidation && typeof scenario.expected.postalValidation === 'object',
    `${scenario.id}.expected.postalValidation is required`,
  );
};

const validateCorrectnessStatusExpectations = (scenario) => {
  assert(
    scenario.expected?.status && typeof scenario.expected.status === 'object',
    `${scenario.id}.expected.status is required`,
  );
};

const validateCorrectnessScenario = (scenario, context) => {
  validateCorrectnessScenarioBase(scenario, context);

  if (scenario.endpoint === 'suggest') {
    validateCorrectnessSuggestExpectations(scenario, context);
  }
  if (scenario.endpoint === 'validate-postal') {
    validateCorrectnessPostalExpectations(scenario);
  }
  if (scenario.endpoint === 'status') {
    validateCorrectnessStatusExpectations(scenario);
  }
};

const validateCorrectnessCoverage = (context) => {
  for (const endpoint of requiredCorrectnessEndpoints) {
    assert(
      context.observedEndpoints.has(endpoint),
      `Correctness fixture is missing required endpoint ${endpoint}`,
    );
  }

  for (const label of requiredCorrectnessLabels) {
    assert(
      context.observedLabels.has(label),
      `Correctness fixture is missing required label ${label}`,
    );
  }
};

const validateCorrectnessFixture = (fixture, corpus) => {
  validateCorrectnessFixtureHeader(fixture, corpus);
  assertUnique(
    fixture.scenarios.map((scenario) => scenario.id),
    'correctness.scenarios.id',
  );

  const context = correctnessContext(corpus);

  for (const scenario of fixture.scenarios) {
    validateCorrectnessScenario(scenario, context);
  }

  validateCorrectnessCoverage(context);
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
const correctnessFixture = readJson(correctnessFixturePath);
const metricsSchema = readJson(metricsSchemaPath);

validateCorpus(corpus);
validateCorrectnessFixture(correctnessFixture, corpus);
validateMetricsSchema(metricsSchema);

console.log(
  `Validated ${corpus.scenarios.length} benchmark scenarios, ${correctnessFixture.scenarios.length} correctness scenarios, and ${metricsSchema['x-smartSuggestMetricContract'].aggregateMetricNames.length} aggregate metric names.`,
);
