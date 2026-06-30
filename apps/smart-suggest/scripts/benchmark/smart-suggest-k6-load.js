import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const trimTrailingSlash = (value) => String(value).replace(/\/+$/u, '');

const normalizePathPrefix = (value) => {
  const prefixed = value.startsWith('/') ? value : `/${value}`;

  return trimTrailingSlash(prefixed);
};

const numberEnv = (name, fallback) => {
  const value = Number(__ENV[name]);

  return Number.isFinite(value) ? value : fallback;
};

const booleanEnv = (name, fallback) => {
  const value = String(__ENV[name] || '').toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(value)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(value)) {
    return false;
  }

  return fallback;
};

const fixture = JSON.parse(open('../fixtures/smart-suggest-correctness-scenarios-v1.json'));
const baseUrl = trimTrailingSlash(__ENV.SMART_SUGGEST_BASE_URL || 'http://localhost:3000');
const pathPrefix = normalizePathPrefix(
  __ENV.SMART_SUGGEST_API_PATH_PREFIX || fixture.apiDefaults?.pathPrefix || '/api/v1',
);
const defaultCountryCode = fixture.apiDefaults?.countryCode || 'CZ';
const defaultLanguage = fixture.apiDefaults?.language || 'cs-CZ';
const defaultLimit = numberEnv('SMART_SUGGEST_K6_LIMIT', fixture.apiDefaults?.limit || 5);
const requireSeededData = booleanEnv('SMART_SUGGEST_K6_REQUIRE_SEEDED_DATA', false);
const requireProviderFixture = booleanEnv('SMART_SUGGEST_K6_REQUIRE_PROVIDER_FIXTURE', false);
const statusEvery = numberEnv('SMART_SUGGEST_K6_STATUS_EVERY', 10);
const postalValidationEvery = numberEnv('SMART_SUGGEST_K6_POSTAL_VALIDATE_EVERY', 7);
const sleepSeconds = numberEnv('SMART_SUGGEST_K6_SLEEP_SECONDS', 0.2);

const suggestScenarios = fixture.scenarios.filter(
  (scenario) =>
    scenario.endpoint === 'suggest' &&
    typeof scenario.query === 'string' &&
    (!scenario.expected?.providerEvents?.requiresProviderFixture || requireProviderFixture),
);
const postalValidationScenarios = fixture.scenarios.filter(
  (scenario) => scenario.endpoint === 'validate-postal',
);
const statusScenarios = fixture.scenarios.filter((scenario) => scenario.endpoint === 'status');

const endpointOk = new Rate('smart_suggest_endpoint_ok');
const suggestCorrect = new Rate('smart_suggest_suggest_correct');
const duplicateRate = new Trend('smart_suggest_duplicate_rate');
const resultCount = new Trend('smart_suggest_result_count');
const providerEventCount = new Counter('smart_suggest_provider_events_total');

export const options = {
  scenarios: {
    cold: {
      duration: __ENV.SMART_SUGGEST_K6_COLD_DURATION || '30s',
      exec: 'coldPhase',
      executor: 'constant-vus',
      tags: { phase: 'cold' },
      vus: numberEnv('SMART_SUGGEST_K6_COLD_VUS', numberEnv('SMART_SUGGEST_K6_VUS', 2)),
    },
    warm: {
      duration: __ENV.SMART_SUGGEST_K6_WARM_DURATION || '1m',
      exec: 'warmPhase',
      executor: 'constant-vus',
      startTime: __ENV.SMART_SUGGEST_K6_COLD_DURATION || '30s',
      tags: { phase: 'warm' },
      vus: numberEnv('SMART_SUGGEST_K6_WARM_VUS', numberEnv('SMART_SUGGEST_K6_VUS', 4)),
    },
  },
  systemTags: [
    'status',
    'method',
    'name',
    'group',
    'check',
    'error',
    'error_code',
    'expected_response',
    'scenario',
  ],
  thresholds: {
    'http_req_duration{endpoint:status,phase:warm}': [
      `p(50)<${numberEnv('SMART_SUGGEST_K6_STATUS_P50_MS', 100)}`,
      `p(95)<${numberEnv('SMART_SUGGEST_K6_STATUS_P95_MS', 300)}`,
      `p(99)<${numberEnv('SMART_SUGGEST_K6_STATUS_P99_MS', 600)}`,
    ],
    'http_req_duration{endpoint:suggest,phase:warm}': [
      `p(50)<${numberEnv('SMART_SUGGEST_K6_SUGGEST_P50_MS', 150)}`,
      `p(95)<${numberEnv('SMART_SUGGEST_K6_SUGGEST_P95_MS', 500)}`,
      `p(99)<${numberEnv('SMART_SUGGEST_K6_SUGGEST_P99_MS', 1000)}`,
    ],
    'http_req_duration{endpoint:validate-postal,phase:warm}': [
      `p(50)<${numberEnv('SMART_SUGGEST_K6_VALIDATE_POSTAL_P50_MS', 100)}`,
      `p(95)<${numberEnv('SMART_SUGGEST_K6_VALIDATE_POSTAL_P95_MS', 300)}`,
      `p(99)<${numberEnv('SMART_SUGGEST_K6_VALIDATE_POSTAL_P99_MS', 600)}`,
    ],
    http_req_failed: [`rate<${numberEnv('SMART_SUGGEST_K6_HTTP_FAIL_RATE', 0.01)}`],
    smart_suggest_duplicate_rate: [`p(95)<=${numberEnv('SMART_SUGGEST_K6_MAX_DUPLICATE_RATE', 0)}`],
    smart_suggest_endpoint_ok: [`rate>${numberEnv('SMART_SUGGEST_K6_MIN_ENDPOINT_OK_RATE', 0.99)}`],
    smart_suggest_suggest_correct: [
      `rate>${numberEnv('SMART_SUGGEST_K6_MIN_SUGGEST_CORRECT_RATE', 0.98)}`,
    ],
  },
};

