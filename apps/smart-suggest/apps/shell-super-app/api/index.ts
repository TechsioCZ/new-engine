import {
  defineEffectBff,
  Effect,
  HttpApiBuilder,
  HttpMiddleware,
  HttpRouter,
  Layer,
} from '@modern-js/plugin-bff/effect-edge';
import { useEffectContext } from '@modern-js/plugin-bff/effect-server';
import {
  SmartSuggestBadRequestError,
  SmartSuggestBadRequestErrorSchema,
  SmartSuggestHttpApi,
  SmartSuggestInternalError,
  SmartSuggestInternalErrorSchema,
} from '../shared/api';
import type {
  SmartSuggestHealthResponse,
  SmartSuggestQuery,
  SmartSuggestStatusResponse,
} from '../shared/api';
import type {
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
import { normalizeSuggestLimit } from '@techsio/smart-suggest-core';
import {
  SAMPLE_DATA_SOURCES,
  seedSampleAddressDatasetsEffect,
} from '@techsio/smart-suggest-datasets';
import {
  getSmartSuggestSourcePolicy,
  SMART_SUGGEST_PROVIDER_SOURCE_ID_ALIASES,
  smartSuggestSourceAllowsTtlCache,
  smartSuggestSourceAllowsWrite,
  smartSuggestSourceMaxTtlDays,
} from '@techsio/smart-suggest-datasets/source-catalog';
import type {
  SmartSuggestProviderRegistry,
  SmartSuggestProviderRuntimeConfig,
} from '@techsio/smart-suggest-integrations';
import { createSmartSuggestProviderRegistryFromConfig } from '@techsio/smart-suggest-integrations';
import type {
  AddressRecord,
  AddressSearchRecordInput,
  DataSourceRecord,
  SmartSuggestD1Binding,
  SmartSuggestRepositories,
  SmartSuggestStorageError,
  TenantRecord,
} from '@techsio/smart-suggest-storage';
import {
  createAddressRecordFromSuggestion,
  createD1SmartSuggestRepositories,
  createInMemorySmartSuggestRepositories,
  createSuggestCacheKey,
  createSuggestQueryHashEffect,
} from '@techsio/smart-suggest-storage';
import { validatePostalCode } from '@techsio/smart-suggest-validation';
import { validatePhoneNumber } from '@techsio/smart-suggest-validation/phone-strict';
import { DateTime, Duration, Random, Schema } from 'effect';
import { catch as catchEffect } from 'effect/Effect';
import { getHealthPayload } from '../shared/health';
import { createSmartSuggestEdgeCacheResponse } from '../shared/edge-cache';

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
  SMART_SUGGEST_D1?: SmartSuggestD1Binding;
  SMART_SUGGEST_D1_ROUTER_BINDING?: string;
  SMART_SUGGEST_D1_SHARD_BINDINGS?: string;
  SMART_SUGGEST_ENVIRONMENT?: string;
  SMART_SUGGEST_PROVIDER_CACHE_TTL_SECONDS?: string;
  SMART_SUGGEST_PROVIDER_PRIORITY?: string;
  SMART_SUGGEST_PROVIDER_TIMEOUT_MS?: string;
  SMART_SUGGEST_QUERY_HASH_SECRET?: string;
  SMART_SUGGEST_ROUTER_D1?: SmartSuggestD1Binding;
}

const inMemoryRepositories = createInMemorySmartSuggestRepositories();
const d1Repositories = new WeakMap<SmartSuggestD1Binding, SmartSuggestRepositories>();
const shardedRepositories = new Map<string, SmartSuggestRepositories>();
const seededRepositories = new WeakSet<SmartSuggestRepositories>();
const runtimeMetricsByRepository = new WeakMap<
  SmartSuggestRepositories,
  SmartSuggestRuntimeMetrics
>();
const providerRegistries = new Map<string, SmartSuggestProviderRegistry>();
const workerSuggestCaches = new WeakMap<
  SmartSuggestRepositories,
  Map<string, SmartSuggestResponse>
>();
const maxWorkerSuggestCacheEntries = 500;

