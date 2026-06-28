import type { SmartSuggestResponse } from '@techsio/smart-suggest-core';
import {
  createInMemorySmartSuggestRepositories,
  createSuggestCacheKey,
  createSuggestQueryHash,
} from '@techsio/smart-suggest-storage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShardedRepositories, createSmartSuggestHandler, handler } from './index';

interface HealthPayload {
  db: {
    ok: boolean;
  };
  service: string;
}

interface StatusPayload {
  imports: {
    freshness: {
      latestBaseline?: {
        completedAt?: string;
        failedRows: number;
        runId: string;
        sourceFeedId?: string;
        sourceValidAt?: string;
        sourceVersion?: string;
        status: 'completed';
        totalRows: number;
        tombstonedRows: number;
        upsertedRows: number;
      };
      latestDelta?: {
        completedAt?: string;
        failedRows: number;
        runId: string;
        sourceFeedId?: string;
        sourceValidAt?: string;
        sourceVersion?: string;
        status: 'completed';
        totalRows: number;
        tombstonedRows: number;
        upsertedRows: number;
      };
      rowCounts: {
        failedRows: number;
        skippedRows: number;
        tombstonedRows: number;
        totalRows: number;
        upsertedRows: number;
      };
      sla: {
        ageHours?: number;
        maxDeltaAgeHours: number;
        measuredAt: string;
        status: 'fresh' | 'stale' | 'unknown';
      };
    };
    recentRuns: unknown[];
  };
  metrics: {
    accept: {
      total: number;
    };
    providerEvents: {
      error: number;
      skipped: number;
      success: number;
      timeout: number;
    };
    suggest: {
      cacheHitRate: number;
      cacheStatus: {
        disabled: number;
        hit: number;
        miss: number;
        stale: number;
        written: number;
      };
      ownedSuccess: number;
      providerFallback: number;
      total: number;
    };
  };
  service: string;
  shards: {
    activeCount: number;
    disabledCount: number;
    maxEstimatedSizeBytes: number;
    rowCount: number;
    shards: {
      bindingName: string;
      countryCode: string;
      estimatedSizeBytes?: number;
      importVersion?: string;
      regionCode: string;
      rowCount: number;
      shardId: string;
      sourceFreshnessAt?: string;
      state: 'active' | 'disabled' | 'standby';
    }[];
    sizeGuard: {
      blockBytes: number;
      status: 'blocked' | 'ok' | 'warning';
      warnBytes: number;
    };
    standbyCount: number;
    totalCount: number;
  };
  sourcePolicy: {
    providerSources: {
      durableRetentionAllowed: string[];
      noDurableRetention: string[];
      permanentCacheAllowed: string[];
      ttlCacheOnly: {
        maxTtlDays: number;
        sourceId: string;
      }[];
    };
    rawQueryStorage: 'disabled';
  };
  sourceProvenance: {
    authoritativeSources: {
      attribution?: {
        label: string;
        license?: string;
        url?: string;
      };
      datasetVersion?: string;
      modificationNoteSha256Present: boolean;
      present: boolean;
      sourceId: string;
      sourceKind: 'cache' | 'live-provider' | 'owned-dataset' | null;
    }[];
  };
}

interface PhoneValidationPayload {
  e164?: string;
  isValid: boolean;
}

interface PostalValidationPayload {
  displayValue: string;
  isValid: boolean | 'unknown';
}

const requestFor = (path: string, init?: RequestInit) =>
  new Request(`https://smart-suggest.test${path}`, init);

const readJson = async <TResponse>(response: Response) => (await response.json()) as TResponse;

const hmacSha256PrefixPattern = /^hmac-sha256:/u;
const providerRequestIdFor = async (query: string, limit = 2) => {
  const queryHash = await createSuggestQueryHash({
    countryCode: 'CZ',
    kind: 'address',
    limit,
    query,
  });

  return {
    queryHash,
    requestId: `provider-${queryHash.slice(0, 16)}`,
  };
};

