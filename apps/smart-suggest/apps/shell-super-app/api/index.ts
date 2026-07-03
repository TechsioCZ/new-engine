import { defineEffectBff, useEffectContext } from '@modern-js/plugin-bff/effect-edge';
import type {
  AddressParts,
  ProviderEventSummary,
  SmartSuggestAcceptEvent,
  SmartSuggestCacheLevels,
  SmartSuggestCacheStatus,
  SmartSuggestCountryCode,
  SmartSuggestError,
  SmartSuggestRequest,
  SmartSuggestResponse,
  SmartSuggestSuggestion,
  SuggestionSource,
  SuggestionSourceKind,
} from '@techsio/smart-suggest-core';
import {
  normalizeSmartSuggestCountryCode,
  normalizeSuggestLimit,
  parseSmartSuggestCountryCodeList,
  resolveSmartSuggestCountryScope,
} from '@techsio/smart-suggest-core';
import {
  getSmartSuggestSourcePolicy,
  SMART_SUGGEST_PROVIDER_SOURCE_ID_ALIASES,
  smartSuggestSourceAllowsTtlCache,
  smartSuggestSourceAllowsWrite,
  smartSuggestSourceMaxTtlDays,
} from '@techsio/smart-suggest-datasets/source-catalog';
import { rankAddressCandidates } from '@techsio/smart-suggest-indexing';
import type {
  SmartSuggestProviderRegistry,
  SmartSuggestProviderRuntimeConfig,
} from '@techsio/smart-suggest-integrations';
import { createSmartSuggestProviderRegistryFromConfig } from '@techsio/smart-suggest-integrations';
import type {
  AddressRecord,
  AddressSearchRecordInput,
  AddressTombstoneRecordInput,
  DataSourceRecord,
  SmartSuggestD1Binding,
  SmartSuggestRepositories,
  SmartSuggestStorageError,
  SuggestCacheRecord,
  TenantRecord,
} from '@techsio/smart-suggest-storage';
import {
  createAddressRecordFromSuggestion,
  createArtifactSmartSuggestRepositories,
  createD1SmartSuggestRepositories,
  createInMemorySmartSuggestRepositories,
  createSuggestCacheKey,
  createSuggestQueryHashEffect,
} from '@techsio/smart-suggest-storage';
import { validatePostalCode } from '@techsio/smart-suggest-validation';
import { validatePhoneNumber } from '@techsio/smart-suggest-validation/phone-strict';
import { Clock, DateTime, Duration, Effect, Layer, Option, Random, Schema } from 'effect';
import { catch as catchEffect } from 'effect/Effect';
import {
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/unstable/http';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import type {
  SmartSuggestHealthResponse,
  SmartSuggestQuery,
  SmartSuggestStatusResponse,
} from '../shared/api.ts';
import {
  SmartSuggestBadRequestError,
  SmartSuggestBadRequestErrorSchema,
  SmartSuggestForbiddenError,
  SmartSuggestForbiddenErrorSchema,
  SmartSuggestHttpApi,
  SmartSuggestInternalError,
  SmartSuggestInternalErrorSchema,
  SmartSuggestRateLimitError,
  SmartSuggestRateLimitErrorSchema,
  SmartSuggestResponseSchema,
  SmartSuggestUnauthorizedError,
  SmartSuggestUnauthorizedErrorSchema,
} from '../shared/api.ts';
import { createSmartSuggestEdgeCacheResponse } from '../shared/edge-cache';
import { getHealthPayload } from '../shared/health';

interface SmartSuggestWorkerEnv {
  CF_PAGES_BRANCH?: string;
  HERE_API_KEY?: string;
  HERE_DEFAULT_LAT?: string;
  HERE_DEFAULT_LNG?: string;
  HERE_DISCOVER_AT?: string;
  HERE_DISCOVER_BASE_URL?: string;
  HERE_DISCOVER_DEFAULT_LIMIT?: string;
  HERE_DISCOVER_IN_AREA?: string;
  HERE_DISCOVER_LANGUAGE?: string;
  MODERNJS_DEPLOY?: string;
  MAPY_CZ_API_KEY?: string;
  MAPY_CZ_ENDPOINT_URL?: string;
  NODE_ENV?: string;
  NOMINATIM_BASE_URL?: string;
  NOMINATIM_DEFAULT_LIMIT?: string;
  NOMINATIM_EMAIL?: string;
  NOMINATIM_REFERER?: string;
  NOMINATIM_USER_AGENT?: string;
  RADAR_API_KEY?: string;
  RADAR_AUTOCOMPLETE_BASE_URL?: string;
  RADAR_AUTOCOMPLETE_COUNTRY_CODE?: string;
  RADAR_AUTOCOMPLETE_DEFAULT_LIMIT?: string;
  RADAR_AUTOCOMPLETE_LAYERS?: string;
  RADAR_AUTOCOMPLETE_NEAR?: string;
  RUIAN_GEOCODE_BASE_URL?: string;
  RUIAN_GEOCODE_DEFAULT_LIMIT?: string;
  RUIAN_GEOCODE_DISABLED?: string;
  SMART_SUGGEST_ALLOWED_ORIGINS?: string;
  SMART_SUGGEST_BFF_RATE_LIMIT_MAX?: string;
  SMART_SUGGEST_BFF_RATE_LIMIT_WINDOW_MS?: string;
  SMART_SUGGEST_D1?: SmartSuggestD1Binding;
  SMART_SUGGEST_D1_ROUTER_BINDING?: string;
  SMART_SUGGEST_D1_SHARD_BINDINGS?: string;
  SMART_SUGGEST_ENVIRONMENT?: string;
  SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE?: string;
  SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL?: string;
  SMART_SUGGEST_OWNED_ARTIFACT_MAX_TOKEN_PAGES?: string;
  SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS?: string;
  SMART_SUGGEST_PROVIDER_CACHE_TTL_SECONDS?: string;
  SMART_SUGGEST_PROVIDER_ENRICHMENT_ENABLED?: string;
  SMART_SUGGEST_PROVIDER_PRIORITY?: string;
  SMART_SUGGEST_PROVIDER_TIMEOUT_MS?: string;
  SMART_SUGGEST_QUERY_HASH_SECRET?: string;
  SMART_SUGGEST_ROUTER_D1?: SmartSuggestD1Binding;
}

const inMemoryRepositories = createInMemorySmartSuggestRepositories();
const d1Repositories = new WeakMap<SmartSuggestD1Binding, SmartSuggestRepositories>();
const artifactRepositories = new WeakMap<
  SmartSuggestRepositories,
  Map<string, SmartSuggestRepositories>
>();
const shardedRepositories = new Map<string, SmartSuggestRepositories>();
const runtimeMetricsByRepository = new WeakMap<
  SmartSuggestRepositories,
  SmartSuggestRuntimeMetrics
>();
const providerRegistries = new Map<string, SmartSuggestProviderRegistry>();
const workerSuggestCaches = new WeakMap<
  SmartSuggestRepositories,
  Map<string, SmartSuggestLayerCacheEntry>
>();
const inboundRateLimitBucketsByRepository = new WeakMap<
  SmartSuggestRepositories,
  Map<string, InboundRateLimitBucket>
>();
const maxWorkerSuggestCacheEntries = 500;
const maxInboundRateLimitBuckets = 2000;
const defaultInboundRateLimitMax = 600;
const defaultInboundRateLimitWindowMs = 60_000;
const defaultEdgeCacheTtlSeconds = 3600;
const secondsPerDay = 86_400;

interface SmartSuggestEdgeCache {
  match: (request: Request) => Promise<Response | undefined>;
  put: (request: Request, response: Response) => Promise<unknown>;
}

interface SmartSuggestCacheStorage {
  default?: SmartSuggestEdgeCache;
}

interface SmartSuggestLayerCacheEntry {
  edgeTtlSeconds?: number;
  response: SmartSuggestResponse;
}

interface InboundRateLimitBucket {
  count: number;
  resetAt: number;
}

type SuggestSourceKind = 'cache' | 'owned' | 'provider-enrichment';

interface SmartSuggestRuntimeMetrics {
  accept: {
    total: number;
  };
  providerEvents: Record<ProviderEventSummary['status'], number>;
  suggest: {
    cacheStatus: Record<SmartSuggestCacheStatus, number>;
    errors: number;
    latencyMsTotal: number;
    ownedSuccess: number;
    providerFallback: number;
    total: number;
  };
}

const createRuntimeMetrics = (): SmartSuggestRuntimeMetrics => ({
  accept: { total: 0 },
  providerEvents: {
    error: 0,
    skipped: 0,
    success: 0,
    timeout: 0,
  },
  suggest: {
    cacheStatus: {
      disabled: 0,
      hit: 0,
      miss: 0,
      stale: 0,
      written: 0,
    },
    errors: 0,
    latencyMsTotal: 0,
    ownedSuccess: 0,
    providerFallback: 0,
    total: 0,
  },
});

const metricsForRepositories = (repositories: SmartSuggestRepositories) => {
  const existingMetrics = runtimeMetricsByRepository.get(repositories);

  if (existingMetrics !== undefined) {
    return existingMetrics;
  }

  const metrics = createRuntimeMetrics();
  runtimeMetricsByRepository.set(repositories, metrics);

  return metrics;
};

const cacheLevel = (
  enabled: boolean,
  status: SmartSuggestCacheStatus,
): SmartSuggestCacheLevels[keyof SmartSuggestCacheLevels] => ({
  enabled,
  status,
});

const nowIso = () => DateTime.formatIso(DateTime.nowUnsafe());

const createSuggestCacheLevels = (edgeCacheEnabled: boolean): SmartSuggestCacheLevels => ({
  browserMemory: cacheLevel(false, 'disabled'),
  d1ReadThrough: cacheLevel(true, 'miss'),
  edgeCache: edgeCacheEnabled ? cacheLevel(true, 'miss') : cacheLevel(false, 'disabled'),
  ownedDb: cacheLevel(true, 'miss'),
  workerMemory: cacheLevel(true, 'miss'),
});

const createDisabledCacheLevels = (): SmartSuggestCacheLevels => ({
  browserMemory: cacheLevel(false, 'disabled'),
  d1ReadThrough: cacheLevel(false, 'disabled'),
  edgeCache: cacheLevel(false, 'disabled'),
  ownedDb: cacheLevel(false, 'disabled'),
  workerMemory: cacheLevel(false, 'disabled'),
});

const cloneCacheLevels = (levels: SmartSuggestCacheLevels): SmartSuggestCacheLevels => ({
  browserMemory: { ...levels.browserMemory },
  d1ReadThrough: { ...levels.d1ReadThrough },
  edgeCache: { ...levels.edgeCache },
  ownedDb: { ...levels.ownedDb },
  workerMemory: { ...levels.workerMemory },
});

const withCacheLevels = (
  response: SmartSuggestResponse,
  levels: SmartSuggestCacheLevels,
): SmartSuggestResponse => ({
  ...response,
  cacheLevels: cloneCacheLevels(levels),
});

const hasOwnedDatasetSuggestions = (response: SmartSuggestResponse) =>
  response.suggestions.some((suggestion) => suggestion.source.kind === 'owned-dataset');

const ownedDbCacheStatusForResponse = (response: SmartSuggestResponse): SmartSuggestCacheStatus =>
  hasOwnedDatasetSuggestions(response) ? 'hit' : 'miss';

const liveProviderSourceIdFromDataSourceId = (sourceId: string) => {
  if (!sourceId.startsWith('live-provider:')) {
    return sourceId;
  }

  return sourceId.slice('live-provider:'.length).split(':')[0] ?? sourceId;
};

const catalogSourceIdForSuggestionSource = (source: SuggestionSource) =>
  liveProviderSourceIdFromDataSourceId(source.id);

const sourceAllowsProviderCache = (source: SuggestionSource, ttlSeconds: number) => {
  const sourceId = catalogSourceIdForSuggestionSource(source);

  return (
    smartSuggestSourceAllowsWrite(sourceId, 'permanent-cache') ||
    smartSuggestSourceAllowsTtlCache(sourceId, Math.ceil(ttlSeconds / secondsPerDay))
  );
};

const hasUncacheableProviderSuggestion = (
  response: SmartSuggestResponse,
  ttlSeconds = defaultEdgeCacheTtlSeconds,
) =>
  response.suggestions.some(
    (suggestion) =>
      suggestion.source.kind === 'live-provider' &&
      !sourceAllowsProviderCache(suggestion.source, ttlSeconds),
  );

const isLayerCacheableSuggestResponse = (
  response: SmartSuggestResponse,
  ttlSeconds = defaultEdgeCacheTtlSeconds,
) =>
  response.cacheStatus !== 'disabled' &&
  response.suggestions.length > 0 &&
  !hasUncacheableProviderSuggestion(response, ttlSeconds);

const edgeCacheTtlSecondsForCachePolicy = (
  cachePolicy: SuggestCacheRecord['cachePolicy'],
): number | undefined => (cachePolicy.kind === 'ttl' ? cachePolicy.ttlSeconds : undefined);

const workerSuggestCacheFor = (repositories: SmartSuggestRepositories) => {
  const existingCache = workerSuggestCaches.get(repositories);

  if (existingCache !== undefined) {
    return existingCache;
  }

  const cache = new Map<string, SmartSuggestLayerCacheEntry>();
  workerSuggestCaches.set(repositories, cache);

  return cache;
};

const responseForLayerCache = (response: SmartSuggestResponse): SmartSuggestResponse => {
  const publicResponse: SmartSuggestResponse = {
    cacheStatus: response.cacheStatus,
    requestId: response.requestId,
    suggestions: response.suggestions,
  };

  if (response.countryScope !== undefined) {
    publicResponse.countryScope = response.countryScope;
  }

  return publicResponse;
};

const responseForPublicDto = (response: SmartSuggestResponse): SmartSuggestResponse =>
  responseForLayerCache(response);

const rememberWorkerSuggestResponse = (
  cache: Map<string, SmartSuggestLayerCacheEntry>,
  cacheKey: string,
  response: SmartSuggestResponse,
  edgeTtlSeconds?: number,
) => {
  if (cache.has(cacheKey)) {
    cache.delete(cacheKey);
  }

  const cacheEntry: SmartSuggestLayerCacheEntry = {
    response: responseForLayerCache(response),
  };

  if (edgeTtlSeconds !== undefined) {
    cacheEntry.edgeTtlSeconds = edgeTtlSeconds;
  }

  cache.set(cacheKey, cacheEntry);

  while (cache.size > maxWorkerSuggestCacheEntries) {
    const oldestKey = cache.keys().next().value;

    if (typeof oldestKey !== 'string') {
      return;
    }

    cache.delete(oldestKey);
  }
};

const readEdgeCache = (): SmartSuggestEdgeCache | undefined => {
  const cacheStorage = (globalThis as typeof globalThis & { caches?: SmartSuggestCacheStorage })
    .caches;

  return cacheStorage?.default;
};

const edgeCacheRequestFor = (cacheKey: string) =>
  new Request(`https://smart-suggest.internal/cache/suggest/${encodeURIComponent(cacheKey)}`, {
    method: 'GET',
  });

const missingEdgeSuggestResponse: SmartSuggestResponse | undefined = undefined;

const recoverMissingEdgeSuggestResponse = () => missingEdgeSuggestResponse;

const serverError = () =>
  new SmartSuggestInternalError({
    errors: [
      {
        code: 'internal-error',
        message: 'Smart Suggest request failed.',
        retryable: true,
      } satisfies SmartSuggestError,
    ],
    message: 'Smart Suggest request failed.',
  });

const readCachedEdgeSuggestResponseBody = (
  cached: Response,
): Effect.Effect<unknown, SmartSuggestInternalError, never> =>
  Effect.tryPromise({
    catch: () => serverError(),
    try: () => cached.json(),
  });

const readEdgeSuggestResponse = (
  edgeCache: SmartSuggestEdgeCache,
  cacheKey: string,
): Effect.Effect<SmartSuggestResponse | undefined, never, never> =>
  Effect.tryPromise({
    catch: () => serverError(),
    try: () => edgeCache.match(edgeCacheRequestFor(cacheKey)),
  }).pipe(
    Effect.flatMap((cached) =>
      cached === undefined
        ? Effect.succeed(recoverMissingEdgeSuggestResponse())
        : readCachedEdgeSuggestResponseBody(cached).pipe(
            Effect.map((body) => {
              const decoded = Option.getOrUndefined(
                Schema.decodeUnknownOption(SmartSuggestResponseSchema)(body),
              );

              return decoded ?? recoverMissingEdgeSuggestResponse();
            }),
          ),
    ),
    Effect.orElseSucceed(recoverMissingEdgeSuggestResponse),
  );