interface SmartSuggestEdgeCache {
  match: (request: Request) => Promise<Response | undefined>;
  put: (request: Request, response: Response) => Promise<unknown>;
}

interface SmartSuggestCacheStorage {
  default?: SmartSuggestEdgeCache;
}

const smartSuggestCacheStatuses = new Set<SmartSuggestCacheStatus>([
  'disabled',
  'hit',
  'miss',
  'stale',
  'written',
]);

type SuggestSourceKind = 'cache' | 'owned' | 'provider-fallback';

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

const workerSuggestCacheFor = (repositories: SmartSuggestRepositories) => {
  const existingCache = workerSuggestCaches.get(repositories);

  if (existingCache !== undefined) {
    return existingCache;
  }

  const cache = new Map<string, SmartSuggestResponse>();
  workerSuggestCaches.set(repositories, cache);

  return cache;
};

const responseForLayerCache = (response: SmartSuggestResponse): SmartSuggestResponse => ({
  cacheStatus: response.cacheStatus,
  requestId: response.requestId,
  suggestions: response.suggestions,
});

const rememberWorkerSuggestResponse = (
  cache: Map<string, SmartSuggestResponse>,
  cacheKey: string,
  response: SmartSuggestResponse,
) => {
  if (cache.has(cacheKey)) {
    cache.delete(cacheKey);
  }

  cache.set(cacheKey, responseForLayerCache(response));

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

const isSmartSuggestCacheStatus = (value: unknown): value is SmartSuggestCacheStatus =>
  typeof value === 'string' && smartSuggestCacheStatuses.has(value as SmartSuggestCacheStatus);

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
): Effect.Effect<Partial<SmartSuggestResponse>, SmartSuggestInternalError, never> =>
  Effect.tryPromise({
    catch: () => serverError(),
    try: () => cached.json() as Promise<Partial<SmartSuggestResponse>>,
  });

const normalizeCachedEdgeSuggestResponse = (
  body: Partial<SmartSuggestResponse>,
): SmartSuggestResponse | undefined => {
  if (
    typeof body.requestId !== 'string' ||
    !Array.isArray(body.suggestions) ||
    !isSmartSuggestCacheStatus(body.cacheStatus)
  ) {
    return recoverMissingEdgeSuggestResponse();
  }

  return {
    cacheStatus: body.cacheStatus,
    requestId: body.requestId,
    suggestions: body.suggestions,
  } satisfies SmartSuggestResponse;
};

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
            Effect.map(normalizeCachedEdgeSuggestResponse),
          ),
    ),
    Effect.orElseSucceed(recoverMissingEdgeSuggestResponse),
  );

const writeEdgeSuggestResponse = (
  edgeCache: SmartSuggestEdgeCache | undefined,
  cacheKey: string,
  response: SmartSuggestResponse,
) => {
  if (edgeCache === undefined || response.cacheStatus === 'disabled') {
    return Effect.succeed(false);
  }

  return Effect.tryPromise({
    catch: () => serverError(),
    try: () =>
      edgeCache.put(
        edgeCacheRequestFor(cacheKey),
        createSmartSuggestEdgeCacheResponse(responseForLayerCache(response)),
      ),
  }).pipe(
    Effect.as(true),
    Effect.orElseSucceed(() => false),
  );
};