export const setup = () => {
  if (suggestScenarios.length === 0) {
    throw new Error('No suggest scenarios selected for k6 load run.');
  }
  if (postalValidationScenarios.length === 0) {
    throw new Error('No postal validation scenarios available for k6 load run.');
  }
  if (statusScenarios.length === 0) {
    throw new Error('No status scenario available for k6 load run.');
  }

  return {
    scenarioCounts: {
      postalValidation: postalValidationScenarios.length,
      status: statusScenarios.length,
      suggest: suggestScenarios.length,
    },
  };
};

export const coldPhase = () => {
  exerciseApi('cold');
};

export const warmPhase = () => {
  exerciseApi('warm');
};

const exerciseApi = (phase) => {
  runSuggest(pickScenario(suggestScenarios, 0), phase);

  const sequence = __ITER + __VU;

  if (statusEvery > 0 && sequence % statusEvery === 0) {
    runStatus(pickScenario(statusScenarios, 3), phase);
  }

  if (postalValidationEvery > 0 && sequence % postalValidationEvery === 0) {
    runPostalValidation(pickScenario(postalValidationScenarios, 5), phase);
  }

  if (sleepSeconds > 0) {
    sleep(sleepSeconds);
  }
};

const runSuggest = (scenario, phase) => {
  const url = route('/suggest', suggestParams(scenario));
  const tags = tagsFor('suggest', scenario, phase);
  const response = http.get(url, {
    headers: { accept: 'application/json', 'x-smart-suggest-benchmark': 'k6-load' },
    tags: { ...tags, name: `${pathPrefix}/suggest` },
  });
  const evaluation = evaluateSuggestResponse(response, parseJson(response), scenario);

  check(response, suggestChecks(response, evaluation), tags);
  recordSuggestMetrics(response, evaluation, tags);
};

const optionalSeededAssertion = (expected) =>
  expected.resultCount?.requiresSeededProductionData === true && !requireSeededData;

const topResultMatchesFixture = (expected, ids, suggestions) => {
  if (optionalSeededAssertion(expected)) {
    return true;
  }

  const expectedTopResultIds = expected.topResultIds || [];

  if (expectedTopResultIds.length === 0) {
    return suggestions.length === 0;
  }

  return expectedTopResultIds.includes(ids[0]);
};

const requiredResultsMatchFixture = (expected, ids) => {
  if (optionalSeededAssertion(expected)) {
    return true;
  }

  return (expected.requiredResultIds || []).every((id) => ids.includes(id));
};

const evaluateSuggestResponse = (response, body, scenario) => {
  const suggestions = Array.isArray(body?.suggestions) ? body.suggestions : [];
  const ids = suggestions.map((suggestion) => String(suggestion.id));
  const expected = scenario.expected || {};
  const duplicateRateValue = calculateDuplicateRate(ids);
  const providerEvents = Array.isArray(body?.providerEvents) ? body.providerEvents : [];
  const resultCountMatches = countMatches(suggestions.length, expected.resultCount);
  const topResultMatches = topResultMatchesFixture(expected, ids, suggestions);
  const requiredResultsMatch = requiredResultsMatchFixture(expected, ids);
  const duplicatesMatch = duplicateRateValue <= (expected.duplicateRate?.max ?? 0);
  const providerEventsMatch = providerEventsMatchFixture(providerEvents, expected.providerEvents);
  const responseIsJson = Array.isArray(body?.suggestions);

  return {
    duplicateRateValue,
    duplicatesMatch,
    ok:
      response.status === 200 &&
      responseIsJson &&
      resultCountMatches &&
      topResultMatches &&
      requiredResultsMatch &&
      duplicatesMatch &&
      providerEventsMatch,
    providerEventCount: providerEvents.length,
    providerEventsMatch,
    requiredResultsMatch,
    responseIsJson,
    resultCount: suggestions.length,
    resultCountMatches,
    topResultMatches,
  };
};

