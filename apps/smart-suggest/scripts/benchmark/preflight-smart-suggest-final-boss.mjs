#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  finalBossApiBaseConfigCheckId,
  finalBossProviderConfigCheckId,
} from './final-boss-preflight-contract.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, '..', '..');
const defaultReportPath = path.resolve(
  appRoot,
  '.codex/reports/smart-suggest-benchmark/final-boss-preflight.json',
);
const defaultCorpusPath = path.resolve(
  appRoot,
  'scripts/fixtures/smart-suggest-benchmark-corpus-v1.json',
);
const defaultOwnedProofScenarioId = 'addr-k-louzi-slash-diacritic-exact';
const defaultRequiredBaselines = [
  'ruian-geocode',
  'mapy-cz',
  'here-discover',
  'managed-nominatim',
  'radar-autocomplete',
];
const providerRequirements = new Map([
  ['ruian-geocode', { required: [] }],
  ['mapy-cz', { required: ['MAPY_CZ_API_KEY'] }],
  ['here-discover', { required: ['HERE_API_KEY'] }],
  ['managed-nominatim', { required: ['NOMINATIM_BASE_URL', 'NOMINATIM_USER_AGENT'] }],
  ['radar-autocomplete', { required: ['RADAR_API_KEY'] }],
]);
const expectedCzVuscCodes = [
  '19',
  '27',
  '35',
  '43',
  '51',
  '60',
  '78',
  '86',
  '94',
  '108',
  '116',
  '124',
  '132',
  '141',
];
const expectedCzVuscShardCount = expectedCzVuscCodes.length;
const defaultMaxFreshnessAgeHours = 48;
const defaultMinOwnedRows = 1;
const defaultMaxOwnedSuggestProviderEvents = 0;
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
  node scripts/benchmark/preflight-smart-suggest-final-boss.mjs [options]

Checks operator prerequisites before the live final-boss benchmark spends any
external provider calls. It verifies the deployed Smart Suggest status endpoint,
owned dataset freshness/shard health, and required provider configuration names
without writing secrets or raw queries into reports.

Options:
  --help, -h                           Show this help.
  --api-base https://...                Smart Suggest API base URL.
  --provider id                         Required external provider baseline. Repeatable.
  --providers a,b                       Comma-separated required baselines.
  --require-live-providers              Require SMART_SUGGEST_BENCHMARK_LIVE_PROVIDERS=true.
  --allow-live-providers-env-missing    Deprecated; live-provider opt-in remains required.
  --max-freshness-age-hours 48          Maximum owned dataset freshness age.
  --min-owned-rows 1                    Minimum imported row count across completed runs.
  --owned-proof-corpus path             Public-safe corpus for owned suggest preflight.
  --owned-proof-scenario id             Public-safe scenario id used for owned suggest proof.
  --max-owned-suggest-provider-events 0 Maximum provider events allowed for owned proof.
  --skip-owned-suggest-proof            Record a blocked report instead of proving owned suggest.
  --require-14-cz-shards                Require exactly 14 active CZ VUSC shards.
  --allow-partial-shards                Deprecated; all 14 CZ VUSC shards remain required.
  --json-out path                       Write redacted JSON preflight report.
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