const rememberRuntimeSuggestCaches = (
  cacheKey: string,
  response: SmartSuggestResponse,
  levels: SmartSuggestCacheLevels,
  workerCache: Map<string, SmartSuggestResponse>,
  edgeCache: SmartSuggestEdgeCache | undefined,
) =>
  Effect.gen(function* rememberRuntimeSuggestCachesProgram() {
    if (response.cacheStatus === 'disabled') {
      return levels;
    }

    rememberWorkerSuggestResponse(workerCache, cacheKey, response);
    levels.workerMemory = cacheLevel(true, 'written');

    if (yield* writeEdgeSuggestResponse(edgeCache, cacheKey, response)) {
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
  if (sourceKind === 'provider-fallback') {
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

const isSmartSuggestD1Binding = (value: unknown): value is SmartSuggestD1Binding =>
  value !== null &&
  typeof value === 'object' &&
  typeof (value as { prepare?: unknown }).prepare === 'function';

const readNamedD1Binding = (env: SmartSuggestWorkerEnv | undefined, bindingName: string) => {
  const value = (env as Record<string, unknown> | undefined)?.[bindingName];

  return isSmartSuggestD1Binding(value) ? value : undefined;
};

const extractPostalRouteHint = (query: string) => {
  const match = /\b\d{3}\s?\d{2}\b/u.exec(query);

  return match?.[0];
};

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
      return [];
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
      return routed.slice(0, 2);
    }

    if (shardBindingNames.length > 2) {
      return [];
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

    return activeCandidates.filter((candidate) =>
      shardBindingNames.includes(candidate.bindingName),
    );
  });

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
    searchAddressRecords: (input) =>
      Effect.gen(function* searchAddressRecordsProgram() {
        const candidates = yield* boundedShardCandidates(router, input, [
          ...shardRepositories.keys(),
        ]);
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

            return repository.addressRecords.searchAddressRecords(searchInput);
          }),
        );

        return shardResults
          .flat()
          .toSorted(
            (left, right) =>
              right.quality - left.quality || left.displayLabel.localeCompare(right.displayLabel),
          )
          .slice(0, limit);
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
  addressTombstones: router.addressTombstones,
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
    registerDataSource: router.dataSources.registerDataSource,
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

const resolveRepositories = (env?: SmartSuggestWorkerEnv) => {
  const sharded = resolveShardedRepositories(env);

  if (sharded !== undefined) {
    return sharded;
  }

  const binding = env?.SMART_SUGGEST_D1;

  if (binding === undefined) {
    return inMemoryRepositories;
  }

  return repositoriesForD1Binding(binding);
};

const seedRepositories = (repositories: SmartSuggestRepositories) => {
  if (seededRepositories.has(repositories)) {
    return Effect.void;
  }

  return seedSampleAddressDatasetsEffect(repositories).pipe(
    Effect.tap(() =>
      Effect.sync(() => {
        seededRepositories.add(repositories);
      }),
    ),
    Effect.asVoid,
  );
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

const isSmartSuggestBadRequestError = Schema.is(SmartSuggestBadRequestErrorSchema);
const isSmartSuggestInternalError = Schema.is(SmartSuggestInternalErrorSchema);

const normalizeApiError = (error: unknown) =>
  isSmartSuggestBadRequestError(error) || isSmartSuggestInternalError(error)
    ? error
    : serverError();

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

const configuredCorsOrigins = (env?: SmartSuggestWorkerEnv) =>
  runtimeEnvStringArray(env, 'SMART_SUGGEST_ALLOWED_ORIGINS') ?? [];

const alpha2ByAlpha3: Record<string, string> = {
  AUT: 'AT',
  CZE: 'CZ',
  DEU: 'DE',
  ESP: 'ES',
  FRA: 'FR',
  GBR: 'GB',
  HUN: 'HU',
  ITA: 'IT',
  POL: 'PL',
  SVK: 'SK',
  USA: 'US',
};

const toCountryCode = (value: string | undefined) => {
  const normalizedCountryCode = value?.trim().toUpperCase();
  const alpha2 =
    normalizedCountryCode === undefined ? undefined : alpha2ByAlpha3[normalizedCountryCode];

  return normalizedCountryCode === undefined || normalizedCountryCode === ''
    ? undefined
    : ((alpha2 ?? normalizedCountryCode) as SmartSuggestCountryCode);
};

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

const parseSuggestRequest = (query: SmartSuggestQuery): SmartSuggestRequest | undefined => {
  const rawQuery = query.q ?? query.query;

  if (rawQuery === undefined || rawQuery.trim().length === 0) {
    return;
  }

  const request: SmartSuggestRequest = {
    kind: query.kind,
    limit: normalizeSuggestLimit(query.limit),
    query: rawQuery,
  };
  const countryCode = toCountryCode(query.countryCode);
  const tenant = readTenantContext(query);

  if (countryCode !== undefined) {
    request.countryCode = countryCode;
  }
  if (query.language !== undefined) {
    request.language = query.language;
  }
  if (tenant !== undefined) {
    request.tenant = tenant;
  }

  return request;
};

type SuggestionSourceRecord = Pick<
  DataSourceRecord,
  'attribution' | 'datasetVersion' | 'id' | 'name' | 'sourceKind'
>;

type SampleSuggestionSourceRecord = Omit<SuggestionSourceRecord, 'sourceKind'> & {
  sourceKind: string;
};

const suggestionSourceKinds = new Set<SuggestionSourceKind>([
  'cache',
  'live-provider',
  'owned-dataset',
]);

const isSuggestionSourceKind = (value: string): value is SuggestionSourceKind =>
  suggestionSourceKinds.has(value as SuggestionSourceKind);

const normalizeSampleSuggestionSource = (
  source: SampleSuggestionSourceRecord,
): SuggestionSourceRecord => {
  if (!isSuggestionSourceKind(source.sourceKind)) {
    throw new Error(`Unknown Smart Suggest sample source kind: ${source.sourceKind}`);
  }

  const normalizedSource: SuggestionSourceRecord = {
    attribution: source.attribution,
    id: source.id,
    name: source.name,
    sourceKind: source.sourceKind,
  };

  if (source.datasetVersion !== undefined) {
    normalizedSource.datasetVersion = source.datasetVersion;
  }

  return normalizedSource;
};

const toSuggestionSource = (source: SuggestionSourceRecord): SuggestionSource => {
  const suggestionSource: SuggestionSource = {
    attribution: source.attribution,
    id: source.id,
    kind: source.sourceKind,
    name: source.name,
  };

  if (source.datasetVersion !== undefined) {
    suggestionSource.datasetVersion = source.datasetVersion;
  }

  return suggestionSource;
};

const defaultSampleDataSource = (): SuggestionSourceRecord => {
  const [source] = SAMPLE_DATA_SOURCES;

  if (source === undefined) {
    throw new Error('Smart Suggest sample data sources are empty.');
  }

  return normalizeSampleSuggestionSource(source);
};

const sourceForSourceId = (sourceId: string): SuggestionSource => {
  const source = SAMPLE_DATA_SOURCES.find((entry) => entry.id === sourceId);

  return toSuggestionSource(
    source === undefined ? defaultSampleDataSource() : normalizeSampleSuggestionSource(source),
  );
};

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

    if (record.attribution !== undefined) {
      suggestion.attribution = record.attribution;
    }

    return suggestion;
  });