const writeEdgeSuggestResponse = (
  edgeCache: SmartSuggestEdgeCache | undefined,
  cacheKey: string,
  response: SmartSuggestResponse,
  edgeTtlSeconds?: number,
): Effect.Effect<boolean, never, never> => {
  if (edgeCache === undefined || !isLayerCacheableSuggestResponse(response, edgeTtlSeconds)) {
    return Effect.succeed(false);
  }

  const edgeCacheOptions = edgeTtlSeconds === undefined ? {} : { ttlSeconds: edgeTtlSeconds };

  return createSmartSuggestEdgeCacheResponse(
    responseForLayerCache(response),
    edgeCacheOptions,
  ).pipe(
    Effect.mapError(() => serverError()),
    Effect.flatMap((cacheResponse) =>
      Effect.tryPromise({
        catch: () => serverError(),
        try: () => edgeCache.put(edgeCacheRequestFor(cacheKey), cacheResponse),
      }),
    ),
    Effect.as(true),
    Effect.orElseSucceed(() => false),
  );
};

const rememberRuntimeSuggestCaches = (
  cacheKey: string,
  response: SmartSuggestResponse,
  levels: SmartSuggestCacheLevels,
  workerCache: Map<string, SmartSuggestLayerCacheEntry>,
  edgeCache: SmartSuggestEdgeCache | undefined,
  edgeTtlSeconds?: number,
): Effect.Effect<SmartSuggestCacheLevels, never, never> =>
  Effect.gen(function* rememberRuntimeSuggestCachesProgram() {
    if (!isLayerCacheableSuggestResponse(response, edgeTtlSeconds)) {
      return levels;
    }

    rememberWorkerSuggestResponse(workerCache, cacheKey, response, edgeTtlSeconds);
    levels.workerMemory = cacheLevel(true, 'written');

    if (yield* writeEdgeSuggestResponse(edgeCache, cacheKey, response, edgeTtlSeconds)) {
      levels.edgeCache = cacheLevel(true, 'written');
    }

    return levels;
  });

const roundMetric = (value: number) => Math.round(value * 1000) / 1000;

const summarizeMetrics = (metrics: SmartSuggestRuntimeMetrics) => {
  const suggestTotal = metrics.suggest.total;

  return {
    accept: {
      total: metrics.accept.total,
    },
    providerEvents: metrics.providerEvents,
    suggest: {
      averageLatencyMs:
        suggestTotal === 0 ? 0 : roundMetric(metrics.suggest.latencyMsTotal / suggestTotal),
      cacheHitRate:
        suggestTotal === 0 ? 0 : roundMetric(metrics.suggest.cacheStatus.hit / suggestTotal),
      cacheStatus: metrics.suggest.cacheStatus,
      errors: metrics.suggest.errors,
      ownedSuccess: metrics.suggest.ownedSuccess,
      providerFallback: metrics.suggest.providerFallback,
      total: suggestTotal,
    },
  };
};

const recordSuggestResponse = (
  repositories: SmartSuggestRepositories,
  response: SmartSuggestResponse,
  startedAt: number,
  sourceKind: SuggestSourceKind,
) => {
  const metrics = metricsForRepositories(repositories);
  metrics.suggest.total += 1;
  metrics.suggest.latencyMsTotal += performance.now() - startedAt;
  metrics.suggest.cacheStatus[response.cacheStatus] += 1;

  if (sourceKind === 'owned') {
    metrics.suggest.ownedSuccess += 1;
  }
  if (sourceKind === 'provider-enrichment') {
    metrics.suggest.providerFallback += 1;
  }
};

const recordSuggestError = (repositories: SmartSuggestRepositories, startedAt: number) => {
  const metrics = metricsForRepositories(repositories);
  metrics.suggest.total += 1;
  metrics.suggest.errors += 1;
  metrics.suggest.latencyMsTotal += performance.now() - startedAt;
};

const repositoriesForD1Binding = (binding: SmartSuggestD1Binding) => {
  const existing = d1Repositories.get(binding);

  if (existing !== undefined) {
    return existing;
  }

  const repositories = createD1SmartSuggestRepositories(binding);
  d1Repositories.set(binding, repositories);

  return repositories;
};

const parseRuntimeList = (value: string | undefined) =>
  value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0) ?? [];

const readNamedD1Binding = (
  env: SmartSuggestWorkerEnv | undefined,
  bindingName: string,
): SmartSuggestD1Binding | undefined =>
  (env as Record<string, SmartSuggestD1Binding | undefined> | undefined)?.[bindingName];

const maxShardSearchFanout = 14;
const shardHashModulus = 2_147_483_647;
const shardAddressNumberPattern = /\d/u;

const hashStringToPositiveInteger = (value: string) => {
  let hash = 0;

  for (const character of value) {
    hash = (Math.imul(hash, 131) + (character.codePointAt(0) ?? 0)) % shardHashModulus;

    if (hash < 0) {
      hash += shardHashModulus;
    }
  }

  return hash;
};

const deterministicShardBindingForRouteKey = (
  routeKey: string,
  shardBindingNames: readonly string[],
) => {
  if (shardBindingNames.length === 0 || shardBindingNames.length > maxShardSearchFanout) {
    return;
  }

  return shardBindingNames[hashStringToPositiveInteger(routeKey) % shardBindingNames.length];
};

const deterministicShardBindingForRecord = (
  record: AddressSearchRecordInput,
  shardBindingNames: readonly string[],
) =>
  deterministicShardBindingForRouteKey(
    record.ruian?.stableAddressId ?? record.ruian?.addressPlaceCode ?? record.id,
    shardBindingNames,
  );

const deterministicShardBindingForTombstone = (
  tombstone: AddressTombstoneRecordInput,
  shardBindingNames: readonly string[],
) =>
  deterministicShardBindingForRouteKey(
    tombstone.ruian?.stableAddressId ?? tombstone.ruian?.addressPlaceCode ?? tombstone.id,
    shardBindingNames,
  );

const extractPostalRouteHint = (query: string) => {
  const match = /\b\d{3}\s?\d{2}\b/u.exec(query);

  return match?.[0];
};

const isStrongShardSearchQuery = (query: string) =>
  shardAddressNumberPattern.test(query) || extractPostalRouteHint(query) !== undefined;

const activeShardCandidatesForFanout = (
  router: SmartSuggestRepositories,
  input: {
    countryCode?: SmartSuggestCountryCode;
  },
  shardBindingNames: readonly string[],
) =>
  Effect.gen(function* activeShardCandidatesForFanoutProgram() {
    const listInput: Parameters<typeof router.shardRegistry.listShardMetadata>[0] =
      input.countryCode === undefined
        ? { state: 'active' }
        : { countryCode: input.countryCode, state: 'active' };
    const listed = yield* router.shardRegistry.listShardMetadata(listInput);
    const activeCandidates = listed.filter((candidate) =>
      shardBindingNames.includes(candidate.bindingName),
    );

    return activeCandidates.length > 0
      ? activeCandidates
      : shardBindingNames.map((bindingName) => ({ bindingName }));
  });

const boundedShardCandidates = (
  router: SmartSuggestRepositories,
  input: {
    countryCode?: SmartSuggestCountryCode;
    query: string;
  },
  shardBindingNames: readonly string[],
) =>
  Effect.gen(function* boundedShardCandidatesProgram() {
    if (input.countryCode === undefined) {
      return isStrongShardSearchQuery(input.query)
        ? yield* activeShardCandidatesForFanout(router, input, shardBindingNames)
        : [];
    }

    const routeInput: Parameters<typeof router.shardRegistry.resolveShardMetadata>[0] = {
      countryCode: input.countryCode,
      states: ['active'],
    };
    const postalCode = extractPostalRouteHint(input.query);

    if (postalCode !== undefined) {
      routeInput.postalCode = postalCode;
    }

    const routed = yield* router.shardRegistry.resolveShardMetadata(routeInput);

    if (routed.length > 0) {
      return routed;
    }

    if (shardBindingNames.length > maxShardSearchFanout) {
      return isStrongShardSearchQuery(input.query)
        ? yield* activeShardCandidatesForFanout(router, input, shardBindingNames)
        : [];
    }

    return yield* router.shardRegistry.listShardMetadata({
      countryCode: input.countryCode,
      state: 'active',
    });
  });

const shardCandidatesForAddressRecord = (
  router: SmartSuggestRepositories,
  record: AddressSearchRecordInput,
  shardBindingNames: readonly string[],
) =>
  Effect.gen(function* shardCandidatesForAddressRecordProgram() {
    const routeInput: Parameters<typeof router.shardRegistry.resolveShardMetadata>[0] = {
      countryCode: record.countryCode,
      states: ['active'],
    };
    const postalCode = record.parts.postalCode ?? record.ruian?.postalCode;
    const municipalityHint = record.parts.city;

    if (postalCode !== undefined) {
      routeInput.postalCode = postalCode;
    }
    if (municipalityHint !== undefined) {
      routeInput.municipalityHint = municipalityHint;
    }
    if (record.ruian?.regionCode !== undefined) {
      routeInput.regionCode = record.ruian.regionCode;
    }
    if (record.ruian?.municipalityCode !== undefined) {
      routeInput.municipalityCode = record.ruian.municipalityCode;
    }

    const activeCandidates = yield* router.shardRegistry.resolveShardMetadata(routeInput);
    const routedCandidates = activeCandidates.filter((candidate) =>
      shardBindingNames.includes(candidate.bindingName),
    );

    if (routedCandidates.length > 0) {
      return routedCandidates;
    }

    const fallbackBindingName = deterministicShardBindingForRecord(record, shardBindingNames);

    return fallbackBindingName === undefined ? [] : [{ bindingName: fallbackBindingName }];
  });

const shardCandidatesForAddressTombstone = (
  router: SmartSuggestRepositories,
  tombstone: AddressTombstoneRecordInput,
  shardBindingNames: readonly string[],
) =>
  Effect.gen(function* shardCandidatesForAddressTombstoneProgram() {
    const routeInput: Parameters<typeof router.shardRegistry.resolveShardMetadata>[0] = {
      countryCode: tombstone.countryCode,
      states: ['active'],
    };

    if (tombstone.ruian?.postalCode !== undefined) {
      routeInput.postalCode = tombstone.ruian.postalCode;
    }
    if (tombstone.ruian?.regionCode !== undefined) {
      routeInput.regionCode = tombstone.ruian.regionCode;
    }
    if (tombstone.ruian?.municipalityCode !== undefined) {
      routeInput.municipalityCode = tombstone.ruian.municipalityCode;
    }

    const activeCandidates = yield* router.shardRegistry.resolveShardMetadata(routeInput);
    const routedCandidates = activeCandidates.filter((candidate) =>
      shardBindingNames.includes(candidate.bindingName),
    );

    if (routedCandidates.length > 0) {
      return routedCandidates;
    }

    const fallbackBindingName = deterministicShardBindingForTombstone(tombstone, shardBindingNames);

    return fallbackBindingName === undefined ? [] : [{ bindingName: fallbackBindingName }];
  });

const uniqueShardMetadataByBindingName = <
  T extends {
    bindingName: string;
  },
>(
  candidates: readonly T[],
) => {
  const unique = new Map<string, T>();

  for (const candidate of candidates) {
    if (!unique.has(candidate.bindingName)) {
      unique.set(candidate.bindingName, candidate);
    }
  }

  return [...unique.values()];
};

type RankedShardAddressRecordCandidate = AddressRecord & {
  confidence: number;
};

const rankShardAddressRecordResults = (
  query: string,
  records: readonly AddressRecord[],
  limit: number,
): AddressRecord[] => {
  const byRecordId = new Map<string, AddressRecord>();

  for (const record of records) {
    byRecordId.set(record.id, record);
  }

  const candidates: RankedShardAddressRecordCandidate[] = [...byRecordId.values()].map(
    (record) => ({
      ...record,
      confidence: record.quality,
    }),
  );

  return rankAddressCandidates(query, candidates, { limit }).map(({ candidate }) => {
    const { confidence: _confidence, ...record } = candidate;

    return byRecordId.get(record.id) ?? record;
  });
};

export const createShardedRepositories = ({
  router,
  shardRepositories,
}: {
  router: SmartSuggestRepositories;
  shardRepositories: ReadonlyMap<string, SmartSuggestRepositories>;
}): SmartSuggestRepositories => ({
  acceptEvents: router.acceptEvents,
  addressRecords: {
    getAddressRecord: (recordId) =>
      Effect.gen(function* getAddressRecordProgram() {
        const routerRecord = yield* router.addressRecords.getAddressRecord(recordId);

        if (routerRecord !== undefined) {
          return routerRecord;
        }

        const records = yield* Effect.all(
          [...shardRepositories.values()].map((repository) =>
            repository.addressRecords.getAddressRecord(recordId),
          ),
        );

        return records.find((record) => record !== undefined);
      }),
    listPostalLocalityAddressRecords: (input) =>
      Effect.gen(function* listPostalLocalityAddressRecordsProgram() {
        const routedCandidates =
          input.countryCode === undefined
            ? []
            : yield* router.shardRegistry.resolveShardMetadata({
                countryCode: input.countryCode,
                postalCode: input.postalCode,
                states: ['active'],
              });
        const routedRepositories = routedCandidates
          .map((candidate) => shardRepositories.get(candidate.bindingName))
          .filter((repository): repository is SmartSuggestRepositories => repository !== undefined);
        const repositories = [
          ...new Set(
            routedRepositories.length > 0 ? routedRepositories : [...shardRepositories.values()],
          ),
        ];
        const results = yield* Effect.all([
          router.addressRecords.listPostalLocalityAddressRecords(input),
          ...repositories.map((repository) =>
            repository.addressRecords.listPostalLocalityAddressRecords(input),
          ),
        ]);
        const byRecordId = new Map<string, AddressRecord>();

        for (const record of results.flat()) {
          byRecordId.set(record.id, record);
        }

        return [...byRecordId.values()].toSorted(
          (left, right) =>
            (left.parts.city ?? '').localeCompare(right.parts.city ?? '') ||
            right.quality - left.quality ||
            left.displayLabel.localeCompare(right.displayLabel),
        );
      }),
    searchAddressRecords: (input) =>
      Effect.gen(function* searchAddressRecordsProgram() {
        const candidates = uniqueShardMetadataByBindingName(
          yield* boundedShardCandidates(router, input, [...shardRepositories.keys()]),
        );
        const limit = normalizeSuggestLimit(input.limit);
        const shardResults = yield* Effect.all(
          candidates.map((candidate) => {
            const repository = shardRepositories.get(candidate.bindingName);

            if (repository === undefined) {
              return Effect.succeed([]);
            }

            const searchInput: Parameters<
              typeof repository.addressRecords.searchAddressRecords
            >[0] = {
              limit,
              query: input.query,
            };

            if (input.countryCode !== undefined) {
              searchInput.countryCode = input.countryCode;
            }
            if (input.countryCodes !== undefined) {
              searchInput.countryCodes = input.countryCodes;
            }

            return repository.addressRecords.searchAddressRecords(searchInput);
          }),
        );

        return rankShardAddressRecordResults(input.query, shardResults.flat(), limit);
      }),
    upsertAddressRecords: (records) =>
      Effect.gen(function* upsertAddressRecordsProgram() {
        if (records.length === 0) {
          return [];
        }

        const shardBindingNames = [...shardRepositories.keys()];
        const shardRecords = new Map<string, AddressSearchRecordInput[]>();
        const routerRecords: AddressSearchRecordInput[] = [];

        for (const record of records) {
          const candidates = yield* shardCandidatesForAddressRecord(
            router,
            record,
            shardBindingNames,
          );

          if (candidates.length === 0) {
            routerRecords.push(record);
            continue;
          }

          for (const candidate of candidates) {
            const existing = shardRecords.get(candidate.bindingName) ?? [];
            existing.push(record);
            shardRecords.set(candidate.bindingName, existing);
          }
        }

        const writes = [
          ...(routerRecords.length === 0
            ? []
            : [router.addressRecords.upsertAddressRecords(routerRecords)]),
          ...[...shardRecords.entries()].flatMap(([bindingName, routedRecords]) => {
            const repository = shardRepositories.get(bindingName);

            return repository === undefined
              ? []
              : [repository.addressRecords.upsertAddressRecords(routedRecords)];
          }),
        ];

        const results = yield* Effect.all(writes);

        return results.flat();
      }),
  },
  addressTombstones: {
    listAddressTombstones: (limit) =>
      Effect.gen(function* listAddressTombstonesProgram() {
        const normalizedLimit = limit ?? 10;
        const results = yield* Effect.all([
          router.addressTombstones.listAddressTombstones(normalizedLimit),
          ...[...shardRepositories.values()].map((repository) =>
            repository.addressTombstones.listAddressTombstones(normalizedLimit),
          ),
        ]);
        const byTombstoneId = new Map<string, (typeof results)[number][number]>();

        for (const tombstone of results.flat()) {
          byTombstoneId.set(tombstone.id, tombstone);
        }

        return [...byTombstoneId.values()]
          .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt))
          .slice(0, normalizedLimit);
      }),
    upsertAddressTombstones: (tombstones) =>
      Effect.gen(function* upsertAddressTombstonesProgram() {
        if (tombstones.length === 0) {
          return [];
        }

        const shardBindingNames = [...shardRepositories.keys()];
        const shardTombstones = new Map<string, AddressTombstoneRecordInput[]>();

        for (const tombstone of tombstones) {
          const candidates = yield* shardCandidatesForAddressTombstone(
            router,
            tombstone,
            shardBindingNames,
          );

          for (const candidate of candidates) {
            const existing = shardTombstones.get(candidate.bindingName) ?? [];
            existing.push(tombstone);
            shardTombstones.set(candidate.bindingName, existing);
          }
        }

        const results = yield* Effect.all([
          router.addressTombstones.upsertAddressTombstones(tombstones),
          ...[...shardTombstones.entries()].flatMap(([bindingName, routedTombstones]) => {
            const repository = shardRepositories.get(bindingName);

            return repository === undefined
              ? []
              : [repository.addressTombstones.upsertAddressTombstones(routedTombstones)];
          }),
        ]);
        const byTombstoneId = new Map<string, (typeof results)[number][number]>();

        for (const tombstone of results.flat()) {
          byTombstoneId.set(tombstone.id, tombstone);
        }

        return [...byTombstoneId.values()];
      }),
  },
  apiKeys: router.apiKeys,
  dataSources: {
    getDataSource: (sourceId) =>
      Effect.gen(function* getDataSourceProgram() {
        const routerSource = yield* router.dataSources.getDataSource(sourceId);

        if (routerSource !== undefined) {
          return routerSource;
        }

        const sources = yield* Effect.all(
          [...shardRepositories.values()].map((repository) =>
            repository.dataSources.getDataSource(sourceId),
          ),
        );

        return sources.find((source) => source !== undefined);
      }),
    registerDataSource: (input) =>
      Effect.gen(function* registerDataSourceProgram() {
        const results = yield* Effect.all([
          router.dataSources.registerDataSource(input),
          ...[...shardRepositories.values()].map((repository) =>
            repository.dataSources.registerDataSource(input),
          ),
        ]);

        return results[0];
      }),
  },
  health: {
    check: () =>
      Effect.gen(function* checkProgram() {
        const checks = yield* Effect.all([
          router.health.check(),
          ...[...shardRepositories.values()].map((repository) => repository.health.check()),
        ]);
        const failed = checks.find((check) => !check.ok);

        return failed ?? checks[0] ?? { checkedAt: nowIso(), ok: false };
      }),
  },
  importRuns: router.importRuns,
  providerEvents: router.providerEvents,
  shardRegistry: router.shardRegistry,
  suggestCache: router.suggestCache,
  tenants: router.tenants,
});