function readRequiredOption(argv, index, arg) {
  const value = argv[index + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${arg} requires a value.`);
  }

  return value;
}

function parseCommaSeparated(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseNumber(value, label) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  return parsed;
}

function resolveOutputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(appRoot, inputPath);
}

function resolveInputPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(appRoot, inputPath);
}

function parseArgs(argv) {
  const parsed = {
    apiBase: envValue('SMART_SUGGEST_BENCHMARK_API_BASE_URL'),
    help: false,
    jsonOut: defaultReportPath,
    maxFreshnessAgeHours: defaultMaxFreshnessAgeHours,
    maxOwnedSuggestProviderEvents: defaultMaxOwnedSuggestProviderEvents,
    minOwnedRows: defaultMinOwnedRows,
    ownedProofCorpus: defaultCorpusPath,
    ownedProofScenarioId: defaultOwnedProofScenarioId,
    providers: [],
    require14CzShards: true,
    requireLiveProviders: true,
    skipOwnedSuggestProof: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--api-base') {
      parsed.apiBase = readRequiredOption(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--provider') {
      parsed.providers.push(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }
    if (arg === '--providers') {
      parsed.providers.push(...parseCommaSeparated(readRequiredOption(argv, index, arg)));
      index += 1;
      continue;
    }
    if (arg === '--require-live-providers') {
      parsed.requireLiveProviders = true;
      continue;
    }
    if (arg === '--allow-live-providers-env-missing') {
      continue;
    }
    if (arg === '--max-freshness-age-hours') {
      parsed.maxFreshnessAgeHours = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg === '--min-owned-rows') {
      parsed.minOwnedRows = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg === '--owned-proof-corpus') {
      parsed.ownedProofCorpus = resolveInputPath(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }
    if (arg === '--owned-proof-scenario') {
      parsed.ownedProofScenarioId = readRequiredOption(argv, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--max-owned-suggest-provider-events') {
      parsed.maxOwnedSuggestProviderEvents = parseNumber(readRequiredOption(argv, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg === '--skip-owned-suggest-proof') {
      parsed.skipOwnedSuggestProof = true;
      continue;
    }
    if (arg === '--require-14-cz-shards') {
      parsed.require14CzShards = true;
      continue;
    }
    if (arg === '--allow-partial-shards') {
      continue;
    }
    if (arg === '--json-out') {
      parsed.jsonOut = resolveOutputPath(readRequiredOption(argv, index, arg));
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (parsed.providers.length === 0) {
    parsed.providers = [...defaultRequiredBaselines];
  }
  parsed.providers = [...new Set(parsed.providers)];

  for (const providerId of parsed.providers) {
    if (!providerRequirements.has(providerId)) {
      throw new Error(`Unsupported final-boss provider baseline: ${providerId}`);
    }
  }

  return parsed;
}

function normalizeApiBaseUrl(apiBase) {
  if (apiBase === undefined || apiBase.trim().length === 0) {
    throw new Error('--api-base or SMART_SUGGEST_BENCHMARK_API_BASE_URL is required.');
  }

  return apiBase.trim().replaceAll(/\/+$/gu, '');
}

function joinApiRoute(apiBase, route) {
  return `${normalizeApiBaseUrl(apiBase)}${route.startsWith('/') ? route : `/${route}`}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function apiBaseSha256(args) {
  return apiBaseConfigured(args) ? sha256(normalizeApiBaseUrl(args.apiBase)) : null;
}

async function fetchStatus(apiBase) {
  const response = await fetch(joinApiRoute(apiBase, '/v1/status'), {
    headers: { accept: 'application/json' },
    method: 'GET',
  });
  const text = await response.text();
  let json;

  try {
    json = text.length === 0 ? undefined : JSON.parse(text);
  } catch {
    json = undefined;
  }

  return {
    json,
    ok: response.ok,
    statusCode: response.status,
  };
}

async function fetchSuggest(apiBase, scenario) {
  const params = new URLSearchParams();

  params.set('countryCode', scenario.countryCode ?? 'CZ');
  params.set('kind', scenario.kind ?? 'address');
  params.set('language', scenario.language ?? 'cs-CZ');
  params.set('limit', String(scenario.limit ?? 5));
  params.set('q', scenario.query);

  const response = await fetch(joinApiRoute(apiBase, `/v1/suggest?${params.toString()}`), {
    headers: {
      accept: 'application/json',
      'x-smart-suggest-benchmark': 'final-boss-owned-preflight',
    },
    method: 'GET',
  });
  const text = await response.text();
  let json;

  try {
    json = text.length === 0 ? undefined : JSON.parse(text);
  } catch {
    json = undefined;
  }

  return {
    json,
    ok: response.ok,
    statusCode: response.status,
  };
}

function check(ok, id, message, details = {}) {
  return {
    ...details,
    id,
    message,
    ok,
    severity: ok ? 'info' : 'error',
  };
}

function sumFreshnessRows(freshness) {
  const rowCounts = freshness?.rowCounts;

  return Number(rowCounts?.upsertedRows ?? rowCounts?.totalRows ?? 0);
}

function latestRun(freshness) {
  return freshness?.latestDelta ?? freshness?.latestBaseline;
}

function normalizeStatusString(value) {
  return typeof value === 'string' ? value.trim() : undefined;
}

function sortRegionCodes(codes) {
  return [...new Set(codes)].toSorted(
    (left, right) => Number(left) - Number(right) || left.localeCompare(right),
  );
}

function arrayEquals(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function codeSetDifference(left, right) {
  const rightCodes = new Set(right);

  return left.filter((code) => !rightCodes.has(code));
}

function activeCzVuscRegionCodes(statusBody) {
  const shardRows = Array.isArray(statusBody?.shards?.shards) ? statusBody.shards.shards : [];

  return sortRegionCodes(
    shardRows
      .filter((shard) => normalizeStatusString(shard?.state) === 'active')
      .filter((shard) => normalizeStatusString(shard?.countryCode ?? shard?.country_code) === 'CZ')
      .filter((shard) => normalizeStatusString(shard?.regionKind ?? shard?.region_kind) === 'vusc')
      .map((shard) => normalizeStatusString(shard?.regionCode ?? shard?.region_code))
      .filter((code) => code !== undefined && code.length > 0),
  );
}

function isCompletedImportRun(run) {
  if (run === undefined) {
    return false;
  }

  return run.status === 'completed' && typeof run.completedAt === 'string';
}

function statusChecks(statusBody, args) {
  const checks = [];
  const freshness = statusBody?.imports?.freshness;
  const latest = latestRun(freshness);
  const ageHours = freshness?.sla?.ageHours;
  const activeShardCount = Number(statusBody?.shards?.activeCount ?? 0);
  const totalShardCount = Number(statusBody?.shards?.totalCount ?? 0);
  const activeCzVuscCodes = activeCzVuscRegionCodes(statusBody);
  const missingCzVuscCodes = codeSetDifference(expectedCzVuscCodes, activeCzVuscCodes);
  const extraCzVuscCodes = codeSetDifference(activeCzVuscCodes, expectedCzVuscCodes);
  const sizeGuardStatus = statusBody?.shards?.sizeGuard?.status;
  const ownedRows = sumFreshnessRows(freshness);
  const failedRows = Number(freshness?.rowCounts?.failedRows ?? 0);
  const sourceProvenance = Array.isArray(statusBody?.sourceProvenance?.authoritativeSources)
    ? statusBody.sourceProvenance.authoritativeSources
    : [];
  const ruianSource = sourceProvenance.find((source) => source?.sourceId === 'ruian-cz');

  checks.push(
    check(
      statusBody?.service === 'smart-suggest',
      'status-service',
      'Status service is smart-suggest.',
    ),
  );
  checks.push(
    check(
      isCompletedImportRun(latest),
      'owned-latest-import-run',
      'Status exposes a completed owned baseline or delta import run.',
      {
        completedAt: latest?.completedAt ?? null,
        runId: latest?.runId ?? null,
        sourceVersion: latest?.sourceVersion ?? null,
        status: latest?.status ?? null,
      },
    ),
  );
  checks.push(
    check(
      Number.isFinite(ageHours) && Number(ageHours) <= args.maxFreshnessAgeHours,
      'owned-freshness-age',
      `Owned dataset freshness is within ${args.maxFreshnessAgeHours} hour(s).`,
      { ageHours: Number.isFinite(ageHours) ? ageHours : null },
    ),
  );
  checks.push(
    check(ownedRows >= args.minOwnedRows, 'owned-row-count', 'Owned import row count is present.', {
      minimumRows: args.minOwnedRows,
      ownedRows,
    }),
  );
  checks.push(
    check(failedRows === 0, 'owned-failed-rows', 'Owned import rows have no unreviewed failures.', {
      failedRows,
    }),
  );
  checks.push(
    check(
      !args.require14CzShards ||
        (activeShardCount === expectedCzVuscShardCount &&
          arrayEquals(activeCzVuscCodes, expectedCzVuscCodes)),
      'owned-active-cz-shards',
      'The exact expected CZ VUSC shard set is active.',
      {
        activeCzVuscCodes,
        activeShardCount,
        expectedCzVuscCodes,
        expectedShardCount: expectedCzVuscShardCount,
        extraCzVuscCodes,
        missingCzVuscCodes,
        totalShardCount,
      },
    ),
  );
  checks.push(
    check(sizeGuardStatus === 'ok', 'owned-shard-size-guard', 'D1 shard size guard is ok.', {
      sizeGuardStatus: sizeGuardStatus ?? null,
    }),
  );
  checks.push(
    check(
      ruianSource?.present === true && ruianSource?.sourceKind === 'owned-dataset',
      'owned-source-provenance-present',
      'Status exposes RUIAN owned source provenance.',
      {
        present: ruianSource?.present ?? false,
        sourceKind: ruianSource?.sourceKind ?? null,
      },
    ),
  );
  checks.push(
    check(
      ruianSource?.attribution?.label === 'CUZK RUIAN' &&
        ruianSource?.attribution?.license === 'CC BY 4.0' &&
        ruianSource?.attribution?.url === 'https://ruian.cuzk.cz/',
      'owned-source-attribution',
      'Status exposes the expected RUIAN public attribution catalog values.',
      {
        label: ruianSource?.attribution?.label ?? null,
        license: ruianSource?.attribution?.license ?? null,
        url: ruianSource?.attribution?.url ?? null,
      },
    ),
  );
  checks.push(
    check(
      ruianSource?.modificationNoteSha256Present === true,
      'owned-source-modification-note',
      'Status confirms the RUIAN Smart Suggest modification-note hash is present.',
      {
        modificationNoteSha256Present: ruianSource?.modificationNoteSha256Present ?? false,
      },
    ),
  );

  return checks;
}

function providerChecks(args) {
  const checks = [];
  const liveProvidersEnabled = envBoolean('SMART_SUGGEST_BENCHMARK_LIVE_PROVIDERS') === true;

  checks.push(
    check(
      !args.requireLiveProviders || liveProvidersEnabled,
      'live-provider-opt-in',
      'Live-provider benchmark opt-in is explicitly enabled.',
    ),
  );

  for (const providerId of args.providers) {
    const requirements = providerRequirements.get(providerId);
    const missing = requirements.required.filter((name) => envValue(name) === undefined);

    checks.push(
      check(
        missing.length === 0,
        finalBossProviderConfigCheckId(providerId),
        `${providerId} config exists.`,
        {
          missingEnv: missing,
          requiredEnv: requirements.required,
        },
      ),
    );
  }

  return checks;
}

function apiBaseConfigured(args) {
  return typeof args.apiBase === 'string' && args.apiBase.trim().length > 0;
}

function apiBaseCheck(args) {
  return check(
    apiBaseConfigured(args),
    finalBossApiBaseConfigCheckId,
    'Smart Suggest API base URL is configured.',
    {
      requiredEnv: 'SMART_SUGGEST_BENCHMARK_API_BASE_URL',
    },
  );
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('cs-CZ')
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replaceAll(/\s+/gu, ' ');
}

function digitsOnly(value) {
  return String(value ?? '').replaceAll(/\D/gu, '');
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 0);
}

function addressText(address = {}) {
  return [
    address.line1,
    address.street,
    address.houseNumber,
    address.orientationNumber,
    address.postalCode,
    address.city,
    address.district,
    address.region,
    address.countryCode,
  ]
    .filter((value) => value !== undefined && String(value).trim() !== '')
    .join(' ');
}

function canonicalCandidate(result) {
  const address = result.address ?? {};
  const streetTokens = tokenize(address.street ?? address.line1);
  const cityTokens = tokenize(address.city);
  const houseNumber = normalizeText(address.houseNumber);
  const orientationNumber = normalizeText(address.orientationNumber);
  const postalDigits = digitsOnly(address.postalCode);
  const requiredTokens = [
    ...streetTokens.filter((token) => token.length > 1),
    houseNumber,
    orientationNumber,
    ...cityTokens.filter((token) => token.length > 1),
  ].filter((token) => token.length > 0);

  return {
    addressKey: normalizeText(addressText(address)),
    id: result.id,
    labelKey: normalizeText(result.label),
    postalDigits,
    requiredTokens,
    sourceId: result.sourceId,
  };
}

function suggestionText(suggestion) {
  return normalizeText([suggestion.displayLabel, addressText(suggestion.address)].join(' '));
}

function matchesCandidate(candidate, suggestion) {
  const text = suggestionText(suggestion);
  const textTokens = new Set(text.split(' ').filter((token) => token.length > 0));
  const textDigits = digitsOnly(text);

  if (text === candidate.labelKey || text === candidate.addressKey) {
    return true;
  }

  if (candidate.postalDigits.length > 0 && !textDigits.includes(candidate.postalDigits)) {
    return false;
  }

  return candidate.requiredTokens.every((token) => textTokens.has(token));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ownedProofScenario(args) {
  const corpus = readJson(args.ownedProofCorpus);

  if (corpus.schemaVersion !== 'smart-suggest-benchmark-corpus/v1') {
    throw new Error('Owned proof corpus has an unexpected schemaVersion.');
  }
  if (corpus.publicSafety?.safeToCommit !== true) {
    throw new Error('Owned proof corpus must be public-safe.');
  }
  if (corpus.publicSafety?.containsRawCustomerQueries !== false) {
    throw new Error('Owned proof corpus must not contain raw customer queries.');
  }

  const scenario = corpus.scenarios?.find((entry) => entry.id === args.ownedProofScenarioId);

  if (scenario === undefined) {
    throw new Error(`Owned proof scenario was not found: ${args.ownedProofScenarioId}`);
  }

  const candidates = new Map(
    (corpus.canonicalResults ?? []).map((result) => [result.id, canonicalCandidate(result)]),
  );
  const expected = scenario.expected ?? {};
  const expectedTop1 = (expected.top1ResultIds ?? [])
    .map((resultId) => candidates.get(resultId))
    .filter((candidate) => candidate !== undefined);
  const required = (expected.requiredResultIds ?? [])
    .map((resultId) => candidates.get(resultId))
    .filter((candidate) => candidate !== undefined);

  if (expectedTop1.length === 0 && required.length === 0) {
    throw new Error(`Owned proof scenario has no canonical expected results: ${scenario.id}`);
  }

  return {
    expectedTop1,
    required,
    scenario,
  };
}

function ownedSuggestionSummary(suggestBody, proof) {
  const suggestions = Array.isArray(suggestBody?.suggestions) ? suggestBody.suggestions : [];
  const providerEvents = Array.isArray(suggestBody?.providerEvents)
    ? suggestBody.providerEvents
    : [];
  const matchedResultIds = suggestions
    .map((suggestion) => {
      const matched = [...new Set([...proof.expectedTop1, ...proof.required])].find((candidate) =>
        matchesCandidate(candidate, suggestion),
      );

      return matched?.id;
    })
    .filter((resultId) => resultId !== undefined);
  const topMatchedResultId = matchedResultIds[0] ?? null;
  const sourceKinds = [
    ...new Set(
      suggestions.map((suggestion) => String(suggestion.source?.kind ?? 'unknown-source-kind')),
    ),
  ].toSorted((left, right) => left.localeCompare(right));
  const ownedSuggestionCount = suggestions.filter(
    (suggestion) =>
      suggestion.source?.kind === 'owned-dataset' || suggestion.source?.id === 'ruian-cz',
  ).length;

  return {
    matchedResultIds,
    ownedSuggestionCount,
    providerEventCount: providerEvents.length,
    resultCount: suggestions.length,
    sourceKinds,
    topMatchedResultId,
  };
}

async function ownedSuggestChecks(args) {
  if (args.skipOwnedSuggestProof) {
    return [
      check(
        false,
        'owned-suggest-proof-skipped',
        'Owned suggest proof cannot be skipped for final-boss preflight.',
      ),
    ];
  }

  const proof = ownedProofScenario(args);
  const checks = [];
  let response = {
    json: undefined,
    ok: false,
    statusCode: undefined,
  };

  try {
    response = await fetchSuggest(args.apiBase, proof.scenario);
  } catch (error) {
    checks.push(
      check(false, 'owned-suggest-fetch', 'Owned suggest endpoint is reachable.', {
        error: error instanceof Error ? error.message : String(error),
        scenarioId: proof.scenario.id,
      }),
    );
    return checks;
  }

  if (!response.ok) {
    checks.push(
      check(false, 'owned-suggest-fetch', 'Owned suggest endpoint is reachable.', {
        scenarioId: proof.scenario.id,
        statusCode: response.statusCode ?? null,
      }),
    );
    return checks;
  }

  const summary = ownedSuggestionSummary(response.json, proof);
  const expectedTop1Ids = proof.expectedTop1.map((candidate) => candidate.id);
  const requiredIds = proof.required.map((candidate) => candidate.id);
  const requiredHitCount = requiredIds.filter((resultId) =>
    summary.matchedResultIds.includes(resultId),
  ).length;

  checks.push(
    check(true, 'owned-suggest-fetch', 'Owned suggest endpoint is reachable.', {
      scenarioId: proof.scenario.id,
      statusCode: response.statusCode ?? null,
    }),
  );
  checks.push(
    check(
      summary.ownedSuggestionCount > 0,
      'owned-suggest-owned-source',
      'Owned suggest proof returned at least one owned-dataset suggestion.',
      {
        ownedSuggestionCount: summary.ownedSuggestionCount,
        scenarioId: proof.scenario.id,
        sourceKinds: summary.sourceKinds,
      },
    ),
  );
  checks.push(
    check(
      expectedTop1Ids.length === 0 || expectedTop1Ids.includes(summary.topMatchedResultId),
      'owned-suggest-top1',
      'Owned suggest proof returned the expected top result.',
      {
        expectedTop1Ids,
        scenarioId: proof.scenario.id,
        topMatchedResultId: summary.topMatchedResultId,
      },
    ),
  );
  checks.push(
    check(
      requiredIds.length === 0 || requiredHitCount === requiredIds.length,
      'owned-suggest-required-results',
      'Owned suggest proof returned every required canonical result.',
      {
        matchedResultIds: summary.matchedResultIds,
        requiredHitCount,
        requiredIds,
        scenarioId: proof.scenario.id,
      },
    ),
  );
  checks.push(
    check(
      summary.providerEventCount <= args.maxOwnedSuggestProviderEvents,
      'owned-suggest-provider-events',
      'Owned suggest proof did not use provider fallback.',
      {
        maximumProviderEvents: args.maxOwnedSuggestProviderEvents,
        providerEventCount: summary.providerEventCount,
        scenarioId: proof.scenario.id,
      },
    ),
  );

  return checks;
}

function writeJson(filePath, value) {
  if (filePath === undefined) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function summarize(report) {
  const failed = report.checks.filter((entry) => entry.ok !== true);
  const apiStatus = report.apiStatus.configured
    ? `${report.apiStatus.ok ? 'ok' : 'failed'} (${report.apiStatus.statusCode ?? 'n/a'})`
    : 'not configured';
  const lines = [
    `Smart Suggest final-boss preflight: ${report.status}`,
    `API status: ${apiStatus}`,
    `Checks: ${report.checks.length - failed.length}/${report.checks.length} passing`,
  ];

  if (failed.length > 0) {
    lines.push('Failed checks:');
    for (const checkEntry of failed) {
      lines.push(`- ${checkEntry.id}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return;
  }

  const checks = [];
  checks.push(apiBaseCheck(args));
  let statusResponse = {
    json: undefined,
    ok: false,
    statusCode: undefined,
  };

  if (apiBaseConfigured(args)) {
    try {
      statusResponse = await fetchStatus(args.apiBase);
    } catch (error) {
      checks.push(
        check(false, 'status-fetch', 'Smart Suggest status endpoint is reachable.', {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    if (statusResponse.ok) {
      checks.push(check(true, 'status-fetch', 'Smart Suggest status endpoint is reachable.'));
      checks.push(...statusChecks(statusResponse.json, args));
    } else if (checks.every((entry) => entry.id !== 'status-fetch')) {
      checks.push(
        check(false, 'status-fetch', 'Smart Suggest status endpoint is reachable.', {
          statusCode: statusResponse.statusCode ?? null,
        }),
      );
    }

    checks.push(...(await ownedSuggestChecks(args)));
  }
  checks.push(...providerChecks(args));

  const report = {
    apiBaseSha256: apiBaseSha256(args),
    apiStatus: {
      configured: apiBaseConfigured(args),
      ok: statusResponse.ok,
      statusCode: statusResponse.statusCode ?? null,
    },
    checkedAt: new Date().toISOString(),
    checks,
    providers: args.providers,
    schemaVersion: 'smart-suggest-final-boss-preflight/v1',
    status: checks.some((entry) => entry.ok !== true) ? 'blocked' : 'ready',
  };

  writeJson(args.jsonOut, report);
  process.stdout.write(summarize(report));

  if (report.status !== 'ready') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