const suggestFromOwnedData = (
  request: SmartSuggestRequest,
  queryHash: string,
  repositories: SmartSuggestRepositories,
  cacheStatus: SmartSuggestCacheStatus = 'miss',
): Effect.Effect<SmartSuggestResponse, SmartSuggestStorageError, never> =>
  Effect.gen(function* suggestFromOwnedDataProgram() {
    if (request.kind !== 'address') {
      return {
        cacheStatus: 'disabled',
        requestId: `owned-${queryHash.slice(0, 16)}`,
        suggestions: [],
      };
    }

    const searchInput: Parameters<
      SmartSuggestRepositories['addressRecords']['searchAddressRecords']
    >[0] = {
      query: request.query,
    };

    if (request.countryCode !== undefined) {
      searchInput.countryCode = request.countryCode;
    }
    if (request.limit !== undefined) {
      searchInput.limit = request.limit;
    }

    const records = yield* repositories.addressRecords.searchAddressRecords(searchInput);
    const suggestions = yield* Effect.all(
      records.map((record) => toSuggestion(repositories, record, cacheStatus)),
    );

    return {
      cacheStatus,
      requestId: `owned-${queryHash.slice(0, 16)}`,
      suggestions,
    };
  });

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
  if (request.kind !== 'address') {
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

const liveProviderSourceIdFromDataSourceId = (sourceId: string) => {
  if (!sourceId.startsWith('live-provider:')) {
    return sourceId;
  }

  return sourceId.slice('live-provider:'.length).split(':')[0] ?? sourceId;
};

const catalogSourceIdForSuggestionSource = (source: SuggestionSource) =>
  liveProviderSourceIdFromDataSourceId(source.id);

const sourceAllowsLiveProviderDurableRetention = (source: SuggestionSource) =>
  smartSuggestSourceAllowsWrite(catalogSourceIdForSuggestionSource(source), 'durable-retention');

const secondsPerDay = 86_400;

const sourceAllowsProviderCache = (source: SuggestionSource, ttlSeconds: number) => {
  const sourceId = catalogSourceIdForSuggestionSource(source);

  return (
    smartSuggestSourceAllowsWrite(sourceId, 'permanent-cache') ||
    smartSuggestSourceAllowsTtlCache(sourceId, Math.ceil(ttlSeconds / secondsPerDay))
  );
};

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

const isCompleteAddressSuggestion = (suggestion: SmartSuggestSuggestion) =>
  suggestion.address !== undefined &&
  hasAddressNumberSignal(suggestion.address) &&
  (suggestion.address.street !== undefined || suggestion.address.line1 !== undefined);

const hasCompleteOwnedAddressAnswer = (
  request: SmartSuggestRequest,
  ownedResponse: SmartSuggestResponse,
) =>
  request.kind === 'address' &&
  addressNumberPattern.test(request.query) &&
  ownedResponse.suggestions.some(isCompleteAddressSuggestion);

const filterSuggestionsForRequest = (
  request: SmartSuggestRequest,
  response: SmartSuggestResponse,
): SmartSuggestResponse =>
  request.kind === 'address'
    ? {
        ...response,
        suggestions: response.suggestions.filter(isCompleteAddressSuggestion),
      }
    : response;

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

const mergeSuggestionResponses = (
  ownedResponse: SmartSuggestResponse,
  providerResponse: SmartSuggestResponse,
  limit: number | undefined,
): SmartSuggestResponse => {
  const seen = new Set<string>();
  const suggestions: SmartSuggestSuggestion[] = [];

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
    suggestions: suggestions.slice(0, normalizeSuggestLimit(limit)),
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
  const hasUncacheableProviderSuggestion = response.suggestions.some(
    (suggestion) =>
      suggestion.source.kind === 'live-provider' &&
      !sourceAllowsProviderCache(suggestion.source, ttlSeconds),
  );

  if (hasUncacheableProviderSuggestion || response.suggestions.length === 0) {
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
  if (request.language !== undefined) {
    cacheWrite.language = request.language;
  }
  if (request.tenant?.tenantId !== undefined) {
    cacheWrite.tenantId = request.tenant.tenantId;
  }

  return repositories.suggestCache.writeSuggestCache(cacheWrite);
};

interface SuggestFromProviderFallbackInput {
  cacheKey: string;
  env?: SmartSuggestWorkerEnv | undefined;
  ownedResponse: SmartSuggestResponse;
  queryHash: string;
  repositories: SmartSuggestRepositories;
  request: SmartSuggestRequest;
}

const suggestFromProviderFallback = ({
  cacheKey,
  env,
  ownedResponse,
  queryHash,
  repositories,
  request,
}: SuggestFromProviderFallbackInput) =>
  Effect.gen(function* suggestFromProviderFallbackProgram() {
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
    });

    let providerResponse = filterSuggestionsForRequest(
      request,
      withCacheStatus(result.response, 'written'),
    );

    if (providerResponse.suggestions.length === 0) {
      return ownedResponse;
    }

    providerResponse = withCacheStatus(providerResponse, 'written');
    const mergedResponse = filterSuggestionsForRequest(
      request,
      mergeSuggestionResponses(ownedResponse, providerResponse, request.limit),
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
      Effect.as(mergedResponse),
      Effect.orElseSucceed(() =>
        mergeSuggestionResponses(ownedResponse, result.response, request.limit),
      ),
    );
  }).pipe(Effect.orElseSucceed(() => ownedResponse));

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
  repositories: SmartSuggestRepositories;
  response: SmartSuggestResponse;
  sourceKind: SuggestSourceKind;
  startedAt: number;
  workerCache: Map<string, SmartSuggestResponse>;
}

