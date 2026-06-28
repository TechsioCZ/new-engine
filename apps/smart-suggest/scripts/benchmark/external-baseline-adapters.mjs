import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

export const fakeExternalBaselineId = 'fake-noop';

export const supportedExternalBaselineIds = [
  fakeExternalBaselineId,
  'ruian-geocode',
  'mapy-cz',
  'here-discover',
  'managed-nominatim',
  'radar-autocomplete',
];

const providerLabels = new Map([
  [fakeExternalBaselineId, 'Deterministic fake no-op provider'],
  ['ruian-geocode', 'RUIAN online geocoder'],
  ['mapy-cz', 'Mapy.cz'],
  ['here-discover', 'HERE Discover'],
  ['managed-nominatim', 'Managed Nominatim'],
  ['radar-autocomplete', 'Radar Autocomplete'],
]);

const defaultProviderRateLimitMs = new Map([
  ['ruian-geocode', 250],
  ['mapy-cz', 200],
  ['here-discover', 200],
  ['managed-nominatim', 1100],
  ['radar-autocomplete', 200],
]);

const envProviderPrefixById = new Map([
  ['ruian-geocode', 'RUIAN_GEOCODE'],
  ['mapy-cz', 'MAPY_CZ'],
  ['here-discover', 'HERE_DISCOVER'],
  ['managed-nominatim', 'NOMINATIM'],
  ['radar-autocomplete', 'RADAR_AUTOCOMPLETE'],
]);

const providerRuntimeIdByBaselineId = new Map([
  [fakeExternalBaselineId, fakeExternalBaselineId],
  ['ruian-geocode', 'ruian-geocode'],
  ['mapy-cz', 'mapy-cz'],
  ['here-discover', 'here-discover'],
  ['managed-nominatim', 'nominatim'],
  ['radar-autocomplete', 'radar-autocomplete'],
]);

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function externalBaselinePathId(providerId) {
  return `external-live-baseline:${providerId}`;
}

export function externalBaselineLabel(providerId) {
  return providerLabels.get(providerId) ?? providerId;
}

export function externalBaselineRuntimeProviderId(providerId) {
  return providerRuntimeIdByBaselineId.get(providerId) ?? providerId;
}

function envValue(name) {
  const value = process.env[name]?.trim();

  return value === undefined || value.length === 0 ? undefined : value;
}

function envNumber(name) {
  const value = envValue(name);

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function envBoolean(name) {
  const value = envValue(name)?.toLowerCase();

  return value === undefined ? undefined : booleanEnvValues.get(value);
}

function optionalNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function providerEnvName(providerId, suffix) {
  const prefix = envProviderPrefixById.get(providerId) ?? providerId.toUpperCase();

  return `SMART_SUGGEST_BENCHMARK_${prefix}_${suffix}`;
}

function providerRateLimitMs(providerId, args) {
  return (
    optionalNumber(args.providerRateLimitMsById?.[providerId]) ??
    envNumber(providerEnvName(providerId, 'RATE_LIMIT_MS')) ??
    optionalNumber(args.providerRateLimitMs) ??
    envNumber('SMART_SUGGEST_BENCHMARK_PROVIDER_RATE_LIMIT_MS') ??
    defaultProviderRateLimitMs.get(providerId) ??
    250
  );
}

function providerCostEstimateUsd(providerId) {
  const per1k =
    envNumber(providerEnvName(providerId, 'COST_PER_1K_USD')) ??
    envNumber('SMART_SUGGEST_BENCHMARK_PROVIDER_COST_PER_1K_USD') ??
    0;

  return Math.max(0, per1k / 1000);
}

function createRateLimiter(minIntervalMs) {
  let nextStartAt = 0;
  let queue = Promise.resolve();

  return {
    wait: async () => {
      const current = queue.then(async () => {
        const now = performance.now();
        const waitMs = Math.max(0, nextStartAt - now);
        nextStartAt = Math.max(now, nextStartAt) + minIntervalMs;

        if (waitMs > 0) {
          await sleep(waitMs);
        }
      });

      queue = current.catch(() => {});
      await current;
    },
  };
}

function createMeteredFetch() {
  const stats = {
    bytesTransferred: 0,
    requestCount: 0,
  };

  return {
    fetch: async (input, init = {}) => {
      stats.requestCount += 1;

      const headers = new Headers(init.headers);
      headers.set('cache-control', 'no-cache');
      headers.set('pragma', 'no-cache');

      const response = await fetch(input, {
        ...init,
        cache: 'no-store',
        headers,
      });
      const body = await response.text();
      stats.bytesTransferred += Buffer.byteLength(body, 'utf8');

      return new Response(body, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      });
    },
    reset: () => {
      stats.bytesTransferred = 0;
      stats.requestCount = 0;
    },
    snapshot: () => ({ ...stats }),
  };
}

