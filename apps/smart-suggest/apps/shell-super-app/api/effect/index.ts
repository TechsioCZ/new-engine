import { SAMPLE_DATA_SOURCES, seedSampleAddressDatasets } from '@techsio/smart-suggest-datasets';
import { normalizeSuggestLimit } from '@techsio/smart-suggest-core';
import type {
  ProviderEventSummary,
  SmartSuggestCacheStatus,
  SmartSuggestAcceptEvent,
  SmartSuggestCountryCode,
  SmartSuggestError,
  SmartSuggestKind,
  SmartSuggestRequest,
  SmartSuggestResponse,
  SmartSuggestSuggestion,
  SuggestionSource,
} from '@techsio/smart-suggest-core';
import {
  createD1SmartSuggestRepositories,
  createInMemorySmartSuggestRepositories,
  createSuggestCacheKey,
  createSuggestQueryHash,
} from '@techsio/smart-suggest-storage';
import type {
  AddressRecord,
  DataSourceRecord,
  SmartSuggestD1Binding,
  SmartSuggestRepositories,
  TenantRecord,
} from '@techsio/smart-suggest-storage';
import { createSmartSuggestProviderRegistryFromConfig } from '@techsio/smart-suggest-integrations';
import type {
  SmartSuggestProviderRegistry,
  SmartSuggestProviderRuntimeConfig,
} from '@techsio/smart-suggest-integrations';
import { validatePhoneNumber, validatePostalCode } from '@techsio/smart-suggest-validation';
import type {
  PhoneValidationRequest,
  PostalValidationRequest,
} from '@techsio/smart-suggest-validation';
import { DateTime } from 'effect';
import { getHealthPayload } from '../../shared/health';

const plainTextHeaders = {
  'content-type': 'text/plain; charset=utf-8',
} as const;

interface SmartSuggestWorkerEnv {
  SMART_SUGGEST_D1?: SmartSuggestD1Binding;
}

const inMemoryRepositories = createInMemorySmartSuggestRepositories();
const d1Repositories = new WeakMap<SmartSuggestD1Binding, SmartSuggestRepositories>();
const repositorySeeds = new WeakMap<SmartSuggestRepositories, Promise<unknown>>();
const runtimeMetricsByRepository = new WeakMap<
  SmartSuggestRepositories,
  SmartSuggestRuntimeMetrics
>();
const providerRegistries = new Map<string, SmartSuggestProviderRegistry>();

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

const resolveRepositories = (env?: SmartSuggestWorkerEnv) => {
  const binding = env?.SMART_SUGGEST_D1;

  if (binding === undefined) {
    return inMemoryRepositories;
  }

  const existing = d1Repositories.get(binding);

  if (existing !== undefined) {
    return existing;
  }

  const repositories = createD1SmartSuggestRepositories(binding);
  d1Repositories.set(binding, repositories);

  return repositories;
};

const seedRepositories = (repositories: SmartSuggestRepositories) => {
  const existing = repositorySeeds.get(repositories);

  if (existing !== undefined) {
    return existing;
  }

  const seed = seedSampleAddressDatasets(repositories);
  repositorySeeds.set(repositories, seed);

  return seed;
};

const notFound = () =>
  new Response('Not found', {
    headers: plainTextHeaders,
    status: 404,
  });

const jsonResponse = (body: unknown, init?: ResponseInit) => Response.json(body, init);

const validationError = (message: string, field?: string) => {
  const error: SmartSuggestError = {
    code: 'bad-request',
    message,
  };

  if (field !== undefined) {
    error.field = field;
  }

  return jsonResponse(
    {
      errors: [error],
      message,
    },
    { status: 400 },
  );
};

const serverError = () =>
  jsonResponse(
    {
      errors: [
        {
          code: 'internal-error',
          message: 'Smart Suggest request failed.',
          retryable: true,
        } satisfies SmartSuggestError,
      ],
      message: 'Smart Suggest request failed.',
    },
    { status: 500 },
  );

const nowIso = () => DateTime.formatIso(DateTime.nowUnsafe());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const optionalBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

const optionalNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);

const optionalStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : undefined;

const toCountryCode = (value: string | undefined) =>
  value?.trim().toUpperCase() as SmartSuggestCountryCode | undefined;

