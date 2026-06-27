import type { SmartSuggestResponse } from '@techsio/smart-suggest-core';
import {
  createInMemorySmartSuggestRepositories,
  createSuggestCacheKey,
  createSuggestQueryHash,
} from '@techsio/smart-suggest-storage';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSmartSuggestHandler, handler } from './index';

interface HealthPayload {
  db: {
    ok: boolean;
  };
  service: string;
}

interface StatusPayload {
  imports: {
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
      providerFallback: number;
      total: number;
    };
  };
  service: string;
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

describe('Smart Suggest effect API', () => {
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

  it('serves CZ and SK owned-data suggestions through repository search and cache', async () => {
    const firstResponse = await handler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&limit=1'),
    );
    const firstBody = await readJson<SmartSuggestResponse>(firstResponse);

    expect(firstBody).toMatchObject({
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

  it('keeps unsupported suggest kinds fail-open with disabled cache status', async () => {
    const response = await handler(requestFor('/v1/suggest?kind=postal&q=12345'));
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'disabled',
      suggestions: [],
    });
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

  it('falls back to configured live providers without caching provider payloads', async () => {
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
      requestFor(
        '/v1/suggest?kind=address&countryCode=CZ&q=provider-only&tenantId=tenant-provider-test&limit=1',
      ),
    );
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'disabled',
      providerEvents: [{ providerId: 'mapy-cz', status: 'success' }],
      suggestions: [
        {
          cacheStatus: 'disabled',
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

    await expect(repositories.suggestCache.readSuggestCache(cacheKey)).resolves.toBeUndefined();

    const statusResponse = await testHandler(requestFor('/v1/status'));
    const statusBody = await readJson<StatusPayload>(statusResponse);

    expect(statusBody.metrics.providerEvents.success).toBeGreaterThanOrEqual(1);
    expect(statusBody.metrics.suggest.providerFallback).toBeGreaterThanOrEqual(1);
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
      cacheStatus: 'disabled',
      providerEvents: [{ providerId: 'mapy-cz', status: 'success' }],
      suggestions: [
        {
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
      source: { id: 'ruian-cz-sample', kind: 'owned-dataset', name: 'RUIAN CZ sample' },
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
          source: { id: 'ruian-cz-sample', kind: 'owned-dataset', name: 'RUIAN CZ sample' },
          suggestionId: 'cz-ruian-vaclavske-namesti-832-19',
        }),
        method: 'POST',
      }),
    );

    expect(storageErrorResponse.status).toBe(500);
  });
});
