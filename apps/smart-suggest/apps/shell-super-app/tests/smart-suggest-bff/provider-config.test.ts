import { afterEach, describe, expect, it } from '@effect/vitest';
import { HttpRouter, HttpServer, Layer } from '@modern-js/plugin-bff/effect-edge';
import type {
  SmartSuggestProviderRegistry,
  SmartSuggestProviderRuntimeConfig,
} from '@techsio/smart-suggest-integrations';
import type * as SmartSuggestIntegrations from '@techsio/smart-suggest-integrations';
import type { SmartSuggestRepositories } from '@techsio/smart-suggest-storage';
import { createInMemorySmartSuggestRepositories } from '@techsio/smart-suggest-storage';
import { Context, Effect, Schema } from 'effect';
import { vi } from 'vitest';
import { createSmartSuggestApiLayer } from '../../api/index';
import { SmartSuggestResponseSchema } from '../../shared/api';

const providerRegistryCreations = vi.hoisted(() => [] as SmartSuggestProviderRuntimeConfig[]);

vi.mock('@techsio/smart-suggest-integrations', async (importOriginal) => {
  const original = await importOriginal<typeof SmartSuggestIntegrations>();

  return {
    ...original,
    createSmartSuggestProviderRegistryFromConfig: (
      config: SmartSuggestProviderRuntimeConfig,
    ): SmartSuggestProviderRegistry => {
      providerRegistryCreations.push(config);

      return original.createSmartSuggestProviderRegistryFromConfig(config);
    },
  };
});

type SmartSuggestTestEnv = Parameters<typeof createSmartSuggestApiLayer>[1];
type SmartSuggestTestHandler = (request: Request) => Promise<Response>;

const defaultTestEnv = {
  RUIAN_GEOCODE_DISABLED: 'true',
  SMART_SUGGEST_PROVIDER_OUTBOUND_BUDGET_MAX: '100000',
  SMART_SUGGEST_PROVIDER_OUTBOUND_BUDGET_WINDOW_MS: '60000',
} satisfies SmartSuggestTestEnv;

const testEnvFor = (env?: SmartSuggestTestEnv): SmartSuggestTestEnv => ({
  ...defaultTestEnv,
  ...env,
});

const requestFor = (path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);

  if (init?.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return new Request(`https://smart-suggest.test${path}`, {
    ...init,
    headers,
  });
};

const decodeJsonResponse = <S extends Schema.Constraint>(response: Response, schema: S) =>
  Effect.promise(() => response.json()).pipe(Effect.flatMap(Schema.decodeUnknownEffect(schema)));

const createSmartSuggestHandler = (
  repositories: SmartSuggestRepositories,
  env?: SmartSuggestTestEnv,
): SmartSuggestTestHandler => {
  const webHandler = HttpRouter.toWebHandler(
    createSmartSuggestApiLayer(repositories, testEnvFor(env)).pipe(
      Layer.provide(HttpServer.layerServices),
    ),
    {
      disableLogger: true,
    },
  ).handler;

  return (request) => webHandler(request, Context.makeUnsafe<unknown>(new Map<string, unknown>()));
};

const resolveEffect = <TValue, TError>(effect: Effect.Effect<TValue, TError, never>) => effect;

const mapyProviderBody = (id: string, label = `${id}, Praha`) => ({
  items: [
    {
      id,
      label,
      name: label,
      regionalStructure: [
        { isoCode: 'CZ', name: 'Cesko', type: 'country' },
        { name: 'Praha', type: 'municipality' },
      ],
      type: 'regional.address',
      zip: '110 00',
    },
  ],
});