function createUnavailableContext(providerId, reason, rateLimitMs) {
  const runtimeProviderId = externalBaselineRuntimeProviderId(providerId);

  return {
    baselineProviderId: providerId,
    cacheMode: 'none',
    close: () => {},
    configured: false,
    indexStrategy: 'provider-only',
    kind: 'live-provider',
    label: `${externalBaselineLabel(providerId)} no-cache live baseline`,
    ownedDataMode: 'disabled',
    pathId: externalBaselinePathId(providerId),
    providerIds: [runtimeProviderId],
    rateLimitMs,
    requiresLiveProviderOptIn: providerId !== fakeExternalBaselineId,
    skipReason: reason,
    suggest: async () => ({
      errorCode: reason,
      network: {
        bytesTransferred: 0,
        requestCount: 0,
      },
      providerEvents: [
        {
          errorCode: reason,
          providerId: runtimeProviderId,
          status: 'skipped',
        },
      ],
      status: 'skipped',
      suggestions: [],
    }),
  };
}

function createFakeNoopContext(providerDelayMs) {
  return {
    baselineProviderId: fakeExternalBaselineId,
    cacheMode: 'none',
    close: () => {},
    configured: true,
    indexStrategy: 'provider-only',
    kind: 'live-provider',
    label: `${externalBaselineLabel(fakeExternalBaselineId)} no-cache baseline`,
    ownedDataMode: 'disabled',
    pathId: externalBaselinePathId(fakeExternalBaselineId),
    providerIds: [fakeExternalBaselineId],
    rateLimitMs: 0,
    requiresLiveProviderOptIn: false,
    skipReason: undefined,
    suggest: async () => {
      if (providerDelayMs > 0) {
        await sleep(providerDelayMs);
      }

      return {
        network: {
          bytesTransferred: 0,
          requestCount: 0,
        },
        providerEvents: [
          {
            errorCode: 'deterministic-noop',
            providerId: fakeExternalBaselineId,
            status: 'skipped',
          },
        ],
        status: 'success',
        suggestions: [],
      };
    },
  };
}

async function createAvailableContext(providerId, options, integrationsPath, rateLimitMs, delayMs) {
  const integrations = await import(pathToFileURL(integrationsPath).href);
  const runtimeProviderId = externalBaselineRuntimeProviderId(providerId);
  const meteredFetch = createMeteredFetch();
  const rateLimiter = createRateLimiter(rateLimitMs);
  const provider = createProvider(providerId, integrations, {
    ...options,
    fetch: meteredFetch.fetch,
  });
  const registry = integrations.createSmartSuggestProviderRegistry({
    circuitBreaker: {
      failureThreshold: Number.MAX_SAFE_INTEGER,
      openMs: 0,
    },
    priority: [runtimeProviderId],
    providers: [provider],
    timeoutMs: options.timeoutMs,
  });
  const costEstimateUsd = providerCostEstimateUsd(providerId);

  return {
    baselineProviderId: providerId,
    cacheMode: 'none',
    close: () => {},
    configured: true,
    indexStrategy: 'provider-only',
    kind: 'live-provider',
    label: `${externalBaselineLabel(providerId)} no-cache live baseline`,
    ownedDataMode: 'disabled',
    pathId: externalBaselinePathId(providerId),
    providerIds: [runtimeProviderId],
    rateLimitMs,
    requiresLiveProviderOptIn: true,
    suggest: async (request) => {
      await rateLimiter.wait();
      meteredFetch.reset();

      const result = await registry.suggest(request, {
        requestId: `benchmark-${runtimeProviderId}`,
      });
      const network = meteredFetch.snapshot();

      if (delayMs > 0) {
        await sleep(delayMs);
      }

      return {
        network,
        providerEvents: result.providerEvents.map((event, index) => ({
          ...event,
          bytesTransferred: index === 0 ? network.bytesTransferred : 0,
          costEstimateUsd,
        })),
        status: 'success',
        suggestions: result.response.suggestions,
      };
    },
  };
}