const resolveShardedRepositories = (env?: SmartSuggestWorkerEnv) => {
  const shardBindingNames = parseRuntimeList(env?.SMART_SUGGEST_D1_SHARD_BINDINGS);

  if (shardBindingNames.length === 0) {
    return;
  }

  const routerBindingName = env?.SMART_SUGGEST_D1_ROUTER_BINDING ?? 'SMART_SUGGEST_ROUTER_D1';
  const routerBinding = readNamedD1Binding(env, routerBindingName);

  if (routerBinding === undefined) {
    return;
  }

  const shardBindings = shardBindingNames
    .map((bindingName) => ({
      binding: readNamedD1Binding(env, bindingName),
      bindingName,
    }))
    .filter(
      (entry): entry is { binding: SmartSuggestD1Binding; bindingName: string } =>
        entry.binding !== undefined,
    );

  if (shardBindings.length === 0) {
    return;
  }

  const cacheKey = [routerBindingName, ...shardBindings.map((entry) => entry.bindingName)].join(
    '|',
  );
  const existing = shardedRepositories.get(cacheKey);

  if (existing !== undefined) {
    return existing;
  }

  const repositories = createShardedRepositories({
    router: repositoriesForD1Binding(routerBinding),
    shardRepositories: new Map(
      shardBindings.map((entry) => [entry.bindingName, repositoriesForD1Binding(entry.binding)]),
    ),
  });
  shardedRepositories.set(cacheKey, repositories);

  return repositories;
};

const telemetryRandomSegment = (value: number) => Math.abs(value).toString(36);

const createTelemetryId = (...parts: readonly string[]) =>
  Effect.all([Random.nextInt, Random.nextInt]).pipe(
    Effect.map((randomParts) =>
      [
        ...parts,
        nowIso(),
        ...randomParts.map((randomPart) => telemetryRandomSegment(randomPart)),
      ].join(':'),
    ),
  );

const badRequestError = (message: string, field?: string) => {
  const error =
    field === undefined
      ? {
          code: 'bad-request' as const,
          message,
        }
      : {
          code: 'bad-request' as const,
          field,
          message,
        };

  return new SmartSuggestBadRequestError({
    errors: [error],
    message,
  });
};

const unauthorizedError = (message: string) =>
  new SmartSuggestUnauthorizedError({
    errors: [
      {
        code: 'unauthorized',
        message,
        retryable: false,
      },
    ],
    message,
  });

const forbiddenError = (message: string) =>
  new SmartSuggestForbiddenError({
    errors: [
      {
        code: 'forbidden',
        message,
        retryable: false,
      },
    ],
    message,
  });

const rateLimitError = (message = 'Smart Suggest request rate limit exceeded.') =>
  new SmartSuggestRateLimitError({
    errors: [
      {
        code: 'rate-limit',
        message,
        retryable: true,
      },
    ],
    message,
  });

const isSmartSuggestBadRequestError = Schema.is(SmartSuggestBadRequestErrorSchema);
const isSmartSuggestForbiddenError = Schema.is(SmartSuggestForbiddenErrorSchema);
const isSmartSuggestInternalError = Schema.is(SmartSuggestInternalErrorSchema);
const isSmartSuggestRateLimitError = Schema.is(SmartSuggestRateLimitErrorSchema);
const isSmartSuggestUnauthorizedError = Schema.is(SmartSuggestUnauthorizedErrorSchema);

type SmartSuggestApiError =
  | SmartSuggestBadRequestError
  | SmartSuggestForbiddenError
  | SmartSuggestInternalError
  | SmartSuggestRateLimitError
  | SmartSuggestUnauthorizedError;

type SmartSuggestSuggestError = SmartSuggestBadRequestError | SmartSuggestInternalError;

const isSmartSuggestApiError = (error: unknown): error is SmartSuggestApiError =>
  isSmartSuggestBadRequestError(error) ||
  isSmartSuggestForbiddenError(error) ||
  isSmartSuggestInternalError(error) ||
  isSmartSuggestRateLimitError(error) ||
  isSmartSuggestUnauthorizedError(error);

const normalizeApiError = (error: unknown): SmartSuggestApiError =>
  isSmartSuggestApiError(error) ? error : serverError();

const normalizeSuggestError = (error: unknown): SmartSuggestSuggestError => {
  const badRequest = Option.getOrUndefined(
    Schema.decodeUnknownOption(SmartSuggestBadRequestErrorSchema)(error),
  );

  if (badRequest !== undefined) {
    return badRequest;
  }

  const internal = Option.getOrUndefined(
    Schema.decodeUnknownOption(SmartSuggestInternalErrorSchema)(error),
  );

  if (internal !== undefined) {
    return internal;
  }

  return serverError();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const optionalBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

const optionalNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);

const optionalStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : undefined;

const envString = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized === undefined || normalized === '' ? undefined : normalized;
};

const envStringArray = (value: string | undefined) =>
  envString(value)
    ?.split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');