const upsertMapyTenant = (
  repositories: SmartSuggestRepositories,
  input: {
    endpointUrl?: string;
    id: string;
    key?: string;
    providerPriority?: readonly string[];
  },
) =>
  repositories.tenants.upsertTenant({
    allowedOrigins: [],
    countryConfig:
      input.key === undefined && input.endpointUrl === undefined
        ? {}
        : {
            countries: {
              CZ: {
                kinds: {
                  address: {
                    providerPriority: ['mapy-cz'],
                    providerTimeoutMs: 100,
                    providers: {
                      'mapy-cz': {
                        apiKey: input.key,
                        endpointUrl: input.endpointUrl,
                      },
                    },
                  },
                },
              },
            },
          },
    id: input.id,
    name: input.id,
    providerPriority: input.providerPriority ?? ['mapy-cz'],
    status: 'active',
  });

describe('Smart Suggest BFF provider configuration', () => {
  afterEach(() => {
    providerRegistryCreations.length = 0;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.effect('evicts the oldest provider registry after 500 live entries', () =>
    Effect.gen(function* providerRegistryEvictionProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories);
      const fetchMock = vi.fn<typeof fetch>(() =>
        Promise.resolve(Response.json(mapyProviderBody('registry-eviction-provider'))),
      );
      vi.stubGlobal('fetch', fetchMock);

      for (let index = 0; index < 500; index += 1) {
        yield* resolveEffect(
          upsertMapyTenant(repositories, {
            endpointUrl: 'https://mapy-registry.test/suggest',
            id: `tenant-registry-${index}`,
            key: 'registry-key',
          }),
        );

        const response = yield* Effect.promise(() =>
          testHandler(
            requestFor(
              `/v1/suggest?kind=address&countryCode=CZ&q=registry-${index}&tenantId=tenant-registry-${index}&limit=1`,
            ),
          ),
        );
        expect(response.status).toBe(200);
      }

      expect(providerRegistryCreations).toHaveLength(500);

      const liveReuseBeforeOverflow = providerRegistryCreations.length;
      const liveBeforeOverflowResponse = yield* Effect.promise(() =>
        testHandler(
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=registry-live-before-overflow&tenantId=tenant-registry-250&limit=1',
          ),
        ),
      );
      expect(liveBeforeOverflowResponse.status).toBe(200);
      expect(providerRegistryCreations).toHaveLength(liveReuseBeforeOverflow);

      yield* resolveEffect(
        upsertMapyTenant(repositories, {
          endpointUrl: 'https://mapy-registry.test/suggest',
          id: 'tenant-registry-500',
          key: 'registry-key',
        }),
      );

      const overflowResponse = yield* Effect.promise(() =>
        testHandler(
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=registry-overflow&tenantId=tenant-registry-500&limit=1',
          ),
        ),
      );
      expect(overflowResponse.status).toBe(200);
      expect(providerRegistryCreations).toHaveLength(501);

      const oldestResponse = yield* Effect.promise(() =>
        testHandler(
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=registry-oldest-revisited&tenantId=tenant-registry-0&limit=1',
          ),
        ),
      );
      expect(oldestResponse.status).toBe(200);
      expect(providerRegistryCreations).toHaveLength(502);

      const liveReuseAfterOverflow = providerRegistryCreations.length;
      const liveAfterOverflowResponse = yield* Effect.promise(() =>
        testHandler(
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=registry-live-after-overflow&tenantId=tenant-registry-250&limit=1',
          ),
        ),
      );
      expect(liveAfterOverflowResponse.status).toBe(200);
      expect(providerRegistryCreations).toHaveLength(liveReuseAfterOverflow);
    }),
  );

  it.effect('prefers tenant provider config over Worker env config', () =>
    Effect.gen(function* tenantProviderConfigPrecedenceProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories, {
        MAPY_CZ_API_KEY: 'env-mapy-key',
        MAPY_CZ_ENDPOINT_URL: 'https://mapy-env.test/suggest',
        SMART_SUGGEST_PROVIDER_ENRICHMENT_ENABLED: 'true',
        SMART_SUGGEST_PROVIDER_PRIORITY: 'mapy-cz',
        SMART_SUGGEST_PROVIDER_TIMEOUT_MS: '100',
      });

      yield* resolveEffect(
        upsertMapyTenant(repositories, {
          endpointUrl: 'https://mapy-tenant.test/suggest',
          id: 'tenant-provider-config-precedence',
          key: 'tenant-mapy-key',
        }),
      );

      const fetchMock = vi.fn<typeof fetch>(() =>
        Promise.resolve(Response.json(mapyProviderBody('tenant-provider-address'))),
      );
      vi.stubGlobal('fetch', fetchMock);

      const response = yield* Effect.promise(() =>
        testHandler(
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=tenant-provider-precedence&tenantId=tenant-provider-config-precedence&limit=1',
          ),
        ),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body).toMatchObject({
        cacheStatus: 'written',
        suggestions: [
          {
            id: 'tenant-provider-address',
            source: { id: 'mapy-cz', kind: 'live-provider' },
          },
        ],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://mapy-tenant.test/suggest?apikey=tenant-mapy-key&query=tenant-provider-precedence&lang=cs&limit=1&type=regional.address&locality=cz',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('mapy-env.test'),
        expect.anything(),
      );
    }),
  );

  it.effect('uses Worker env provider config when a tenant has no provider config', () =>
    Effect.gen(function* envProviderConfigTenantFallbackProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories, {
        MAPY_CZ_API_KEY: 'env-mapy-key',
        MAPY_CZ_ENDPOINT_URL: 'https://mapy-env.test/suggest',
        SMART_SUGGEST_PROVIDER_ENRICHMENT_ENABLED: 'true',
        SMART_SUGGEST_PROVIDER_PRIORITY: 'mapy-cz',
        SMART_SUGGEST_PROVIDER_TIMEOUT_MS: '100',
      });

      yield* resolveEffect(
        upsertMapyTenant(repositories, {
          id: 'tenant-provider-config-env-fallback',
          providerPriority: ['mapy-cz'],
        }),
      );

      const fetchMock = vi.fn<typeof fetch>(() =>
        Promise.resolve(Response.json(mapyProviderBody('env-fallback-address'))),
      );
      vi.stubGlobal('fetch', fetchMock);

      const response = yield* Effect.promise(() =>
        testHandler(
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=tenant-env-provider-fallback&tenantId=tenant-provider-config-env-fallback&limit=1',
          ),
        ),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body).toMatchObject({
        cacheStatus: 'written',
        suggestions: [
          {
            id: 'env-fallback-address',
            source: { id: 'mapy-cz', kind: 'live-provider' },
          },
        ],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://mapy-env.test/suggest?apikey=env-mapy-key&query=tenant-env-provider-fallback&lang=cs&limit=1&type=regional.address&locality=cz',
        expect.objectContaining({ method: 'GET' }),
      );
    }),
  );

  it.effect('prefers HERE_DISCOVER_AT over HERE default coordinates', () =>
    Effect.gen(function* hereAtFallbackPrecedenceProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories, {
        HERE_API_KEY: 'here-key',
        HERE_DEFAULT_LAT: '50.1',
        HERE_DEFAULT_LNG: '14.4',
        HERE_DISCOVER_AT: '49.1,16.2',
        HERE_DISCOVER_BASE_URL: 'https://here.test',
        SMART_SUGGEST_PROVIDER_ENRICHMENT_ENABLED: 'true',
        SMART_SUGGEST_PROVIDER_PRIORITY: 'here-discover',
        SMART_SUGGEST_PROVIDER_TIMEOUT_MS: '100',
      });
      const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ items: [] })));
      vi.stubGlobal('fetch', fetchMock);

      const response = yield* Effect.promise(() =>
        testHandler(
          requestFor('/v1/suggest?kind=address&countryCode=CZ&q=here-at-fallback-order&limit=1'),
        ),
      );

      expect(response.status).toBe(200);
      expect(providerRegistryCreations.at(-1)?.hereDiscover).toMatchObject({
        apiKey: 'here-key',
        at: '49.1,16.2',
        baseUrl: 'https://here.test',
      });
      expect(providerRegistryCreations.at(-1)?.hereDiscover?.at).not.toBe('50.1,14.4');
    }),
  );
});
