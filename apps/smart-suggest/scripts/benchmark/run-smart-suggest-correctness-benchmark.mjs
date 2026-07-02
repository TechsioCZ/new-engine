#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const scriptDirectory = import.meta.dirname;
const appRoot = path.resolve(scriptDirectory, '..', '..');
const defaultFixturePath = path.resolve(
  appRoot,
  'scripts/fixtures/smart-suggest-correctness-scenarios-v1.json',
);
const defaultCorpusPath = path.resolve(
  appRoot,
  'scripts/fixtures/smart-suggest-benchmark-corpus-v1.json',
);
const localBenchmarkScript = path.resolve(scriptDirectory, 'run-local-owned-benchmark.mjs');
const targetModes = new Set(['fixture', 'local', 'http', 'both']);
const requiredFixtureLabels = [
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
const requiredFixtureEndpoints = ['suggest', 'validate-postal', 'status'];
const secretLikePatterns = [
  /(?:api[_-]?key|token|secret|bearer)\s*[:=]\s*[^"',\s]+/giu,
  /(?<queryPrefix>[?&](?:api[_-]?key|token|secret|access[_-]?token)=)[^&#\s"']+/giu,
  /bearer\s+[a-z0-9._~+/=-]+/giu,
];

const printHelp = () => {
  process.stdout.write(`Usage:
  node scripts/benchmark/run-smart-suggest-correctness-benchmark.mjs [options]

Runs deterministic Smart Suggest correctness proof scenarios. Local target uses
the existing owned-data benchmark report and does not need production secrets.
HTTP target calls the configured Smart Suggest API base.

Options:
  --target local                 fixture, local, http, or both. Defaults to local.
  --fixture path                 Correctness scenario fixture.
  --corpus path                  Benchmark corpus used for local source attribution.
  --benchmark-report path        Existing local benchmark report to validate instead of running one.
  --paths in-memory,sqlite-local Local benchmark paths. Defaults to both owned local paths.
  --api-base https://...         Required for --target http or both. Env: SMART_SUGGEST_BASE_URL.
  --api-path-prefix /api/v1      API route prefix. Env: SMART_SUGGEST_API_PATH_PREFIX.
  --timeout-ms 1000              Per-request timeout.
  --warmup 0                     Local benchmark warmup iterations.
  --require-seeded-production-data
                                  Enforce ZIP full-locality coverage assertions.
  --require-provider-events      Enforce provider-timeout fixture event assertion.
  --out path                     Optional JSON proof output path.
  --format summary               summary or json stdout.
`);
};

const envValue = (name) => {
  const value = process.env[name]?.trim();

  return value === undefined || value.length === 0 ? undefined : value;
};

const defaultArgs = () => ({
  apiBase: envValue('SMART_SUGGEST_BASE_URL') ?? envValue('SMART_SUGGEST_BENCHMARK_API_BASE_URL'),
  apiPathPrefix: envValue('SMART_SUGGEST_API_PATH_PREFIX'),
  benchmarkReport: undefined,
  corpus: defaultCorpusPath,
  fixture: defaultFixturePath,
  format: 'summary',
  help: false,
  out: undefined,
  paths: 'in-memory,sqlite-local',
  requireProviderEvents: false,
  requireSeededProductionData: false,
  target: 'local',
  timeoutMs: 1000,
  warmup: 0,
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

const resolveAppPath = (inputPath) =>
  path.isAbsolute(inputPath) ? inputPath : path.resolve(appRoot, inputPath);

const parseOptionArgument = (arg, value, parsed) => {
  switch (arg) {
    case '--api-base': {
      parsed.apiBase = value;
      return true;
    }
    case '--api-path-prefix': {
      parsed.apiPathPrefix = value;
      return true;
    }
    case '--benchmark-report': {
      parsed.benchmarkReport = resolveAppPath(value);
      return true;
    }
    case '--corpus': {
      parsed.corpus = resolveAppPath(value);
      return true;
    }
    case '--fixture': {
      parsed.fixture = resolveAppPath(value);
      return true;
    }
    case '--format': {
      parsed.format = value;
      return true;
    }
    case '--out': {
      parsed.out = resolveAppPath(value);
      return true;
    }
    case '--paths': {
      parsed.paths = value;
      return true;
    }
    case '--target': {
      parsed.target = value;
      return true;
    }
    case '--timeout-ms': {
      parsed.timeoutMs = parsePositiveInteger(value, arg);
      return true;
    }
    case '--warmup': {
      parsed.warmup = parseNonNegativeInteger(value, arg);
      return true;
    }
    default: {
      return false;
    }
  }
};

const parseArgs = (argv) => {
  const parsed = defaultArgs();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--require-seeded-production-data') {
      parsed.requireSeededProductionData = true;
      continue;
    }
    if (arg === '--require-provider-events') {
      parsed.requireProviderEvents = true;
      continue;
    }

    if (!parseOptionArgument(arg, readRequiredOption(argv, index, arg), parsed)) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    index += 1;
  }

  if (!targetModes.has(parsed.target)) {
    throw new Error('--target must be fixture, local, http, or both.');
  }
  if (!['json', 'summary'].includes(parsed.format)) {
    throw new Error('--format must be json or summary.');
  }
  if ((parsed.target === 'http' || parsed.target === 'both') && parsed.apiBase === undefined) {
    throw new Error('--api-base or SMART_SUGGEST_BASE_URL is required for HTTP target.');
  }

  return parsed;
};

const readJson = (filePath, label) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(
      `Failed to read ${label} at ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    );
  }
};

const assertion = (status, id, message, details = {}) => ({ details, id, message, status });

const pass = (id, message, details) => assertion('pass', id, message, details);

const fail = (id, message, details) => assertion('fail', id, message, details);

const skip = (id, message, details) => assertion('skip', id, message, details);

const unique = (values) => [...new Set(values)];

const duplicateRate = (ids) =>
  ids.length === 0 ? 0 : (ids.length - new Set(ids).size) / ids.length;

const canonicalSourceMap = (corpus) =>
  new Map((corpus.canonicalResults ?? []).map((result) => [result.id, result.sourceId]));

const sourceIdsForResultIds = (resultIds, sourceByResultId) =>
  unique(
    resultIds
      .map((resultId) => sourceByResultId.get(resultId) ?? postalSourceId(resultId))
      .filter((sourceId) => sourceId !== undefined),
  );

const postalSourceId = (resultId) =>
  resultId.startsWith('ruian-cz:postal:') ? 'ruian-cz' : undefined;

const fixtureCoverageAssertions = (fixture) => {
  const labels = new Set(fixture.scenarios.flatMap((scenario) => scenario.labels ?? []));
  const endpoints = new Set(fixture.scenarios.map((scenario) => scenario.endpoint));
  const assertions = [
    fixture.schemaVersion === 'smart-suggest-correctness-scenarios/v1'
      ? pass('fixture:schema', 'Correctness fixture schema is current.')
      : fail('fixture:schema', 'Correctness fixture schema is not current.'),
  ];

  for (const label of requiredFixtureLabels) {
    assertions.push(
      labels.has(label)
        ? pass(`fixture:label:${label}`, `Fixture covers ${label}.`)
        : fail(`fixture:label:${label}`, `Fixture is missing ${label}.`),
    );
  }

  for (const endpoint of requiredFixtureEndpoints) {
    assertions.push(
      endpoints.has(endpoint)
        ? pass(`fixture:endpoint:${endpoint}`, `Fixture covers ${endpoint}.`)
        : fail(`fixture:endpoint:${endpoint}`, `Fixture is missing ${endpoint}.`),
    );
  }

  return assertions;
};

const benchmarkScenarios = (fixture) =>
  fixture.scenarios.filter(
    (scenario) =>
      scenario.endpoint === 'suggest' &&
      scenario.targetModes?.includes('local-benchmark') &&
      typeof scenario.benchmarkScenarioId === 'string',
  );

const runLocalBenchmarkReport = (args, fixture) => {
  if (args.benchmarkReport !== undefined) {
    return {
      report: readJson(args.benchmarkReport, 'local benchmark report'),
      reportPath: appRelative(args.benchmarkReport),
    };
  }

  const tempPath = path.join(
    os.tmpdir(),
    `smart-suggest-correctness-${process.pid}-${Date.now()}.json`,
  );
  const scenarioIds = unique(
    benchmarkScenarios(fixture).map((scenario) => scenario.benchmarkScenarioId),
  );
  const command = [
    localBenchmarkScript,
    '--paths',
    args.paths,
    '--iterations',
    '1',
    '--warmup',
    String(args.warmup),
    '--timeout-ms',
    String(args.timeoutMs),
    '--json-out',
    tempPath,
    '--format',
    'json',
    '--environment-label',
    'production-correctness-local',
    '--operator',
    'smart-suggest-correctness-benchmark',
  ];

  for (const scenarioId of scenarioIds) {
    command.push('--scenario', scenarioId);
  }

  const result = spawnSync(process.execPath, command, {
    cwd: appRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout]
      .filter((value) => typeof value === 'string' && value.trim() !== '')
      .join('\n')
      .slice(0, 4000);
    throw new Error(`Local correctness benchmark failed.${detail === '' ? '' : `\n${detail}`}`);
  }

  const report = readJson(tempPath, 'generated local benchmark report');
  fs.rmSync(tempPath, { force: true });

  return { report, reportPath: 'generated-temp-local-benchmark-report' };
};

const appRelative = (filePath) => {
  const relative = path.relative(appRoot, filePath);

  return relative.startsWith('..') || path.isAbsolute(relative)
    ? path.basename(filePath)
    : relative.split(path.sep).join('/');
};

const localAssertionsForResult = ({ result, scenario, sourceByResultId }) => {
  const expected = scenario.expected ?? {};
  const topResultIds = result.topResultIds ?? [];
  const actualSourceIds = sourceIdsForResultIds(topResultIds, sourceByResultId);
  const providerEvents = result.providerEvents ?? [];
  const cacheStatus = result.cache?.status;
  const rate = duplicateRate(topResultIds);
  const details = {
    cacheStatus,
    duplicateRate: rate,
    pathId: result.pathId,
    providerEventCount: providerEvents.length,
    resultCount: result.resultCount,
    scenarioId: scenario.id,
    sourceIds: actualSourceIds,
    topResultIds,
  };
  const assertions = [
    result.status === 'success'
      ? pass(`${scenario.id}:${result.pathId}:status`, 'Scenario returned success.', details)
      : fail(`${scenario.id}:${result.pathId}:status`, 'Scenario did not return success.', details),
    resultCountMatches(result.resultCount, expected.resultCount, true)
      ? pass(
          `${scenario.id}:${result.pathId}:result-count`,
          'Result count matched min/max/full fixture assertion.',
          details,
        )
      : fail(
          `${scenario.id}:${result.pathId}:result-count`,
          'Result count missed min/max/full fixture assertion.',
          details,
        ),
    topResultMatches(topResultIds, expected)
      ? pass(`${scenario.id}:${result.pathId}:top-result`, 'Top result matched fixture.', details)
      : fail(
          `${scenario.id}:${result.pathId}:top-result`,
          'Top result did not match fixture.',
          details,
        ),
    requiredResultsMatch(topResultIds, expected)
      ? pass(
          `${scenario.id}:${result.pathId}:required-results`,
          'Required results were present.',
          details,
        )
      : fail(
          `${scenario.id}:${result.pathId}:required-results`,
          'Required results were missing.',
          details,
        ),
    sourceAttributionMatches(actualSourceIds, expected.sourceIds ?? [])
      ? pass(
          `${scenario.id}:${result.pathId}:source-attribution`,
          'Source attribution matched fixture.',
          details,
        )
      : fail(
          `${scenario.id}:${result.pathId}:source-attribution`,
          'Source attribution did not match fixture.',
          details,
        ),
    rate <= (expected.duplicateRate?.max ?? 0)
      ? pass(
          `${scenario.id}:${result.pathId}:duplicate-rate`,
          'Duplicate rate stayed within fixture limit.',
          details,
        )
      : fail(
          `${scenario.id}:${result.pathId}:duplicate-rate`,
          'Duplicate rate exceeded fixture limit.',
          details,
        ),
    providerEvents.length <= (expected.providerEvents?.maxTotal ?? 0)
      ? pass(
          `${scenario.id}:${result.pathId}:provider-events`,
          'Provider event count matched fixture.',
          details,
        )
      : fail(
          `${scenario.id}:${result.pathId}:provider-events`,
          'Provider event count exceeded fixture.',
          details,
        ),
    cacheStatusAllowed(cacheStatus, expected.cache?.allowedStatuses)
      ? pass(`${scenario.id}:${result.pathId}:cache-status`, 'Cache status was allowed.', details)
      : fail(
          `${scenario.id}:${result.pathId}:cache-status`,
          'Cache status was not allowed.',
          details,
        ),
  ];

  return assertions;
};

const runLocalProof = (args, fixture, corpus) => {
  const { report, reportPath } = runLocalBenchmarkReport(args, fixture);
  const sourceByResultId = canonicalSourceMap(corpus);
  const assertions = [];

  for (const scenario of benchmarkScenarios(fixture)) {
    const results = report.scenarioResults.filter(
      (result) => result.scenarioId === scenario.benchmarkScenarioId,
    );

    if (results.length === 0) {
      assertions.push(
        fail(`${scenario.id}:local:present`, 'Local benchmark report did not include scenario.', {
          benchmarkScenarioId: scenario.benchmarkScenarioId,
          scenarioId: scenario.id,
        }),
      );
      continue;
    }

    for (const result of results) {
      assertions.push(...localAssertionsForResult({ result, scenario, sourceByResultId }));
    }
  }

  for (const scenario of fixture.scenarios.filter((entry) =>
    entry.labels?.includes('zip-locality-coverage'),
  )) {
    assertions.push(
      skip(
        `${scenario.id}:local:zip-locality-coverage`,
        'Full ZIP locality coverage requires HTTP against seeded production data.',
        { scenarioId: scenario.id },
      ),
    );
  }

  return {
    assertions,
    benchmarkReport: reportPath,
    pathCount: report.aggregateMetrics?.paths?.length ?? 0,
    scenarioCount: benchmarkScenarios(fixture).length,
    target: 'local',
  };
};

const resultCountMatches = (actual, expected, enforceFull) => {
  if (expected === undefined) {
    return true;
  }
  if (actual < expected.min || actual > expected.max) {
    return false;
  }
  if (enforceFull && expected.full !== undefined && !expected.requiresSeededProductionData) {
    return actual === expected.full;
  }

  return true;
};

const topResultMatches = (resultIds, expected) => {
  const expectedTop = expected.topResultIds ?? [];

  return expectedTop.length === 0 ? resultIds.length === 0 : expectedTop.includes(resultIds[0]);
};

const requiredResultsMatch = (resultIds, expected) =>
  (expected.requiredResultIds ?? []).every((resultId) => resultIds.includes(resultId));

const sourceAttributionMatches = (actualSourceIds, expectedSourceIds) => {
  if (expectedSourceIds.length === 0) {
    return actualSourceIds.length === 0;
  }

  return (
    actualSourceIds.length > 0 && actualSourceIds.every((id) => expectedSourceIds.includes(id))
  );
};

const cacheStatusAllowed = (cacheStatus, allowedStatuses = []) =>
  allowedStatuses.length === 0 || allowedStatuses.includes(cacheStatus);

const fetchJsonWithTimeout = async (url, options, timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const text = await response.text();

    return {
      body: text.length === 0 ? undefined : JSON.parse(text),
      ok: response.ok,
      statusCode: response.status,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const normalizePrefix = (value) => {
  const prefixed = value.startsWith('/') ? value : `/${value}`;

  return prefixed.replace(/\/+$/u, '');
};

const joinApiRoute = (apiBase, pathPrefix, routePath) => {
  const normalizedBase = String(apiBase).endsWith('/') ? String(apiBase) : `${apiBase}/`;
  const route = `${pathPrefix}${routePath}`;
  const normalizedRoute = route.startsWith('/') ? route.slice(1) : route;

  return new URL(normalizedRoute, normalizedBase);
};

const appendSearchParams = (url, params) => {
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
};

const callSuggest = (args, fixture, scenario) => {
  const pathPrefix = normalizePrefix(
    args.apiPathPrefix ?? fixture.apiDefaults?.pathPrefix ?? '/api/v1',
  );
  const request = scenario.request ?? {};
  const url = appendSearchParams(joinApiRoute(args.apiBase, pathPrefix, '/suggest'), {
    countryCode: request.countryCode ?? fixture.apiDefaults?.countryCode ?? 'CZ',
    kind: scenario.kind,
    language: request.language ?? fixture.apiDefaults?.language ?? 'cs-CZ',
    limit: request.limit ?? fixture.apiDefaults?.limit ?? 5,
    q: scenario.query,
    tenantId: request.tenantId,
  });

  return fetchJsonWithTimeout(
    url,
    {
      headers: {
        accept: 'application/json',
        'x-smart-suggest-benchmark': 'correctness-proof',
      },
    },
    args.timeoutMs,
  );
};

const callPostalValidation = (args, fixture, scenario) => {
  const pathPrefix = normalizePrefix(
    args.apiPathPrefix ?? fixture.apiDefaults?.pathPrefix ?? '/api/v1',
  );

  return fetchJsonWithTimeout(
    joinApiRoute(args.apiBase, pathPrefix, '/validate/postal'),
    {
      body: JSON.stringify(scenario.payload),
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-smart-suggest-benchmark': 'correctness-proof',
      },
      method: 'POST',
    },
    args.timeoutMs,
  );
};

const callStatus = (args, fixture) => {
  const pathPrefix = normalizePrefix(
    args.apiPathPrefix ?? fixture.apiDefaults?.pathPrefix ?? '/api/v1',
  );

  return fetchJsonWithTimeout(
    joinApiRoute(args.apiBase, pathPrefix, '/status'),
    {
      headers: {
        accept: 'application/json',
        'x-smart-suggest-benchmark': 'correctness-proof',
      },
    },
    args.timeoutMs,
  );
};

const httpSuggestDetails = ({
  body,
  providerEvents,
  rate,
  scenario,
  suggestions,
  topResultIds,
}) => {
  const actualSourceIds = unique(
    suggestions.map((suggestion) => suggestion.source?.id).filter(Boolean),
  );

  return {
    cacheStatus: body?.cacheStatus,
    duplicateRate: rate,
    providerEventCount: providerEvents.length,
    resultCount: suggestions.length,
    scenarioId: scenario.id,
    sourceIds: actualSourceIds,
    topResultIds,
  };
};

const httpSuggestStatusAssertion = ({ details, response, scenario }) =>
  response.ok
    ? pass(`${scenario.id}:http:status`, 'HTTP suggest returned a success status.', details)
    : fail(`${scenario.id}:http:status`, 'HTTP suggest did not return a success status.', {
        ...details,
        statusCode: response.statusCode,
      });

const httpSuggestResultAssertions = ({ args, details, expected, scenario, suggestions }) => {
  const seededOnly = expected.resultCount?.requiresSeededProductionData === true;
  const { topResultIds } = details;

  if (seededOnly && !args.requireSeededProductionData) {
    return [
      skip(
        `${scenario.id}:http:seeded-result-count`,
        'Full result count requires seeded production data.',
        {
          scenarioId: scenario.id,
        },
      ),
    ];
  }

  return [
    resultCountMatches(suggestions.length, expected.resultCount, true)
      ? pass(`${scenario.id}:http:result-count`, 'Result count matched fixture.', details)
      : fail(`${scenario.id}:http:result-count`, 'Result count did not match fixture.', details),
    topResultMatches(topResultIds, expected)
      ? pass(`${scenario.id}:http:top-result`, 'Top result matched fixture.', details)
      : fail(`${scenario.id}:http:top-result`, 'Top result did not match fixture.', details),
    requiredResultsMatch(topResultIds, expected)
      ? pass(`${scenario.id}:http:required-results`, 'Required results were present.', details)
      : fail(`${scenario.id}:http:required-results`, 'Required results were missing.', details),
  ];
};

const httpSuggestQualityAssertions = ({ details, expected, scenario }) => [
  sourceAttributionMatches(details.sourceIds, expected.sourceIds ?? [])
    ? pass(`${scenario.id}:http:source-attribution`, 'Source attribution matched fixture.', details)
    : fail(
        `${scenario.id}:http:source-attribution`,
        'Source attribution did not match fixture.',
        details,
      ),
  details.duplicateRate <= (expected.duplicateRate?.max ?? 0)
    ? pass(
        `${scenario.id}:http:duplicate-rate`,
        'Duplicate rate stayed within fixture limit.',
        details,
      )
    : fail(`${scenario.id}:http:duplicate-rate`, 'Duplicate rate exceeded fixture limit.', details),
  cacheStatusAllowed(details.cacheStatus, expected.cache?.allowedStatuses)
    ? pass(`${scenario.id}:http:cache-status`, 'Cache status was allowed.', details)
    : fail(`${scenario.id}:http:cache-status`, 'Cache status was not allowed.', details),
];

const providerEventsMatch = (providerEvents, expected) => {
  const maxTotal = expected.providerEvents?.maxTotal;
  const allowedStatuses = expected.providerEvents?.allowedStatuses;
  const requiredStatus = expected.providerEvents?.requiredStatusWhenFixtureEnabled;
  const countMatches = maxTotal === undefined || providerEvents.length <= maxTotal;
  const statusesMatch =
    !Array.isArray(allowedStatuses) ||
    providerEvents.every((event) => allowedStatuses.includes(event.status));
  const requiredStatusMatches =
    requiredStatus === undefined || providerEvents.some((event) => event.status === requiredStatus);

  return countMatches && statusesMatch && requiredStatusMatches;
};

const httpSuggestProviderAssertion = ({ args, details, expected, providerEvents, scenario }) => {
  if (expected.providerEvents?.requiresProviderFixture && !args.requireProviderEvents) {
    return skip(
      `${scenario.id}:http:provider-events`,
      'Provider timeout assertion requires provider fixture opt-in.',
      { scenarioId: scenario.id },
    );
  }

  return providerEventsMatch(providerEvents, expected)
    ? pass(`${scenario.id}:http:provider-events`, 'Provider events matched fixture.', details)
    : fail(`${scenario.id}:http:provider-events`, 'Provider events did not match fixture.', {
        ...details,
        providerStatuses: providerEvents.map((event) => event.status),
      });
};

const httpSuggestZipAssertions = ({ args, details, expected, scenario, suggestions }) => {
  if (!expected.zipLocalityCoverage?.requiresSeededProductionData) {
    return [];
  }

  return [
    args.requireSeededProductionData &&
    suggestions.length === expected.zipLocalityCoverage.fullResultCount
      ? pass(
          `${scenario.id}:http:zip-locality-coverage`,
          'Full ZIP locality coverage matched seeded production assertion.',
          details,
        )
      : skip(
          `${scenario.id}:http:zip-locality-coverage`,
          'Full ZIP locality coverage requires seeded production data opt-in.',
          {
            expectedFullResultCount: expected.zipLocalityCoverage.fullResultCount,
            scenarioId: scenario.id,
          },
        ),
  ];
};

const httpSuggestAssertions = ({ args, response, scenario }) => {
  const { body } = response;
  const suggestions = Array.isArray(body?.suggestions) ? body.suggestions : [];
  const topResultIds = suggestions.map((suggestion) => suggestion.id);
  const providerEvents = Array.isArray(body?.providerEvents) ? body.providerEvents : [];
  const expected = scenario.expected ?? {};
  const rate = duplicateRate(topResultIds);
  const details = httpSuggestDetails({
    body,
    providerEvents,
    rate,
    scenario,
    suggestions,
    topResultIds,
  });
  const assertions = [
    httpSuggestStatusAssertion({ details, response, scenario }),
    ...httpSuggestResultAssertions({ args, details, expected, scenario, suggestions }),
    ...httpSuggestQualityAssertions({ details, expected, scenario }),
    httpSuggestProviderAssertion({ args, details, expected, providerEvents, scenario }),
    ...httpSuggestZipAssertions({ args, details, expected, scenario, suggestions }),
  ];

  return assertions;
};

const httpPostalAssertions = ({ response, scenario }) => {
  const { body } = response;
  const expected = scenario.expected?.postalValidation ?? {};
  const details = {
    countryCode: body?.countryCode,
    displayValue: body?.displayValue,
    isValid: body?.isValid,
    normalizedValue: body?.normalizedValue,
    scenarioId: scenario.id,
  };

  return [
    response.ok
      ? pass(`${scenario.id}:http:status`, 'HTTP postal validation returned success.', details)
      : fail(`${scenario.id}:http:status`, 'HTTP postal validation failed.', {
          ...details,
          statusCode: response.statusCode,
        }),
    body?.countryCode === expected.countryCode &&
    body?.displayValue === expected.displayValue &&
    body?.isValid === expected.isValid &&
    body?.normalizedValue === expected.normalizedValue
      ? pass(
          `${scenario.id}:http:postal-fields`,
          'Postal validation fields matched fixture.',
          details,
        )
      : fail(
          `${scenario.id}:http:postal-fields`,
          'Postal validation fields did not match fixture.',
          details,
        ),
  ];
};

const httpStatusAssertions = ({ response, scenario }) => {
  const { body } = response;
  const expected = scenario.expected?.status ?? {};
  const details = {
    rawQueryStorage: body?.sourcePolicy?.rawQueryStorage,
    scenarioId: scenario.id,
    service: body?.service,
  };

  return [
    response.ok
      ? pass(`${scenario.id}:http:status`, 'HTTP status endpoint returned success.', details)
      : fail(`${scenario.id}:http:status`, 'HTTP status endpoint failed.', {
          ...details,
          statusCode: response.statusCode,
        }),
    body?.service === expected.service
      ? pass(`${scenario.id}:http:service`, 'Status service matched fixture.', details)
      : fail(`${scenario.id}:http:service`, 'Status service did not match fixture.', details),
    expected.rawQueryStorage === undefined ||
    body?.sourcePolicy?.rawQueryStorage === expected.rawQueryStorage
      ? pass(
          `${scenario.id}:http:raw-query-storage`,
          'Status raw-query storage policy matched fixture.',
          details,
        )
      : fail(
          `${scenario.id}:http:raw-query-storage`,
          'Status raw-query storage policy did not match fixture.',
          details,
        ),
  ];
};

const skippedHttpScenarioAssertions = (args, scenario) => {
  if (
    scenario.expected?.resultCount?.requiresSeededProductionData &&
    !args.requireSeededProductionData
  ) {
    return [
      skip(`${scenario.id}:http:seeded-data`, 'Scenario requires seeded production data opt-in.', {
        scenarioId: scenario.id,
      }),
    ];
  }

  if (scenario.expected?.providerEvents?.requiresProviderFixture && !args.requireProviderEvents) {
    return [
      skip(`${scenario.id}:http:provider-fixture`, 'Scenario requires provider fixture opt-in.', {
        scenarioId: scenario.id,
      }),
    ];
  }

  return null;
};

const httpScenarioAssertions = async (args, fixture, scenario) => {
  const skippedAssertions = skippedHttpScenarioAssertions(args, scenario);

  if (skippedAssertions !== null) {
    return skippedAssertions;
  }

  try {
    if (scenario.endpoint === 'suggest') {
      return httpSuggestAssertions({
        args,
        response: await callSuggest(args, fixture, scenario),
        scenario,
      });
    }
    if (scenario.endpoint === 'validate-postal') {
      return httpPostalAssertions({
        response: await callPostalValidation(args, fixture, scenario),
        scenario,
      });
    }
    if (scenario.endpoint === 'status') {
      return httpStatusAssertions({
        response: await callStatus(args, fixture),
        scenario,
      });
    }
  } catch (error) {
    return [
      fail(`${scenario.id}:http:request`, 'HTTP scenario request failed.', {
        errorCode: error instanceof Error ? error.name : 'unknown-error',
        scenarioId: scenario.id,
      }),
    ];
  }

  return [];
};

const runHttpProof = async (args, fixture) => {
  const selectedScenarios = fixture.scenarios.filter((scenario) =>
    scenario.targetModes?.includes('http'),
  );
  const assertionGroups = await Promise.all(
    selectedScenarios.map((scenario) => httpScenarioAssertions(args, fixture, scenario)),
  );

  return {
    apiBaseSha256: sha256(normalizeApiBase(args.apiBase)),
    assertions: assertionGroups.flat(),
    scenarioCount: selectedScenarios.length,
    target: 'http',
  };
};

const normalizeApiBase = (value) => String(value).trim().replace(/\/+$/u, '');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const assertNoReportLeaks = (proof, fixture) => {
  const serialized = JSON.stringify(proof);

  for (const scenario of fixture.scenarios) {
    if (
      typeof scenario.query === 'string' &&
      scenario.query.length > 6 &&
      serialized.includes(scenario.query)
    ) {
      throw new Error(`Correctness proof leaked raw query for ${scenario.id}.`);
    }
  }

  for (const pattern of secretLikePatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(serialized)) {
      throw new Error('Correctness proof appears to contain a secret-like value.');
    }
  }
};

const targetList = (target) => {
  if (target === 'both') {
    return ['local', 'http'];
  }
  if (target === 'fixture') {
    return [];
  }

  return [target];
};

const writeJson = (filePath, content) => {
  if (filePath === undefined) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`);
};

const printSummary = (proof) => {
  const statusCounts = {};

  for (const entry of proof.assertions) {
    statusCounts[entry.status] = (statusCounts[entry.status] ?? 0) + 1;
  }

  const lines = [
    `Smart Suggest correctness benchmark ${proof.status}: pass=${statusCounts.pass ?? 0} fail=${
      statusCounts.fail ?? 0
    } skip=${statusCounts.skip ?? 0}`,
  ];

  for (const run of proof.runs) {
    lines.push(`- ${run.target}: scenarios=${run.scenarioCount}`);
  }

  process.stdout.write(`${lines.join('\n')}\n`);
};

const runTargetProof = async ({ args, corpus, fixture, target }) => {
  if (target === 'local') {
    return runLocalProof(args, fixture, corpus);
  }
  if (target === 'http') {
    return await runHttpProof(args, fixture);
  }

  throw new Error(`Unsupported target: ${target}`);
};

const collectProofAssertions = (fixture, runs) => {
  const assertions = [...fixtureCoverageAssertions(fixture)];

  for (const run of runs) {
    assertions.push(...run.assertions);
  }

  return assertions;
};

const main = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return;
  }

  const fixture = readJson(args.fixture, 'correctness fixture');
  const corpus = readJson(args.corpus, 'benchmark corpus');
  const targets = targetList(args.target);
  const runs = await Promise.all(
    targets.map((target) => runTargetProof({ args, corpus, fixture, target })),
  );
  const assertions = collectProofAssertions(fixture, runs);

  const proof = {
    assertions,
    fixture: {
      id: fixture.id,
      scenarioCount: fixture.scenarios.length,
      schemaVersion: fixture.schemaVersion,
    },
    generatedAt: new Date().toISOString(),
    runs,
    schemaVersion: 'smart-suggest-correctness-benchmark/v1',
    status: assertions.some((entry) => entry.status === 'fail') ? 'fail' : 'pass',
    targets,
  };

  assertNoReportLeaks(proof, fixture);
  writeJson(args.out, proof);

  if (args.format === 'json') {
    process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  } else {
    printSummary(proof);
  }

  if (proof.status !== 'pass') {
    process.exitCode = 1;
  }
};

try {
  await main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