function createProvider(providerId, integrations, options) {
  if (providerId === 'ruian-geocode') {
    return integrations.createRuianGeocodeProvider(options);
  }

  if (providerId === 'mapy-cz') {
    return integrations.createMapyCzProvider(options);
  }

  if (providerId === 'here-discover') {
    return integrations.createHereDiscoverProvider(options);
  }

  if (providerId === 'managed-nominatim') {
    return integrations.createNominatimProvider(options);
  }

  if (providerId === 'radar-autocomplete') {
    return integrations.createRadarAutocompleteProvider(options);
  }

  throw new Error(`Unsupported external baseline provider: ${providerId}`);
}

function readRuianOptions(timeoutMs) {
  if (envBoolean('RUIAN_GEOCODE_DISABLED') === true) {
    return {
      reason: 'provider-disabled',
    };
  }

  return {
    options: {
      baseUrl: envValue('RUIAN_GEOCODE_BASE_URL'),
      limit: envNumber('RUIAN_GEOCODE_DEFAULT_LIMIT'),
      timeoutMs,
    },
  };
}

function readMapyOptions(timeoutMs) {
  const apiKey = envValue('MAPY_CZ_API_KEY');

  if (apiKey === undefined) {
    return {
      reason: 'missing-MAPY_CZ_API_KEY',
    };
  }

  return {
    options: {
      apiKey,
      endpointUrl: envValue('MAPY_CZ_ENDPOINT_URL'),
      language: envValue('MAPY_CZ_LANGUAGE'),
      limit: envNumber('MAPY_CZ_DEFAULT_LIMIT'),
      timeoutMs,
    },
  };
}

function readHereOptions(timeoutMs) {
  const apiKey = envValue('HERE_API_KEY');

  if (apiKey === undefined) {
    return {
      reason: 'missing-HERE_API_KEY',
    };
  }

  return {
    options: {
      apiKey,
      at: envValue('HERE_DISCOVER_AT'),
      baseUrl: envValue('HERE_DISCOVER_BASE_URL'),
      inArea: envValue('HERE_DISCOVER_IN_AREA'),
      language: envValue('HERE_DISCOVER_LANGUAGE'),
      limit: envNumber('HERE_DISCOVER_DEFAULT_LIMIT'),
      timeoutMs,
    },
  };
}

function readNominatimOptions(timeoutMs) {
  const baseUrl = envValue('NOMINATIM_BASE_URL');
  const userAgent = envValue('NOMINATIM_USER_AGENT');
  const missing = [];

  if (baseUrl === undefined) {
    missing.push('NOMINATIM_BASE_URL');
  }
  if (userAgent === undefined) {
    missing.push('NOMINATIM_USER_AGENT');
  }
  if (missing.length > 0) {
    return {
      reason: `missing-${missing.join('-and-')}`,
    };
  }

  return {
    options: {
      baseUrl,
      email: envValue('NOMINATIM_EMAIL'),
      limit: envNumber('NOMINATIM_DEFAULT_LIMIT'),
      referer: envValue('NOMINATIM_REFERER'),
      timeoutMs,
      userAgent,
    },
  };
}