const readJsonRecord = async (request: Request) => {
  const body = (await request.json()) as unknown;
  return isRecord(body) ? body : undefined;
};

const readOptionalRecord = (value: unknown) => (isRecord(value) ? value : undefined);

const health = async (repositories: SmartSuggestRepositories) => {
  try {
    const storage = await repositories.health.check();
    return jsonResponse(getHealthPayload(storage));
  } catch {
    return jsonResponse(getHealthPayload());
  }
};

const toSafeImportRunSummary = (
  run: Awaited<ReturnType<SmartSuggestRepositories['importRuns']['listRecentImportRuns']>>[number],
) => ({
  completedAt: run.completedAt,
  failedRows: run.failedRows,
  id: run.id,
  insertedRows: run.insertedRows,
  shardCountryCode: run.shardCountryCode,
  sourceId: run.sourceId,
  startedAt: run.startedAt,
  status: run.status,
  totalRows: run.totalRows,
});

const status = async (repositories: SmartSuggestRepositories) => {
  const [storage, importRuns] = await Promise.all([
    repositories.health.check().catch(() => null),
    repositories.importRuns.listRecentImportRuns(5).catch(() => []),
  ]);

  return jsonResponse({
    db: storage,
    imports: {
      recentRuns: importRuns.map(toSafeImportRunSummary),
    },
    metrics: summarizeMetrics(metricsForRepositories(repositories)),
    service: 'smart-suggest',
    timestamp: nowIso(),
  });
};

const parsePhoneValidationRequest = (
  body: Record<string, unknown>,
): PhoneValidationRequest | undefined => {
  const rawInput = optionalString(body['rawInput']);

  if (rawInput === undefined) {
    return undefined;
  }

  const request: PhoneValidationRequest = { rawInput };
  const defaultCountry = toCountryCode(optionalString(body['defaultCountry']));
  const allowedCountries = optionalStringArray(body['allowedCountries'])?.map(
    (country) => country.trim().toUpperCase() as SmartSuggestCountryCode,
  );
  const requireMobile = optionalBoolean(body['requireMobile']);
  const requireCountryMatch = optionalBoolean(body['requireCountryMatch']);

  if (defaultCountry !== undefined) {
    request.defaultCountry = defaultCountry;
  }
  if (allowedCountries !== undefined) {
    request.allowedCountries = allowedCountries;
  }
  if (requireMobile !== undefined) {
    request.requireMobile = requireMobile;
  }
  if (requireCountryMatch !== undefined) {
    request.requireCountryMatch = requireCountryMatch;
  }

  return request;
};

const parsePostalValidationRequest = (
  body: Record<string, unknown>,
): PostalValidationRequest | undefined => {
  const rawInput = optionalString(body['rawInput']);
  const countryCode = toCountryCode(optionalString(body['countryCode']));

  if (rawInput === undefined || countryCode === undefined) {
    return undefined;
  }

  return { countryCode, rawInput };
};

const validatePhone = async (request: Request) => {
  try {
    const body = await readJsonRecord(request);

    if (body === undefined) {
      return validationError('Expected a JSON object body.');
    }

    const validationRequest = parsePhoneValidationRequest(body);

    return validationRequest === undefined
      ? validationError('Missing rawInput.', 'rawInput')
      : jsonResponse(validatePhoneNumber(validationRequest));
  } catch {
    return validationError('Invalid JSON body.');
  }
};

const validatePostal = async (request: Request) => {
  try {
    const body = await readJsonRecord(request);

    if (body === undefined) {
      return validationError('Expected a JSON object body.');
    }

    const validationRequest = parsePostalValidationRequest(body);

    return validationRequest === undefined
      ? validationError('Missing rawInput or countryCode.')
      : jsonResponse(validatePostalCode(validationRequest));
  } catch {
    return validationError('Invalid JSON body.');
  }
};