const cacheLevelsForFinalResponse = (
  response: SmartSuggestResponse,
  cacheLevels: SmartSuggestCacheLevels,
) => (response.cacheStatus === 'disabled' ? createDisabledCacheLevels() : cacheLevels);

const finalizeSuggestResponse = ({
  cacheKey,
  cacheLevels,
  edgeCache,
  repositories,
  response,
  sourceKind,
  startedAt,
  workerCache,
}: FinalizeSuggestResponseInput) =>
  Effect.gen(function* finalizeSuggestResponseProgram() {
    yield* rememberRuntimeSuggestCaches(cacheKey, response, cacheLevels, workerCache, edgeCache);
    const responseWithLevels = withCacheLevels(
      response,
      cacheLevelsForFinalResponse(response, cacheLevels),
    );

    recordSuggestResponse(repositories, responseWithLevels, startedAt, sourceKind);

    return responseWithLevels;
  });

const writeOwnedCacheBestEffort = (
  input: WriteOwnedCacheInput,
  cacheLevels: SmartSuggestCacheLevels,
) =>
  writeOwnedCache(input).pipe(
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

interface ProviderFallbackResponseInput {
  cacheKey: string;
  cacheLevels: SmartSuggestCacheLevels;
  env?: SmartSuggestWorkerEnv | undefined;
  ownedResponse: SmartSuggestResponse;
  queryHash: string;
  repositories: SmartSuggestRepositories;
  request: SmartSuggestRequest;
}

const providerFallbackResponseFor = ({
  cacheKey,
  cacheLevels,
  env,
  ownedResponse,
  queryHash,
  repositories,
  request,
}: ProviderFallbackResponseInput) =>
  Effect.gen(function* providerFallbackResponseForProgram() {
    if (
      ownedResponse.suggestions.length >= normalizeSuggestLimit(request.limit) ||
      hasCompleteOwnedAddressAnswer(request, ownedResponse)
    ) {
      return;
    }

    const fallbackResponse = filterSuggestionsForRequest(
      request,
      yield* suggestFromProviderFallback({
        cacheKey,
        env,
        ownedResponse,
        queryHash,
        repositories,
        request,
      }),
    );

    if (fallbackResponse === ownedResponse) {
      return;
    }

    cacheLevels.ownedDb = cacheLevel(true, ownedDbCacheStatusForResponse(fallbackResponse));

    if (fallbackResponse.cacheStatus === 'written') {
      cacheLevels.d1ReadThrough = cacheLevel(true, 'written');
    }

    return fallbackResponse;
  });

const suggest = (
  query: SmartSuggestQuery,
  repositories: SmartSuggestRepositories,
  env?: SmartSuggestWorkerEnv,
): Effect.Effect<
  SmartSuggestResponse,
  SmartSuggestBadRequestError | SmartSuggestInternalError,
  never
> => {
  const startedAt = performance.now();
  const suggestRequest = parseSuggestRequest(query);

  if (suggestRequest === undefined) {
    return Effect.fail(badRequestError('Missing or invalid suggest query parameters.'));
  }

  return Effect.gen(function* suggestProgram() {
    yield* seedRepositories(repositories);

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

      return response;
    }

    const workerCached = workerCache.get(cacheKey);

    if (workerCached !== undefined) {
      cacheLevels.workerMemory = cacheLevel(true, 'hit');
      cacheLevels.ownedDb = cacheLevel(true, ownedDbCacheStatusForResponse(workerCached));

      let response = filterSuggestionsForRequest(
        suggestRequest,
        withCacheLevels(withCacheStatus(workerCached, 'hit'), cacheLevels),
      );

      if (yield* writeEdgeSuggestResponse(edgeCache, cacheKey, response)) {
        cacheLevels.edgeCache = cacheLevel(true, 'written');
        response = withCacheLevels(response, cacheLevels);
      }

      recordSuggestResponse(repositories, response, startedAt, 'cache');

      return response;
    }

    const cached = yield* repositories.suggestCache.readSuggestCache(cacheKey);

    if (cached !== undefined && cached.status === 'hit') {
      cacheLevels.d1ReadThrough = cacheLevel(true, 'hit');

      let response = filterSuggestionsForRequest(
        suggestRequest,
        withCacheLevels(
          {
            cacheStatus: 'hit',
            requestId: `cache-${queryHash.slice(0, 16)}`,
            suggestions: cached.payload.slice(0, suggestRequest.limit).map((suggestion) => ({
              ...suggestion,
              cacheStatus: 'hit',
            })),
          } satisfies SmartSuggestResponse,
          cacheLevels,
        ),
      );

      cacheLevels.ownedDb = cacheLevel(true, ownedDbCacheStatusForResponse(response));
      yield* rememberRuntimeSuggestCaches(cacheKey, response, cacheLevels, workerCache, edgeCache);
      response = withCacheLevels(response, cacheLevels);

      recordSuggestResponse(repositories, response, startedAt, 'cache');

      return response;
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

    const fallbackResponse = yield* providerFallbackResponseFor({
      cacheKey,
      cacheLevels,
      env,
      ownedResponse: response,
      queryHash,
      repositories,
      request: suggestRequest,
    });

    if (fallbackResponse !== undefined) {
      return yield* finalizeSuggestResponse({
        cacheKey,
        cacheLevels,
        edgeCache,
        repositories,
        response: fallbackResponse,
        sourceKind: 'provider-fallback',
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
      }).pipe(Effect.flatMap(() => Effect.fail(normalizeApiError(failure)))),
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

const suggestEffect = (
  query: Parameters<typeof suggest>[0],
  repositories: SmartSuggestRepositories,
  env?: SmartSuggestWorkerEnv,
) => suggest(query, repositories, env);

const recordAcceptEventEffect = (
  repositories: SmartSuggestRepositories,
  input: Parameters<typeof normalizeAcceptEvent>[0],
) =>
  Effect.gen(function* recordAcceptEventEffectProgram() {
    const event = normalizeAcceptEvent(input);
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
      .handle('suggest', ({ query }) =>
        withRuntimeResources(repositories, env, (resources) =>
          suggestEffect(query, resources.repositories, resources.env),
        ),
      )
      .handle('accept', ({ payload }) =>
        withRuntimeResources(repositories, env, ({ repositories: runtimeRepositories }) =>
          recordAcceptEventEffect(runtimeRepositories, payload),
        ),
      )
      .handle('validatePhone', ({ payload }) => Effect.succeed(validatePhoneNumber(payload)))
      .handle('validatePostal', ({ payload }) => Effect.succeed(validatePostalCode(payload))),
  );

const createSmartSuggestCorsLayer = (env?: SmartSuggestWorkerEnv) => {
  const isAllowedOrigin = (origin: string) => {
    const allowedOrigins = configuredCorsOrigins(readEffectWorkerEnv() ?? env);

    return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
  };

  return HttpRouter.middleware(
    Effect.succeed(
      HttpMiddleware.cors({
        allowedHeaders: ['authorization', 'content-type'],
        allowedMethods: ['GET', 'POST', 'OPTIONS'],
        allowedOrigins: isAllowedOrigin,
        maxAge: 600,
      }),
    ),
    { global: true },
  );
};

export const createSmartSuggestApiLayer = (
  repositories?: SmartSuggestRepositories,
  env?: SmartSuggestWorkerEnv,
) =>
  HttpApiBuilder.layer(SmartSuggestHttpApi).pipe(
    Layer.provide(createSmartSuggestApiGroupLayer(repositories, env)),
    Layer.provide(createSmartSuggestCorsLayer(env)),
  );

const smartSuggestApiRuntime = defineEffectBff({
  api: SmartSuggestHttpApi,
  layer: createSmartSuggestApiLayer(),
});

export default smartSuggestApiRuntime;