const envNumber = (value: string | undefined) => {
  const normalized = envString(value);

  if (normalized === undefined) {
    return;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const booleanEnvValues = new Map<string, boolean>([
  ['1', true],
  ['true', true],
  ['yes', true],
  ['on', true],
  ['0', false],
  ['false', false],
  ['no', false],
  ['off', false],
]);

const envBoolean = (value: string | undefined) => {
  const normalized = envString(value)?.toLowerCase();

  if (normalized === undefined) {
    return booleanEnvValues.get('');
  }

  return booleanEnvValues.get(normalized);
};

const runtimeEnvValue = (
  env: SmartSuggestWorkerEnv | undefined,
  key: keyof SmartSuggestWorkerEnv,
): string | undefined => {
  const value = env?.[key];

  return typeof value === 'string' ? value : undefined;
};

const runtimeEnvString = (
  env: SmartSuggestWorkerEnv | undefined,
  key: keyof SmartSuggestWorkerEnv,
) => envString(runtimeEnvValue(env, key));

const runtimeEnvStringArray = (
  env: SmartSuggestWorkerEnv | undefined,
  key: keyof SmartSuggestWorkerEnv,
) => envStringArray(runtimeEnvValue(env, key));

const runtimeEnvNumber = (
  env: SmartSuggestWorkerEnv | undefined,
  key: keyof SmartSuggestWorkerEnv,
) => envNumber(runtimeEnvValue(env, key));

const runtimeEnvBoolean = (
  env: SmartSuggestWorkerEnv | undefined,
  key: keyof SmartSuggestWorkerEnv,
) => envBoolean(runtimeEnvValue(env, key));

const boundedPositiveInt = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) => {
  if (value === undefined) {
    return fallback;
  }

  return Math.max(min, Math.min(Math.trunc(value), max));
};

const optionalBoundedPositiveInt = (value: number | undefined, min: number, max: number) =>
  value === undefined ? undefined : Math.max(min, Math.min(Math.trunc(value), max));

const resolveArtifactRepositories = (
  env: SmartSuggestWorkerEnv | undefined,
  fallback: SmartSuggestRepositories,
) => {
  const manifestUrl = runtimeEnvString(env, 'SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL');

  if (manifestUrl === undefined) {
    return fallback;
  }

  const allowIncomplete =
    runtimeEnvBoolean(env, 'SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE') ?? false;
  const readFallbackAddressRecords =
    runtimeEnvBoolean(env, 'SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS') ?? false;
  const maxAddressTokenPages = optionalBoundedPositiveInt(
    runtimeEnvNumber(env, 'SMART_SUGGEST_OWNED_ARTIFACT_MAX_TOKEN_PAGES'),
    1,
    10_000,
  );
  const cacheKey = [
    manifestUrl,
    allowIncomplete ? 'allow-incomplete' : 'complete-only',
    readFallbackAddressRecords ? 'with-address-fallback' : 'artifact-primary',
    maxAddressTokenPages === undefined ? 'manifest-page-budget' : String(maxAddressTokenPages),
  ].join('|');
  let variants = artifactRepositories.get(fallback);

  if (variants === undefined) {
    variants = new Map();
    artifactRepositories.set(fallback, variants);
  }

  const existing = variants.get(cacheKey);

  if (existing !== undefined) {
    return existing;
  }

  const baseOptions = {
    allowIncomplete,
    fallback,
    manifestUrl,
    readFallbackAddressRecords,
  };
  const options: Parameters<typeof createArtifactSmartSuggestRepositories>[0] =
    maxAddressTokenPages === undefined ? baseOptions : { ...baseOptions, maxAddressTokenPages };

  const repositories = createArtifactSmartSuggestRepositories(options);
  variants.set(cacheKey, repositories);

  return repositories;
};

const resolveRepositories = (env?: SmartSuggestWorkerEnv) => {
  const sharded = resolveShardedRepositories(env);

  if (sharded !== undefined) {
    return resolveArtifactRepositories(env, sharded);
  }

  const binding = env?.SMART_SUGGEST_D1;

  if (binding === undefined) {
    return resolveArtifactRepositories(env, inMemoryRepositories);
  }

  return resolveArtifactRepositories(env, repositoriesForD1Binding(binding));
};

const readInboundRateLimitConfig = (env?: SmartSuggestWorkerEnv) => ({
  max: boundedPositiveInt(
    runtimeEnvNumber(env, 'SMART_SUGGEST_BFF_RATE_LIMIT_MAX'),
    defaultInboundRateLimitMax,
    1,
    100_000,
  ),
  windowMs: boundedPositiveInt(
    runtimeEnvNumber(env, 'SMART_SUGGEST_BFF_RATE_LIMIT_WINDOW_MS'),
    defaultInboundRateLimitWindowMs,
    100,
    3_600_000,
  ),
});

const configuredCorsOrigins = (env?: SmartSuggestWorkerEnv) =>
  runtimeEnvStringArray(env, 'SMART_SUGGEST_ALLOWED_ORIGINS') ?? [];

const explicitCorsOrigins = (origins: readonly string[]) =>
  origins.filter((origin) => origin !== '*');

const requestHeaderValue = (
  headers: Readonly<Record<string, string | undefined>>,
  headerName: string,
) => envString(headers[headerName] ?? headers[headerName.toLowerCase()]);

const requestOrigin = (request: HttpServerRequest.HttpServerRequest) =>
  requestHeaderValue(request.headers, 'origin');

const missingCorsOrigin: string | undefined = undefined;
const recoverMissingCorsOrigin = () => missingCorsOrigin;

const requestUrl = (request: HttpServerRequest.HttpServerRequest) => {
  let url: URL | undefined;

  try {
    url = new URL(request.url, 'https://smart-suggest.internal');
  } catch {
    // Invalid request URLs are treated the same as requests without tenant CORS context.
  }

  return url;
};

const tenantIdCorsRoutes = new Set(['/v1/accept', '/v1/suggest']);

const normalizeTenantIdCorsPathname = (pathname: string) =>
  pathname.startsWith('/api/') ? pathname.slice('/api'.length) : pathname;

const tenantIdFromCorsRequest = (request: HttpServerRequest.HttpServerRequest) => {
  const url = requestUrl(request);

  return url !== undefined && tenantIdCorsRoutes.has(normalizeTenantIdCorsPathname(url.pathname))
    ? envString(url.searchParams.get('tenantId') ?? undefined)
    : missingCorsOrigin;
};

const corsSimpleHeaders = (origin: string) => ({
  'access-control-allow-origin': origin,
  vary: 'Origin',
});

const corsPreflightHeaders = (origin: string | undefined) => ({
  ...(origin === undefined ? {} : corsSimpleHeaders(origin)),
  'access-control-allow-headers': 'authorization, content-type, x-api-key',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-max-age': '600',
});

const tenantAllowsOrigin = (tenant: TenantRecord, origin: string) =>
  explicitCorsOrigins(tenant.allowedOrigins).includes(origin);

const tenantHasConfiguredOriginPolicy = (tenant: TenantRecord) => tenant.allowedOrigins.length > 0;

interface AuthorizedTenantRequest {
  apiKeyHash?: string;
  origin: string | undefined;
  tenant?: TenantRecord;
  tenantId?: string;
}

const presentedApiKeyFromHeaders = (headers: Readonly<Record<string, string | undefined>>) => {
  const explicitApiKey = requestHeaderValue(headers, 'x-api-key');

  if (explicitApiKey !== undefined) {
    return explicitApiKey;
  }

  const authorization = requestHeaderValue(headers, 'authorization');
  const bearerPrefix = 'bearer ';

  if (authorization?.toLowerCase().startsWith(bearerPrefix) === true) {
    return envString(authorization.slice(bearerPrefix.length));
  }

  return missingCorsOrigin;
};

const sha256Hex = (value: string): Effect.Effect<string, SmartSuggestInternalError, never> =>
  Effect.tryPromise({
    catch: () => serverError(),
    try: () => {
      const subtleCrypto = globalThis.crypto?.subtle;

      if (subtleCrypto === undefined) {
        return Promise.reject(new Error('Web Crypto subtle digest is unavailable.'));
      }

      return subtleCrypto
        .digest('SHA-256', new TextEncoder().encode(value))
        .then((digest) =>
          [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
        );
    },
  });

const enforceTenantOrigin = (
  tenant: TenantRecord,
  origin: string | undefined,
): Effect.Effect<void, SmartSuggestForbiddenError, never> => {
  if (origin === undefined || !tenantHasConfiguredOriginPolicy(tenant)) {
    return Effect.void;
  }

  if (!tenantAllowsOrigin(tenant, origin)) {
    return Effect.fail(forbiddenError('Smart Suggest origin is not allowed for this tenant.'));
  }

  return Effect.void;
};

const enforceTenantApiKey = (
  tenantId: string,
  tenantApiKeys: readonly { keyHash: string }[],
  headers: Readonly<Record<string, string | undefined>>,
  repositories: SmartSuggestRepositories,
) =>
  Effect.gen(function* enforceTenantApiKeyProgram() {
    if (tenantApiKeys.length === 0) {
      return;
    }

    const presentedApiKey = presentedApiKeyFromHeaders(headers);

    if (presentedApiKey === undefined) {
      return yield* unauthorizedError('Smart Suggest API key is required.');
    }

    const keyHash = yield* sha256Hex(presentedApiKey);
    const apiKey = yield* repositories.apiKeys.getApiKeyByHash(keyHash);

    if (apiKey === undefined) {
      return yield* unauthorizedError('Smart Suggest API key is invalid.');
    }

    if (apiKey.status !== 'active') {
      return yield* unauthorizedError('Smart Suggest API key is not active.');
    }

    if (apiKey.tenantId !== tenantId) {
      return yield* forbiddenError('Smart Suggest API key is not scoped to this tenant.');
    }

    return keyHash;
  });

const authorizeTenantRequest = ({
  headers,
  origin,
  repositories,
  requireKnownTenant,
  tenantId,
}: {
  headers: Readonly<Record<string, string | undefined>>;
  origin: string | undefined;
  repositories: SmartSuggestRepositories;
  requireKnownTenant: boolean;
  tenantId: string | undefined;
}): Effect.Effect<
  AuthorizedTenantRequest,
  | SmartSuggestForbiddenError
  | SmartSuggestInternalError
  | SmartSuggestStorageError
  | SmartSuggestUnauthorizedError,
  never
> =>
  Effect.gen(function* authorizeTenantRequestProgram() {
    if (tenantId === undefined) {
      return { origin };
    }

    const tenant = yield* repositories.tenants.getTenant(tenantId);

    if (tenant === undefined) {
      if (requireKnownTenant) {
        return yield* forbiddenError('Smart Suggest tenant is not available.');
      }

      return { origin, tenantId };
    }

    if (tenant.status !== 'active') {
      return yield* forbiddenError('Smart Suggest tenant is not active.');
    }

    yield* enforceTenantOrigin(tenant, origin);

    const keyHash = yield* enforceTenantApiKey(
      tenantId,
      yield* repositories.apiKeys.listApiKeysForTenant(tenantId),
      headers,
      repositories,
    );

    return keyHash === undefined
      ? { origin, tenant, tenantId }
      : { apiKeyHash: keyHash, origin, tenant, tenantId };
  });

const inboundRateLimitBucketsFor = (repositories: SmartSuggestRepositories) => {
  const existingBuckets = inboundRateLimitBucketsByRepository.get(repositories);

  if (existingBuckets !== undefined) {
    return existingBuckets;
  }

  const buckets = new Map<string, InboundRateLimitBucket>();
  inboundRateLimitBucketsByRepository.set(repositories, buckets);

  return buckets;
};

const requestClientIdentity = (request: HttpServerRequest.HttpServerRequest) => {
  const forwardedFor = requestHeaderValue(request.headers, 'x-forwarded-for')
    ?.split(',')[0]
    ?.trim();

  return (
    requestHeaderValue(request.headers, 'cf-connecting-ip') ??
    envString(forwardedFor) ??
    Option.getOrUndefined(request.remoteAddress) ??
    requestOrigin(request) ??
    'anonymous'
  );
};

const rateLimitKeyFor = (
  request: HttpServerRequest.HttpServerRequest,
  endpoint: string,
  authorization: AuthorizedTenantRequest,
) =>
  [
    endpoint,
    authorization.tenantId ?? 'public',
    authorization.apiKeyHash === undefined ? 'no-api-key' : `api-key:${authorization.apiKeyHash}`,
    authorization.origin ?? requestClientIdentity(request),
  ].join(':');

const trimExpiredRateLimitBuckets = (buckets: Map<string, InboundRateLimitBucket>, now: number) => {
  if (buckets.size < maxInboundRateLimitBuckets) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  for (const key of buckets.keys()) {
    if (buckets.size < maxInboundRateLimitBuckets) {
      return;
    }

    buckets.delete(key);
  }
};

const consumeInboundRateLimit = ({
  authorization,
  endpoint,
  env,
  repositories,
  request,
}: {
  authorization: AuthorizedTenantRequest;
  endpoint: string;
  env: SmartSuggestWorkerEnv | undefined;
  repositories: SmartSuggestRepositories;
  request: HttpServerRequest.HttpServerRequest;
}) =>
  Effect.gen(function* consumeInboundRateLimitProgram() {
    const now = yield* Clock.currentTimeMillis;
    const config = readInboundRateLimitConfig(env);
    const buckets = inboundRateLimitBucketsFor(repositories);
    const key = rateLimitKeyFor(request, endpoint, authorization);
    const existing = buckets.get(key);

    const allowed = yield* Effect.sync(() => {
      trimExpiredRateLimitBuckets(buckets, now);

      if (existing === undefined || existing.resetAt <= now) {
        buckets.set(key, {
          count: 1,
          resetAt: now + config.windowMs,
        });
        return true;
      }

      if (existing.count >= config.max) {
        return false;
      }

      existing.count += 1;
      return true;
    });

    if (!allowed) {
      return yield* rateLimitError();
    }
  });

const toCountryCode = normalizeSmartSuggestCountryCode;

const readOptionalRecord = (value: unknown) => (isRecord(value) ? value : undefined);

const health = (
  repositories: SmartSuggestRepositories,
  env?: SmartSuggestWorkerEnv,
): Effect.Effect<SmartSuggestHealthResponse, never, never> =>
  repositories.health.check().pipe(
    Effect.map((storage) => getHealthPayload(storage, env)),
    Effect.orElseSucceed(() => getHealthPayload(undefined, env)),
  );

type EffectSuccess<T> = T extends Effect.Effect<infer A, unknown, never> ? A : never;

const toSafeImportRunSummary = (
  run: EffectSuccess<
    ReturnType<SmartSuggestRepositories['importRuns']['listRecentImportRuns']>
  >[number],
) => ({
  completedAt: run.completedAt,
  failedRows: run.failedRows,
  id: run.id,
  importKind: run.importKind,
  insertedRows: run.insertedRows,
  shardCountryCode: run.shardCountryCode,
  skippedRows: run.skippedRows,
  sourceFeedId: run.sourceFeedId,
  sourceId: run.sourceId,
  sourceValidAt: run.sourceValidAt,
  sourceVersion: run.sourceVersion,
  startedAt: run.startedAt,
  status: run.status,
  tombstonedRows: run.tombstonedRows,
  totalRows: run.totalRows,
  upsertedRows: run.upsertedRows,
});

const freshnessSlaMaxDeltaAgeHours = 48;
const shardWarnSizeBytes = 5_000_000_000;
const shardBlockSizeBytes = 6_000_000_000;

type ImportRunSummary = ReturnType<typeof toSafeImportRunSummary>;
type ShardMetadataRecord = EffectSuccess<
  ReturnType<SmartSuggestRepositories['shardRegistry']['listShardMetadata']>
>[number];

const compareOptionalIsoDesc = (left: string | undefined, right: string | undefined) =>
  (right ?? '').localeCompare(left ?? '');

const completedImportRuns = (runs: readonly ImportRunSummary[]) =>
  runs.filter((run) => run.status === 'completed');

const latestImportRunByKind = (
  runs: readonly ImportRunSummary[],
  importKind: ImportRunSummary['importKind'],
) =>
  runs
    .filter((run) => run.importKind === importKind)
    .toSorted((left, right) => compareOptionalIsoDesc(left.completedAt, right.completedAt))[0];

const toFreshnessRun = (run: ImportRunSummary | undefined) => {
  if (run === undefined) {
    return;
  }

  return {
    completedAt: run.completedAt,
    failedRows: run.failedRows,
    runId: run.id,
    sourceFeedId: run.sourceFeedId,
    sourceValidAt: run.sourceValidAt,
    sourceVersion: run.sourceVersion,
    status: run.status,
    tombstonedRows: run.tombstonedRows,
    totalRows: run.totalRows,
    upsertedRows: run.upsertedRows,
  };
};

const freshnessReferenceIso = (run: ImportRunSummary | undefined) =>
  run?.sourceValidAt ?? run?.completedAt;

const freshnessAgeHours = (measuredAt: string, referenceIso: string | undefined) => {
  if (referenceIso === undefined) {
    return;
  }

  const measured = Date.parse(measuredAt);
  const reference = Date.parse(referenceIso);

  if (!(Number.isFinite(measured) && Number.isFinite(reference))) {
    return;
  }

  return roundMetric(Math.max(0, measured - reference) / 3_600_000);
};

const freshnessSlaStatus = (ageHours: number | undefined) => {
  if (ageHours === undefined) {
    return 'unknown';
  }

  return ageHours <= freshnessSlaMaxDeltaAgeHours ? 'fresh' : 'stale';
};

const summarizeImportFreshness = (runs: readonly ImportRunSummary[], measuredAt: string) => {
  const completedRuns = completedImportRuns(runs);
  const latestBaseline = latestImportRunByKind(completedRuns, 'baseline');
  const latestDelta = latestImportRunByKind(completedRuns, 'delta');
  const referenceRun = latestDelta ?? latestBaseline;
  const ageHours = freshnessAgeHours(measuredAt, freshnessReferenceIso(referenceRun));
  const rowCounts = {
    failedRows: 0,
    skippedRows: 0,
    tombstonedRows: 0,
    totalRows: 0,
    upsertedRows: 0,
  };

  for (const run of completedRuns) {
    rowCounts.failedRows += run.failedRows;
    rowCounts.skippedRows += run.skippedRows;
    rowCounts.tombstonedRows += run.tombstonedRows;
    rowCounts.totalRows += run.totalRows;
    rowCounts.upsertedRows += run.upsertedRows;
  }

  return {
    latestBaseline: toFreshnessRun(latestBaseline),
    latestDelta: toFreshnessRun(latestDelta),
    rowCounts,
    sla: {
      ageHours,
      maxDeltaAgeHours: freshnessSlaMaxDeltaAgeHours,
      measuredAt,
      status: freshnessSlaStatus(ageHours),
    },
  };
};

const toSafeShardSummary = (record: ShardMetadataRecord) => ({
  bindingName: record.bindingName,
  countryCode: record.countryCode,
  estimatedSizeBytes: record.estimatedSizeBytes,
  importVersion: record.importVersion,
  lastImportCompletedAt: record.lastImportCompletedAt,
  regionCode: record.regionCode,
  regionKind: record.regionKind,
  regionName: record.regionName,
  rowCount: record.rowCount,
  shardId: record.shardId,
  sourceFreshnessAt: record.sourceFreshnessAt,
  state: record.state,
});

const physicalShardSizeEstimates = (records: readonly ShardMetadataRecord[]) => {
  const estimates = new Map<string, number>();

  for (const record of records) {
    estimates.set(
      record.bindingName,
      (estimates.get(record.bindingName) ?? 0) + (record.estimatedSizeBytes ?? 0),
    );
  }

  return estimates;
};

const shardSizeStatus = (estimates: ReadonlyMap<string, number>) => {
  const estimatedSizes = [...estimates.values()];

  if (estimatedSizes.some((estimatedSizeBytes) => estimatedSizeBytes >= shardBlockSizeBytes)) {
    return 'blocked';
  }
  if (estimatedSizes.some((estimatedSizeBytes) => estimatedSizeBytes >= shardWarnSizeBytes)) {
    return 'warning';
  }

  return 'ok';
};

const summarizeShardHealth = (records: readonly ShardMetadataRecord[]) => {
  const activeRecords = records.filter((record) => record.state === 'active');
  const physicalSizeEstimates = physicalShardSizeEstimates(records);
  let maxEstimatedSizeBytes = 0;
  let rowCount = 0;

  for (const record of records) {
    maxEstimatedSizeBytes = Math.max(maxEstimatedSizeBytes, record.estimatedSizeBytes ?? 0);
    rowCount += record.rowCount;
  }

  return {
    activeCount: activeRecords.length,
    disabledCount: records.filter((record) => record.state === 'disabled').length,
    maxEstimatedSizeBytes,
    maxPhysicalShardEstimatedSizeBytes: Math.max(0, ...physicalSizeEstimates.values()),
    physicalShardCount: physicalSizeEstimates.size,
    rowCount,
    shards: records.map(toSafeShardSummary),
    sizeGuard: {
      blockBytes: shardBlockSizeBytes,
      status: shardSizeStatus(physicalSizeEstimates),
      warnBytes: shardWarnSizeBytes,
    },
    standbyCount: records.filter((record) => record.state === 'standby').length,
    totalCount: records.length,
  };
};

const authoritativeSourceIds = ['ruian-cz'] as const;
const missingDataSourceRecord: DataSourceRecord | undefined = undefined;

const hasSourceModificationNoteHash = (source: DataSourceRecord | undefined) =>
  typeof source?.modificationNoteSha256 === 'string' &&
  /^[a-f0-9]{64}$/u.test(source.modificationNoteSha256);

const toSafeSourceProvenance = (
  sourceId: (typeof authoritativeSourceIds)[number],
  source: DataSourceRecord | undefined,
) => ({
  attribution: source?.attribution,
  datasetVersion: source?.datasetVersion,
  modificationNoteSha256Present: hasSourceModificationNoteHash(source),
  present: source !== undefined,
  sourceId,
  sourceKind: source?.sourceKind ?? null,
});

const summarizeSourceProvenance = (repositories: SmartSuggestRepositories) =>
  Effect.gen(function* summarizeSourceProvenanceProgram() {
    const authoritativeSources = yield* Effect.all(
      authoritativeSourceIds.map((sourceId) =>
        repositories.dataSources.getDataSource(sourceId).pipe(
          Effect.orElseSucceed(() => missingDataSourceRecord),
          Effect.map((source) => toSafeSourceProvenance(sourceId, source)),
        ),
      ),
    );

    return { authoritativeSources };
  });

const sourcePolicySourceIds = Object.values(SMART_SUGGEST_PROVIDER_SOURCE_ID_ALIASES);

const uniqueSortedSourceIds = (sourceIds: readonly string[]) => [...new Set(sourceIds)].toSorted();

const summarizeSourcePolicies = () => {
  const providerSourceIds = uniqueSortedSourceIds(sourcePolicySourceIds);
  const durableRetentionAllowed = providerSourceIds.filter((sourceId) =>
    smartSuggestSourceAllowsWrite(sourceId, 'durable-retention'),
  );
  const permanentCacheAllowed = providerSourceIds.filter((sourceId) =>
    smartSuggestSourceAllowsWrite(sourceId, 'permanent-cache'),
  );
  const ttlCacheOnly = providerSourceIds
    .map((sourceId) => ({
      maxTtlDays: smartSuggestSourceMaxTtlDays(sourceId),
      sourceId,
    }))
    .filter(
      (
        policy,
      ): policy is {
        maxTtlDays: number;
        sourceId: string;
      } =>
        policy.maxTtlDays !== undefined &&
        !smartSuggestSourceAllowsWrite(policy.sourceId, 'durable-retention'),
    );
  const noDurableRetention = providerSourceIds.filter(
    (sourceId) =>
      getSmartSuggestSourcePolicy(sourceId)?.sourceKind === 'live-provider' &&
      !smartSuggestSourceAllowsWrite(sourceId, 'durable-retention'),
  );

  return {
    providerSources: {
      durableRetentionAllowed,
      noDurableRetention,
      permanentCacheAllowed,
      ttlCacheOnly,
    },
    rawQueryStorage: 'disabled',
  };
};

const toJsonCompatible = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(toJsonCompatible);
  }

  if (isRecord(value)) {
    const record: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        record[key] = toJsonCompatible(entry);
      }
    }

    return record;
  }

  return value;
};

const status = (
  repositories: SmartSuggestRepositories,
): Effect.Effect<SmartSuggestStatusResponse, never, never> =>
  Effect.gen(function* statusProgram() {
    const timestamp = nowIso();
    const [storage, importRuns, shardMetadata, sourceProvenance] = yield* Effect.all([
      repositories.health.check().pipe(Effect.orElseSucceed(() => null)),
      repositories.importRuns.listRecentImportRuns(50).pipe(Effect.orElseSucceed(() => [])),
      repositories.shardRegistry.listShardMetadata().pipe(Effect.orElseSucceed(() => [])),
      summarizeSourceProvenance(repositories),
    ]);
    const safeImportRuns = importRuns.map(toSafeImportRunSummary);

    return toJsonCompatible({
      db: storage,
      imports: {
        freshness: summarizeImportFreshness(safeImportRuns, timestamp),
        recentRuns: safeImportRuns.slice(0, 5),
      },
      metrics: summarizeMetrics(metricsForRepositories(repositories)),
      service: 'smart-suggest',
      shards: summarizeShardHealth(shardMetadata),
      sourcePolicy: summarizeSourcePolicies(),
      sourceProvenance,
      timestamp,
    }) as SmartSuggestStatusResponse;
  });

const readTenantContext = (query: SmartSuggestQuery) => {
  const { cartId, salesChannelId, sessionId, tenantId } = query;

  if (
    tenantId === undefined &&
    salesChannelId === undefined &&
    cartId === undefined &&
    sessionId === undefined
  ) {
    return;
  }

  const tenantContext: NonNullable<SmartSuggestRequest['tenant']> = {};

  if (cartId !== undefined) {
    tenantContext.cartId = cartId;
  }
  if (salesChannelId !== undefined) {
    tenantContext.salesChannelId = salesChannelId;
  }
  if (sessionId !== undefined) {
    tenantContext.sessionId = sessionId;
  }
  if (tenantId !== undefined) {
    tenantContext.tenantId = tenantId;
  }

  return tenantContext;
};