const suggestChecks = (response, evaluation) => ({
  'suggest duplicate rate is bounded': () => evaluation.duplicatesMatch,
  'suggest provider events are bounded': () => evaluation.providerEventsMatch,
  'suggest required results are present': () => evaluation.requiredResultsMatch,
  'suggest response is json': () => evaluation.responseIsJson,
  'suggest result count matches fixture': () => evaluation.resultCountMatches,
  'suggest status is 200': () => response.status === 200,
  'suggest top result matches fixture': () => evaluation.topResultMatches,
});

const recordSuggestMetrics = (response, evaluation, tags) => {
  endpointOk.add(response.status === 200 && evaluation.responseIsJson, tags);
  suggestCorrect.add(evaluation.ok, tags);
  duplicateRate.add(evaluation.duplicateRateValue, tags);
  resultCount.add(evaluation.resultCount, tags);
  providerEventCount.add(evaluation.providerEventCount, tags);
};

const runPostalValidation = (scenario, phase) => {
  const tags = tagsFor('validate-postal', scenario, phase);
  const response = http.post(route('/validate/postal'), JSON.stringify(scenario.payload), {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-smart-suggest-benchmark': 'k6-load',
    },
    tags: { ...tags, name: `${pathPrefix}/validate/postal` },
  });
  const body = parseJson(response);
  const expected = scenario.expected?.postalValidation || {};
  const fieldsMatch =
    body?.isValid === expected.isValid &&
    body?.countryCode === expected.countryCode &&
    body?.normalizedValue === expected.normalizedValue;

  check(
    response,
    {
      'postal validation fields match fixture': () => fieldsMatch,
      'postal validation status is 200': () => response.status === 200,
    },
    tags,
  );

  endpointOk.add(response.status === 200 && fieldsMatch, tags);
};

const runStatus = (scenario, phase) => {
  const tags = tagsFor('status', scenario, phase);
  const response = http.get(route('/status'), {
    headers: { accept: 'application/json', 'x-smart-suggest-benchmark': 'k6-load' },
    tags: { ...tags, name: `${pathPrefix}/status` },
  });
  const body = parseJson(response);
  const expected = scenario.expected?.status || {};
  const serviceMatches = body?.service === expected.service;
  const rawQueryStorageMatches =
    expected.rawQueryStorage === undefined ||
    body?.sourcePolicy?.rawQueryStorage === expected.rawQueryStorage;

  check(
    response,
    {
      'status endpoint status is 200': () => response.status === 200,
      'status raw-query storage policy matches fixture': () => rawQueryStorageMatches,
      'status service matches fixture': () => serviceMatches,
    },
    tags,
  );

  endpointOk.add(response.status === 200 && serviceMatches && rawQueryStorageMatches, tags);
};

const suggestParams = (scenario) => {
  const request = scenario.request || {};
  const params = {
    countryCode: request.countryCode || defaultCountryCode,
    kind: scenario.kind,
    language: request.language || defaultLanguage,
    limit: String(request.limit || defaultLimit),
    q: scenario.query,
  };

  if (request.tenantId) {
    params.tenantId = request.tenantId;
  }

  return params;
};

const route = (routePath, query) => {
  const search = query === undefined ? '' : `?${encodeParams(query)}`;

  return `${baseUrl}${pathPrefix}${routePath}${search}`;
};

const encodeParams = (params) =>
  Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

const parseJson = (response) => {
  try {
    return response.body ? JSON.parse(response.body) : undefined;
  } catch {
    return null;
  }
};

const countMatches = (actual, expected) => {
  if (expected === undefined) {
    return true;
  }

  if (expected.requiresSeededProductionData && !requireSeededData) {
    return true;
  }

  const min = expected.min ?? 0;
  const max = expected.max ?? Number.MAX_SAFE_INTEGER;

  if (actual < min || actual > max) {
    return false;
  }

  if (expected.full !== undefined && !expected.requiresSeededProductionData) {
    return actual === expected.full;
  }

  if (expected.full !== undefined && expected.requiresSeededProductionData && requireSeededData) {
    return actual === expected.full;
  }

  return true;
};

const providerEventsMatchFixture = (providerEvents, expected) => {
  if (expected === undefined) {
    return providerEvents.length === 0;
  }

  if (expected.requiresProviderFixture && !requireProviderFixture) {
    return true;
  }

  if (expected.maxTotal !== undefined && providerEvents.length > expected.maxTotal) {
    return false;
  }

  if (Array.isArray(expected.allowedStatuses)) {
    const allowedStatuses = new Set(expected.allowedStatuses);

    return providerEvents.every((event) => allowedStatuses.has(event.status));
  }

  return true;
};

const calculateDuplicateRate = (ids) => {
  if (ids.length === 0) {
    return 0;
  }

  return (ids.length - new Set(ids).size) / ids.length;
};

const pickScenario = (scenarios, offset) => scenarios[(__ITER + __VU + offset) % scenarios.length];

const tagsFor = (endpoint, scenario, phase) => ({
  endpoint,
  phase,
  scenario_id: scenario.id,
});