const readTenantContext = (url: URL) => {
  const tenantId = url.searchParams.get('tenantId') ?? undefined;
  const salesChannelId = url.searchParams.get('salesChannelId') ?? undefined;
  const cartId = url.searchParams.get('cartId') ?? undefined;
  const sessionId = url.searchParams.get('sessionId') ?? undefined;

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

const parseSuggestRequest = (url: URL): SmartSuggestRequest | undefined => {
  const query = url.searchParams.get('q') ?? url.searchParams.get('query');
  const kind = url.searchParams.get('kind') as SmartSuggestKind | null;

  if (query === null || query.trim().length === 0 || kind === null) {
    return undefined;
  }

  if (!['address', 'place', 'postal'].includes(kind)) {
    return undefined;
  }

  const request: SmartSuggestRequest = {
    kind,
    limit: normalizeSuggestLimit(Number(url.searchParams.get('limit') ?? 10)),
    query,
  };
  const countryCode = toCountryCode(url.searchParams.get('countryCode') ?? undefined);
  const language = url.searchParams.get('language') ?? undefined;
  const tenant = readTenantContext(url);

  if (countryCode !== undefined) {
    request.countryCode = countryCode;
  }
  if (language !== undefined) {
    request.language = language;
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

const defaultSampleDataSource = () => {
  const [source] = SAMPLE_DATA_SOURCES;

  if (source === undefined) {
    throw new Error('Smart Suggest sample data sources are empty.');
  }

  return source;
};

const sourceForSourceId = (sourceId: string): SuggestionSource => {
  const source = SAMPLE_DATA_SOURCES.find((entry) => entry.id === sourceId);

  return toSuggestionSource(source ?? defaultSampleDataSource());
};

const sourceForAddressRecord = async (
  repositories: SmartSuggestRepositories,
  record: AddressRecord,
) => {
  const source = await repositories.dataSources.getDataSource(record.sourceId);

  return source === undefined ? sourceForSourceId(record.sourceId) : toSuggestionSource(source);
};

const sourceForCountry = (countryCode: SmartSuggestCountryCode | undefined): SuggestionSource => {
  const source = SAMPLE_DATA_SOURCES.find((entry) => entry.countryCode === countryCode);

  return toSuggestionSource(source ?? defaultSampleDataSource());
};

const parseSuggestionSource = (value: unknown): SuggestionSource | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = optionalString(value['id']);
  const kind = optionalString(value['kind']);
  const name = optionalString(value['name']);

  if (
    id === undefined ||
    name === undefined ||
    !['cache', 'live-provider', 'owned-dataset'].includes(kind ?? '')
  ) {
    return undefined;
  }

  return {
    id,
    kind: kind as SuggestionSource['kind'],
    name,
  };
};

const toSuggestion = async (
  repositories: SmartSuggestRepositories,
  record: AddressRecord,
  cacheStatus: SmartSuggestCacheStatus = 'miss',
): Promise<SmartSuggestSuggestion> => {
  const source = await sourceForAddressRecord(repositories, record);
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
};

const suggestFromOwnedData = async (
  request: SmartSuggestRequest,
  queryHash: string,
  repositories: SmartSuggestRepositories,
  cacheStatus: SmartSuggestCacheStatus = 'miss',
): Promise<SmartSuggestResponse> => {
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

  const records = await repositories.addressRecords.searchAddressRecords(searchInput);
  const suggestions = await Promise.all(
    records.map((record) => toSuggestion(repositories, record, cacheStatus)),
  );

  return {
    cacheStatus,
    requestId: `owned-${queryHash.slice(0, 16)}`,
    suggestions,
  };
};

const readScopedProviderConfig = (
  tenant: TenantRecord | undefined,
  request: SmartSuggestRequest,
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
      .find((value) => value !== undefined) ?? tenant?.providerPriority;

  return {
    priority,
    scopeConfigs,
  };
};

const readMapyProviderConfig = (
  providerScopes: readonly Record<string, unknown>[],
  request: SmartSuggestRequest,
): SmartSuggestProviderRuntimeConfig['mapyCz'] => {
  const mapyConfig = providerScopes
    .map((providerScope) => {
      const providers = readOptionalRecord(providerScope['providers']);
      return (
        readOptionalRecord(providers?.['mapy-cz']) ?? readOptionalRecord(providers?.['mapyCz'])
      );
    })
    .find((value) => value !== undefined);
  const apiKey = optionalString(mapyConfig?.['apiKey']);

  if (apiKey === undefined) {
    return undefined;
  }

  const config: NonNullable<SmartSuggestProviderRuntimeConfig['mapyCz']> = {
    apiKey,
  };
  const endpointUrl = optionalString(mapyConfig?.['endpointUrl']);
  const language = optionalString(mapyConfig?.['language']) ?? request.language;
  const limit = optionalNumber(mapyConfig?.['limit']);

  if (endpointUrl !== undefined) {
    config.endpointUrl = endpointUrl;
  }
  if (language !== undefined) {
    config.language = language;
  }
  if (limit !== undefined) {
    config.limit = limit;
  }

  return config;
};

const readProviderTimeoutMs = (providerScopes: readonly Record<string, unknown>[]) =>
  providerScopes
    .map((providerScope) => optionalNumber(providerScope['providerTimeoutMs']))
    .find((value) => value !== undefined);

const readProviderRuntimeConfig = (
  tenant: TenantRecord | undefined,
  request: SmartSuggestRequest,
): SmartSuggestProviderRuntimeConfig => {
  const scopedConfig = readScopedProviderConfig(tenant, request);
  const config: SmartSuggestProviderRuntimeConfig = {};
  const { priority } = scopedConfig;
  const mapyCz = readMapyProviderConfig(scopedConfig.scopeConfigs, request);
  const timeoutMs = readProviderTimeoutMs(scopedConfig.scopeConfigs);

  if (priority !== undefined) {
    config.priority = priority;
  }
  if (mapyCz !== undefined) {
    config.mapyCz = mapyCz;
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

const getProviderRegistry = (tenant: TenantRecord | undefined, request: SmartSuggestRequest) => {
  const config = readProviderRuntimeConfig(tenant, request);
  const key = providerRegistryKey(tenant, request, config);
  const existingRegistry = providerRegistries.get(key);

  if (existingRegistry !== undefined) {
    return existingRegistry;
  }

  const registry = createSmartSuggestProviderRegistryFromConfig(config);
  providerRegistries.set(key, registry);
  return registry;
};

const recordProviderEvents = async (
  events: readonly ProviderEventSummary[],
  request: SmartSuggestRequest,
  requestId: string,
  queryHash: string,
  repositories: SmartSuggestRepositories,
) => {
  const metrics = metricsForRepositories(repositories);

  await Promise.all(
    events.map((event, index) => {
      const { providerId, status: providerStatus } = event;
      const record: Parameters<typeof repositories.providerEvents.recordProviderEvent>[0] = {
        id: `${requestId}:${providerId}:${index}`,
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
      return repositories.providerEvents.recordProviderEvent(record);
    }),
  );
};

const suggestFromProviderFallback = async (
  request: SmartSuggestRequest,
  queryHash: string,
  ownedResponse: SmartSuggestResponse,
  repositories: SmartSuggestRepositories,
) => {
  try {
    const tenantId = request.tenant?.tenantId;
    const tenant =
      tenantId === undefined ? undefined : await repositories.tenants.getTenant(tenantId);
    const result = await getProviderRegistry(tenant, request).suggest(request, {
      requestId: `provider-${queryHash.slice(0, 16)}`,
    });

    await recordProviderEvents(
      result.providerEvents,
      request,
      result.response.requestId,
      queryHash,
      repositories,
    );

    return result.response.suggestions.length > 0 ? result.response : ownedResponse;
  } catch {
    return ownedResponse;
  }
};

const writeOwnedCache = (
  cacheKey: string,
  queryHash: string,
  request: SmartSuggestRequest,
  response: SmartSuggestResponse,
  repositories: SmartSuggestRepositories,
) => {
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

const suggest = async (request: Request, repositories: SmartSuggestRepositories) => {
  const startedAt = performance.now();
  const url = new URL(request.url);
  const suggestRequest = parseSuggestRequest(url);

  if (suggestRequest === undefined) {
    return validationError('Missing or invalid suggest query parameters.');
  }

  try {
    await seedRepositories(repositories);

    const queryHash = await createSuggestQueryHash(suggestRequest);
    const cacheKeyInput: Parameters<typeof createSuggestCacheKey>[0] = {
      kind: suggestRequest.kind,
      queryHash,
    };

    if (suggestRequest.countryCode !== undefined) {
      cacheKeyInput.countryCode = suggestRequest.countryCode;
    }
    if (suggestRequest.language !== undefined) {
      cacheKeyInput.language = suggestRequest.language;
    }
    if (suggestRequest.tenant?.tenantId !== undefined) {
      cacheKeyInput.tenantId = suggestRequest.tenant.tenantId;
    }

    const cacheKey = createSuggestCacheKey(cacheKeyInput);
    const cached = await repositories.suggestCache.readSuggestCache(cacheKey);

    if (cached !== undefined && cached.status === 'hit') {
      const response = {
        cacheStatus: 'hit',
        requestId: `cache-${queryHash.slice(0, 16)}`,
        suggestions: cached.payload.map((suggestion) => ({
          ...suggestion,
          cacheStatus: 'hit',
        })),
      } satisfies SmartSuggestResponse;

      recordSuggestResponse(repositories, response, startedAt, 'cache');

      return jsonResponse(response);
    }

    const ownedCacheStatus = cached?.status === 'stale' ? 'stale' : 'miss';
    const response = await suggestFromOwnedData(
      suggestRequest,
      queryHash,
      repositories,
      ownedCacheStatus,
    );

    if (response.suggestions.length === 0) {
      const fallbackResponse = await suggestFromProviderFallback(
        suggestRequest,
        queryHash,
        response,
        repositories,
      );
      recordSuggestResponse(repositories, fallbackResponse, startedAt, 'provider-fallback');

      return jsonResponse(fallbackResponse);
    }

    try {
      await writeOwnedCache(cacheKey, queryHash, suggestRequest, response, repositories);
    } catch {
      recordSuggestResponse(repositories, response, startedAt, 'owned');
      return jsonResponse(response);
    }

    recordSuggestResponse(repositories, response, startedAt, 'owned');

    return jsonResponse(response);
  } catch {
    recordSuggestError(repositories, startedAt);
    return serverError();
  }
};

const parseAcceptEvent = (body: Record<string, unknown>): SmartSuggestAcceptEvent | undefined => {
  const requestId = optionalString(body['requestId']);
  const suggestionId = optionalString(body['suggestionId']);

  if (requestId === undefined || suggestionId === undefined) {
    return undefined;
  }

  return {
    acceptedAt: optionalString(body['acceptedAt']) ?? nowIso(),
    requestId,
    source:
      parseSuggestionSource(body['source']) ??
      sourceForCountry(toCountryCode(optionalString(body['countryCode']))),
    suggestionId,
  };
};

const accept = async (request: Request, repositories: SmartSuggestRepositories) => {
  try {
    const body = await readJsonRecord(request);

    if (body === undefined) {
      return validationError('Expected a JSON object body.');
    }

    const event = parseAcceptEvent(body);

    if (event === undefined) {
      return validationError('Missing requestId or suggestionId.');
    }

    await repositories.acceptEvents.recordAcceptEvent({
      acceptedAt: event.acceptedAt,
      id: `${event.requestId}:${event.suggestionId}`,
      requestId: event.requestId,
      sourceId: event.source.id,
      suggestionId: event.suggestionId,
    });
    metricsForRepositories(repositories).accept.total += 1;

    return jsonResponse({ accepted: true });
  } catch {
    return validationError('Invalid JSON body.');
  }
};

const route = (request: Request, repositories: SmartSuggestRepositories) => {
  const url = new URL(request.url);
  const routeKey = `${request.method} ${url.pathname}`;

  switch (routeKey) {
    case 'GET /v1/health': {
      return health(repositories);
    }
    case 'GET /v1/status': {
      return status(repositories);
    }
    case 'GET /v1/suggest': {
      return suggest(request, repositories);
    }
    case 'POST /v1/accept': {
      return accept(request, repositories);
    }
    case 'POST /v1/validate/phone': {
      return validatePhone(request);
    }
    case 'POST /v1/validate/postal': {
      return validatePostal(request);
    }
    default: {
      return notFound();
    }
  }
};

export const createSmartSuggestHandler =
  (repositories: SmartSuggestRepositories) => (request: Request) =>
    route(request, repositories);

export const handler = (request: Request, env?: SmartSuggestWorkerEnv) =>
  route(request, resolveRepositories(env));