type ParsedSuggestRequest =
  | {
      status: 'blocked';
      request: SmartSuggestRequest;
    }
  | {
      status: 'invalid';
      field: string;
      message: string;
    }
  | {
      status: 'valid';
      request: SmartSuggestRequest;
    };

const readCountryCodeAllowlist = (
  query: SmartSuggestQuery,
): ParsedSuggestRequest | readonly SmartSuggestCountryCode[] | undefined => {
  const rawCountryCodes = query.countryCodes?.trim();

  if (rawCountryCodes === undefined || rawCountryCodes === '') {
    return;
  }

  const parseResult = parseSmartSuggestCountryCodeList(rawCountryCodes);

  if (!parseResult.ok) {
    return {
      field: 'countryCodes',
      message:
        parseResult.reason === 'empty-allowlist'
          ? 'Expected countryCodes to contain at least one country code.'
          : `Expected countryCodes to contain comma-separated alpha country codes: ${parseResult.invalidTokens.join(
              ', ',
            )}`,
      status: 'invalid',
    };
  }

  return parseResult.countryCodes;
};

const parseSuggestRequest = (query: SmartSuggestQuery): ParsedSuggestRequest | undefined => {
  const rawQuery = query.q ?? query.query;

  if (rawQuery === undefined || rawQuery.trim().length === 0 || !/[\p{L}\p{N}]/u.test(rawQuery)) {
    return;
  }

  const request: SmartSuggestRequest = {
    kind: query.kind,
    query: rawQuery,
  };
  const countryCode = toCountryCode(query.countryCode);
  const countryCodes = readCountryCodeAllowlist(query);
  const tenant = readTenantContext(query);

  if (countryCodes !== undefined && !Array.isArray(countryCodes)) {
    return countryCodes;
  }

  request.limit = normalizeSuggestLimit(query.limit);
  if (countryCode !== undefined) {
    request.countryCode = countryCode;
  }
  if (countryCodes !== undefined) {
    request.countryCodes = countryCodes;
  }
  const countryScope = resolveSmartSuggestCountryScope({
    countryCode: request.countryCode,
    countryCodes: request.countryCodes,
  });
  request.countryScope = countryScope;
  if (request.countryCode === undefined && countryScope.countryCode !== undefined) {
    request.countryCode = countryScope.countryCode;
  }
  if (query.language !== undefined) {
    request.language = query.language;
  }
  if (tenant !== undefined) {
    request.tenant = tenant;
  }

  return countryScope.status === 'blocked'
    ? { request, status: 'blocked' }
    : { request, status: 'valid' };
};

interface SuggestionSourceRecord {
  attribution?: SuggestionSource['attribution'];
  datasetVersion?: string;
  id: string;
  name: string;
  sourceKind: SuggestionSourceKind;
}

const suggestionSourceKinds = new Set<SuggestionSourceKind>([
  'cache',
  'live-provider',
  'owned-dataset',
]);

const isSuggestionSourceKind = (value: string): value is SuggestionSourceKind =>
  suggestionSourceKinds.has(value as SuggestionSourceKind);

const toSuggestionSource = (source: SuggestionSourceRecord): SuggestionSource => {
  const suggestionSource: SuggestionSource = {
    id: source.id,
    kind: source.sourceKind,
    name: source.name,
  };

  if (source.attribution !== undefined) {
    suggestionSource.attribution = source.attribution;
  }

  if (source.datasetVersion !== undefined) {
    suggestionSource.datasetVersion = source.datasetVersion;
  }

  return suggestionSource;
};

const fallbackSourceKindForSourceId = (sourceId: string): SuggestionSourceKind => {
  if (sourceId.startsWith('live-provider:')) {
    return 'live-provider';
  }
  if (isSuggestionSourceKind(sourceId)) {
    return sourceId;
  }

  return 'owned-dataset';
};

const sourceForSourceId = (sourceId: string): SuggestionSource =>
  toSuggestionSource({
    id: sourceId,
    name: sourceId,
    sourceKind: fallbackSourceKindForSourceId(sourceId),
  });

const sourceForAddressRecord = (repositories: SmartSuggestRepositories, record: AddressRecord) =>
  repositories.dataSources
    .getDataSource(record.sourceId)
    .pipe(
      Effect.map((source) =>
        source === undefined ? sourceForSourceId(record.sourceId) : toSuggestionSource(source),
      ),
    );

const toSuggestion = (
  repositories: SmartSuggestRepositories,
  record: AddressRecord,
  cacheStatus: SmartSuggestCacheStatus = 'miss',
): Effect.Effect<SmartSuggestSuggestion, SmartSuggestStorageError, never> =>
  Effect.gen(function* toSuggestionProgram() {
    const source = yield* sourceForAddressRecord(repositories, record);
    const suggestion: SmartSuggestSuggestion = {
      address: record.parts,
      cacheStatus,
      confidence: record.quality,
      displayLabel: record.displayLabel,
      id: record.id,
      kind: 'address',
      metadata: {
        rankingReasons: 'storage:quality',
        rankingScore: record.quality,
      },
      searchLabel: record.searchLabel,
      source,
    };

    if (record.ranking?.addressCount !== undefined) {
      suggestion.metadata = {
        ...suggestion.metadata,
        addressCount: record.ranking.addressCount,
      };
    }

    if (record.attribution !== undefined) {
      suggestion.attribution = record.attribution;
    }

    return suggestion;
  });

const normalizeSuggestionMergeText = (value: string) =>
  value
    .normalize('NFKD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('cs-CZ')
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replaceAll(/\s+/gu, ' ');

const normalizeSuggestionPostalCode = (value: string | undefined) =>
  value?.replaceAll(/\D/gu, '') ?? '';

const compactPostalTextParts = (parts: readonly (string | undefined)[]) =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(' ');

const normalizePostalLocalityIdPart = (value: string) =>
  normalizeSuggestionMergeText(value).replaceAll(/\s+/gu, '-');

const createPostalLocalitySuggestions = ({
  cacheStatus,
  request,
  suggestions,
}: {
  cacheStatus?: SmartSuggestCacheStatus;
  request: SmartSuggestRequest;
  suggestions: readonly SmartSuggestSuggestion[];
}) => {
  const postalSuggestions: SmartSuggestSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of suggestions) {
    const { address } = suggestion;
    const postalDigits = normalizeSuggestionPostalCode(address?.postalCode);
    const city = address?.city?.trim();

    if (address === undefined || postalDigits === '' || city === undefined || city === '') {
      continue;
    }

    const countryCode = address.countryCode ?? request.countryCode;
    const key = [countryCode, postalDigits, normalizeSuggestionMergeText(city)].join('|');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const localityAddress: AddressParts = {
      city,
    };

    if (address.postalCode !== undefined) {
      localityAddress.postalCode = address.postalCode;
    }
    if (countryCode !== undefined) {
      localityAddress.countryCode = countryCode;
    }
    if (address.region !== undefined) {
      localityAddress.region = address.region;
    }

    const displayLabel = compactPostalTextParts([address.postalCode, city]);
    const metadata: Record<string, string | number | boolean | null> = {
      localityKind: 'postal-code',
    };

    if (address.district !== undefined) {
      metadata['representativeDistrict'] = address.district;
    }

    const postalSuggestion: SmartSuggestSuggestion = {
      address: localityAddress,
      confidence: Math.min(suggestion.confidence, 0.93),
      displayLabel,
      id: `${suggestion.source.id}:postal:${postalDigits}:${normalizePostalLocalityIdPart(city)}`,
      kind: 'postal',
      metadata,
      searchLabel: compactPostalTextParts([displayLabel, address.district, address.region]),
      source: suggestion.source,
    };

    if (suggestion.attribution !== undefined) {
      postalSuggestion.attribution = suggestion.attribution;
    }

    const resolvedCacheStatus = cacheStatus ?? suggestion.cacheStatus;

    if (resolvedCacheStatus !== undefined) {
      postalSuggestion.cacheStatus = resolvedCacheStatus;
    }

    postalSuggestions.push(postalSuggestion);
  }

  return postalSuggestions;
};