function readRadarOptions(timeoutMs) {
  const apiKey = envValue('RADAR_API_KEY');

  if (apiKey === undefined) {
    return {
      reason: 'missing-RADAR_API_KEY',
    };
  }

  return {
    options: {
      apiKey,
      baseUrl: envValue('RADAR_AUTOCOMPLETE_BASE_URL'),
      countryCode: envValue('RADAR_AUTOCOMPLETE_COUNTRY_CODE'),
      layers: envValue('RADAR_AUTOCOMPLETE_LAYERS'),
      limit: envNumber('RADAR_AUTOCOMPLETE_DEFAULT_LIMIT'),
      near: envValue('RADAR_AUTOCOMPLETE_NEAR'),
      timeoutMs,
    },
  };
}

function readProviderOptions(providerId, timeoutMs) {
  if (providerId === 'ruian-geocode') {
    return readRuianOptions(timeoutMs);
  }

  if (providerId === 'mapy-cz') {
    return readMapyOptions(timeoutMs);
  }

  if (providerId === 'here-discover') {
    return readHereOptions(timeoutMs);
  }

  if (providerId === 'managed-nominatim') {
    return readNominatimOptions(timeoutMs);
  }

  if (providerId === 'radar-autocomplete') {
    return readRadarOptions(timeoutMs);
  }

  return {
    reason: 'unsupported-provider',
  };
}

export async function createExternalBaselineContexts(args, options) {
  const contexts = [];

  for (const providerId of args.externalBaselineIds) {
    const rateLimitMs = providerRateLimitMs(providerId, args);
    const delayMs = Math.max(0, optionalNumber(args.providerDelayMs) ?? 0);

    if (providerId === fakeExternalBaselineId) {
      contexts.push(createFakeNoopContext(delayMs));
      continue;
    }

    if (!args.liveProvidersEnabled) {
      contexts.push(createUnavailableContext(providerId, 'live-providers-disabled', rateLimitMs));
      continue;
    }

    const providerOptions = readProviderOptions(providerId, args.timeoutMs);

    if (providerOptions.options === undefined) {
      contexts.push(createUnavailableContext(providerId, providerOptions.reason, rateLimitMs));
      continue;
    }

    contexts.push(
      await createAvailableContext(
        providerId,
        providerOptions.options,
        options.integrationsPath,
        rateLimitMs,
        delayMs,
      ),
    );
  }

  return contexts;
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

function suggestionFingerprint(suggestion) {
  return normalizeText(
    [
      suggestion.source?.id,
      suggestion.displayLabel,
      addressText(suggestion.address),
      suggestion.kind,
    ].join(' '),
  );
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

function hashExternalResult(providerId, suggestion, index) {
  return createHash('sha256')
    .update(providerId)
    .update('\0')
    .update(suggestionFingerprint(suggestion))
    .update('\0')
    .update(String(index))
    .digest('hex')
    .slice(0, 16);
}

export function createExternalResultNormalizer(corpus) {
  const candidates = corpus.canonicalResults.map(canonicalCandidate);

  return {
    normalizeSuggestions: (providerId, suggestions) => {
      const normalized = [];
      const seen = new Set();
      const runtimeProviderId = externalBaselineRuntimeProviderId(providerId);

      for (const [index, suggestion] of suggestions.entries()) {
        const matched = candidates.find((candidate) => matchesCandidate(candidate, suggestion));
        const record =
          matched === undefined
            ? {
                id: `external:${runtimeProviderId}:${hashExternalResult(
                  runtimeProviderId,
                  suggestion,
                  index,
                )}`,
                sourceId: `live-provider:${runtimeProviderId}`,
              }
            : {
                id: matched.id,
                sourceId: matched.sourceId,
              };

        if (!seen.has(record.id)) {
          seen.add(record.id);
          normalized.push(record);
        }
      }

      return normalized;
    },
  };
}