describe('Smart Suggest effect API', () => {
  beforeEach(() => {
    vi.stubEnv('RUIAN_GEOCODE_DISABLED', 'true');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reports health with storage connectivity', async () => {
    const response = await handler(requestFor('/v1/health'));
    const body = await readJson<HealthPayload>(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      db: { ok: true },
      service: 'smart-suggest',
    });
  });

  it('honors configured CORS origins for preflight and API responses', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories, {
      SMART_SUGGEST_ALLOWED_ORIGINS: 'https://shop.example, https://admin.example',
    });

    const preflightResponse = await testHandler(
      requestFor('/v1/suggest', {
        headers: {
          'access-control-request-headers': 'content-type',
          origin: 'https://shop.example',
        },
        method: 'OPTIONS',
      }),
    );
    const rejectedPreflightResponse = await testHandler(
      requestFor('/v1/suggest', {
        headers: {
          origin: 'https://blocked.example',
        },
        method: 'OPTIONS',
      }),
    );
    const healthResponse = await testHandler(
      requestFor('/v1/health', {
        headers: { origin: 'https://admin.example' },
      }),
    );

    expect(preflightResponse.status).toBe(204);
    expect(preflightResponse.headers.get('access-control-allow-origin')).toBe(
      'https://shop.example',
    );
    expect(preflightResponse.headers.get('access-control-allow-methods')).toContain('OPTIONS');
    expect(rejectedPreflightResponse.status).toBe(403);
    expect(healthResponse.headers.get('access-control-allow-origin')).toBe('https://admin.example');
  });

  it('reports compact catalog-derived source policy coverage', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);
    const response = await testHandler(requestFor('/v1/status'));
    const body = await readJson<StatusPayload>(response);

    expect(body.sourcePolicy).toMatchObject({
      providerSources: {
        durableRetentionAllowed: ['here-discover', 'mapy-cz', 'nominatim-managed'],
        noDurableRetention: ['radar-autocomplete', 'ruian-geocode'],
        permanentCacheAllowed: ['here-discover', 'mapy-cz', 'nominatim-managed'],
        ttlCacheOnly: [
          {
            maxTtlDays: 30,
            sourceId: 'radar-autocomplete',
          },
        ],
      },
      rawQueryStorage: 'disabled',
    });
    expect(body.sourcePolicy.providerSources.durableRetentionAllowed).not.toContain(
      'radar-autocomplete',
    );
    expect(body.sourcePolicy.providerSources.durableRetentionAllowed).not.toContain(
      'ruian-geocode',
    );
  });

  it('serves CZ and SK owned-data suggestions through repository search and cache', async () => {
    const firstResponse = await handler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&limit=1'),
    );
    const firstBody = await readJson<SmartSuggestResponse>(firstResponse);

    expect(firstBody).toMatchObject({
      cacheLevels: {
        browserMemory: { enabled: false, status: 'disabled' },
        d1ReadThrough: { enabled: true, status: 'written' },
        edgeCache: { enabled: false, status: 'disabled' },
        ownedDb: { enabled: true, status: 'hit' },
        workerMemory: { enabled: true, status: 'written' },
      },
      cacheStatus: 'miss',
      suggestions: [
        {
          address: { city: 'Praha', countryCode: 'CZ' },
          id: 'cz-ruian-vaclavske-namesti-832-19',
          source: {
            attribution: { label: 'RUIAN sample' },
            kind: 'owned-dataset',
          },
        },
      ],
    });

    const secondResponse = await handler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&limit=1'),
    );
    const secondBody = await readJson<SmartSuggestResponse>(secondResponse);

    expect(secondBody).toMatchObject({
      cacheLevels: {
        browserMemory: { enabled: false, status: 'disabled' },
        d1ReadThrough: { enabled: true, status: 'miss' },
        edgeCache: { enabled: false, status: 'disabled' },
        ownedDb: { enabled: true, status: 'hit' },
        workerMemory: { enabled: true, status: 'hit' },
      },
      cacheStatus: 'hit',
      suggestions: [{ cacheStatus: 'hit' }],
    });

    const skResponse = await handler(
      requestFor('/v1/suggest?kind=address&countryCode=SK&q=zizkova&limit=1'),
    );
    const skBody = await readJson<SmartSuggestResponse>(skResponse);

    expect(skBody.suggestions[0]).toMatchObject({
      address: { city: 'Žilina', countryCode: 'SK' },
      id: 'sk-register-adries-zizkova-45',
      source: {
        attribution: { label: 'Register adries sample' },
        kind: 'owned-dataset',
      },
    });
  });

  it('records edge cache telemetry when the Cloudflare cache API is available', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);
    const edgeStore = new Map<string, string>();
    const edgeCache = {
      match: vi.fn((request: Request) => {
        const body = edgeStore.get(request.url);

        return body === undefined
          ? undefined
          : new Response(body, { headers: { 'content-type': 'application/json' } });
      }),
      put: vi.fn(async (request: Request, response: Response) => {
        edgeStore.set(request.url, await response.clone().text());
      }),
    };
    vi.stubGlobal('caches', { default: edgeCache });

    const firstResponse = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vinohradska&limit=1'),
    );
    const firstBody = await readJson<SmartSuggestResponse>(firstResponse);

    expect(firstBody).toMatchObject({
      cacheLevels: {
        d1ReadThrough: { enabled: true, status: 'written' },
        edgeCache: { enabled: true, status: 'written' },
        ownedDb: { enabled: true, status: 'hit' },
        workerMemory: { enabled: true, status: 'written' },
      },
      cacheStatus: 'miss',
      suggestions: [{ id: 'cz-ruian-vinohradska-12-34' }],
    });

    const secondResponse = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vinohradska&limit=1'),
    );
    const secondBody = await readJson<SmartSuggestResponse>(secondResponse);

    expect(edgeCache.match).toHaveBeenCalled();
    expect(edgeCache.put).toHaveBeenCalled();
    const storedEdgeBodies = [...edgeStore.values()].map((body) => JSON.parse(body));

    expect(storedEdgeBodies).toHaveLength(1);
    expect(storedEdgeBodies[0]).not.toHaveProperty('cacheLevels');
    expect(storedEdgeBodies[0]).not.toHaveProperty('providerEvents');
    expect(secondBody).toMatchObject({
      cacheLevels: {
        edgeCache: { enabled: true, status: 'hit' },
        ownedDb: { enabled: true, status: 'hit' },
        workerMemory: { enabled: true, status: 'miss' },
      },
      cacheStatus: 'hit',
      suggestions: [{ cacheStatus: 'hit', id: 'cz-ruian-vinohradska-12-34' }],
    });
  });

  it('serves OpenAddresses US sample suggestions through the public suggest API', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);
    const response = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=US&q=mission%20san%20francisco&limit=1'),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      cacheStatus: 'miss',
      suggestions: [
        {
          address: { city: 'San Francisco', countryCode: 'US', region: 'CA' },
          id: 'us-openaddresses-ca-mission-1',
          source: {
            attribution: { label: 'OpenAddresses sample' },
            id: 'openaddresses-us-ca-sample',
            kind: 'owned-dataset',
          },
        },
      ],
    });
  });

  it('keeps unsupported suggest kinds fail-open with disabled cache status', async () => {
    const response = await handler(requestFor('/v1/suggest?kind=postal&q=12345'));
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'disabled',
      suggestions: [],
    });
  });

  it('does not return confidence-only owned-data suggestions for unrelated street text', async () => {
    const response = await handler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=K%20Lou%C5%BEi%201&limit=3'),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      cacheStatus: 'miss',
      suggestions: [],
    });
  });

  it('filters incomplete address suggestions from cache-hit responses', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);
    const queryHash = await createSuggestQueryHash({
      countryCode: 'CZ',
      kind: 'address',
      limit: 5,
      query: 'K L',
    });
    const cacheKey = createSuggestCacheKey({
      countryCode: 'CZ',
      kind: 'address',
      queryHash,
    });

    await repositories.suggestCache.writeSuggestCache({
      cacheKey,
      cachePolicy: { kind: 'permanent' },
      countryCode: 'CZ',
      expiresAt: '2999-01-01T00:00:00.000Z',
      kind: 'address',
      payload: [
        {
          address: { countryCode: 'CZ', street: 'Liberecký kraj' },
          confidence: 0.72,
          displayLabel: 'Liberecký kraj',
          id: 'bad-admin-row',
          kind: 'address',
          source: {
            id: 'ruian-geocode',
            kind: 'live-provider',
            name: 'RÚIAN geocoder',
          },
        },
        {
          address: {
            countryCode: 'CZ',
            houseNumber: '1258',
            orientationNumber: '12',
            postalCode: '101 00',
            street: 'K louži',
          },
          confidence: 0.98,
          displayLabel: 'K louži 1258/12, Vršovice, 10100 Praha 10',
          id: 'good-address-row',
          kind: 'address',
          source: {
            id: 'ruian-geocode',
            kind: 'live-provider',
            name: 'RÚIAN geocoder',
          },
        },
      ],
      queryHash,
    });

    const response = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=K%20L&limit=5'),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'hit',
      suggestions: [{ id: 'good-address-row' }],
    });
  });

  it('uses the configured query hash secret for cache and telemetry keys', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories, {
      SMART_SUGGEST_QUERY_HASH_SECRET: 'operator-secret-a',
    });
    const queryHash = await createSuggestQueryHash(
      {
        countryCode: 'CZ',
        kind: 'address',
        limit: 1,
        query: 'K Louži 1258/12',
      },
      { secret: 'operator-secret-a' },
    );
    const unkeyedHash = await createSuggestQueryHash({
      countryCode: 'CZ',
      kind: 'address',
      limit: 1,
      query: 'K Louži 1258/12',
    });
    const cacheKey = createSuggestCacheKey({
      countryCode: 'CZ',
      kind: 'address',
      queryHash,
    });

    await repositories.suggestCache.writeSuggestCache({
      cacheKey,
      cachePolicy: { kind: 'permanent' },
      countryCode: 'CZ',
      kind: 'address',
      payload: [
        {
          address: {
            city: 'Praha 10',
            countryCode: 'CZ',
            houseNumber: '1258',
            orientationNumber: '12',
            postalCode: '101 00',
            street: 'K Louži',
          },
          confidence: 0.99,
          displayLabel: 'K Louži 1258/12, Praha 10, CZ',
          id: 'keyed-cache-row',
          kind: 'address',
          source: { id: 'ruian-cz', kind: 'owned-dataset', name: 'RUIAN' },
        },
      ],
      queryHash,
    });

    const response = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=K%20Lou%C5%BEi%201258%2F12&limit=1'),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(queryHash).toMatch(hmacSha256PrefixPattern);
    expect(queryHash).not.toBe(unkeyedHash);
    expect(body).toMatchObject({
      cacheStatus: 'hit',
      suggestions: [{ id: 'keyed-cache-row' }],
    });
    await expect(
      repositories.suggestCache.readSuggestCache(
        createSuggestCacheKey({
          countryCode: 'CZ',
          kind: 'address',
          queryHash: unkeyedHash,
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it('reports stale cache status while refreshing owned-data suggestions', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);
    const queryHash = await createSuggestQueryHash({
      countryCode: 'CZ',
      kind: 'address',
      limit: 1,
      query: 'vinohradska',
    });
    const cacheKey = createSuggestCacheKey({
      countryCode: 'CZ',
      kind: 'address',
      queryHash,
    });

    await repositories.suggestCache.writeSuggestCache({
      cacheKey,
      cachePolicy: { kind: 'ttl', ttlSeconds: 1 },
      countryCode: 'CZ',
      expiresAt: '2000-01-01T00:00:00.000Z',
      kind: 'address',
      payload: [],
      queryHash,
    });

    const response = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vinohradska&limit=1'),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'stale',
      suggestions: [
        {
          cacheStatus: 'stale',
          id: 'cz-ruian-vinohradska-12-34',
        },
      ],
    });

    const statusResponse = await testHandler(requestFor('/v1/status'));
    const statusBody = await readJson<StatusPayload>(statusResponse);

    expect(statusBody.metrics.suggest.cacheStatus.stale).toBeGreaterThanOrEqual(1);
  });

  it('retries sample seeding after a transient storage failure', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);
    const { registerDataSource } = repositories.dataSources;
    let shouldFailRegistration = true;

    repositories.dataSources.registerDataSource = (input) => {
      if (shouldFailRegistration) {
        shouldFailRegistration = false;
        return Promise.reject(new Error('transient D1 failure'));
      }

      return registerDataSource(input);
    };

    const failedResponse = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske&limit=1'),
    );
    expect(failedResponse.status).toBe(500);

    const retriedResponse = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske&limit=1'),
    );
    const retriedBody = await readJson<SmartSuggestResponse>(retriedResponse);

    expect(retriedResponse.status).toBe(200);
    expect(retriedBody.suggestions).toHaveLength(1);
  });

  it('keeps owned-data cache entries scoped by requested limit', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);

    const firstResponse = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=praha&limit=1'),
    );
    const firstBody = await readJson<SmartSuggestResponse>(firstResponse);

    expect(firstBody).toMatchObject({
      cacheStatus: 'miss',
      suggestions: [expect.any(Object)],
    });
    expect(firstBody.suggestions).toHaveLength(1);

    const secondResponse = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=praha&limit=2'),
    );
    const secondBody = await readJson<SmartSuggestResponse>(secondResponse);

    expect(secondBody.cacheStatus).toBe('miss');
    expect(secondBody.suggestions).toHaveLength(2);

    const cachedResponse = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=praha&limit=2'),
    );
    const cachedBody = await readJson<SmartSuggestResponse>(cachedResponse);

    expect(cachedBody.cacheStatus).toBe('hit');
    expect(cachedBody.suggestions).toHaveLength(2);
  });

  it('falls back to Mapy and persists sanitized provider payloads', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);

    await expect(
      readJson<SmartSuggestResponse>(
        await testHandler(
          requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&limit=1'),
        ),
      ),
    ).resolves.toMatchObject({
      cacheStatus: 'miss',
      suggestions: [{ source: { kind: 'owned-dataset' } }],
    });

    await repositories.tenants.upsertTenant({
      allowedOrigins: [],
      countryConfig: {
        countries: {
          CZ: {
            kinds: {
              address: {
                providerPriority: ['mapy-cz'],
                providerTimeoutMs: 100,
                providers: {
                  'mapy-cz': {
                    apiKey: 'test-mapy-key',
                    endpointUrl: 'https://mapy.test/suggest',
                  },
                },
              },
            },
          },
        },
      },
      id: 'tenant-provider-test',
      name: 'Tenant Provider Test',
      providerPriority: ['mapy-cz'],
      status: 'active',
    });

    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({
          items: [
            {
              id: 'mapy-address-1',
              label: 'Národní 1, 110 00 Praha, Česko',
              name: 'Národní 1',
              position: { lat: 50.081, lon: 14.428 },
              rawProviderOnly: 'do-not-leak-provider-raw-field',
              regionalStructure: [
                { isoCode: 'CZ', name: 'Česko', type: 'country' },
                { name: 'Praha', type: 'municipality' },
              ],
              secretRawPayload: {
                value: 'do-not-leak-provider-secret',
              },
              type: 'regional.address',
              zip: '110 00',
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await testHandler(
      requestFor(
        '/v1/suggest?kind=address&countryCode=CZ&q=provider-only&tenantId=tenant-provider-test&limit=1',
      ),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'written',
      providerEvents: [{ providerId: 'mapy-cz', status: 'success' }],
      suggestions: [
        {
          cacheStatus: 'written',
          id: 'mapy-address-1',
          source: { id: 'mapy-cz', kind: 'live-provider' },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mapy.test/suggest?apikey=test-mapy-key&query=provider-only&lang=cs&limit=1&type=regional.address&locality=cz',
      expect.objectContaining({
        headers: { accept: 'application/json' },
        method: 'GET',
      }),
    );

    const queryHash = await createSuggestQueryHash({
      countryCode: 'CZ',
      kind: 'address',
      limit: 1,
      query: 'provider-only',
    });
    const cacheKey = createSuggestCacheKey({
      countryCode: 'CZ',
      kind: 'address',
      queryHash,
      tenantId: 'tenant-provider-test',
    });

    await expect(repositories.suggestCache.readSuggestCache(cacheKey)).resolves.toMatchObject({
      payload: [
        {
          displayLabel: 'Národní 1, 110 00 Praha, Česko',
          source: { id: 'mapy-cz', kind: 'live-provider' },
        },
      ],
      status: 'hit',
    });
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: 'CZ',
        query: 'narodni 1',
      }),
    ).resolves.toMatchObject([
      {
        displayLabel: 'Národní 1, 110 00 Praha, Česko',
        sourceId: 'live-provider:mapy-cz:CZ',
      },
    ]);
    await expect(
      repositories.dataSources.getDataSource('live-provider:mapy-cz:CZ'),
    ).resolves.toMatchObject({
      cachePolicy: { kind: 'permanent' },
    });
    expect(JSON.stringify(body)).not.toContain('do-not-leak-provider-raw-field');
    expect(JSON.stringify(body)).not.toContain('do-not-leak-provider-secret');

    const cachedResponse = await testHandler(
      requestFor(
        '/v1/suggest?kind=address&countryCode=CZ&q=provider-only&tenantId=tenant-provider-test&limit=1',
      ),
    );
    const cachedBody = await readJson<SmartSuggestResponse>(cachedResponse);

    expect(cachedBody).toMatchObject({
      cacheStatus: 'hit',
      suggestions: [{ cacheStatus: 'hit', id: 'mapy-address-1' }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const statusResponse = await testHandler(requestFor('/v1/status'));
    const statusBody = await readJson<StatusPayload>(statusResponse);
    const statusJson = JSON.stringify(statusBody);

    expect(statusBody.metrics.providerEvents.success).toBeGreaterThanOrEqual(1);
    expect(statusBody.metrics.suggest.ownedSuccess).toBeGreaterThanOrEqual(1);
    expect(statusBody.metrics.suggest.providerFallback).toBeGreaterThanOrEqual(1);
    expect(statusBody.sourcePolicy.providerSources.durableRetentionAllowed).toEqual([
      'here-discover',
      'mapy-cz',
      'nominatim-managed',
    ]);
    expect(statusBody.sourcePolicy.providerSources.noDurableRetention).toEqual([
      'radar-autocomplete',
      'ruian-geocode',
    ]);
    expect(statusJson).not.toContain('provider-only');
    expect(statusJson).not.toContain('Národní');
    expect(statusJson).not.toContain('do-not-leak-provider-secret');
  });

  it('keeps Radar provider suggestions in the TTL cache without durable address records', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);

    await repositories.tenants.upsertTenant({
      allowedOrigins: [],
      countryConfig: {
        countries: {
          CZ: {
            kinds: {
              address: {
                providerPriority: ['radar-autocomplete'],
                providerTimeoutMs: 100,
                providers: {
                  'radar-autocomplete': {
                    apiKey: 'radar-key',
                    baseUrl: 'https://radar.test',
                    layers: 'address',
                  },
                },
              },
            },
          },
        },
      },
      id: 'tenant-radar-cache-test',
      name: 'Tenant Radar Cache Test',
      providerPriority: ['radar-autocomplete'],
      status: 'active',
    });

    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({
          addresses: [
            {
              city: 'Praha',
              countryCode: 'CZ',
              formattedAddress: 'Radarova 9, Praha',
              number: '9',
              postalCode: '101 00',
              street: 'Radarova',
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await testHandler(
      requestFor(
        '/v1/suggest?kind=address&countryCode=CZ&q=radar-provider-only&tenantId=tenant-radar-cache-test&limit=1',
      ),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'written',
      providerEvents: [{ providerId: 'radar-autocomplete', status: 'success' }],
      suggestions: [
        {
          cacheStatus: 'written',
          displayLabel: 'Radarova 9, Praha',
          source: { id: 'radar-autocomplete', kind: 'live-provider' },
        },
      ],
    });

    const queryHash = await createSuggestQueryHash({
      countryCode: 'CZ',
      kind: 'address',
      limit: 1,
      query: 'radar-provider-only',
    });
    const cacheKey = createSuggestCacheKey({
      countryCode: 'CZ',
      kind: 'address',
      queryHash,
      tenantId: 'tenant-radar-cache-test',
    });

    await expect(repositories.suggestCache.readSuggestCache(cacheKey)).resolves.toMatchObject({
      payload: [
        {
          displayLabel: 'Radarova 9, Praha',
          source: { id: 'radar-autocomplete', kind: 'live-provider' },
        },
      ],
      status: 'hit',
    });
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: 'CZ',
        query: 'Radarova 9',
      }),
    ).resolves.toEqual([]);
  });

  it('uses Worker env provider config for live fallback without tenant setup', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories, {
      MAPY_CZ_API_KEY: 'env-mapy-key',
      MAPY_CZ_ENDPOINT_URL: 'https://mapy-env.test/suggest',
      SMART_SUGGEST_PROVIDER_PRIORITY: 'mapy-cz',
      SMART_SUGGEST_PROVIDER_TIMEOUT_MS: '100',
    });
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({
          items: [
            {
              id: 'mapy-env-address-1',
              label: 'Env Provider 1, Praha',
              name: 'Env Provider 1',
              regionalStructure: [
                { isoCode: 'CZ', name: 'Česko', type: 'country' },
                { name: 'Praha', type: 'municipality' },
              ],
              type: 'regional.address',
              zip: '110 00',
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=env-provider-only&limit=1'),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'written',
      providerEvents: [{ providerId: 'mapy-cz', status: 'success' }],
      suggestions: [
        {
          cacheStatus: 'written',
          id: 'mapy-env-address-1',
          source: { id: 'mapy-cz', kind: 'live-provider' },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mapy-env.test/suggest?apikey=env-mapy-key&query=env-provider-only&lang=cs&limit=1&type=regional.address&locality=cz',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('keeps owned suggestions when a provider fallback times out', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);

    await repositories.tenants.upsertTenant({
      allowedOrigins: [],
      countryConfig: {
        countries: {
          CZ: {
            kinds: {
              address: {
                providerPriority: ['mapy-cz'],
                providerTimeoutMs: 1,
                providers: {
                  'mapy-cz': {
                    apiKey: 'test-mapy-timeout-key',
                    endpointUrl: 'https://mapy-timeout.test/suggest',
                  },
                },
              },
            },
          },
        },
      },
      id: 'tenant-provider-timeout-test',
      name: 'Tenant Provider Timeout Test',
      providerPriority: ['mapy-cz'],
      status: 'active',
    });

    const fetchMock = vi.fn<typeof fetch>(() => Promise.race<Response>([]));
    vi.stubGlobal('fetch', fetchMock);

    const response = await testHandler(
      requestFor(
        '/v1/suggest?kind=address&countryCode=CZ&q=vaclavske&tenantId=tenant-provider-timeout-test&limit=2',
      ),
    );
    const body = await readJson<SmartSuggestResponse>(response);
    const { queryHash, requestId } = await providerRequestIdFor('vaclavske');
    const providerEvents = await repositories.providerEvents.listProviderEvents(requestId);
    const statusResponse = await testHandler(requestFor('/v1/status'));
    const statusBody = await readJson<StatusPayload>(statusResponse);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      cacheStatus: 'miss',
      suggestions: [
        {
          id: 'cz-ruian-vaclavske-namesti-832-19',
          source: { kind: 'owned-dataset' },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(providerEvents).toMatchObject([
      {
        errorCode: 'provider-timeout',
        providerId: 'mapy-cz',
        queryHash,
        status: 'timeout',
      },
    ]);
    expect(JSON.stringify(providerEvents)).not.toContain('vaclavske');
    expect(statusBody.metrics.providerEvents.timeout).toBeGreaterThanOrEqual(1);
    expect(statusBody.metrics.suggest.providerFallback).toBeGreaterThanOrEqual(1);
  });

  it('opens the provider circuit after failures and rate limits while keeping owned suggestions', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);

    await repositories.tenants.upsertTenant({
      allowedOrigins: [],
      countryConfig: {
        countries: {
          CZ: {
            kinds: {
              address: {
                providerPriority: ['mapy-cz'],
                providerTimeoutMs: 100,
                providers: {
                  'mapy-cz': {
                    apiKey: 'test-mapy-rate-limit-key',
                    endpointUrl: 'https://mapy-rate-limit.test/suggest',
                  },
                },
              },
            },
          },
        },
      },
      id: 'tenant-provider-rate-limit-test',
      name: 'Tenant Provider Rate Limit Test',
      providerPriority: ['mapy-cz'],
      status: 'active',
    });

    let providerAttempt = 0;
    const fetchMock = vi.fn<typeof fetch>(() => {
      providerAttempt += 1;
      return Promise.resolve(Response.json({}, { status: providerAttempt === 1 ? 500 : 429 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const firstResponse = await testHandler(
      requestFor(
        '/v1/suggest?kind=address&countryCode=CZ&q=vaclavske&tenantId=tenant-provider-rate-limit-test&limit=2',
      ),
    );
    const secondResponse = await testHandler(
      requestFor(
        '/v1/suggest?kind=address&countryCode=CZ&q=vinohradska&tenantId=tenant-provider-rate-limit-test&limit=2',
      ),
    );
    const thirdResponse = await testHandler(
      requestFor(
        '/v1/suggest?kind=address&countryCode=CZ&q=masarykova&tenantId=tenant-provider-rate-limit-test&limit=2',
      ),
    );
    const [firstBody, secondBody, thirdBody] = await Promise.all([
      readJson<SmartSuggestResponse>(firstResponse),
      readJson<SmartSuggestResponse>(secondResponse),
      readJson<SmartSuggestResponse>(thirdResponse),
    ]);
    const firstProviderRequest = await providerRequestIdFor('vaclavske');
    const secondProviderRequest = await providerRequestIdFor('vinohradska');
    const thirdProviderRequest = await providerRequestIdFor('masarykova');
    const [firstProviderEvents, secondProviderEvents, thirdProviderEvents] = await Promise.all([
      repositories.providerEvents.listProviderEvents(firstProviderRequest.requestId),
      repositories.providerEvents.listProviderEvents(secondProviderRequest.requestId),
      repositories.providerEvents.listProviderEvents(thirdProviderRequest.requestId),
    ]);
    const statusResponse = await testHandler(requestFor('/v1/status'));
    const statusBody = await readJson<StatusPayload>(statusResponse);
    const providerEventJson = JSON.stringify([
      firstProviderEvents,
      secondProviderEvents,
      thirdProviderEvents,
    ]);

    expect(firstBody.suggestions).toEqual([
      expect.objectContaining({
        id: 'cz-ruian-vaclavske-namesti-832-19',
        source: expect.objectContaining({ kind: 'owned-dataset' }),
      }),
    ]);
    expect(secondBody.suggestions).toEqual([
      expect.objectContaining({
        id: 'cz-ruian-vinohradska-12-34',
        source: expect.objectContaining({ kind: 'owned-dataset' }),
      }),
    ]);
    expect(thirdBody.suggestions).toEqual([
      expect.objectContaining({
        id: 'cz-ruian-masarykova-12',
        source: expect.objectContaining({ kind: 'owned-dataset' }),
      }),
    ]);
    expect(firstProviderEvents).toMatchObject([
      {
        errorCode: 'provider-unavailable',
        providerId: 'mapy-cz',
        queryHash: firstProviderRequest.queryHash,
        status: 'error',
      },
    ]);
    expect(secondProviderEvents).toMatchObject([
      {
        errorCode: 'provider-unavailable',
        providerId: 'mapy-cz',
        queryHash: secondProviderRequest.queryHash,
        status: 'error',
      },
    ]);
    expect(thirdProviderEvents).toMatchObject([
      {
        errorCode: 'provider-unavailable',
        providerId: 'mapy-cz',
        queryHash: thirdProviderRequest.queryHash,
        status: 'skipped',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(providerAttempt).toBe(2);
    expect(statusBody.metrics.providerEvents.error).toBeGreaterThanOrEqual(2);
    expect(statusBody.metrics.providerEvents.skipped).toBeGreaterThanOrEqual(1);
    expect(providerEventJson).not.toContain('vaclavske');
    expect(providerEventJson).not.toContain('vinohradska');
    expect(providerEventJson).not.toContain('masarykova');
  });

  it('uses RÚIAN geocode fallback for Czech address-point recall without durable writes', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const existingSource = await repositories.dataSources.registerDataSource({
      attribution: {
        label: 'Existing learned provider data',
      },
      cachePolicy: { kind: 'ttl', ttlSeconds: 43_200 },
      countryCode: 'CZ',
      id: 'live-provider:nominatim:CZ',
      name: 'Nominatim CZ cache',
      sourceKind: 'live-provider',
    });

    await repositories.addressRecords.upsertAddressRecords([
      {
        countryCode: 'CZ',
        displayLabel: 'K louži 1312/1, Vršovice, 10100 Praha 10',
        id: 'existing-k-louzi-1312-1',
        parts: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1312',
          orientationNumber: '1',
          postalCode: '101 00',
          street: 'K louži',
        },
        quality: 0.9,
        searchLabel: 'k louzi 1312 1 vrsovice 10100 praha 10',
        sourceId: existingSource.id,
      },
    ]);

    const testHandler = createSmartSuggestHandler(repositories, {
      RUIAN_GEOCODE_BASE_URL: 'https://ruian.test/geocode',
      RUIAN_GEOCODE_DISABLED: 'false',
      SMART_SUGGEST_PROVIDER_PRIORITY: 'ruian-geocode',
      SMART_SUGGEST_PROVIDER_TIMEOUT_MS: '100',
    });
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({
          suggestions: [
            {
              isCollection: false,
              magicKey: '4_34593',
              text: 'K louži, Praha',
              type: 'Ulice',
            },
            {
              isCollection: false,
              magicKey: '1_1202562',
              text: 'K louži 784/3, Vršovice, 10100 Praha 10',
              type: 'AdresniMisto',
            },
            {
              isCollection: false,
              magicKey: '1_1203603',
              text: 'K louži 1258/12, Vršovice, 10100 Praha 10',
              type: 'AdresniMisto',
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=K%20Lou%C5%BEi&limit=20'),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'written',
      providerEvents: [{ providerId: 'ruian-geocode', status: 'success' }],
    });
    expect(body.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          address: expect.objectContaining({
            city: 'Praha 10',
            countryCode: 'CZ',
            district: 'Vršovice',
            houseNumber: '784',
            orientationNumber: '3',
            postalCode: '101 00',
            street: 'K louži',
          }),
          cacheStatus: 'written',
          id: 'ruian-geocode:1_1202562',
          source: expect.objectContaining({
            id: 'ruian-geocode',
            kind: 'live-provider',
          }),
        }),
        expect.objectContaining({
          address: expect.objectContaining({
            houseNumber: '1258',
            orientationNumber: '12',
          }),
          displayLabel: 'K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ',
          id: 'cz-ruian-k-louzi-1258-12',
          source: expect.objectContaining({
            id: 'ruian-cz-sample',
            kind: 'owned-dataset',
          }),
        }),
      ]),
    );
    expect(body.suggestions).toHaveLength(3);
    expect(body.suggestions[0]).toMatchObject({
      displayLabel: 'K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ',
      source: { id: 'ruian-cz-sample', kind: 'owned-dataset' },
    });
    expect(body.suggestions.slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayLabel: 'K louži 1312/1, Vršovice, 10100 Praha 10',
          source: expect.objectContaining({
            id: 'live-provider:nominatim:CZ',
          }),
        }),
        expect.objectContaining({
          id: 'ruian-geocode:1_1202562',
          source: expect.objectContaining({
            id: 'ruian-geocode',
            kind: 'live-provider',
          }),
        }),
      ]),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ruian.test/geocode/suggest?text=K+Lou%C5%BEi&f=json&maxSuggestions=20',
      expect.objectContaining({ method: 'GET' }),
    );
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: 'CZ',
        query: 'K Louži 1258',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'cz-ruian-k-louzi-1258-12',
        sourceId: 'ruian-cz-sample',
      }),
    ]);
  });

  it('fans out across configured Radar, HERE, and Nominatim providers', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);

    await repositories.tenants.upsertTenant({
      allowedOrigins: [],
      countryConfig: {
        countries: {
          CZ: {
            kinds: {
              address: {
                providerPriority: ['radar-autocomplete', 'here-discover', 'nominatim'],
                providerTimeoutMs: 100,
                providers: {
                  'here-discover': {
                    apiKey: 'here-key',
                    baseUrl: 'https://here.test',
                  },
                  nominatim: {
                    baseUrl: 'https://nominatim.test',
                    userAgent: 'smart-suggest-test',
                  },
                  'radar-autocomplete': {
                    apiKey: 'radar-key',
                    baseUrl: 'https://radar.test',
                    layers: 'address',
                  },
                },
              },
            },
          },
        },
      },
      id: 'tenant-fanout-test',
      name: 'Tenant Fanout Test',
      providerPriority: ['radar-autocomplete', 'here-discover', 'nominatim'],
      status: 'active',
    });

    const fetchMock = vi.fn<typeof fetch>((input) => {
      const url = String(input);

      if (url.startsWith('https://radar.test')) {
        return Promise.resolve(
          Response.json({
            addresses: [
              {
                city: 'Praha',
                countryCode: 'CZ',
                formattedAddress: 'K Louži 1, Praha',
                number: '1',
                postalCode: '101 00',
                street: 'K Louži',
              },
            ],
          }),
        );
      }

      if (url.startsWith('https://here.test')) {
        return Promise.resolve(
          Response.json({
            items: [
              {
                address: {
                  city: 'Praha',
                  countryCode: 'CZE',
                  houseNumber: '1',
                  label: 'K Louži 1, Praha',
                  postalCode: '101 00',
                  street: 'K Louži',
                },
                id: 'here-k-louzi-1',
                scoring: { queryScore: 0.95 },
                title: 'K Louži 1',
              },
            ],
          }),
        );
      }

      if (url.startsWith('https://nominatim.test')) {
        return Promise.resolve(
          Response.json([
            {
              address: {
                city: 'Praha',
                country_code: 'cz',
                house_number: '2',
                postcode: '101 00',
                road: 'K Louži',
              },
              display_name: 'K Louži 2, Praha',
              importance: 0.7,
              lat: '50.03',
              lon: '14.5',
              osm_id: 123,
              osm_type: 'way',
              place_id: 456,
            },
          ]),
        );
      }

      return Promise.resolve(Response.json({}, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await testHandler(
      requestFor(
        '/v1/suggest?kind=address&countryCode=CZ&q=K%20Lou%C5%BEi%201&tenantId=tenant-fanout-test&limit=3',
      ),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'written',
      providerEvents: [
        { providerId: 'radar-autocomplete', status: 'success' },
        { providerId: 'here-discover', status: 'success' },
        { providerId: 'nominatim', status: 'success' },
      ],
    });
    expect(body.suggestions.map((suggestion) => suggestion.displayLabel)).toEqual([
      'K Louži 1, Praha',
      'K Louži 2, Praha',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://here.test/v1/discover?q=K+Lou%C5%BEi+1&apiKey=here-key&limit=3&in=countryCode%3ACZE',
      expect.objectContaining({ method: 'GET' }),
    );
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: 'CZ',
        query: 'K Louži 1',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        displayLabel: 'K Louži 1, Praha',
        sourceId: 'live-provider:here-discover:CZ',
      }),
    ]);
    await expect(
      repositories.dataSources.getDataSource('live-provider:here-discover:CZ'),
    ).resolves.toMatchObject({
      cachePolicy: { kind: 'permanent' },
    });
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: 'CZ',
        query: 'K Louži 2',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        displayLabel: 'K Louži 2, Praha',
        sourceId: 'live-provider:nominatim:CZ',
      }),
    ]);
    await expect(
      repositories.dataSources.getDataSource('live-provider:nominatim:CZ'),
    ).resolves.toMatchObject({
      cachePolicy: { kind: 'permanent' },
    });
  });

  it('validates phone and postal requests through API endpoints', async () => {
    const phoneResponse = await handler(
      requestFor('/v1/validate/phone', {
        body: JSON.stringify({ defaultCountry: 'CZ', rawInput: '777 123 456' }),
        method: 'POST',
      }),
    );
    const phoneBody = await readJson<PhoneValidationPayload>(phoneResponse);

    expect(phoneBody).toMatchObject({
      e164: '+420777123456',
      isValid: true,
    });

    const postalResponse = await handler(
      requestFor('/v1/validate/postal', {
        body: JSON.stringify({ countryCode: 'PL', rawInput: '12345' }),
        method: 'POST',
      }),
    );
    const postalBody = await readJson<PostalValidationPayload>(postalResponse);

    expect(postalBody).toMatchObject({
      displayValue: '12-345',
      isValid: true,
    });

    const blankCountryResponse = await handler(
      requestFor('/v1/validate/postal', {
        body: JSON.stringify({ countryCode: '   ', rawInput: '12345' }),
        method: 'POST',
      }),
    );

    expect(blankCountryResponse.status).toBe(400);
  });

  it('records tenant-scoped accept telemetry with unique event ids', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);
    const acceptBody = {
      requestId: 'request-status-test',
      source: {
        id: 'ruian-cz-sample',
        kind: 'owned-dataset',
        name: 'RUIAN CZ sample',
      },
      suggestionId: 'cz-ruian-vaclavske-namesti-832-19',
      tenant: { cartId: 'cart-1', tenantId: 'tenant-1' },
    };

    const acceptResponse = await testHandler(
      requestFor('/v1/accept', {
        body: JSON.stringify(acceptBody),
        method: 'POST',
      }),
    );
    const repeatedAcceptResponse = await testHandler(
      requestFor('/v1/accept', {
        body: JSON.stringify(acceptBody),
        method: 'POST',
      }),
    );

    await expect(readJson<{ accepted: true }>(acceptResponse)).resolves.toEqual({
      accepted: true,
    });
    await expect(readJson<{ accepted: true }>(repeatedAcceptResponse)).resolves.toEqual({
      accepted: true,
    });

    const acceptEvents = await repositories.acceptEvents.listAcceptEvents('request-status-test');

    expect(acceptEvents).toHaveLength(2);
    expect(acceptEvents[0]).toMatchObject({
      sourceId: 'ruian-cz-sample',
      tenant: { cartId: 'cart-1', tenantId: 'tenant-1' },
    });

    const statusResponse = await testHandler(requestFor('/v1/status'));
    const statusBody = await readJson<StatusPayload>(statusResponse);

    expect(statusBody).toMatchObject({
      imports: { recentRuns: expect.any(Array) },
      service: 'smart-suggest',
    });
    expect(statusBody.metrics.accept.total).toBe(2);
  });

  it('reports redacted import freshness status from baseline and delta runs', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);

    await repositories.dataSources.registerDataSource({
      attribution: {
        label: 'CUZK RUIAN',
        license: 'CC BY 4.0',
        url: 'https://ruian.cuzk.cz/',
      },
      cachePolicy: { kind: 'permanent' },
      countryCode: 'CZ',
      datasetVersion: 'ruian-cz-2026-06-27',
      id: 'ruian-cz',
      modificationNoteSha256: 'a'.repeat(64),
      name: 'RUIAN CZ official address snapshot',
      sourceKind: 'owned-dataset',
    });
    await repositories.importRuns.startImportRun({
      checksumSha256: 'baseline-secret-checksum',
      id: 'import-ruian-cz-baseline-status-test',
      importKind: 'baseline',
      shardCountryCode: 'CZ',
      sourceFeedId: 'RUIAN-S-ZA-U',
      sourceId: 'ruian-cz',
      sourceUri: 'https://data.example.invalid/ruian/baseline.csv',
      sourceValidAt: '2026-06-26',
      sourceVersion: '20260626',
    });
    await repositories.importRuns.finishImportRun({
      completedAt: '2026-06-26T03:00:00.000Z',
      failedRows: 0,
      id: 'import-ruian-cz-baseline-status-test',
      insertedRows: 2,
      skippedRows: 0,
      status: 'completed',
      tombstonedRows: 0,
      totalRows: 2,
      upsertedRows: 2,
    });
    await repositories.importRuns.startImportRun({
      checksumSha256: 'delta-secret-checksum',
      id: 'import-ruian-cz-delta-status-test',
      importKind: 'delta',
      shardCountryCode: 'CZ',
      sourceFeedId: 'RUIAN-S-ZA-Z',
      sourceId: 'ruian-cz',
      sourceUri: 'https://data.example.invalid/ruian/delta.csv',
      sourceValidAt: '2026-06-27',
      sourceVersion: '20260627',
    });
    await repositories.importRuns.finishImportRun({
      completedAt: '2026-06-27T03:00:00.000Z',
      failedRows: 1,
      id: 'import-ruian-cz-delta-status-test',
      insertedRows: 1,
      skippedRows: 1,
      status: 'completed',
      tombstonedRows: 1,
      totalRows: 2,
      upsertedRows: 1,
    });
    await repositories.shardRegistry.upsertShardMetadata({
      bindingName: 'SMART_SUGGEST_CZ_VUSC_19',
      countryCode: 'CZ',
      estimatedSizeBytes: 5_100_000_000,
      importVersion: '2026-06-27',
      lastImportCompletedAt: '2026-06-27T03:00:00.000Z',
      regionCode: '19',
      regionKind: 'vusc',
      regionName: 'Praha',
      rowCount: 1,
      shardId: 'smart-suggest-cz-vusc-19',
      sourceFreshnessAt: '2026-06-27',
      state: 'active',
    });

    const statusResponse = await testHandler(requestFor('/v1/status'));
    const statusBody = await readJson<StatusPayload>(statusResponse);
    const statusJson = JSON.stringify(statusBody);

    expect(statusBody.imports.freshness).toMatchObject({
      latestBaseline: {
        completedAt: '2026-06-26T03:00:00.000Z',
        failedRows: 0,
        runId: 'import-ruian-cz-baseline-status-test',
        sourceFeedId: 'RUIAN-S-ZA-U',
        sourceValidAt: '2026-06-26',
        sourceVersion: '20260626',
        status: 'completed',
        tombstonedRows: 0,
        totalRows: 2,
        upsertedRows: 2,
      },
      latestDelta: {
        completedAt: '2026-06-27T03:00:00.000Z',
        failedRows: 1,
        runId: 'import-ruian-cz-delta-status-test',
        sourceFeedId: 'RUIAN-S-ZA-Z',
        sourceValidAt: '2026-06-27',
        sourceVersion: '20260627',
        status: 'completed',
        tombstonedRows: 1,
        totalRows: 2,
        upsertedRows: 1,
      },
      rowCounts: {
        failedRows: 1,
        skippedRows: 1,
        tombstonedRows: 1,
        totalRows: 4,
        upsertedRows: 3,
      },
      sla: {
        maxDeltaAgeHours: 48,
        status: expect.any(String),
      },
    });
    expect(statusBody.shards).toMatchObject({
      activeCount: 1,
      rowCount: 1,
      shards: [
        expect.objectContaining({
          bindingName: 'SMART_SUGGEST_CZ_VUSC_19',
          countryCode: 'CZ',
          estimatedSizeBytes: 5_100_000_000,
          importVersion: '2026-06-27',
          regionCode: '19',
          rowCount: 1,
          shardId: 'smart-suggest-cz-vusc-19',
          sourceFreshnessAt: '2026-06-27',
          state: 'active',
        }),
      ],
      sizeGuard: {
        blockBytes: 6_000_000_000,
        status: 'warning',
        warnBytes: 5_000_000_000,
      },
      totalCount: 1,
    });
    expect(statusBody.sourceProvenance).toMatchObject({
      authoritativeSources: [
        {
          attribution: {
            label: 'CUZK RUIAN',
            license: 'CC BY 4.0',
            url: 'https://ruian.cuzk.cz/',
          },
          datasetVersion: 'ruian-cz-2026-06-27',
          modificationNoteSha256Present: true,
          present: true,
          sourceId: 'ruian-cz',
          sourceKind: 'owned-dataset',
        },
      ],
    });
    expect(statusJson).not.toContain('data.example.invalid');
    expect(statusJson).not.toContain('secret-checksum');
    expect(statusJson).not.toContain('Smart Suggest normalizes RUIAN source rows');
  });

  it('searches bounded shard repositories through router metadata', async () => {
    const router = createInMemorySmartSuggestRepositories();
    const shardPraha = createInMemorySmartSuggestRepositories();
    const shardCentralBohemia = createInMemorySmartSuggestRepositories();

    await router.shardRegistry.upsertShardMetadata({
      bindingName: 'SMART_SUGGEST_CZ_VUSC_19',
      countryCode: 'CZ',
      regionCode: '19',
      regionKind: 'vusc',
      regionName: 'Praha',
      rowCount: 1,
      shardId: 'smart-suggest-cz-vusc-19',
      state: 'active',
    });
    await router.shardRegistry.upsertShardMetadata({
      bindingName: 'SMART_SUGGEST_CZ_VUSC_27',
      countryCode: 'CZ',
      regionCode: '27',
      regionKind: 'vusc',
      regionName: 'Středočeský',
      rowCount: 1,
      shardId: 'smart-suggest-cz-vusc-27',
      state: 'active',
    });
    await shardPraha.dataSources.registerDataSource({
      attribution: {
        label: 'RUIAN CZ',
        license: 'CC BY 4.0',
        url: 'https://ruian.cuzk.gov.cz/',
      },
      cachePolicy: { kind: 'permanent' },
      countryCode: 'CZ',
      datasetVersion: '2026-06-28',
      id: 'ruian-cz',
      name: 'RUIAN CZ',
      sourceKind: 'owned-dataset',
    });
    await shardPraha.addressRecords.upsertAddressRecords([
      {
        countryCode: 'CZ',
        displayLabel: 'K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ',
        id: 'ruian-cz:1203603',
        parts: {
          city: 'Praha 10',
          countryCode: 'CZ',
          district: 'Vršovice',
          houseNumber: '1258',
          orientationNumber: '12',
          postalCode: '101 00',
          street: 'K Louži',
        },
        quality: 0.99,
        ruian: {
          addressPlaceCode: '1203603',
          regionCode: '19',
          stableAddressId: 'ruian-cz:1203603',
        },
        searchLabel: 'k louzi 1258 12 101 00 praha 10 vrsovice cz',
        sourceId: 'ruian-cz',
      },
    ]);
    const repositories = createShardedRepositories({
      router,
      shardRepositories: new Map([
        ['SMART_SUGGEST_CZ_VUSC_19', shardPraha],
        ['SMART_SUGGEST_CZ_VUSC_27', shardCentralBohemia],
      ]),
    });
    const testHandler = createSmartSuggestHandler(repositories);
    const response = await testHandler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&query=K%20Lou%C5%BEi%201258&limit=5'),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body.suggestions).toEqual([
      expect.objectContaining({
        displayLabel: 'K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ',
        id: 'ruian-cz:1203603',
        source: expect.objectContaining({
          id: 'ruian-cz',
          kind: 'owned-dataset',
        }),
      }),
    ]);
  });

  it('rejects accept telemetry without trusted source and reports storage failures as server errors', async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const testHandler = createSmartSuggestHandler(repositories);

    const missingSourceResponse = await testHandler(
      requestFor('/v1/accept', {
        body: JSON.stringify({
          countryCode: 'CZ',
          requestId: 'request-missing-source',
          suggestionId: 'cz-ruian-vaclavske-namesti-832-19',
        }),
        method: 'POST',
      }),
    );

    expect(missingSourceResponse.status).toBe(400);

    repositories.acceptEvents.recordAcceptEvent = () =>
      Promise.reject(new Error('storage unavailable'));

    const storageErrorResponse = await testHandler(
      requestFor('/v1/accept', {
        body: JSON.stringify({
          requestId: 'request-storage-failure',
          source: {
            id: 'ruian-cz-sample',
            kind: 'owned-dataset',
            name: 'RUIAN CZ sample',
          },
          suggestionId: 'cz-ruian-vaclavske-namesti-832-19',
        }),
        method: 'POST',
      }),
    );

    expect(storageErrorResponse.status).toBe(500);
  });
});