const readSuggestionMetadataNumber = (
  metadata: SmartSuggestSuggestion['metadata'] | undefined,
  keys: readonly string[],
) => {
  for (const key of keys) {
    const value = metadata?.[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
};

interface PlaceSuggestionAccumulator {
  addressCount: number;
  count: number;
  maxConfidence: number;
  suggestion: SmartSuggestSuggestion;
}

const placeAddressCountMetadataKeys = ['addressCount', 'sourceRecordCount'] as const;

const createLocalityAddress = (
  address: AddressParts | undefined,
  city: string,
  countryCode: SmartSuggestCountryCode,
): AddressParts => {
  const localityAddress: AddressParts = { city, countryCode };

  if (address?.region !== undefined) {
    localityAddress.region = address.region;
  }
  if (address?.district !== undefined) {
    localityAddress.district = address.district;
  }
  if (address?.postalCode !== undefined) {
    localityAddress.postalCode = address.postalCode;
  }

  return localityAddress;
};

const createPlaceSuggestion = ({
  addressCount,
  cacheStatus,
  city,
  countryCode,
  suggestion,
}: {
  addressCount: number;
  cacheStatus?: SmartSuggestCacheStatus;
  city: string;
  countryCode: SmartSuggestCountryCode;
  suggestion: SmartSuggestSuggestion;
}): SmartSuggestSuggestion => {
  const { address } = suggestion;

  const placeSuggestion: SmartSuggestSuggestion = {
    address: createLocalityAddress(address, city, countryCode),
    cacheStatus: cacheStatus ?? suggestion.cacheStatus,
    confidence: Math.min(suggestion.confidence, 0.95),
    displayLabel: compactPostalTextParts([city, address?.region, countryCode]),
    id: `${suggestion.source.id}:place:${countryCode}:${normalizePostalLocalityIdPart(city)}`,
    kind: 'place',
    metadata: {
      ...(addressCount > 0 ? { addressCount } : {}),
      matchKind: 'city',
      rankingScore: suggestion.confidence,
    },
    searchLabel: compactPostalTextParts([city, address?.district, address?.region, countryCode]),
    source: suggestion.source,
  };

  if (suggestion.attribution !== undefined) {
    placeSuggestion.attribution = suggestion.attribution;
  }

  return placeSuggestion;
};

const mergePlaceSuggestion = (
  places: Map<string, PlaceSuggestionAccumulator>,
  suggestion: SmartSuggestSuggestion,
  city: string,
  countryCode: SmartSuggestCountryCode,
  addressCount: number,
  cacheStatus: SmartSuggestCacheStatus | undefined,
) => {
  const key = [countryCode, normalizeSuggestionMergeText(city)].join('|');
  const existing = places.get(key);

  if (existing !== undefined) {
    existing.count += 1;
    existing.maxConfidence = Math.max(existing.maxConfidence, suggestion.confidence);
    existing.addressCount = Math.max(existing.addressCount, addressCount);
    return;
  }

  places.set(key, {
    addressCount,
    count: 1,
    maxConfidence: suggestion.confidence,
    suggestion: createPlaceSuggestion({ addressCount, cacheStatus, city, countryCode, suggestion }),
  });
};

const createPlaceSuggestions = ({
  cacheStatus,
  request,
  suggestions,
}: {
  cacheStatus?: SmartSuggestCacheStatus;
  request: SmartSuggestRequest;
  suggestions: readonly SmartSuggestSuggestion[];
}) => {
  const places = new Map<string, PlaceSuggestionAccumulator>();
  const normalizedCityPrefix = normalizeSuggestionMergeText(request.query);

  for (const suggestion of suggestions) {
    const { address } = suggestion;
    const city = address?.city?.trim();
    const countryCode = address?.countryCode ?? request.countryCode;

    if (
      city === undefined ||
      city.length === 0 ||
      countryCode === undefined ||
      !normalizeSuggestionMergeText(city).startsWith(normalizedCityPrefix)
    ) {
      continue;
    }

    mergePlaceSuggestion(
      places,
      suggestion,
      city,
      countryCode,
      readSuggestionMetadataNumber(suggestion.metadata, placeAddressCountMetadataKeys),
      cacheStatus,
    );
  }

  return [...places.values()]
    .toSorted(
      (left, right) =>
        right.addressCount - left.addressCount ||
        right.count - left.count ||
        right.maxConfidence - left.maxConfidence ||
        left.suggestion.displayLabel.localeCompare(right.suggestion.displayLabel, 'cs-CZ'),
    )
    .map((entry) => ({
      ...entry.suggestion,
      confidence: Math.min(0.99, entry.suggestion.confidence + Math.min(entry.count, 20) / 100),
      metadata: {
        ...entry.suggestion.metadata,
        sourceRecordCount: entry.count,
      },
    }))
    .slice(0, normalizeSuggestLimit(request.limit));
};

const effectiveCountryCodesForSearch = (request: SmartSuggestRequest) =>
  request.countryCodes ?? request.countryScope?.countryCodes;

const countryCodeScopesForRequest = (request: SmartSuggestRequest) => {
  if (request.countryCode !== undefined) {
    if (
      request.countryCodes !== undefined &&
      request.countryCodes.length > 0 &&
      !request.countryCodes.includes(request.countryCode)
    ) {
      return [];
    }

    return [request.countryCode];
  }

  if (request.countryCodes !== undefined && request.countryCodes.length > 0) {
    return [...new Set(request.countryCodes)];
  }
};

const suggestionMergeKey = (suggestion: SmartSuggestSuggestion) => {
  const { address } = suggestion;
  const structuredKey = [
    address?.countryCode,
    normalizeSuggestionPostalCode(address?.postalCode),
    address?.city,
    address?.street ?? address?.line1,
    address?.houseNumber,
    address?.orientationNumber,
  ]
    .filter((value) => value !== undefined && value.trim() !== '')
    .join('|');

  return normalizeSuggestionMergeText(
    structuredKey === '' ? `${suggestion.source.id}|${suggestion.displayLabel}` : structuredKey,
  );
};

const mergeScopedOwnedResponses = (
  request: SmartSuggestRequest,
  responses: readonly SmartSuggestResponse[],
): SmartSuggestResponse => {
  const suggestionsByKey = new Map<string, SmartSuggestSuggestion>();

  for (const response of responses) {
    for (const suggestion of response.suggestions) {
      const key = suggestionMergeKey(suggestion);
      const existing = suggestionsByKey.get(key);

      if (
        existing === undefined ||
        suggestion.confidence > existing.confidence ||
        (suggestion.confidence === existing.confidence &&
          readSuggestionMetadataNumber(suggestion.metadata, placeAddressCountMetadataKeys) >
            readSuggestionMetadataNumber(existing.metadata, placeAddressCountMetadataKeys))
      ) {
        suggestionsByKey.set(key, suggestion);
      }
    }
  }

  const [firstResponse] = responses;
  const suggestions = [...suggestionsByKey.values()]
    .toSorted(
      (left, right) =>
        readSuggestionMetadataNumber(right.metadata, placeAddressCountMetadataKeys) -
          readSuggestionMetadataNumber(left.metadata, placeAddressCountMetadataKeys) ||
        right.confidence - left.confidence ||
        left.displayLabel.localeCompare(right.displayLabel, 'cs-CZ'),
    )
    .slice(0, normalizeSuggestLimit(request.limit));

  return {
    cacheStatus: responses.some((response) => response.cacheStatus === 'miss')
      ? 'miss'
      : 'disabled',
    countryScope: request.countryScope,
    requestId: firstResponse?.requestId ?? 'owned-empty',
    suggestions,
  };
};

const suggestFromOwnedDataForSingleCountry = (
  request: SmartSuggestRequest,
  queryHash: string,
  repositories: SmartSuggestRepositories,
  cacheStatus: SmartSuggestCacheStatus = 'miss',
): Effect.Effect<SmartSuggestResponse, SmartSuggestStorageError, never> =>
  Effect.gen(function* suggestFromOwnedDataProgram() {
    if (request.kind !== 'address' && request.kind !== 'place' && request.kind !== 'postal') {
      return {
        cacheStatus: 'disabled',
        requestId: `owned-${queryHash.slice(0, 16)}`,
        suggestions: [],
      };
    }

    if (request.kind === 'postal') {
      const postalDigits = normalizeSuggestionPostalCode(request.query);

      if (postalDigits.length < 5) {
        const searchInput: Parameters<
          SmartSuggestRepositories['addressRecords']['searchAddressRecords']
        >[0] = {
          kind: 'postal',
          query: request.query,
        };

        if (request.countryCode !== undefined) {
          searchInput.countryCode = request.countryCode;
        }
        const effectiveCountryCodes = effectiveCountryCodesForSearch(request);
        if (effectiveCountryCodes !== undefined) {
          searchInput.countryCodes = effectiveCountryCodes;
        }
        if (request.limit !== undefined) {
          searchInput.limit = request.limit;
        }

        const records = yield* repositories.addressRecords.searchAddressRecords(searchInput);
        const addressSuggestions = yield* Effect.all(
          records.map((record) => toSuggestion(repositories, record, cacheStatus)),
        );

        return {
          cacheStatus,
          requestId: `owned-${queryHash.slice(0, 16)}`,
          suggestions: createPostalLocalitySuggestions({
            cacheStatus,
            request,
            suggestions: addressSuggestions,
          }).slice(0, normalizeSuggestLimit(request.limit)),
        };
      }

      const postalInput: Parameters<
        SmartSuggestRepositories['addressRecords']['listPostalLocalityAddressRecords']
      >[0] = {
        postalCode: request.query,
      };

      if (request.countryCode !== undefined) {
        postalInput.countryCode = request.countryCode;
      }

      const records =
        yield* repositories.addressRecords.listPostalLocalityAddressRecords(postalInput);
      const addressSuggestions = yield* Effect.all(
        records.map((record) => toSuggestion(repositories, record, cacheStatus)),
      );

      return {
        cacheStatus,
        requestId: `owned-${queryHash.slice(0, 16)}`,
        suggestions: createPostalLocalitySuggestions({
          cacheStatus,
          request,
          suggestions: addressSuggestions,
        }).slice(0, normalizeSuggestLimit(request.limit)),
      };
    }

    const searchInput: Parameters<
      SmartSuggestRepositories['addressRecords']['searchAddressRecords']
    >[0] = {
      kind: request.kind === 'place' ? 'place' : 'address',
      query: request.query,
    };

    if (request.countryCode !== undefined) {
      searchInput.countryCode = request.countryCode;
    }
    const effectiveCountryCodes = effectiveCountryCodesForSearch(request);
    if (effectiveCountryCodes !== undefined) {
      searchInput.countryCodes = effectiveCountryCodes;
    }
    if (request.limit !== undefined) {
      searchInput.limit = request.limit;
    }

    const records = yield* repositories.addressRecords.searchAddressRecords(searchInput);
    const addressSuggestions = yield* Effect.all(
      records.map((record) => toSuggestion(repositories, record, cacheStatus)),
    );

    if (request.kind === 'place') {
      return {
        cacheStatus,
        requestId: `owned-${queryHash.slice(0, 16)}`,
        suggestions: createPlaceSuggestions({
          cacheStatus,
          request,
          suggestions: addressSuggestions,
        }),
      };
    }

    return {
      cacheStatus,
      requestId: `owned-${queryHash.slice(0, 16)}`,
      suggestions: addressSuggestions,
    };
  });

const suggestFromOwnedData = (
  request: SmartSuggestRequest,
  queryHash: string,
  repositories: SmartSuggestRepositories,
  cacheStatus: SmartSuggestCacheStatus = 'miss',
): Effect.Effect<SmartSuggestResponse, SmartSuggestStorageError, never> => {
  const countryScopes = countryCodeScopesForRequest(request);

  if (countryScopes !== undefined) {
    if (countryScopes.length === 0) {
      return Effect.succeed({
        cacheStatus,
        requestId: `owned-${queryHash.slice(0, 16)}`,
        suggestions: [],
      });
    }

    if (countryScopes.length > 1) {
      return Effect.all(
        countryScopes.map((countryCode) =>
          suggestFromOwnedDataForSingleCountry(
            { ...request, countryCode, countryCodes: undefined },
            queryHash,
            repositories,
            cacheStatus,
          ),
        ),
      ).pipe(Effect.map((responses) => mergeScopedOwnedResponses(request, responses)));
    }
  }

  return suggestFromOwnedDataForSingleCountry(request, queryHash, repositories, cacheStatus);
};

const readScopedProviderConfig = (
  tenant: TenantRecord | undefined,
  request: SmartSuggestRequest,
  env?: SmartSuggestWorkerEnv,
) => {
  const rootConfig = tenant?.countryConfig;
  const countryConfigs = readOptionalRecord(rootConfig?.['countries']);
  const countryConfig =
    request.countryCode === undefined
      ? undefined
      : readOptionalRecord(countryConfigs?.[request.countryCode]);
  const kindConfigs = readOptionalRecord(countryConfig?.['kinds']);
  const kindConfig = readOptionalRecord(kindConfigs?.[request.kind]);
  const scopeConfigs = [kindConfig, countryConfig, rootConfig].filter(
    (config) => config !== undefined,
  );
  const priority =
    scopeConfigs
      .map((config) => optionalStringArray(config['providerPriority']))
      .find((value) => value !== undefined) ??
    tenant?.providerPriority ??
    runtimeEnvStringArray(env, 'SMART_SUGGEST_PROVIDER_PRIORITY');

  return {
    priority,
    scopeConfigs,
  };
};

const readProviderConfigRecord = (
  providerScopes: readonly Record<string, unknown>[],
  providerKeys: readonly string[],
) =>
  providerScopes
    .map((providerScope) => {
      const providers = readOptionalRecord(providerScope['providers']);

      return providerKeys
        .map((providerKey) => readOptionalRecord(providers?.[providerKey]))
        .find((value) => value !== undefined);
    })
    .find((value) => value !== undefined);

const assignDefined = <TTarget extends object, TKey extends keyof TTarget>(
  target: TTarget,
  key: TKey,
  value: TTarget[TKey] | undefined,
) => {
  if (value !== undefined) {
    target[key] = value;
  }
};

const readProviderString = (
  providerConfig: Record<string, unknown> | undefined,
  key: string,
  env: SmartSuggestWorkerEnv | undefined,
  envKey: keyof SmartSuggestWorkerEnv,
) => optionalString(providerConfig?.[key]) ?? runtimeEnvString(env, envKey);

const readProviderNumber = (
  providerConfig: Record<string, unknown> | undefined,
  key: string,
  env: SmartSuggestWorkerEnv | undefined,
  envKey: keyof SmartSuggestWorkerEnv,
) => optionalNumber(providerConfig?.[key]) ?? runtimeEnvNumber(env, envKey);

const readMapyProviderConfig = (
  providerScopes: readonly Record<string, unknown>[],
  request: SmartSuggestRequest,
  env?: SmartSuggestWorkerEnv,
): SmartSuggestProviderRuntimeConfig['mapyCz'] => {
  const mapyConfig = readProviderConfigRecord(providerScopes, ['mapy-cz', 'mapyCz']);
  const apiKey = optionalString(mapyConfig?.['apiKey']) ?? runtimeEnvString(env, 'MAPY_CZ_API_KEY');

  if (apiKey === undefined) {
    return;
  }

  const config: NonNullable<SmartSuggestProviderRuntimeConfig['mapyCz']> = {
    apiKey,
  };
  const endpointUrl =
    optionalString(mapyConfig?.['endpointUrl']) ?? runtimeEnvString(env, 'MAPY_CZ_ENDPOINT_URL');
  const language = optionalString(mapyConfig?.['language']) ?? request.language;
  const limit = optionalNumber(mapyConfig?.['limit']);

  assignDefined(config, 'endpointUrl', endpointUrl);
  assignDefined(config, 'language', language);
  assignDefined(config, 'limit', limit);

  return config;
};

const readRuianGeocodeProviderConfig = (
  providerScopes: readonly Record<string, unknown>[],
  request: SmartSuggestRequest,
  env?: SmartSuggestWorkerEnv,
): SmartSuggestProviderRuntimeConfig['ruianGeocode'] => {
  if (request.kind !== 'address' && request.kind !== 'postal') {
    return;
  }

  if (request.countryCode !== undefined && request.countryCode !== 'CZ') {
    return;
  }

  const ruianConfig = readProviderConfigRecord(providerScopes, [
    'ruian',
    'ruian-geocode',
    'ruianGeocode',
  ]);
  const enabled = optionalBoolean(ruianConfig?.['enabled']);
  const disabled =
    optionalBoolean(ruianConfig?.['disabled']) ?? runtimeEnvBoolean(env, 'RUIAN_GEOCODE_DISABLED');

  if (enabled === false || disabled === true) {
    return;
  }

  const config: NonNullable<SmartSuggestProviderRuntimeConfig['ruianGeocode']> = {};
  const baseUrl =
    optionalString(ruianConfig?.['baseUrl']) ?? runtimeEnvString(env, 'RUIAN_GEOCODE_BASE_URL');
  const limit =
    optionalNumber(ruianConfig?.['limit']) ?? runtimeEnvNumber(env, 'RUIAN_GEOCODE_DEFAULT_LIMIT');

  assignDefined(config, 'baseUrl', baseUrl);
  assignDefined(config, 'limit', limit);

  return config;
};

const readRadarAutocompleteProviderConfig = (
  providerScopes: readonly Record<string, unknown>[],
  env?: SmartSuggestWorkerEnv,
): SmartSuggestProviderRuntimeConfig['radarAutocomplete'] => {
  const radarConfig = readProviderConfigRecord(providerScopes, [
    'radar-autocomplete',
    'radarAutocomplete',
  ]);
  const apiKey = optionalString(radarConfig?.['apiKey']) ?? runtimeEnvString(env, 'RADAR_API_KEY');

  if (apiKey === undefined) {
    return;
  }

  const config: NonNullable<SmartSuggestProviderRuntimeConfig['radarAutocomplete']> = {
    apiKey,
  };
  const baseUrl =
    optionalString(radarConfig?.['baseUrl']) ??
    runtimeEnvString(env, 'RADAR_AUTOCOMPLETE_BASE_URL');
  const countryCode =
    toCountryCode(optionalString(radarConfig?.['countryCode'])) ??
    toCountryCode(runtimeEnvString(env, 'RADAR_AUTOCOMPLETE_COUNTRY_CODE'));
  const layers =
    optionalString(radarConfig?.['layers']) ?? runtimeEnvString(env, 'RADAR_AUTOCOMPLETE_LAYERS');
  const limit =
    optionalNumber(radarConfig?.['limit']) ??
    runtimeEnvNumber(env, 'RADAR_AUTOCOMPLETE_DEFAULT_LIMIT');
  const near =
    optionalString(radarConfig?.['near']) ?? runtimeEnvString(env, 'RADAR_AUTOCOMPLETE_NEAR');

  assignDefined(config, 'baseUrl', baseUrl);
  assignDefined(config, 'countryCode', countryCode);
  assignDefined(config, 'layers', layers);
  assignDefined(config, 'limit', limit);
  assignDefined(config, 'near', near);

  return config;
};

const readHereFallbackAt = (
  hereConfig: Record<string, unknown> | undefined,
  env?: SmartSuggestWorkerEnv,
) => {
  const defaultLat = readProviderNumber(hereConfig, 'defaultLat', env, 'HERE_DEFAULT_LAT');
  const defaultLng = readProviderNumber(hereConfig, 'defaultLng', env, 'HERE_DEFAULT_LNG');

  return defaultLat === undefined || defaultLng === undefined
    ? undefined
    : `${defaultLat},${defaultLng}`;
};

const readHereDiscoverProviderConfig = (
  providerScopes: readonly Record<string, unknown>[],
  env?: SmartSuggestWorkerEnv,
): SmartSuggestProviderRuntimeConfig['hereDiscover'] => {
  const hereConfig = readProviderConfigRecord(providerScopes, ['here-discover', 'hereDiscover']);
  const apiKey = optionalString(hereConfig?.['apiKey']) ?? runtimeEnvString(env, 'HERE_API_KEY');

  if (apiKey === undefined) {
    return;
  }

  const config: NonNullable<SmartSuggestProviderRuntimeConfig['hereDiscover']> = {
    apiKey,
  };
  const baseUrl = readProviderString(hereConfig, 'baseUrl', env, 'HERE_DISCOVER_BASE_URL');
  const at =
    readProviderString(hereConfig, 'at', env, 'HERE_DISCOVER_AT') ??
    readHereFallbackAt(hereConfig, env);
  const inArea = readProviderString(hereConfig, 'inArea', env, 'HERE_DISCOVER_IN_AREA');
  const language = readProviderString(hereConfig, 'language', env, 'HERE_DISCOVER_LANGUAGE');
  const limit = readProviderNumber(hereConfig, 'limit', env, 'HERE_DISCOVER_DEFAULT_LIMIT');

  assignDefined(config, 'at', at);
  assignDefined(config, 'baseUrl', baseUrl);
  assignDefined(config, 'inArea', inArea);
  assignDefined(config, 'language', language);
  assignDefined(config, 'limit', limit);

  return config;
};

const readNominatimProviderConfig = (
  providerScopes: readonly Record<string, unknown>[],
  env?: SmartSuggestWorkerEnv,
): SmartSuggestProviderRuntimeConfig['nominatim'] => {
  const nominatimConfig = readProviderConfigRecord(providerScopes, ['nominatim']);
  const userAgent =
    optionalString(nominatimConfig?.['userAgent']) ?? runtimeEnvString(env, 'NOMINATIM_USER_AGENT');

  if (userAgent === undefined) {
    return;
  }

  const config: NonNullable<SmartSuggestProviderRuntimeConfig['nominatim']> = {
    userAgent,
  };
  const baseUrl =
    optionalString(nominatimConfig?.['baseUrl']) ?? runtimeEnvString(env, 'NOMINATIM_BASE_URL');
  const email =
    optionalString(nominatimConfig?.['email']) ?? runtimeEnvString(env, 'NOMINATIM_EMAIL');
  const limit =
    optionalNumber(nominatimConfig?.['limit']) ?? runtimeEnvNumber(env, 'NOMINATIM_DEFAULT_LIMIT');
  const referer =
    optionalString(nominatimConfig?.['referer']) ?? runtimeEnvString(env, 'NOMINATIM_REFERER');

  assignDefined(config, 'baseUrl', baseUrl);
  assignDefined(config, 'email', email);
  assignDefined(config, 'limit', limit);
  assignDefined(config, 'referer', referer);

  return config;
};

const readProviderTimeoutMs = (providerScopes: readonly Record<string, unknown>[]) =>
  providerScopes
    .map((providerScope) => optionalNumber(providerScope['providerTimeoutMs']))
    .find((value) => value !== undefined);

const readProviderCacheTtlSeconds = (
  providerScopes: readonly Record<string, unknown>[],
  env?: SmartSuggestWorkerEnv,
) => {
  const configured =
    providerScopes
      .map((providerScope) => optionalNumber(providerScope['providerCacheTtlSeconds']))
      .find((value) => value !== undefined) ??
    runtimeEnvNumber(env, 'SMART_SUGGEST_PROVIDER_CACHE_TTL_SECONDS') ??
    43_200;

  return Math.max(60, Math.min(Math.trunc(configured), 604_800));
};

const readProviderRuntimeConfig = (
  tenant: TenantRecord | undefined,
  request: SmartSuggestRequest,
  env?: SmartSuggestWorkerEnv,
): SmartSuggestProviderRuntimeConfig => {
  const scopedConfig = readScopedProviderConfig(tenant, request, env);
  const config: SmartSuggestProviderRuntimeConfig = {};
  const { priority } = scopedConfig;
  const ruianGeocode = readRuianGeocodeProviderConfig(scopedConfig.scopeConfigs, request, env);
  const mapyCz = readMapyProviderConfig(scopedConfig.scopeConfigs, request, env);
  const radarAutocomplete = readRadarAutocompleteProviderConfig(scopedConfig.scopeConfigs, env);
  const hereDiscover = readHereDiscoverProviderConfig(scopedConfig.scopeConfigs, env);
  const nominatim = readNominatimProviderConfig(scopedConfig.scopeConfigs, env);
  const timeoutMs =
    readProviderTimeoutMs(scopedConfig.scopeConfigs) ??
    runtimeEnvNumber(env, 'SMART_SUGGEST_PROVIDER_TIMEOUT_MS');

  if (priority !== undefined) {
    config.priority = priority;
  }
  if (ruianGeocode !== undefined) {
    config.ruianGeocode = ruianGeocode;
  }
  if (mapyCz !== undefined) {
    config.mapyCz = mapyCz;
  }
  if (radarAutocomplete !== undefined) {
    config.radarAutocomplete = radarAutocomplete;
  }
  if (hereDiscover !== undefined) {
    config.hereDiscover = hereDiscover;
  }
  if (nominatim !== undefined) {
    config.nominatim = nominatim;
  }
  if (timeoutMs !== undefined) {
    config.timeoutMs = timeoutMs;
  }

  return config;
};

const providerRegistryKey = (
  tenant: TenantRecord | undefined,
  request: SmartSuggestRequest,
  config: SmartSuggestProviderRuntimeConfig,
) =>
  [
    tenant?.id ?? 'anonymous',
    request.countryCode ?? 'global',
    request.kind,
    JSON.stringify(config),
  ].join(':');

const getProviderRegistry = (
  tenant: TenantRecord | undefined,
  request: SmartSuggestRequest,
  env?: SmartSuggestWorkerEnv,
) => {
  const config = readProviderRuntimeConfig(tenant, request, env);
  const key = providerRegistryKey(tenant, request, config);
  const existingRegistry = providerRegistries.get(key);

  if (existingRegistry !== undefined) {
    return existingRegistry;
  }

  const registry = createSmartSuggestProviderRegistryFromConfig(config);
  providerRegistries.set(key, registry);
  return registry;
};

interface RecordProviderEventsInput {
  events: readonly ProviderEventSummary[];
  queryHash: string;
  repositories: SmartSuggestRepositories;
  request: SmartSuggestRequest;
  requestId: string;
}

const recordProviderEvents = ({
  events,
  queryHash,
  repositories,
  request,
  requestId,
}: RecordProviderEventsInput) => {
  const metrics = metricsForRepositories(repositories);

  return Effect.all(
    events.map((event, index) =>
      Effect.gen(function* recordProviderEventProgram() {
        const { providerId, status: providerStatus } = event;
        const id = yield* createTelemetryId('provider', requestId, providerId, String(index));
        const record: Parameters<typeof repositories.providerEvents.recordProviderEvent>[0] = {
          id,
          providerId,
          queryHash,
          requestId,
          status: providerStatus,
        };

        if (event.errorCode !== undefined) {
          record.errorCode = event.errorCode;
        }
        if (event.latencyMs !== undefined) {
          record.latencyMs = event.latencyMs;
        }
        if (request.tenant?.tenantId !== undefined) {
          record.tenantId = request.tenant.tenantId;
        }

        metrics.providerEvents[providerStatus] += 1;
        yield* repositories.providerEvents.recordProviderEvent(record);
      }),
    ),
  ).pipe(Effect.asVoid);
};

const liveProviderDataSourceId = (source: SuggestionSource, countryCode: SmartSuggestCountryCode) =>
  `live-provider:${source.id}:${countryCode}`;

const sourceAllowsLiveProviderDurableRetention = (source: SuggestionSource) =>
  smartSuggestSourceAllowsWrite(catalogSourceIdForSuggestionSource(source), 'durable-retention');

const attributionForLiveProviderSuggestion = (suggestion: SmartSuggestSuggestion) =>
  suggestion.source.attribution ??
  suggestion.attribution ?? {
    label: suggestion.source.name,
  };

const cachePolicyForLiveProviderDataSource = (
  source: SuggestionSource,
  ttlSeconds: number,
): Parameters<SmartSuggestRepositories['dataSources']['registerDataSource']>[0]['cachePolicy'] =>
  smartSuggestSourceAllowsWrite(catalogSourceIdForSuggestionSource(source), 'permanent-cache')
    ? { kind: 'permanent' }
    : { kind: 'ttl', ttlSeconds };

const countryCodeForSuggestion = (
  request: SmartSuggestRequest,
  suggestion: SmartSuggestSuggestion,
) => toCountryCode(suggestion.address?.countryCode) ?? request.countryCode;

const registerLiveProviderDataSource = (
  repositories: SmartSuggestRepositories,
  suggestion: SmartSuggestSuggestion,
  countryCode: SmartSuggestCountryCode,
  ttlSeconds: number,
) => {
  const input: Parameters<typeof repositories.dataSources.registerDataSource>[0] = {
    attribution: attributionForLiveProviderSuggestion(suggestion),
    cachePolicy: cachePolicyForLiveProviderDataSource(suggestion.source, ttlSeconds),
    countryCode,
    id: liveProviderDataSourceId(suggestion.source, countryCode),
    name: suggestion.source.name,
    sourceKind: 'live-provider',
  };

  if (suggestion.source.datasetVersion !== undefined) {
    input.datasetVersion = suggestion.source.datasetVersion;
  }

  return repositories.dataSources.registerDataSource(input);
};

const persistLiveProviderSuggestions = (
  request: SmartSuggestRequest,
  response: SmartSuggestResponse,
  repositories: SmartSuggestRepositories,
  ttlSeconds: number,
) =>
  Effect.gen(function* persistLiveProviderSuggestionsProgram() {
    const recordResults = yield* Effect.all(
      response.suggestions.map((suggestion) =>
        Effect.gen(function* recordResultsProgram() {
          const countryCode = countryCodeForSuggestion(request, suggestion);

          if (
            countryCode === undefined ||
            suggestion.kind !== 'address' ||
            !sourceAllowsLiveProviderDurableRetention(suggestion.source)
          ) {
            return;
          }

          const source = yield* registerLiveProviderDataSource(
            repositories,
            suggestion,
            countryCode,
            ttlSeconds,
          );
          return createAddressRecordFromSuggestion({
            countryCode,
            sourceId: source.id,
            suggestion,
          });
        }),
      ),
    );
    const records = recordResults.filter(
      (record): record is AddressSearchRecordInput => record !== undefined,
    );

    if (records.length === 0) {
      return [];
    }

    return yield* repositories.addressRecords.upsertAddressRecords(records);
  });

const withCacheStatus = (
  response: SmartSuggestResponse,
  cacheStatus: SmartSuggestCacheStatus,
): SmartSuggestResponse => ({
  ...response,
  cacheStatus,
  suggestions: response.suggestions.map((suggestion) => ({
    ...suggestion,
    cacheStatus,
  })),
});

const addressNumberPattern = /\d/u;

const hasAddressNumberSignal = (address: NonNullable<SmartSuggestSuggestion['address']>) =>
  address.houseNumber !== undefined || addressNumberPattern.test(address.line1 ?? '');

const isAddressSuggestionForRequest = (suggestion: SmartSuggestSuggestion) => {
  const { address } = suggestion;

  if (address === undefined) {
    return false;
  }

  const hasAddressLine =
    address.street !== undefined || address.line1 !== undefined || hasAddressNumberSignal(address);
  const hasLocalityContext =
    address.city !== undefined ||
    address.postalCode !== undefined ||
    hasAddressNumberSignal(address);

  return hasAddressLine && hasLocalityContext;
};

const isSuggestionInCountryScope = (
  request: SmartSuggestRequest,
  suggestion: SmartSuggestSuggestion,
) => {
  const countryCodes = countryCodeScopesForRequest(request);

  if (countryCodes === undefined) {
    return true;
  }
  if (countryCodes.length === 0) {
    return false;
  }

  const countryCode = suggestion.address?.countryCode;

  return countryCode !== undefined && countryCodes.includes(countryCode);
};

const filterSuggestionsForRequest = (
  request: SmartSuggestRequest,
  response: SmartSuggestResponse,
): SmartSuggestResponse => {
  const scopedSuggestions = response.suggestions.filter((suggestion) =>
    isSuggestionInCountryScope(request, suggestion),
  );

  return request.kind === 'address'
    ? {
        ...response,
        suggestions: scopedSuggestions.filter(isAddressSuggestionForRequest),
      }
    : { ...response, suggestions: scopedSuggestions };
};

const mergeSuggestionResponses = (
  ownedResponse: SmartSuggestResponse,
  providerResponse: SmartSuggestResponse,
  request: SmartSuggestRequest,
): SmartSuggestResponse => {
  const seen = new Set<string>();
  const suggestions: SmartSuggestSuggestion[] = [];
  const limit = normalizeSuggestLimit(request.limit);

  for (const suggestion of [...ownedResponse.suggestions, ...providerResponse.suggestions]) {
    const key = suggestionMergeKey(suggestion);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    suggestions.push(suggestion);
  }

  return {
    ...providerResponse,
    suggestions: suggestions.slice(0, limit),
  };
};

interface WriteProviderCacheInput {
  cacheKey: string;
  queryHash: string;
  repositories: SmartSuggestRepositories;
  request: SmartSuggestRequest;
  response: SmartSuggestResponse;
  ttlSeconds: number;
}

const writeProviderCache = ({
  cacheKey,
  queryHash,
  repositories,
  request,
  response,
  ttlSeconds,
}: WriteProviderCacheInput) => {
  if (!isLayerCacheableSuggestResponse(response, ttlSeconds)) {
    return Effect.void;
  }

  const expiresAt = DateTime.formatIso(
    DateTime.addDuration(DateTime.nowUnsafe(), Duration.seconds(ttlSeconds)),
  );
  const cacheWrite: Parameters<typeof repositories.suggestCache.writeSuggestCache>[0] = {
    cacheKey,
    cachePolicy: { kind: 'ttl', ttlSeconds },
    expiresAt,
    kind: request.kind,
    payload: response.suggestions,
    queryHash,
    status: 'written',
  };

  if (request.countryCode !== undefined) {
    cacheWrite.countryCode = request.countryCode;
  }
  if (request.countryCodes !== undefined) {
    cacheWrite.countryCodes = request.countryCodes;
  }
  if (request.language !== undefined) {
    cacheWrite.language = request.language;
  }
  if (request.tenant?.tenantId !== undefined) {
    cacheWrite.tenantId = request.tenant.tenantId;
  }

  return repositories.suggestCache.writeSuggestCache(cacheWrite);
};

interface SuggestFromProviderEnrichmentInput {
  cacheKey: string;
  env?: SmartSuggestWorkerEnv | undefined;
  ownedResponse: SmartSuggestResponse;
  queryHash: string;
  repositories: SmartSuggestRepositories;
  request: SmartSuggestRequest;
}

type SuggestFromProviderEnrichmentResult =
  | {
      kind: 'contributed';
      response: SmartSuggestResponse;
      ttlSeconds: number;
    }
  | {
      kind: 'miss';
      providerAttempted: boolean;
    };

const suggestFromProviderEnrichment = ({
  cacheKey,
  env,
  ownedResponse,
  queryHash,
  repositories,
  request,
}: SuggestFromProviderEnrichmentInput): Effect.Effect<
  SuggestFromProviderEnrichmentResult | undefined,
  never,
  never
> =>
  Effect.gen(function* suggestFromProviderEnrichmentProgram() {
    const tenantId = request.tenant?.tenantId;
    const tenant =
      tenantId === undefined ? undefined : yield* repositories.tenants.getTenant(tenantId);
    const scopedConfig = readScopedProviderConfig(tenant, request, env);
    const providerCacheTtlSeconds = readProviderCacheTtlSeconds(scopedConfig.scopeConfigs, env);
    const result = yield* getProviderRegistry(tenant, request, env).suggest(request, {
      requestId: `provider-${queryHash.slice(0, 16)}`,
    });

    yield* recordProviderEvents({
      events: result.providerEvents,
      queryHash,
      repositories,
      request,
      requestId: result.response.requestId,
    }).pipe(Effect.orElseSucceed(() => null));
    const providerAttempted = result.providerEvents.length > 0;

    let providerResponse = filterSuggestionsForRequest(
      request,
      withCacheStatus(result.response, 'written'),
    );

    if (providerResponse.suggestions.length === 0) {
      return { kind: 'miss', providerAttempted };
    }

    providerResponse = withCacheStatus(providerResponse, 'written');
    const mergedResponse = filterSuggestionsForRequest(
      request,
      mergeSuggestionResponses(ownedResponse, providerResponse, request),
    );

    return yield* Effect.all([
      persistLiveProviderSuggestions(
        request,
        providerResponse,
        repositories,
        providerCacheTtlSeconds,
      ),
      writeProviderCache({
        cacheKey,
        queryHash,
        repositories,
        request,
        response: mergedResponse,
        ttlSeconds: providerCacheTtlSeconds,
      }),
    ]).pipe(
      Effect.as({
        kind: 'contributed' as const,
        response: mergedResponse,
        ttlSeconds: providerCacheTtlSeconds,
      }),
      Effect.orElseSucceed(() => ({
        kind: 'contributed' as const,
        response: mergedResponse,
        ttlSeconds: providerCacheTtlSeconds,
      })),
    );
  }).pipe(Effect.orElseSucceed(() => ({ kind: 'miss', providerAttempted: false })));

interface WriteOwnedCacheInput {
  cacheKey: string;
  queryHash: string;
  repositories: SmartSuggestRepositories;
  request: SmartSuggestRequest;
  response: SmartSuggestResponse;
}

const writeOwnedCache = ({
  cacheKey,
  queryHash,
  repositories,
  request,
  response,
}: WriteOwnedCacheInput) => {
  if (!isLayerCacheableSuggestResponse(response)) {
    return Effect.void;
  }

  const cacheWrite: Parameters<typeof repositories.suggestCache.writeSuggestCache>[0] = {
    cacheKey,
    cachePolicy: { kind: 'permanent' },
    kind: request.kind,
    payload: response.suggestions,
    queryHash,
  };

  if (request.countryCode !== undefined) {
    cacheWrite.countryCode = request.countryCode;
  }
  if (request.countryCodes !== undefined) {
    cacheWrite.countryCodes = request.countryCodes;
  }
  if (request.language !== undefined) {
    cacheWrite.language = request.language;
  }
  if (request.tenant?.tenantId !== undefined) {
    cacheWrite.tenantId = request.tenant.tenantId;
  }

  return repositories.suggestCache.writeSuggestCache(cacheWrite);
};

const createSuggestCacheKeyForRequest = (request: SmartSuggestRequest, queryHash: string) => {
  const cacheKeyInput: Parameters<typeof createSuggestCacheKey>[0] = {
    kind: request.kind,
    queryHash,
  };

  if (request.countryCode !== undefined) {
    cacheKeyInput.countryCode = request.countryCode;
  }
  if (request.countryCodes !== undefined) {
    cacheKeyInput.countryCodes = request.countryCodes;
  }
  if (request.language !== undefined) {
    cacheKeyInput.language = request.language;
  }
  if (request.tenant?.tenantId !== undefined) {
    cacheKeyInput.tenantId = request.tenant.tenantId;
  }

  return createSuggestCacheKey(cacheKeyInput);
};

interface FinalizeSuggestResponseInput {
  cacheKey: string;
  cacheLevels: SmartSuggestCacheLevels;
  edgeCache: SmartSuggestEdgeCache | undefined;
  edgeTtlSeconds?: number;
  repositories: SmartSuggestRepositories;
  response: SmartSuggestResponse;
  runtimeCacheEnabled?: boolean;
  sourceKind: SuggestSourceKind;
  startedAt: number;
  workerCache: Map<string, SmartSuggestLayerCacheEntry>;
}

const cacheLevelsForFinalResponse = (
  response: SmartSuggestResponse,
  cacheLevels: SmartSuggestCacheLevels,
) => (response.cacheStatus === 'disabled' ? createDisabledCacheLevels() : cacheLevels);

const finalizeSuggestResponse = ({
  cacheKey,
  cacheLevels,
  edgeCache,
  edgeTtlSeconds,
  repositories,
  response,
  runtimeCacheEnabled = true,
  sourceKind,
  startedAt,
  workerCache,
}: FinalizeSuggestResponseInput): Effect.Effect<SmartSuggestResponse, never, never> =>
  Effect.gen(function* finalizeSuggestResponseProgram() {
    if (runtimeCacheEnabled) {
      yield* rememberRuntimeSuggestCaches(
        cacheKey,
        response,
        cacheLevels,
        workerCache,
        edgeCache,
        edgeTtlSeconds,
      );
    }
    const responseWithLevels = withCacheLevels(
      response,
      cacheLevelsForFinalResponse(response, cacheLevels),
    );

    recordSuggestResponse(repositories, responseWithLevels, startedAt, sourceKind);

    return responseForPublicDto(responseWithLevels);
  });

const writeOwnedCacheBestEffort = (
  input: WriteOwnedCacheInput,
  cacheLevels: SmartSuggestCacheLevels,
): Effect.Effect<void, never, never> => {
  if (!isLayerCacheableSuggestResponse(input.response)) {
    return Effect.void;
  }

  return writeOwnedCache(input).pipe(
    Effect.tap(() =>
      Effect.sync(() => {
        if (input.response.cacheStatus !== 'disabled') {
          cacheLevels.d1ReadThrough = cacheLevel(true, 'written');
        }
      }),
    ),
    Effect.asVoid,
    catchEffect(() => Effect.void),
  );
};

interface ProviderEnrichmentResponseInput {
  cacheKey: string;
  cacheLevels: SmartSuggestCacheLevels;
  env?: SmartSuggestWorkerEnv | undefined;
  ownedResponse: SmartSuggestResponse;
  queryHash: string;
  repositories: SmartSuggestRepositories;
  request: SmartSuggestRequest;
}

type ProviderEnrichmentResponseResult =
  | {
      edgeTtlSeconds: number;
      kind: 'contributed';
      response: SmartSuggestResponse;
    }
  | {
      kind: 'miss';
      providerAttempted: boolean;
    };

const providerEnrichmentEnabledForRequest = (
  request: SmartSuggestRequest,
  env?: SmartSuggestWorkerEnv,
) =>
  request.tenant?.tenantId !== undefined ||
  runtimeEnvBoolean(env, 'SMART_SUGGEST_PROVIDER_ENRICHMENT_ENABLED') === true;

const providerEnrichmentResponseFor = ({
  cacheKey,
  cacheLevels,
  env,
  ownedResponse,
  queryHash,
  repositories,
  request,
}: ProviderEnrichmentResponseInput): Effect.Effect<
  ProviderEnrichmentResponseResult | undefined,
  never,
  never
> =>
  Effect.gen(function* providerEnrichmentResponseForProgram() {
    if (request.kind === 'postal') {
      return;
    }

    if (ownedResponse.suggestions.length >= normalizeSuggestLimit(request.limit)) {
      return;
    }

    if (!providerEnrichmentEnabledForRequest(request, env)) {
      return;
    }

    const enrichment = yield* suggestFromProviderEnrichment({
      cacheKey,
      env,
      ownedResponse,
      queryHash,
      repositories,
      request,
    });

    if (enrichment === undefined || enrichment.kind === 'miss') {
      return enrichment;
    }

    const enrichedResponse = filterSuggestionsForRequest(request, enrichment.response);

    if (enrichedResponse.suggestions.length === 0) {
      return { kind: 'miss', providerAttempted: true };
    }

    cacheLevels.ownedDb = cacheLevel(true, ownedDbCacheStatusForResponse(enrichedResponse));

    if (enrichedResponse.cacheStatus === 'written') {
      cacheLevels.d1ReadThrough = cacheLevel(true, 'written');
    }

    return {
      edgeTtlSeconds: enrichment.ttlSeconds,
      kind: 'contributed',
      response: enrichedResponse,
    };
  });

const blockedCountryScopeResponse = (request: SmartSuggestRequest): SmartSuggestResponse => ({
  cacheStatus: 'disabled',
  countryScope: request.countryScope,
  requestId: `blocked-country-scope-${request.kind}`,
  suggestions: [],
});

const suggest = (
  query: SmartSuggestQuery,
  repositories: SmartSuggestRepositories,
  env?: SmartSuggestWorkerEnv,
): Effect.Effect<SmartSuggestResponse, SmartSuggestSuggestError, never> => {
  const startedAt = performance.now();
  const parsedSuggestRequest = parseSuggestRequest(query);

  if (parsedSuggestRequest === undefined) {
    return Effect.fail(badRequestError('Missing or invalid suggest query parameters.'));
  }
  if (parsedSuggestRequest.status === 'invalid') {
    return Effect.fail(badRequestError(parsedSuggestRequest.message, parsedSuggestRequest.field));
  }

  const suggestRequest = parsedSuggestRequest.request;

  if (parsedSuggestRequest.status === 'blocked') {
    return Effect.succeed(responseForPublicDto(blockedCountryScopeResponse(suggestRequest)));
  }

  return Effect.gen(function* suggestProgram() {
    const queryHashOptions: Parameters<typeof createSuggestQueryHashEffect>[1] = {};

    if (env?.SMART_SUGGEST_QUERY_HASH_SECRET !== undefined) {
      queryHashOptions.secret = env.SMART_SUGGEST_QUERY_HASH_SECRET;
    }

    const queryHash = yield* createSuggestQueryHashEffect(suggestRequest, queryHashOptions);
    const cacheKey = createSuggestCacheKeyForRequest(suggestRequest, queryHash);
    const edgeCache = readEdgeCache();
    const workerCache = workerSuggestCacheFor(repositories);
    const cacheLevels = createSuggestCacheLevels(edgeCache !== undefined);
    const edgeCached =
      edgeCache === undefined ? undefined : yield* readEdgeSuggestResponse(edgeCache, cacheKey);

    if (edgeCached !== undefined) {
      cacheLevels.edgeCache = cacheLevel(true, 'hit');
      cacheLevels.ownedDb = cacheLevel(true, ownedDbCacheStatusForResponse(edgeCached));

      const response = filterSuggestionsForRequest(
        suggestRequest,
        withCacheLevels(withCacheStatus(edgeCached, 'hit'), cacheLevels),
      );

      recordSuggestResponse(repositories, response, startedAt, 'cache');

      return responseForPublicDto(response);
    }

    const workerCached = workerCache.get(cacheKey);

    if (workerCached !== undefined) {
      cacheLevels.workerMemory = cacheLevel(true, 'hit');
      cacheLevels.ownedDb = cacheLevel(true, ownedDbCacheStatusForResponse(workerCached.response));

      let response = filterSuggestionsForRequest(
        suggestRequest,
        withCacheLevels(withCacheStatus(workerCached.response, 'hit'), cacheLevels),
      );

      if (
        yield* writeEdgeSuggestResponse(edgeCache, cacheKey, response, workerCached.edgeTtlSeconds)
      ) {
        cacheLevels.edgeCache = cacheLevel(true, 'written');
        response = withCacheLevels(response, cacheLevels);
      }

      recordSuggestResponse(repositories, response, startedAt, 'cache');

      return responseForPublicDto(response);
    }

    const cached = yield* repositories.suggestCache.readSuggestCache(cacheKey);

    if (cached !== undefined && cached.status === 'hit') {
      cacheLevels.d1ReadThrough = cacheLevel(true, 'hit');
      const edgeTtlSeconds = edgeCacheTtlSecondsForCachePolicy(cached.cachePolicy);

      let response = filterSuggestionsForRequest(
        suggestRequest,
        withCacheLevels(
          {
            cacheStatus: 'hit',
            requestId: `cache-${queryHash.slice(0, 16)}`,
            suggestions: cached.payload.map((suggestion) => ({
              ...suggestion,
              cacheStatus: 'hit',
            })),
          } satisfies SmartSuggestResponse,
          cacheLevels,
        ),
      );
      const cachedSuggestionLimit = normalizeSuggestLimit(suggestRequest.limit);
      response = {
        ...response,
        suggestions: response.suggestions.slice(0, cachedSuggestionLimit),
      };

      cacheLevels.ownedDb = cacheLevel(true, ownedDbCacheStatusForResponse(response));
      yield* rememberRuntimeSuggestCaches(
        cacheKey,
        response,
        cacheLevels,
        workerCache,
        edgeCache,
        edgeTtlSeconds,
      );
      response = withCacheLevels(response, cacheLevels);

      recordSuggestResponse(repositories, response, startedAt, 'cache');

      return responseForPublicDto(response);
    }

    const ownedCacheStatus = cached?.status === 'stale' ? 'stale' : 'miss';
    cacheLevels.d1ReadThrough = cacheLevel(true, ownedCacheStatus);
    let response = yield* suggestFromOwnedData(
      suggestRequest,
      queryHash,
      repositories,
      ownedCacheStatus,
    );
    response = filterSuggestionsForRequest(suggestRequest, response);
    cacheLevels.ownedDb = cacheLevel(true, ownedDbCacheStatusForResponse(response));

    const enrichedResponse = yield* providerEnrichmentResponseFor({
      cacheKey,
      cacheLevels,
      env,
      ownedResponse: response,
      queryHash,
      repositories,
      request: suggestRequest,
    });

    if (enrichedResponse?.kind === 'contributed') {
      return yield* finalizeSuggestResponse({
        cacheKey,
        cacheLevels,
        edgeCache,
        edgeTtlSeconds: enrichedResponse.edgeTtlSeconds,
        repositories,
        response: enrichedResponse.response,
        sourceKind: 'provider-enrichment',
        startedAt,
        workerCache,
      });
    }

    if (enrichedResponse?.kind === 'miss' && enrichedResponse.providerAttempted) {
      return yield* finalizeSuggestResponse({
        cacheKey,
        cacheLevels,
        edgeCache,
        repositories,
        response,
        runtimeCacheEnabled: false,
        sourceKind: 'provider-enrichment',
        startedAt,
        workerCache,
      });
    }

    yield* writeOwnedCacheBestEffort(
      {
        cacheKey,
        queryHash,
        repositories,
        request: suggestRequest,
        response,
      },
      cacheLevels,
    );

    return yield* finalizeSuggestResponse({
      cacheKey,
      cacheLevels,
      edgeCache,
      repositories,
      response,
      sourceKind: 'owned',
      startedAt,
      workerCache,
    });
  }).pipe(
    catchEffect((failure) =>
      Effect.sync(() => {
        recordSuggestError(repositories, startedAt);
      }).pipe(Effect.flatMap(() => Effect.fail(normalizeSuggestError(failure)))),
    ),
  );
};

const normalizeAcceptEvent = (event: {
  acceptedAt?: string | undefined;
  requestId: string;
  source: SuggestionSource;
  suggestionId: string;
  tenant?: SmartSuggestAcceptEvent['tenant'] | undefined;
}): SmartSuggestAcceptEvent => {
  const normalizedEvent: SmartSuggestAcceptEvent = {
    acceptedAt: event.acceptedAt ?? nowIso(),
    requestId: event.requestId,
    source: event.source,
    suggestionId: event.suggestionId,
  };

  if (event.tenant !== undefined) {
    normalizedEvent.tenant = { ...event.tenant };
  }

  return normalizedEvent;
};

const healthEffect = (repositories: SmartSuggestRepositories, env?: SmartSuggestWorkerEnv) =>
  health(repositories, env);

const statusEffect = (repositories: SmartSuggestRepositories) => status(repositories);

const protectBffRequest = ({
  endpoint,
  env,
  repositories,
  request,
  requireKnownTenant,
  tenantId,
}: {
  endpoint: string;
  env: SmartSuggestWorkerEnv | undefined;
  repositories: SmartSuggestRepositories;
  request: HttpServerRequest.HttpServerRequest;
  requireKnownTenant: boolean;
  tenantId: string | undefined;
}) =>
  Effect.gen(function* protectBffRequestProgram() {
    const authorization = yield* authorizeTenantRequest({
      headers: request.headers,
      origin: requestOrigin(request),
      repositories,
      requireKnownTenant,
      tenantId,
    });

    yield* consumeInboundRateLimit({
      authorization,
      endpoint,
      env,
      repositories,
      request,
    });

    return authorization;
  }).pipe(Effect.mapError(normalizeApiError));

const applyPublicBffRateLimit = (
  endpoint: string,
  repositories: SmartSuggestRepositories,
  env: SmartSuggestWorkerEnv | undefined,
  request: HttpServerRequest.HttpServerRequest,
) =>
  consumeInboundRateLimit({
    authorization: { origin: requestOrigin(request) },
    endpoint,
    env,
    repositories,
    request,
  }).pipe(Effect.mapError(normalizeApiError));

const suggestEffect = (
  query: Parameters<typeof suggest>[0],
  repositories: SmartSuggestRepositories,
  env?: SmartSuggestWorkerEnv,
  request?: HttpServerRequest.HttpServerRequest,
) =>
  Effect.gen(function* suggestEffectProgram() {
    if (request !== undefined) {
      yield* protectBffRequest({
        endpoint: 'suggest',
        env,
        repositories,
        request,
        requireKnownTenant: query.tenantId !== undefined,
        tenantId: query.tenantId,
      });
    }

    return yield* suggest(query, repositories, env);
  }).pipe(Effect.mapError(normalizeApiError));

const recordAcceptEventEffect = (
  repositories: SmartSuggestRepositories,
  input: Parameters<typeof normalizeAcceptEvent>[0],
  env?: SmartSuggestWorkerEnv,
  request?: HttpServerRequest.HttpServerRequest,
) =>
  Effect.gen(function* recordAcceptEventEffectProgram() {
    const event = normalizeAcceptEvent(input);

    if (request !== undefined) {
      yield* protectBffRequest({
        endpoint: 'accept',
        env,
        repositories,
        request,
        requireKnownTenant: false,
        tenantId: event.tenant?.tenantId,
      });
    }

    const id = yield* createTelemetryId('accept', event.requestId, event.suggestionId);

    yield* repositories.acceptEvents.recordAcceptEvent({
      acceptedAt: event.acceptedAt,
      id,
      requestId: event.requestId,
      sourceId: event.source.id,
      suggestionId: event.suggestionId,
      ...(event.tenant === undefined ? {} : { tenant: event.tenant }),
    });

    metricsForRepositories(repositories).accept.total += 1;

    return { accepted: true as const };
  }).pipe(Effect.mapError(normalizeApiError));

const readEffectWorkerEnv = (): SmartSuggestWorkerEnv | undefined => {
  let runtimeEnv: SmartSuggestWorkerEnv | undefined;

  try {
    runtimeEnv = useEffectContext().env as SmartSuggestWorkerEnv;
  } catch {
    // Direct test handlers run without the Modern Effect request context.
  }

  return runtimeEnv;
};

const runtimeResourcesEffect = (
  repositories?: SmartSuggestRepositories,
  env?: SmartSuggestWorkerEnv,
) =>
  Effect.sync(() => {
    const runtimeEnv = env ?? readEffectWorkerEnv();

    return {
      env: runtimeEnv,
      repositories: repositories ?? resolveRepositories(runtimeEnv),
    };
  });

const withRuntimeResources = <A, E>(
  repositories: SmartSuggestRepositories | undefined,
  env: SmartSuggestWorkerEnv | undefined,
  run: (resources: {
    env: SmartSuggestWorkerEnv | undefined;
    repositories: SmartSuggestRepositories;
  }) => Effect.Effect<A, E, never>,
) => runtimeResourcesEffect(repositories, env).pipe(Effect.flatMap(run));

const corsOriginForRequest = (
  request: HttpServerRequest.HttpServerRequest,
  repositories: SmartSuggestRepositories | undefined,
  env: SmartSuggestWorkerEnv | undefined,
) => {
  const origin = requestOrigin(request);

  if (origin === undefined) {
    return Effect.succeed(recoverMissingCorsOrigin());
  }

  if (explicitCorsOrigins(configuredCorsOrigins(env)).includes(origin)) {
    return Effect.succeed(origin);
  }

  const tenantId = tenantIdFromCorsRequest(request);

  if (tenantId === undefined) {
    return Effect.succeed(recoverMissingCorsOrigin());
  }

  return runtimeResourcesEffect(repositories, env).pipe(
    Effect.flatMap(({ repositories: runtimeRepositories }) =>
      runtimeRepositories.tenants.getTenant(tenantId),
    ),
    Effect.map((tenant) =>
      tenant !== undefined && tenant.status === 'active' && tenantAllowsOrigin(tenant, origin)
        ? origin
        : undefined,
    ),
    Effect.orElseSucceed(recoverMissingCorsOrigin),
  );
};

export const createSmartSuggestApiGroupLayer = (
  repositories?: SmartSuggestRepositories,
  env?: SmartSuggestWorkerEnv,
) =>
  HttpApiBuilder.group(SmartSuggestHttpApi, 'smartSuggest', (handlers) =>
    handlers
      .handle('getHealth', () =>
        withRuntimeResources(repositories, env, (resources) =>
          healthEffect(resources.repositories, resources.env),
        ),
      )
      .handle('getStatus', () =>
        withRuntimeResources(repositories, env, ({ repositories: runtimeRepositories }) =>
          statusEffect(runtimeRepositories),
        ),
      )
      .handle('suggest', ({ query, request }) =>
        withRuntimeResources(repositories, env, (resources) =>
          suggestEffect(query, resources.repositories, resources.env, request),
        ),
      )
      .handle('accept', ({ payload, request }) =>
        withRuntimeResources(repositories, env, (resources) =>
          recordAcceptEventEffect(resources.repositories, payload, resources.env, request),
        ),
      )
      .handle('validatePhone', ({ payload, request }) =>
        withRuntimeResources(repositories, env, (resources) =>
          applyPublicBffRateLimit(
            'validate-phone',
            resources.repositories,
            resources.env,
            request,
          ).pipe(Effect.as(validatePhoneNumber(payload))),
        ),
      )
      .handle('validatePostal', ({ payload, request }) =>
        withRuntimeResources(repositories, env, (resources) =>
          applyPublicBffRateLimit(
            'validate-postal',
            resources.repositories,
            resources.env,
            request,
          ).pipe(Effect.as(validatePostalCode(payload))),
        ),
      ),
  );

const createSmartSuggestCorsLayer = (
  repositories?: SmartSuggestRepositories,
  env?: SmartSuggestWorkerEnv,
) =>
  HttpRouter.middleware(
    Effect.succeed(
      HttpMiddleware.make((httpApp) =>
        Effect.gen(function* smartSuggestCorsMiddlewareProgram() {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const runtimeEnv = readEffectWorkerEnv() ?? env;

          if (request.method === 'OPTIONS') {
            const origin = yield* corsOriginForRequest(request, repositories, runtimeEnv);

            return HttpServerResponse.empty({
              headers: corsPreflightHeaders(origin),
              status: 204,
            });
          }

          const response = yield* httpApp;
          const origin = yield* corsOriginForRequest(request, repositories, runtimeEnv);

          return origin === undefined
            ? response
            : HttpServerResponse.setHeaders(response, corsSimpleHeaders(origin));
        }),
      ),
    ),
    { global: true },
  );

export const createSmartSuggestApiLayer = (
  repositories?: SmartSuggestRepositories,
  env?: SmartSuggestWorkerEnv,
) =>
  HttpApiBuilder.layer(SmartSuggestHttpApi).pipe(
    Layer.provide(createSmartSuggestApiGroupLayer(repositories, env)),
    Layer.provide(createSmartSuggestCorsLayer(repositories, env)),
  );

const smartSuggestApiRuntime = defineEffectBff({
  api: SmartSuggestHttpApi,
  layer: createSmartSuggestApiLayer(),
});

export default smartSuggestApiRuntime;
