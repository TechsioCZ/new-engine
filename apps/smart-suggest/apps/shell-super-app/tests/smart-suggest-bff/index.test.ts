import { afterEach, describe, expect, it, vi } from '@effect/vitest';
import {
  createEffectOperationContext,
  HttpRouter,
  HttpServer,
  Layer,
  runWithEffectContext,
} from '@modern-js/plugin-bff/effect-edge';
import { seedSampleAddressDatasetsEffect } from '@techsio/smart-suggest-datasets';
import type { SmartSuggestRepositories } from '@techsio/smart-suggest-storage';
import {
  createInMemorySmartSuggestRepositories,
  createSuggestCacheKey,
  createSuggestQueryHashEffect,
  SmartSuggestStorageError,
} from '@techsio/smart-suggest-storage';
import { Context, Effect, Schema } from 'effect';
import { createShardedRepositories, createSmartSuggestApiLayer } from '../../api/index';
import {
  PhoneValidationRequestSchema,
  PhoneValidationResultSchema,
  PostalValidationRequestSchema,
  PostalValidationResultSchema,
  ProviderEventStatusSchema,
  SmartSuggestAcceptEventSchema,
  SmartSuggestAcceptResponseSchema,
  SmartSuggestBadRequestErrorBodySchema,
  SmartSuggestErrorCodeSchema,
  SmartSuggestForbiddenErrorBodySchema,
  SmartSuggestHealthResponseSchema,
  SmartSuggestIdSchema,
  SmartSuggestIsoDateTimeStringSchema,
  SmartSuggestNonNegativeNumberSchema,
  SmartSuggestRateLimitErrorBodySchema,
  SmartSuggestResponseSchema,
  SmartSuggestStatusResponseSchema,
  SmartSuggestUnauthorizedErrorBodySchema,
} from '../../shared/api';

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
const SmartSuggestResponseJsonSchema = Schema.fromJsonString(SmartSuggestResponseSchema);
const SmartSuggestStatusResponseJsonSchema = Schema.fromJsonString(
  SmartSuggestStatusResponseSchema,
);
const PhoneValidationRequestJsonSchema = Schema.fromJsonString(PhoneValidationRequestSchema);
const PostalValidationRequestJsonSchema = Schema.fromJsonString(PostalValidationRequestSchema);
const SmartSuggestAcceptEventJsonSchema = Schema.fromJsonString(SmartSuggestAcceptEventSchema);
const InvalidPostalValidationRequestJsonSchema = Schema.fromJsonString(
  Schema.Struct({
    countryCode: Schema.String,
    rawInput: Schema.String,
  }),
);
const InvalidAcceptEventJsonSchema = Schema.fromJsonString(
  Schema.Struct({
    countryCode: Schema.String,
    requestId: SmartSuggestIdSchema,
    suggestionId: SmartSuggestIdSchema,
  }),
);
const ProviderEventRecordSchema = Schema.Struct({
  createdAt: SmartSuggestIsoDateTimeStringSchema,
  errorCode: Schema.optionalKey(SmartSuggestErrorCodeSchema),
  id: SmartSuggestIdSchema,
  latencyMs: Schema.optionalKey(SmartSuggestNonNegativeNumberSchema),
  providerId: SmartSuggestIdSchema,
  queryHash: Schema.optionalKey(SmartSuggestIdSchema),
  requestId: SmartSuggestIdSchema,
  status: ProviderEventStatusSchema,
  tenantId: Schema.optionalKey(SmartSuggestIdSchema),
});
const ProviderEventRecordsJsonSchema = Schema.fromJsonString(
  Schema.Array(ProviderEventRecordSchema),
);
type SmartSuggestTestEnv = Parameters<typeof createSmartSuggestApiLayer>[1];
type SmartSuggestTestHandler = (request: Request) => Promise<Response>;
const sha256HexForTest = (value: string) =>
  Effect.promise(() =>
    globalThis.crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(value))
      .then((digest) =>
        [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
      ),
  );
const defaultTestEnv = {
  RUIAN_GEOCODE_DISABLED: 'true',
} satisfies SmartSuggestTestEnv;
const testEnvFor = (env?: SmartSuggestTestEnv): SmartSuggestTestEnv => ({
  ...defaultTestEnv,
  ...env,
});
const createSmartSuggestHandlerFromEnv = (
  repositories: SmartSuggestRepositories,
  env?: SmartSuggestTestEnv,
): SmartSuggestTestHandler => {
  const webHandler = HttpRouter.toWebHandler(
    createSmartSuggestApiLayer(repositories, env).pipe(Layer.provide(HttpServer.layerServices)),
    {
      disableLogger: true,
    },
  ).handler;

  return (request) => webHandler(request, Context.makeUnsafe<unknown>(new Map<string, unknown>()));
};
const requestPath = (request: Request) => new URL(request.url).pathname;
const createSmartSuggestHandlerFromWorkerEnv = (
  repositories: SmartSuggestRepositories,
  env?: SmartSuggestTestEnv,
): SmartSuggestTestHandler => {
  const webHandler = HttpRouter.toWebHandler(
    createSmartSuggestApiLayer(repositories).pipe(Layer.provide(HttpServer.layerServices)),
    {
      disableLogger: true,
    },
  ).handler;
  const runtimeEnv = testEnvFor(env);

  return (request) => {
    const path = requestPath(request);
    const { method } = request;
    const context = {
      env: runtimeEnv,
      method,
      operationContext: createEffectOperationContext({
        env: runtimeEnv,
        method,
        path,
        request,
      }),
      path,
      request,
    };

    return runWithEffectContext(context, () =>
      webHandler(request, Context.makeUnsafe<unknown>(new Map<string, unknown>())),
    );
  };
};
const createSmartSuggestHandler = (
  repositories: SmartSuggestRepositories,
  env?: SmartSuggestTestEnv,
): SmartSuggestTestHandler => createSmartSuggestHandlerFromEnv(repositories, testEnvFor(env));
const seedSampleRepositories = (repositories: SmartSuggestRepositories) =>
  seedSampleAddressDatasetsEffect(repositories);
const upsertTenantApiKey = ({
  id,
  key,
  repositories,
  status = 'active',
  tenantId,
}: {
  id: string;
  key: string;
  repositories: SmartSuggestRepositories;
  status?: 'active' | 'revoked';
  tenantId: string;
}) =>
  sha256HexForTest(key).pipe(
    Effect.flatMap((keyHash) =>
      repositories.apiKeys.upsertApiKey({
        id,
        keyHash,
        label: id,
        status,
        tenantId,
      }),
    ),
  );
const createSeededSmartSuggestHandler = (
  repositories: SmartSuggestRepositories,
  env?: SmartSuggestTestEnv,
) =>
  seedSampleRepositories(repositories).pipe(
    Effect.as(createSmartSuggestHandler(repositories, env)),
  );
const defaultTestHandler = createSmartSuggestHandler(createInMemorySmartSuggestRepositories());
const handlerEffect = (request: Request) => Effect.promise(() => defaultTestHandler(request));
const handlerCallEffect = (
  currentHandler: (request: Request) => Promise<Response>,
  request: Request,
) => Effect.promise(() => currentHandler(request));
const resolveEffect = <TValue, TError>(effect: Effect.Effect<TValue, TError, never>) => effect;

const hmacSha256PrefixPattern = /^hmac-sha256:/u;
const providerRequestIdFor = (query: string, limit = 2) =>
  Effect.map(
    resolveEffect(
      createSuggestQueryHashEffect({
        countryCode: 'CZ',
        kind: 'address',
        limit,
        query,
      }),
    ),
    (queryHash) => ({
      queryHash,
      requestId: `provider-${queryHash.slice(0, 16)}`,
    }),
  );

describe('Smart Suggest effect API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.effect('reports health with storage connectivity', () =>
    Effect.gen(function* shellEffectTestProgram1() {
      const response = yield* handlerEffect(requestFor('/v1/health'));
      const body = yield* decodeJsonResponse(response, SmartSuggestHealthResponseSchema);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        db: { ok: true },
        service: 'smart-suggest',
      });
    }),
  );

  it.effect('honors configured CORS origins for preflight and API responses', () =>
    Effect.gen(function* shellEffectTestProgram2() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories, {
        SMART_SUGGEST_ALLOWED_ORIGINS: 'https://shop.example, https://admin.example',
      });

      const preflightResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest', {
          headers: {
            'access-control-request-headers': 'content-type',
            origin: 'https://shop.example',
          },
          method: 'OPTIONS',
        }),
      );
      const rejectedPreflightResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest', {
          headers: {
            origin: 'https://blocked.example',
          },
          method: 'OPTIONS',
        }),
      );
      const healthResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/health', {
          headers: { origin: 'https://admin.example' },
        }),
      );

      expect(preflightResponse.status).toBe(204);
      expect(preflightResponse.headers.get('access-control-allow-origin')).toBe(
        'https://shop.example',
      );
      expect(preflightResponse.headers.get('access-control-allow-methods')).toContain('OPTIONS');
      expect(rejectedPreflightResponse.status).toBe(204);
      expect(rejectedPreflightResponse.headers.get('access-control-allow-origin')).toBeNull();
      expect(healthResponse.headers.get('access-control-allow-origin')).toBe(
        'https://admin.example',
      );
    }),
  );

  it.effect('builds CORS decisions from Worker request env when the layer is envless', () =>
    Effect.gen(function* workerEnvCorsProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandlerFromWorkerEnv(repositories, {
        SMART_SUGGEST_ALLOWED_ORIGINS: 'https://worker-env.example',
      });

      const preflightResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/health', {
          headers: {
            origin: 'https://worker-env.example',
          },
          method: 'OPTIONS',
        }),
      );
      const healthResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/health', {
          headers: { origin: 'https://worker-env.example' },
        }),
      );

      expect(preflightResponse.status).toBe(204);
      expect(preflightResponse.headers.get('access-control-allow-origin')).toBe(
        'https://worker-env.example',
      );
      expect(healthResponse.headers.get('access-control-allow-origin')).toBe(
        'https://worker-env.example',
      );
    }),
  );

  it.effect('ignores wildcard CORS and applies tenant-scoped origins on protected suggest', () =>
    Effect.gen(function* tenantScopedCorsProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories, {
        SMART_SUGGEST_ALLOWED_ORIGINS: '*',
      });

      yield* resolveEffect(
        repositories.tenants.upsertTenant({
          allowedOrigins: ['*', 'https://tenant-shop.example'],
          countryConfig: {},
          id: 'tenant-origin-test',
          name: 'Tenant Origin Test',
          providerPriority: [],
          status: 'active',
        }),
      );

      const wildcardHealthResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/health', {
          headers: { origin: 'https://wildcard.example' },
        }),
      );
      const tenantPreflightResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?tenantId=tenant-origin-test', {
          headers: {
            'access-control-request-headers': 'x-api-key',
            origin: 'https://tenant-shop.example',
          },
          method: 'OPTIONS',
        }),
      );
      const prefixedTenantPreflightResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/api/v1/suggest?tenantId=tenant-origin-test', {
          headers: {
            'access-control-request-headers': 'x-api-key',
            origin: 'https://tenant-shop.example',
          },
          method: 'OPTIONS',
        }),
      );
      const tenantAcceptPreflightResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/accept?tenantId=tenant-origin-test', {
          headers: {
            'access-control-request-headers': 'content-type',
            origin: 'https://tenant-shop.example',
          },
          method: 'OPTIONS',
        }),
      );
      const blockedResponse = yield* handlerCallEffect(
        testHandler,
        requestFor(
          '/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&tenantId=tenant-origin-test&limit=1',
          {
            headers: { origin: 'https://blocked.example' },
          },
        ),
      );
      const blockedBody = yield* decodeJsonResponse(
        blockedResponse,
        SmartSuggestForbiddenErrorBodySchema,
      );
      const allowedResponse = yield* handlerCallEffect(
        testHandler,
        requestFor(
          '/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&tenantId=tenant-origin-test&limit=1',
          {
            headers: { origin: 'https://tenant-shop.example' },
          },
        ),
      );
      const allowedBody = yield* decodeJsonResponse(allowedResponse, SmartSuggestResponseSchema);

      expect(wildcardHealthResponse.headers.get('access-control-allow-origin')).toBeNull();
      expect(tenantPreflightResponse.status).toBe(204);
      expect(tenantPreflightResponse.headers.get('access-control-allow-origin')).toBe(
        'https://tenant-shop.example',
      );
      expect(prefixedTenantPreflightResponse.status).toBe(204);
      expect(prefixedTenantPreflightResponse.headers.get('access-control-allow-origin')).toBe(
        'https://tenant-shop.example',
      );
      expect(tenantAcceptPreflightResponse.status).toBe(204);
      expect(tenantAcceptPreflightResponse.headers.get('access-control-allow-origin')).toBe(
        'https://tenant-shop.example',
      );
      expect(blockedResponse.status).toBe(403);
      expect(blockedBody.errors[0]).toMatchObject({ code: 'forbidden' });
      expect(allowedResponse.status).toBe(200);
      expect(allowedResponse.headers.get('access-control-allow-origin')).toBe(
        'https://tenant-shop.example',
      );
      expect(allowedBody.suggestions).toHaveLength(1);
    }),
  );

  it.effect('rejects punctuation-only suggest queries before provider or storage lookup', () =>
    Effect.gen(function* punctuationOnlySuggestProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=...---...&limit=1'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestBadRequestErrorBodySchema);

      expect(response.status).toBe(400);
      expect(body.errors[0]).toMatchObject({ code: 'bad-request' });
    }),
  );

  it.effect('requires active tenant API keys when tenant key config is present', () =>
    Effect.gen(function* tenantApiKeyProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);

      yield* resolveEffect(
        repositories.tenants.upsertTenant({
          allowedOrigins: [],
          countryConfig: {},
          id: 'tenant-api-key-test',
          name: 'Tenant API Key Test',
          providerPriority: [],
          status: 'active',
        }),
      );
      yield* resolveEffect(
        repositories.tenants.upsertTenant({
          allowedOrigins: [],
          countryConfig: {},
          id: 'tenant-other-api-key-test',
          name: 'Tenant Other API Key Test',
          providerPriority: [],
          status: 'active',
        }),
      );
      yield* upsertTenantApiKey({
        id: 'tenant-api-key-test-key',
        key: 'tenant-secret-key',
        repositories,
        tenantId: 'tenant-api-key-test',
      });
      yield* upsertTenantApiKey({
        id: 'tenant-api-key-test-revoked-key',
        key: 'tenant-revoked-key',
        repositories,
        status: 'revoked',
        tenantId: 'tenant-api-key-test',
      });
      yield* upsertTenantApiKey({
        id: 'tenant-other-api-key-test-key',
        key: 'tenant-other-secret-key',
        repositories,
        tenantId: 'tenant-other-api-key-test',
      });

      const suggestPath =
        '/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&tenantId=tenant-api-key-test&limit=1';
      const missingResponse = yield* handlerCallEffect(testHandler, requestFor(suggestPath));
      const missingBody = yield* decodeJsonResponse(
        missingResponse,
        SmartSuggestUnauthorizedErrorBodySchema,
      );
      const revokedResponse = yield* handlerCallEffect(
        testHandler,
        requestFor(suggestPath, {
          headers: { 'x-api-key': 'tenant-revoked-key' },
        }),
      );
      const mismatchedResponse = yield* handlerCallEffect(
        testHandler,
        requestFor(suggestPath, {
          headers: { authorization: 'Bearer tenant-other-secret-key' },
        }),
      );
      const allowedResponse = yield* handlerCallEffect(
        testHandler,
        requestFor(suggestPath, {
          headers: { authorization: 'Bearer tenant-secret-key' },
        }),
      );
      const allowedBody = yield* decodeJsonResponse(allowedResponse, SmartSuggestResponseSchema);

      expect(missingResponse.status).toBe(401);
      expect(missingBody.errors[0]).toMatchObject({ code: 'unauthorized' });
      expect(revokedResponse.status).toBe(401);
      expect(mismatchedResponse.status).toBe(403);
      expect(allowedResponse.status).toBe(200);
      expect(allowedBody.suggestions).toHaveLength(1);
    }),
  );

  it.effect('rate limits inbound BFF requests with a typed 429 error', () =>
    Effect.gen(function* inboundRateLimitProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories, {
        SMART_SUGGEST_BFF_RATE_LIMIT_MAX: '1',
        SMART_SUGGEST_BFF_RATE_LIMIT_WINDOW_MS: '60000',
      });
      const request = () =>
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vinohradska&limit=1', {
          headers: { origin: 'https://rate-limit.example' },
        });

      const allowedResponse = yield* handlerCallEffect(testHandler, request());
      const limitedResponse = yield* handlerCallEffect(testHandler, request());
      const limitedBody = yield* decodeJsonResponse(
        limitedResponse,
        SmartSuggestRateLimitErrorBodySchema,
      );

      expect(allowedResponse.status).toBe(200);
      expect(limitedResponse.status).toBe(429);
      expect(limitedBody.errors[0]).toMatchObject({ code: 'rate-limit', retryable: true });
    }),
  );

  it.effect('reports compact catalog-derived source policy coverage', () =>
    Effect.gen(function* shellEffectTestProgram3() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories);
      const response = yield* handlerCallEffect(testHandler, requestFor('/v1/status'));
      const body = yield* decodeJsonResponse(response, SmartSuggestStatusResponseSchema);

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
    }),
  );

  it.effect('serves CZ and SK owned-data suggestions through repository search and cache', () =>
    Effect.gen(function* shellEffectTestProgram4() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);
      const firstResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&limit=1'),
      );
      const firstBody = yield* decodeJsonResponse(firstResponse, SmartSuggestResponseSchema);

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
      expect(firstBody).not.toHaveProperty('cacheLevels');
      expect(firstBody).not.toHaveProperty('providerEvents');

      const secondResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&limit=1'),
      );
      const secondBody = yield* decodeJsonResponse(secondResponse, SmartSuggestResponseSchema);

      expect(secondBody).toMatchObject({
        cacheStatus: 'hit',
        suggestions: [{ cacheStatus: 'hit' }],
      });
      expect(secondBody).not.toHaveProperty('cacheLevels');

      const skResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=SK&q=zizkova&limit=1'),
      );
      const skBody = yield* decodeJsonResponse(skResponse, SmartSuggestResponseSchema);

      expect(skBody.suggestions[0]).toMatchObject({
        address: { city: 'Žilina', countryCode: 'SK' },
        id: 'sk-register-adries-zizkova-45',
        source: {
          attribution: { label: 'Register adries sample' },
          kind: 'owned-dataset',
        },
      });
    }),
  );

  it.effect('records edge cache telemetry when the Cloudflare cache API is available', () =>
    Effect.gen(function* shellEffectTestProgram5() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);
      const edgeStore = new Map<string, string>();
      const edgeCache = {
        match: vi.fn((request: Request) => {
          const body = edgeStore.get(request.url);

          return body === undefined
            ? undefined
            : new Response(body, {
                headers: { 'content-type': 'application/json' },
              });
        }),
        put: vi.fn((request: Request, response: Response) =>
          response
            .clone()
            .text()
            .then((body) => {
              edgeStore.set(request.url, body);
            }),
        ),
      };
      vi.stubGlobal('caches', { default: edgeCache });

      const firstResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vinohradska&limit=1'),
      );
      const firstBody = yield* decodeJsonResponse(firstResponse, SmartSuggestResponseSchema);

      expect(firstBody).toMatchObject({
        cacheStatus: 'miss',
        suggestions: [{ id: 'cz-ruian-vinohradska-12-34' }],
      });
      expect(firstBody).not.toHaveProperty('cacheLevels');

      const secondResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vinohradska&limit=1'),
      );
      const secondBody = yield* decodeJsonResponse(secondResponse, SmartSuggestResponseSchema);

      expect(edgeCache.match).toHaveBeenCalled();
      expect(edgeCache.put).toHaveBeenCalled();
      const storedEdgeBodies = yield* Effect.all(
        [...edgeStore.values()].map((body) =>
          Schema.decodeEffect(SmartSuggestResponseJsonSchema)(body),
        ),
      );

      expect(storedEdgeBodies).toHaveLength(1);
      expect(storedEdgeBodies[0]).not.toHaveProperty('cacheLevels');
      expect(storedEdgeBodies[0]).not.toHaveProperty('providerEvents');
      expect(secondBody).toMatchObject({
        cacheStatus: 'hit',
        suggestions: [{ cacheStatus: 'hit', id: 'cz-ruian-vinohradska-12-34' }],
      });
      expect(secondBody).not.toHaveProperty('cacheLevels');
    }),
  );

  it.effect('treats schema-invalid edge cache entries as cache misses', () =>
    Effect.gen(function* invalidEdgeCacheEntryProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);
      const edgeCache = {
        match: vi.fn(() =>
          Response.json({
            cacheStatus: 'sideways',
            requestId: 'invalid-cache-entry',
            suggestions: [],
          }),
        ),
        put: vi.fn(() => Promise.resolve()),
      };
      vi.stubGlobal('caches', { default: edgeCache });

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vinohradska&limit=1'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(response.status).toBe(200);
      expect(edgeCache.match).toHaveBeenCalledOnce();
      expect(edgeCache.put).toHaveBeenCalledOnce();
      expect(body).toMatchObject({
        cacheStatus: 'miss',
        suggestions: [{ id: 'cz-ruian-vinohradska-12-34' }],
      });
      expect(body).not.toHaveProperty('cacheLevels');
    }),
  );

  it.effect('serves OpenAddresses US sample suggestions through the public suggest API', () =>
    Effect.gen(function* shellEffectTestProgram6() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);
      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=US&q=mission%20san%20francisco&limit=1'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        cacheStatus: 'miss',
        suggestions: [
          {
            address: {
              city: 'San Francisco',
              countryCode: 'US',
              region: 'CA',
            },
            id: 'us-openaddresses-ca-mission-1',
            source: {
              attribution: { label: 'OpenAddresses sample' },
              id: 'openaddresses-us-ca-sample',
              kind: 'owned-dataset',
            },
          },
        ],
      });
    }),
  );

  it.effect('serves postal-code locality suggestions from owned address data', () =>
    Effect.gen(function* shellEffectTestProgram7() {
      const repositories = createInMemorySmartSuggestRepositories();
      const source = yield* resolveEffect(
        repositories.dataSources.registerDataSource({
          attribution: { label: 'RÚIAN / ČÚZK' },
          cachePolicy: { kind: 'permanent' },
          countryCode: 'CZ',
          id: 'ruian-cz',
          name: 'RÚIAN',
          sourceKind: 'owned-dataset',
        }),
      );

      yield* resolveEffect(
        repositories.addressRecords.upsertAddressRecords([
          {
            countryCode: 'CZ',
            displayLabel: 'Ruská 225/4, Vršovice, 10100 Praha 10',
            id: 'postal-owned-praha-10-a',
            parts: {
              city: 'Praha 10',
              countryCode: 'CZ',
              district: 'Vršovice',
              houseNumber: '225',
              orientationNumber: '4',
              postalCode: '101 00',
              street: 'Ruská',
            },
            quality: 0.98,
            searchLabel: 'ruska 225 4 vrsovice 10100 praha 10',
            sourceId: source.id,
          },
          {
            countryCode: 'CZ',
            displayLabel: 'Sámova 4/29, Vršovice, 10100 Praha 10',
            id: 'postal-owned-praha-10-b',
            parts: {
              city: 'Praha 10',
              countryCode: 'CZ',
              district: 'Vršovice',
              houseNumber: '4',
              orientationNumber: '29',
              postalCode: '101 00',
              street: 'Sámova',
            },
            quality: 0.98,
            searchLabel: 'samova 4 29 vrsovice 10100 praha 10',
            sourceId: source.id,
          },
          {
            countryCode: 'CZ',
            displayLabel: 'Náměstí 1, 10100 Jiná Obec',
            id: 'postal-owned-jina-obec',
            parts: {
              city: 'Jiná Obec',
              countryCode: 'CZ',
              houseNumber: '1',
              postalCode: '101 00',
              street: 'Náměstí',
            },
            quality: 0.98,
            searchLabel: 'namesti 1 10100 jina obec',
            sourceId: source.id,
          },
          ...Array.from({ length: 25 }, (_, index) => {
            const localityNumber = String(index + 1).padStart(2, '0');

            return {
              countryCode: 'CZ' as const,
              displayLabel: `Hlavní ${index + 1}, 10100 Obec ${localityNumber}`,
              id: `postal-owned-obec-${localityNumber}`,
              parts: {
                city: `Obec ${localityNumber}`,
                countryCode: 'CZ' as const,
                houseNumber: String(index + 1),
                postalCode: index % 2 === 0 ? '101 00' : '10100',
                street: 'Hlavní',
              },
              quality: 0.9,
              searchLabel: `hlavni ${index + 1} 10100 obec ${localityNumber}`,
              sourceId: source.id,
            };
          }),
        ]),
      );

      const testHandler = createSmartSuggestHandler(repositories);
      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=postal&countryCode=CZ&q=10100&limit=2'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body.cacheStatus).toBe('miss');
      expect(body.suggestions).toHaveLength(2);
      expect(body.suggestions).toEqual([
        expect.objectContaining({
          address: expect.objectContaining({
            city: 'Jiná Obec',
            countryCode: 'CZ',
            postalCode: '101 00',
          }),
          displayLabel: '101 00 Jiná Obec',
          id: 'ruian-cz:postal:10100:jina-obec',
          kind: 'postal',
          source: expect.objectContaining({
            id: 'ruian-cz',
            kind: 'owned-dataset',
          }),
        }),
        expect.objectContaining({
          address: expect.objectContaining({
            city: 'Obec 01',
            countryCode: 'CZ',
            postalCode: '101 00',
          }),
          displayLabel: '101 00 Obec 01',
          id: 'ruian-cz:postal:10100:obec-01',
          kind: 'postal',
          source: expect.objectContaining({
            id: 'ruian-cz',
            kind: 'owned-dataset',
          }),
        }),
      ]);

      const cachedResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=postal&countryCode=CZ&q=10100&limit=2'),
      );
      const cachedBody = yield* decodeJsonResponse(cachedResponse, SmartSuggestResponseSchema);

      expect(cachedBody.cacheStatus).toBe('hit');
      expect(cachedBody.suggestions).toHaveLength(2);

      const limitOneResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=postal&countryCode=CZ&q=10100&limit=1'),
      );
      const limitOneBody = yield* decodeJsonResponse(limitOneResponse, SmartSuggestResponseSchema);

      expect(limitOneBody.cacheStatus).toBe('miss');
      expect(limitOneBody.suggestions).toEqual([
        expect.objectContaining({
          address: expect.objectContaining({
            city: 'Jiná Obec',
            countryCode: 'CZ',
            postalCode: '101 00',
          }),
          displayLabel: '101 00 Jiná Obec',
          id: 'ruian-cz:postal:10100:jina-obec',
          kind: 'postal',
        }),
      ]);
    }),
  );

  it.effect(
    'does not return confidence-only owned-data suggestions for nonexistent street numbers',
    () =>
      Effect.gen(function* shellEffectTestProgram8() {
        const repositories = createInMemorySmartSuggestRepositories();
        const testHandler = yield* createSeededSmartSuggestHandler(repositories);
        const response = yield* handlerCallEffect(
          testHandler,
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=K%20Lou%C5%BEi%209999%2F99&limit=3',
          ),
        );
        const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
          cacheStatus: 'miss',
          suggestions: [],
        });
      }),
  );

  it.effect('filters incomplete address suggestions before limiting cache-hit responses', () =>
    Effect.gen(function* shellEffectTestProgram9() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories);
      const queryHash = yield* resolveEffect(
        createSuggestQueryHashEffect({
          countryCode: 'CZ',
          kind: 'address',
          limit: 1,
          query: 'K L',
        }),
      );
      const cacheKey = createSuggestCacheKey({
        countryCode: 'CZ',
        kind: 'address',
        queryHash,
      });

      yield* resolveEffect(
        repositories.suggestCache.writeSuggestCache({
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
        }),
      );

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=K%20L&limit=1'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body).toMatchObject({
        cacheStatus: 'hit',
        suggestions: [{ id: 'good-address-row' }],
      });
    }),
  );

  it.effect('uses the configured query hash secret for cache and telemetry keys', () =>
    Effect.gen(function* shellEffectTestProgram10() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories, {
        SMART_SUGGEST_QUERY_HASH_SECRET: 'operator-secret-a',
      });
      const queryHash = yield* resolveEffect(
        createSuggestQueryHashEffect(
          {
            countryCode: 'CZ',
            kind: 'address',
            limit: 1,
            query: 'K Louži 1258/12',
          },
          { secret: 'operator-secret-a' },
        ),
      );
      const unkeyedHash = yield* resolveEffect(
        createSuggestQueryHashEffect({
          countryCode: 'CZ',
          kind: 'address',
          limit: 1,
          query: 'K Louži 1258/12',
        }),
      );
      const cacheKey = createSuggestCacheKey({
        countryCode: 'CZ',
        kind: 'address',
        queryHash,
      });

      yield* resolveEffect(
        repositories.suggestCache.writeSuggestCache({
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
              source: {
                id: 'ruian-cz',
                kind: 'owned-dataset',
                name: 'RUIAN',
              },
            },
          ],
          queryHash,
        }),
      );

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=K%20Lou%C5%BEi%201258%2F12&limit=1'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(queryHash).toMatch(hmacSha256PrefixPattern);
      expect(queryHash).not.toBe(unkeyedHash);
      expect(body).toMatchObject({
        cacheStatus: 'hit',
        suggestions: [{ id: 'keyed-cache-row' }],
      });
      const unkeyedCache = yield* resolveEffect(
        repositories.suggestCache.readSuggestCache(
          createSuggestCacheKey({
            countryCode: 'CZ',
            kind: 'address',
            queryHash: unkeyedHash,
          }),
        ),
      );

      expect(unkeyedCache).toBeUndefined();
    }),
  );

  it.effect('reports stale cache status while refreshing owned-data suggestions', () =>
    Effect.gen(function* shellEffectTestProgram11() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);
      const queryHash = yield* resolveEffect(
        createSuggestQueryHashEffect({
          countryCode: 'CZ',
          kind: 'address',
          limit: 1,
          query: 'vinohradska',
        }),
      );
      const cacheKey = createSuggestCacheKey({
        countryCode: 'CZ',
        kind: 'address',
        queryHash,
      });

      yield* resolveEffect(
        repositories.suggestCache.writeSuggestCache({
          cacheKey,
          cachePolicy: { kind: 'ttl', ttlSeconds: 1 },
          countryCode: 'CZ',
          expiresAt: '2000-01-01T00:00:00.000Z',
          kind: 'address',
          payload: [],
          queryHash,
        }),
      );

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vinohradska&limit=1'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body).toMatchObject({
        cacheStatus: 'stale',
        suggestions: [
          {
            cacheStatus: 'stale',
            id: 'cz-ruian-vinohradska-12-34',
          },
        ],
      });

      const statusResponse = yield* handlerCallEffect(testHandler, requestFor('/v1/status'));
      const statusBody = yield* decodeJsonResponse(
        statusResponse,
        SmartSuggestStatusResponseSchema,
      );

      expect(statusBody.metrics.suggest.cacheStatus.stale).toBeGreaterThanOrEqual(1);
    }),
  );

  it.effect('does not seed sample datasets during runtime suggest handling', () =>
    Effect.gen(function* shellEffectTestProgram12() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories);
      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske&limit=1'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);
      const records = yield* resolveEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: 'CZ',
          query: 'vaclavske',
        }),
      );

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        cacheStatus: 'miss',
        suggestions: [],
      });
      expect(records).toEqual([]);
    }),
  );

  it.effect('keeps owned-data cache entries scoped by requested limit', () =>
    Effect.gen(function* shellEffectTestProgram13() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);

      const firstResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=praha&limit=1'),
      );
      const firstBody = yield* decodeJsonResponse(firstResponse, SmartSuggestResponseSchema);

      expect(firstBody).toMatchObject({
        cacheStatus: 'miss',
        suggestions: [expect.any(Object)],
      });
      expect(firstBody.suggestions).toHaveLength(1);

      const secondResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=praha&limit=2'),
      );
      const secondBody = yield* decodeJsonResponse(secondResponse, SmartSuggestResponseSchema);

      expect(secondBody.cacheStatus).toBe('miss');
      expect(secondBody.suggestions).toHaveLength(2);

      const cachedResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=praha&limit=2'),
      );
      const cachedBody = yield* decodeJsonResponse(cachedResponse, SmartSuggestResponseSchema);

      expect(cachedBody.cacheStatus).toBe('hit');
      expect(cachedBody.suggestions).toHaveLength(2);
    }),
  );

  it.effect('enriches from Mapy and persists sanitized provider payloads', () =>
    Effect.gen(function* shellEffectTestProgram14() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);

      const ownedResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&limit=1'),
      );
      const ownedBody = yield* decodeJsonResponse(ownedResponse, SmartSuggestResponseSchema);

      expect(ownedBody).toMatchObject({
        cacheStatus: 'miss',
        suggestions: [{ source: { kind: 'owned-dataset' } }],
      });

      yield* resolveEffect(
        repositories.tenants.upsertTenant({
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
        }),
      );

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

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor(
          '/v1/suggest?kind=address&countryCode=CZ&q=provider-only&tenantId=tenant-provider-test&limit=1',
        ),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body).toMatchObject({
        cacheStatus: 'written',
        suggestions: [
          {
            cacheStatus: 'written',
            id: 'mapy-address-1',
            source: { id: 'mapy-cz', kind: 'live-provider' },
          },
        ],
      });
      expect(body).not.toHaveProperty('cacheLevels');
      expect(body).not.toHaveProperty('providerEvents');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://mapy.test/suggest?apikey=test-mapy-key&query=provider-only&lang=cs&limit=1&type=regional.address&locality=cz',
        expect.objectContaining({
          headers: { accept: 'application/json' },
          method: 'GET',
        }),
      );

      const queryHash = yield* resolveEffect(
        createSuggestQueryHashEffect({
          countryCode: 'CZ',
          kind: 'address',
          limit: 1,
          query: 'provider-only',
        }),
      );
      const cacheKey = createSuggestCacheKey({
        countryCode: 'CZ',
        kind: 'address',
        queryHash,
        tenantId: 'tenant-provider-test',
      });

      const cacheEntry = yield* resolveEffect(repositories.suggestCache.readSuggestCache(cacheKey));

      expect(cacheEntry).toMatchObject({
        payload: [
          {
            displayLabel: 'Národní 1, 110 00 Praha, Česko',
            source: { id: 'mapy-cz', kind: 'live-provider' },
          },
        ],
        status: 'hit',
      });
      const addressRecords = yield* resolveEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: 'CZ',
          query: 'narodni 1',
        }),
      );

      expect(addressRecords).toMatchObject([
        {
          displayLabel: 'Národní 1, 110 00 Praha, Česko',
          sourceId: 'live-provider:mapy-cz:CZ',
        },
      ]);
      const providerSource = yield* resolveEffect(
        repositories.dataSources.getDataSource('live-provider:mapy-cz:CZ'),
      );

      expect(providerSource).toMatchObject({
        cachePolicy: { kind: 'permanent' },
      });
      const responseJson = yield* Schema.encodeEffect(SmartSuggestResponseJsonSchema)(body);

      expect(responseJson).not.toContain('do-not-leak-provider-raw-field');
      expect(responseJson).not.toContain('do-not-leak-provider-secret');

      const cachedResponse = yield* handlerCallEffect(
        testHandler,
        requestFor(
          '/v1/suggest?kind=address&countryCode=CZ&q=provider-only&tenantId=tenant-provider-test&limit=1',
        ),
      );
      const cachedBody = yield* decodeJsonResponse(cachedResponse, SmartSuggestResponseSchema);

      expect(cachedBody).toMatchObject({
        cacheStatus: 'hit',
        suggestions: [{ cacheStatus: 'hit', id: 'mapy-address-1' }],
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const statusResponse = yield* handlerCallEffect(testHandler, requestFor('/v1/status'));
      const statusBody = yield* decodeJsonResponse(
        statusResponse,
        SmartSuggestStatusResponseSchema,
      );
      const statusJson = yield* Schema.encodeEffect(SmartSuggestStatusResponseJsonSchema)(
        statusBody,
      );

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
    }),
  );

  it.effect('enriches exact owned address answers when the requested limit is underfilled', () =>
    Effect.gen(function* shellEffectTestProgram15() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);

      yield* resolveEffect(
        repositories.tenants.upsertTenant({
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
                        apiKey: 'test-mapy-underfilled-key',
                        endpointUrl: 'https://mapy-underfilled.test/suggest',
                      },
                    },
                  },
                },
              },
            },
          },
          id: 'tenant-underfilled-owned-test',
          name: 'Tenant Underfilled Owned Test',
          providerPriority: ['mapy-cz'],
          status: 'active',
        }),
      );

      const fetchMock = vi.fn<typeof fetch>(() =>
        Promise.resolve(
          Response.json({
            items: [
              {
                id: 'mapy-k-louzi-nearby',
                label: 'K Louži 1259/14, 101 00 Praha, Česko',
                name: 'K Louži 1259/14',
                regionalStructure: [
                  { isoCode: 'CZ', name: 'Česko', type: 'country' },
                  { name: 'Praha', type: 'municipality' },
                ],
                type: 'regional.address',
                zip: '101 00',
              },
            ],
          }),
        ),
      );
      vi.stubGlobal('fetch', fetchMock);

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor(
          '/v1/suggest?kind=address&countryCode=CZ&q=K%20Lou%C5%BEi%201258%2F12&tenantId=tenant-underfilled-owned-test&limit=2',
        ),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(body).toMatchObject({
        cacheStatus: 'written',
      });
      expect(body.suggestions.map((suggestion) => suggestion.id)).toEqual([
        'cz-ruian-k-louzi-1258-12',
        'mapy-k-louzi-nearby',
      ]);
    }),
  );

  it.effect(
    'keeps Radar provider suggestions in the TTL cache without durable address records',
    () =>
      Effect.gen(function* shellEffectTestProgram16() {
        const repositories = createInMemorySmartSuggestRepositories();
        const testHandler = createSmartSuggestHandler(repositories);
        const edgeCacheControlHeaders: string[] = [];
        const edgeCache = {
          match: vi.fn(() => {}),
          put: vi.fn((_request: Request, response: Response) => {
            edgeCacheControlHeaders.push(response.headers.get('cache-control') ?? '');
            return Promise.resolve();
          }),
        };
        vi.stubGlobal('caches', { default: edgeCache });

        yield* resolveEffect(
          repositories.tenants.upsertTenant({
            allowedOrigins: [],
            countryConfig: {
              countries: {
                CZ: {
                  kinds: {
                    address: {
                      providerCacheTtlSeconds: 120,
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
          }),
        );

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

        const response = yield* handlerCallEffect(
          testHandler,
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=radar-provider-only&tenantId=tenant-radar-cache-test&limit=1',
          ),
        );
        const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

        expect(body).toMatchObject({
          cacheStatus: 'written',
          suggestions: [
            {
              cacheStatus: 'written',
              displayLabel: 'Radarova 9, Praha',
              source: { id: 'radar-autocomplete', kind: 'live-provider' },
            },
          ],
        });

        const queryHash = yield* resolveEffect(
          createSuggestQueryHashEffect({
            countryCode: 'CZ',
            kind: 'address',
            limit: 1,
            query: 'radar-provider-only',
          }),
        );
        const cacheKey = createSuggestCacheKey({
          countryCode: 'CZ',
          kind: 'address',
          queryHash,
          tenantId: 'tenant-radar-cache-test',
        });

        const cacheEntry = yield* resolveEffect(
          repositories.suggestCache.readSuggestCache(cacheKey),
        );

        expect(cacheEntry).toMatchObject({
          cachePolicy: { kind: 'ttl', ttlSeconds: 120 },
          payload: [
            {
              displayLabel: 'Radarova 9, Praha',
              source: { id: 'radar-autocomplete', kind: 'live-provider' },
            },
          ],
          status: 'hit',
        });
        const durableRecords = yield* resolveEffect(
          repositories.addressRecords.searchAddressRecords({
            countryCode: 'CZ',
            query: 'Radarova 9',
          }),
        );

        expect(durableRecords).toEqual([]);
        expect(edgeCache.put).toHaveBeenCalledOnce();
        expect(edgeCacheControlHeaders).toEqual(['public, max-age=120']);
      }),
  );

  it.effect(
    'does not cache empty provider fallback misses after filtering incomplete addresses',
    () =>
      Effect.gen(function* incompleteProviderFallbackCacheProgram() {
        const repositories = createInMemorySmartSuggestRepositories();
        const testHandler = createSmartSuggestHandler(repositories);
        const edgeCache = {
          match: vi.fn(() => {}),
          put: vi.fn(() => Promise.resolve()),
        };
        vi.stubGlobal('caches', { default: edgeCache });

        yield* resolveEffect(
          repositories.tenants.upsertTenant({
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
                          apiKey: 'mapy-incomplete-key',
                          endpointUrl: 'https://mapy-incomplete.test/suggest',
                        },
                      },
                    },
                  },
                },
              },
            },
            id: 'tenant-incomplete-provider-cache-test',
            name: 'Tenant Incomplete Provider Cache Test',
            providerPriority: ['mapy-cz'],
            status: 'active',
          }),
        );

        const fetchMock = vi.fn<typeof fetch>(() =>
          Promise.resolve(
            Response.json({
              items: [
                {
                  id: 'mapy-incomplete-street',
                  label: 'Národní, Praha, Česko',
                  name: 'Národní',
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

        const path =
          '/v1/suggest?kind=address&countryCode=CZ&q=incomplete-provider-only&tenantId=tenant-incomplete-provider-cache-test&limit=1';
        const firstResponse = yield* handlerCallEffect(testHandler, requestFor(path));
        const secondResponse = yield* handlerCallEffect(testHandler, requestFor(path));
        const firstBody = yield* decodeJsonResponse(firstResponse, SmartSuggestResponseSchema);
        const secondBody = yield* decodeJsonResponse(secondResponse, SmartSuggestResponseSchema);
        const queryHash = yield* resolveEffect(
          createSuggestQueryHashEffect({
            countryCode: 'CZ',
            kind: 'address',
            limit: 1,
            query: 'incomplete-provider-only',
          }),
        );
        const cacheKey = createSuggestCacheKey({
          countryCode: 'CZ',
          kind: 'address',
          queryHash,
          tenantId: 'tenant-incomplete-provider-cache-test',
        });
        const cacheEntry = yield* resolveEffect(
          repositories.suggestCache.readSuggestCache(cacheKey),
        );

        expect(firstBody).toMatchObject({ cacheStatus: 'miss', suggestions: [] });
        expect(secondBody).toMatchObject({ cacheStatus: 'miss', suggestions: [] });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(edgeCache.put).not.toHaveBeenCalled();
        expect(cacheEntry).toBeUndefined();
      }),
  );

  it.effect('uses Worker env provider config for live enrichment without tenant setup', () =>
    Effect.gen(function* shellEffectTestProgram16() {
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

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=env-provider-only&limit=1'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body).toMatchObject({
        cacheStatus: 'written',
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
    }),
  );

  it.effect('uses RUIAN as the default credentialless CZ provider', () =>
    Effect.gen(function* shellEffectTestProgram17() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandlerFromEnv(repositories, {
        RUIAN_GEOCODE_BASE_URL: 'https://ruian-default.test/geocode',
        SMART_SUGGEST_PROVIDER_TIMEOUT_MS: '100',
      });
      const fetchMock = vi.fn<typeof fetch>(() =>
        Promise.resolve(
          Response.json({
            suggestions: [
              {
                isCollection: false,
                magicKey: '1_1203603',
                text: 'K Louži 1258/12, Vršovice, 10100 Praha 10',
                type: 'AdresniMisto',
              },
              {
                isCollection: false,
                magicKey: '1_1202562',
                text: 'K Louži 784/3, Vršovice, 10100 Praha 10',
                type: 'AdresniMisto',
              },
            ],
          }),
        ),
      );
      vi.stubGlobal('fetch', fetchMock);

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&q=K%20Lou%C5%BEi&limit=4'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body).toMatchObject({
        cacheStatus: 'written',
        suggestions: [
          {
            cacheStatus: 'written',
            id: 'ruian-geocode:1_1203603',
            source: { id: 'ruian-geocode', kind: 'live-provider' },
          },
          {
            cacheStatus: 'written',
            id: 'ruian-geocode:1_1202562',
            source: { id: 'ruian-geocode', kind: 'live-provider' },
          },
        ],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        'https://ruian-default.test/geocode/suggest?text=K+Lou%C5%BEi&f=json&maxSuggestions=4',
        expect.objectContaining({ method: 'GET' }),
      );
    }),
  );

  it.effect('does not write non-cacheable provider suggestions to runtime caches', () =>
    Effect.gen(function* nonCacheableProviderRuntimeCacheProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandlerFromEnv(repositories, {
        RUIAN_GEOCODE_BASE_URL: 'https://ruian-live-only.test/geocode',
        RUIAN_GEOCODE_DISABLED: 'false',
        SMART_SUGGEST_PROVIDER_PRIORITY: 'ruian-geocode',
        SMART_SUGGEST_PROVIDER_TIMEOUT_MS: '100',
      });
      const edgeCache = {
        match: vi.fn(() => {}),
        put: vi.fn(() => Promise.resolve()),
      };
      vi.stubGlobal('caches', { default: edgeCache });
      const fetchMock = vi.fn<typeof fetch>(() =>
        Promise.resolve(
          Response.json({
            suggestions: [
              {
                isCollection: false,
                magicKey: '1_1203603',
                text: 'K Louži 1258/12, Vršovice, 10100 Praha 10',
                type: 'AdresniMisto',
              },
            ],
          }),
        ),
      );
      vi.stubGlobal('fetch', fetchMock);

      const path = '/v1/suggest?kind=address&countryCode=CZ&q=K%20Lou%C5%BEi&limit=1';
      const firstResponse = yield* handlerCallEffect(testHandler, requestFor(path));
      const secondResponse = yield* handlerCallEffect(testHandler, requestFor(path));
      const firstBody = yield* decodeJsonResponse(firstResponse, SmartSuggestResponseSchema);
      const secondBody = yield* decodeJsonResponse(secondResponse, SmartSuggestResponseSchema);
      const queryHash = yield* resolveEffect(
        createSuggestQueryHashEffect({
          countryCode: 'CZ',
          kind: 'address',
          limit: 1,
          query: 'K Louži',
        }),
      );
      const cacheKey = createSuggestCacheKey({
        countryCode: 'CZ',
        kind: 'address',
        queryHash,
      });
      const cacheEntry = yield* resolveEffect(repositories.suggestCache.readSuggestCache(cacheKey));

      expect(firstBody).toMatchObject({
        cacheStatus: 'written',
        suggestions: [{ id: 'ruian-geocode:1_1203603' }],
      });
      expect(secondBody).toMatchObject({
        cacheStatus: 'written',
        suggestions: [{ id: 'ruian-geocode:1_1203603' }],
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(edgeCache.put).not.toHaveBeenCalled();
      expect(cacheEntry).toBeUndefined();
    }),
  );

  it.effect('keeps postal lookups owned-index only when live providers are configured', () =>
    Effect.gen(function* shellEffectPostalOwnedIndexOnlyProgram() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandlerFromEnv(repositories, {
        RUIAN_GEOCODE_BASE_URL: 'https://ruian-postal.test/geocode',
        SMART_SUGGEST_PROVIDER_TIMEOUT_MS: '100',
      });
      const fetchMock = vi.fn<typeof fetch>(() =>
        Promise.resolve(
          Response.json({
            suggestions: [
              {
                isCollection: false,
                magicKey: '1_1183167',
                text: 'Michle č.ev. 88, 10100 Praha 10',
                type: 'AdresniMisto',
              },
              {
                isCollection: false,
                magicKey: '1_1203497',
                text: 'Ruská 225/4, Vršovice, 10100 Praha 10',
                type: 'AdresniMisto',
              },
              {
                isCollection: false,
                magicKey: '1_9000001',
                text: 'Náměstí 1, 10100 Jiná Obec',
                type: 'AdresniMisto',
              },
            ],
          }),
        ),
      );
      vi.stubGlobal('fetch', fetchMock);

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=postal&countryCode=CZ&q=101%2000&limit=20'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body).toMatchObject({
        cacheStatus: 'miss',
        suggestions: [],
      });
      expect(body).not.toHaveProperty('providerEvents');
      expect(fetchMock).not.toHaveBeenCalled();
    }),
  );

  it.effect('keeps owned suggestions when provider enrichment times out', () =>
    Effect.gen(function* shellEffectTestProgram18() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = yield* createSeededSmartSuggestHandler(repositories);

      yield* resolveEffect(
        repositories.tenants.upsertTenant({
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
        }),
      );

      const fetchMock = vi.fn<typeof fetch>(() => Promise.race<Response>([]));
      vi.stubGlobal('fetch', fetchMock);

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor(
          '/v1/suggest?kind=address&countryCode=CZ&q=vaclavske&tenantId=tenant-provider-timeout-test&limit=2',
        ),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);
      const { queryHash, requestId } = yield* providerRequestIdFor('vaclavske');
      const providerEvents = yield* resolveEffect(
        repositories.providerEvents.listProviderEvents(requestId),
      );
      const statusResponse = yield* handlerCallEffect(testHandler, requestFor('/v1/status'));
      const statusBody = yield* decodeJsonResponse(
        statusResponse,
        SmartSuggestStatusResponseSchema,
      );

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
      const providerEventsJson = yield* Schema.encodeEffect(ProviderEventRecordsJsonSchema)([
        ...providerEvents,
      ]);

      expect(providerEventsJson).not.toContain('vaclavske');
      expect(statusBody.metrics.providerEvents.timeout).toBeGreaterThanOrEqual(1);
      expect(statusBody.metrics.suggest.providerFallback).toBeGreaterThanOrEqual(1);
    }),
  );

  it.effect(
    'opens the provider circuit after failures and rate limits while keeping owned suggestions',
    () =>
      Effect.gen(function* shellEffectTestProgram18() {
        const repositories = createInMemorySmartSuggestRepositories();
        const testHandler = yield* createSeededSmartSuggestHandler(repositories);

        yield* resolveEffect(
          repositories.tenants.upsertTenant({
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
          }),
        );

        let providerAttempt = 0;
        const fetchMock = vi.fn<typeof fetch>(() => {
          providerAttempt += 1;
          return Promise.resolve(Response.json({}, { status: providerAttempt === 1 ? 500 : 429 }));
        });
        vi.stubGlobal('fetch', fetchMock);

        const firstResponse = yield* handlerCallEffect(
          testHandler,
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=vaclavske&tenantId=tenant-provider-rate-limit-test&limit=2',
          ),
        );
        const secondResponse = yield* handlerCallEffect(
          testHandler,
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=vinohradska&tenantId=tenant-provider-rate-limit-test&limit=2',
          ),
        );
        const thirdResponse = yield* handlerCallEffect(
          testHandler,
          requestFor(
            '/v1/suggest?kind=address&countryCode=CZ&q=masarykova&tenantId=tenant-provider-rate-limit-test&limit=2',
          ),
        );
        const [firstBody, secondBody, thirdBody] = yield* Effect.all([
          decodeJsonResponse(firstResponse, SmartSuggestResponseSchema),
          decodeJsonResponse(secondResponse, SmartSuggestResponseSchema),
          decodeJsonResponse(thirdResponse, SmartSuggestResponseSchema),
        ]);
        const firstProviderRequest = yield* providerRequestIdFor('vaclavske');
        const secondProviderRequest = yield* providerRequestIdFor('vinohradska');
        const thirdProviderRequest = yield* providerRequestIdFor('masarykova');
        const [firstProviderEvents, secondProviderEvents, thirdProviderEvents] = yield* Effect.all([
          resolveEffect(
            repositories.providerEvents.listProviderEvents(firstProviderRequest.requestId),
          ),
          resolveEffect(
            repositories.providerEvents.listProviderEvents(secondProviderRequest.requestId),
          ),
          resolveEffect(
            repositories.providerEvents.listProviderEvents(thirdProviderRequest.requestId),
          ),
        ]);
        const statusResponse = yield* handlerCallEffect(testHandler, requestFor('/v1/status'));
        const statusBody = yield* decodeJsonResponse(
          statusResponse,
          SmartSuggestStatusResponseSchema,
        );
        const providerEventJson = yield* Schema.encodeEffect(ProviderEventRecordsJsonSchema)(
          [firstProviderEvents, secondProviderEvents, thirdProviderEvents].flat(),
        );

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
      }),
  );

  it.effect(
    'uses RÚIAN geocode enrichment for Czech address-point recall without durable writes',
    () =>
      Effect.gen(function* shellEffectTestProgram19() {
        const repositories = createInMemorySmartSuggestRepositories();
        const existingSource = yield* resolveEffect(
          repositories.dataSources.registerDataSource({
            attribution: {
              label: 'Existing learned provider data',
            },
            cachePolicy: { kind: 'ttl', ttlSeconds: 43_200 },
            countryCode: 'CZ',
            id: 'live-provider:nominatim:CZ',
            name: 'Nominatim CZ cache',
            sourceKind: 'live-provider',
          }),
        );

        yield* resolveEffect(
          repositories.addressRecords.upsertAddressRecords([
            {
              countryCode: 'CZ',
              displayLabel: 'Na Fallbacku 1312/1, Vršovice, 10100 Praha 10',
              id: 'existing-na-fallbacku-1312-1',
              parts: {
                city: 'Praha 10',
                countryCode: 'CZ',
                district: 'Vršovice',
                houseNumber: '1312',
                orientationNumber: '1',
                postalCode: '101 00',
                street: 'Na Fallbacku',
              },
              quality: 0.9,
              searchLabel: 'na fallbacku 1312 1 vrsovice 10100 praha 10',
              sourceId: existingSource.id,
            },
          ]),
        );

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
                  text: 'Na Fallbacku, Praha',
                  type: 'Ulice',
                },
                {
                  isCollection: false,
                  magicKey: '1_1202562',
                  text: 'Na Fallbacku 784/3, Vršovice, 10100 Praha 10',
                  type: 'AdresniMisto',
                },
                {
                  isCollection: false,
                  magicKey: '1_1203603',
                  text: 'Na Fallbacku 1258/12, Vršovice, 10100 Praha 10',
                  type: 'AdresniMisto',
                },
              ],
            }),
          ),
        );
        vi.stubGlobal('fetch', fetchMock);

        const response = yield* handlerCallEffect(
          testHandler,
          requestFor('/v1/suggest?kind=address&countryCode=CZ&q=Na%20Fallbacku&limit=20'),
        );
        const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

        expect(body).toMatchObject({
          cacheStatus: 'written',
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
                street: 'Na Fallbacku',
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
              displayLabel: 'Na Fallbacku 1258/12, Vršovice, 10100 Praha 10',
              id: 'ruian-geocode:1_1203603',
              source: expect.objectContaining({
                id: 'ruian-geocode',
                kind: 'live-provider',
              }),
            }),
          ]),
        );
        expect(body.suggestions).toHaveLength(3);
        expect(body.suggestions[0]).toMatchObject({
          displayLabel: 'Na Fallbacku 1312/1, Vršovice, 10100 Praha 10',
          source: { id: 'live-provider:nominatim:CZ', kind: 'live-provider' },
        });
        expect(body.suggestions.slice(1)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              displayLabel: 'Na Fallbacku 784/3, Vršovice, 10100 Praha 10',
              source: expect.objectContaining({
                id: 'ruian-geocode',
              }),
            }),
            expect.objectContaining({
              displayLabel: 'Na Fallbacku 1258/12, Vršovice, 10100 Praha 10',
              source: expect.objectContaining({
                id: 'ruian-geocode',
              }),
            }),
          ]),
        );
        expect(fetchMock).toHaveBeenCalledWith(
          'https://ruian.test/geocode/suggest?text=Na+Fallbacku&f=json&maxSuggestions=20',
          expect.objectContaining({ method: 'GET' }),
        );
        const durableRecords = yield* resolveEffect(
          repositories.addressRecords.searchAddressRecords({
            countryCode: 'CZ',
            query: 'Na Fallbacku 1258',
          }),
        );

        expect(durableRecords).toEqual([]);
      }),
  );

  it.effect('fans out across configured Radar, HERE, and Nominatim providers', () =>
    Effect.gen(function* shellEffectTestProgram20() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories);

      yield* resolveEffect(
        repositories.tenants.upsertTenant({
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
        }),
      );

      const fetchMock = vi.fn<typeof fetch>((input) => {
        const url = String(input);

        if (url.startsWith('https://radar.test')) {
          return Promise.resolve(
            Response.json({
              addresses: [
                {
                  city: 'Praha',
                  countryCode: 'CZ',
                  formattedAddress: 'Providerova 1, Praha',
                  number: '1',
                  postalCode: '101 00',
                  street: 'Providerova',
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
                    label: 'Providerova 1, Praha',
                    postalCode: '101 00',
                    street: 'Providerova',
                  },
                  id: 'here-providerova-1',
                  scoring: { queryScore: 0.95 },
                  title: 'Providerova 1',
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
                  road: 'Providerova',
                },
                display_name: 'Providerova 2, Praha',
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

      const response = yield* handlerCallEffect(
        testHandler,
        requestFor(
          '/v1/suggest?kind=address&countryCode=CZ&q=Providerova%201&tenantId=tenant-fanout-test&limit=3',
        ),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body).toMatchObject({
        cacheStatus: 'written',
      });
      expect(body).not.toHaveProperty('providerEvents');
      expect(body.suggestions.map((suggestion) => suggestion.displayLabel)).toEqual([
        'Providerova 1, Praha',
        'Providerova 2, Praha',
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://here.test/v1/discover?q=Providerova+1&apiKey=here-key&limit=3&in=countryCode%3ACZE',
        expect.objectContaining({ method: 'GET' }),
      );
      const hereRecords = yield* resolveEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: 'CZ',
          query: 'Providerova 1',
        }),
      );
      const hereSource = yield* resolveEffect(
        repositories.dataSources.getDataSource('live-provider:here-discover:CZ'),
      );
      const nominatimRecords = yield* resolveEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: 'CZ',
          query: 'Providerova 2',
        }),
      );
      const nominatimSource = yield* resolveEffect(
        repositories.dataSources.getDataSource('live-provider:nominatim:CZ'),
      );

      expect(hereRecords).toEqual([
        expect.objectContaining({
          displayLabel: 'Providerova 1, Praha',
          sourceId: 'live-provider:here-discover:CZ',
        }),
      ]);
      expect(hereSource).toMatchObject({
        cachePolicy: { kind: 'permanent' },
      });
      expect(nominatimRecords).toEqual([
        expect.objectContaining({
          displayLabel: 'Providerova 2, Praha',
          sourceId: 'live-provider:nominatim:CZ',
        }),
      ]);
      expect(nominatimSource).toMatchObject({
        cachePolicy: { kind: 'permanent' },
      });
    }),
  );

  it.effect('validates phone and postal requests through API endpoints', () =>
    Effect.gen(function* shellEffectTestProgram21() {
      const phoneResponse = yield* handlerEffect(
        requestFor('/v1/validate/phone', {
          body: yield* Schema.encodeEffect(PhoneValidationRequestJsonSchema)({
            defaultCountry: 'CZ',
            rawInput: '777 123 456',
          }),
          method: 'POST',
        }),
      );
      const phoneBody = yield* decodeJsonResponse(phoneResponse, PhoneValidationResultSchema);

      expect(phoneBody).toMatchObject({
        e164: '+420777123456',
        isValid: true,
      });

      const postalResponse = yield* handlerEffect(
        requestFor('/v1/validate/postal', {
          body: yield* Schema.encodeEffect(PostalValidationRequestJsonSchema)({
            countryCode: 'PL',
            rawInput: '12345',
          }),
          method: 'POST',
        }),
      );
      const postalBody = yield* decodeJsonResponse(postalResponse, PostalValidationResultSchema);

      expect(postalBody).toMatchObject({
        displayValue: '12-345',
        isValid: true,
      });

      const blankCountryResponse = yield* handlerEffect(
        requestFor('/v1/validate/postal', {
          body: yield* Schema.encodeEffect(InvalidPostalValidationRequestJsonSchema)({
            countryCode: '   ',
            rawInput: '12345',
          }),
          method: 'POST',
        }),
      );

      expect(blankCountryResponse.status).toBe(400);
    }),
  );

  it.effect('records tenant-scoped accept telemetry with unique event ids', () =>
    Effect.gen(function* shellEffectTestProgram22() {
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
      } satisfies typeof SmartSuggestAcceptEventSchema.Type;
      const acceptRequestBody = yield* Schema.encodeEffect(SmartSuggestAcceptEventJsonSchema)(
        acceptBody,
      );

      const acceptResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/accept', {
          body: acceptRequestBody,
          method: 'POST',
        }),
      );
      const repeatedAcceptResponse = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/accept', {
          body: acceptRequestBody,
          method: 'POST',
        }),
      );

      const acceptPayload = yield* decodeJsonResponse(
        acceptResponse,
        SmartSuggestAcceptResponseSchema,
      );
      const repeatedAcceptPayload = yield* decodeJsonResponse(
        repeatedAcceptResponse,
        SmartSuggestAcceptResponseSchema,
      );

      expect(acceptPayload).toEqual({ accepted: true });
      expect(repeatedAcceptPayload).toEqual({ accepted: true });

      const acceptEvents = yield* resolveEffect(
        repositories.acceptEvents.listAcceptEvents('request-status-test'),
      );

      expect(acceptEvents).toHaveLength(2);
      expect(acceptEvents[0]).toMatchObject({
        sourceId: 'ruian-cz-sample',
        tenant: { cartId: 'cart-1', tenantId: 'tenant-1' },
      });

      const statusResponse = yield* handlerCallEffect(testHandler, requestFor('/v1/status'));
      const statusBody = yield* decodeJsonResponse(
        statusResponse,
        SmartSuggestStatusResponseSchema,
      );

      expect(statusBody).toMatchObject({
        imports: { recentRuns: expect.any(Array) },
        service: 'smart-suggest',
      });
      expect(statusBody.metrics.accept.total).toBe(2);
    }),
  );

  it.effect('reports redacted import freshness status from baseline and delta runs', () =>
    Effect.gen(function* shellEffectTestProgram23() {
      const repositories = createInMemorySmartSuggestRepositories();
      const testHandler = createSmartSuggestHandler(repositories);

      yield* resolveEffect(
        repositories.dataSources.registerDataSource({
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
        }),
      );
      yield* resolveEffect(
        repositories.importRuns.startImportRun({
          checksumSha256: 'baseline-secret-checksum',
          id: 'import-ruian-cz-baseline-status-test',
          importKind: 'baseline',
          shardCountryCode: 'CZ',
          sourceFeedId: 'RUIAN-S-ZA-U',
          sourceId: 'ruian-cz',
          sourceUri: 'https://data.example.invalid/ruian/baseline.csv',
          sourceValidAt: '2026-06-26',
          sourceVersion: '20260626',
        }),
      );
      yield* resolveEffect(
        repositories.importRuns.finishImportRun({
          completedAt: '2026-06-26T03:00:00.000Z',
          failedRows: 0,
          id: 'import-ruian-cz-baseline-status-test',
          insertedRows: 2,
          skippedRows: 0,
          status: 'completed',
          tombstonedRows: 0,
          totalRows: 2,
          upsertedRows: 2,
        }),
      );
      yield* resolveEffect(
        repositories.importRuns.startImportRun({
          checksumSha256: 'delta-secret-checksum',
          id: 'import-ruian-cz-delta-status-test',
          importKind: 'delta',
          shardCountryCode: 'CZ',
          sourceFeedId: 'RUIAN-S-ZA-Z',
          sourceId: 'ruian-cz',
          sourceUri: 'https://data.example.invalid/ruian/delta.csv',
          sourceValidAt: '2026-06-27',
          sourceVersion: '20260627',
        }),
      );
      yield* resolveEffect(
        repositories.importRuns.finishImportRun({
          completedAt: '2026-06-27T03:00:00.000Z',
          failedRows: 1,
          id: 'import-ruian-cz-delta-status-test',
          insertedRows: 1,
          skippedRows: 1,
          status: 'completed',
          tombstonedRows: 1,
          totalRows: 2,
          upsertedRows: 1,
        }),
      );
      yield* resolveEffect(
        repositories.shardRegistry.upsertShardMetadata({
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
        }),
      );

      const statusResponse = yield* handlerCallEffect(testHandler, requestFor('/v1/status'));
      const statusBody = yield* decodeJsonResponse(
        statusResponse,
        SmartSuggestStatusResponseSchema,
      );
      const statusJson = yield* Schema.encodeEffect(SmartSuggestStatusResponseJsonSchema)(
        statusBody,
      );

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
    }),
  );

  it.effect('searches bounded shard repositories through router metadata', () =>
    Effect.gen(function* shellEffectTestProgram24() {
      const router = createInMemorySmartSuggestRepositories();
      const shardPraha = createInMemorySmartSuggestRepositories();
      const shardCentralBohemia = createInMemorySmartSuggestRepositories();
      const shardSouthBohemia = createInMemorySmartSuggestRepositories();

      yield* resolveEffect(
        router.shardRegistry.upsertShardMetadata({
          bindingName: 'SMART_SUGGEST_CZ_VUSC_19',
          countryCode: 'CZ',
          regionCode: '19',
          regionKind: 'vusc',
          regionName: 'Praha',
          rowCount: 1,
          shardId: 'smart-suggest-cz-vusc-19',
          state: 'active',
        }),
      );
      yield* resolveEffect(
        router.shardRegistry.upsertShardMetadata({
          bindingName: 'SMART_SUGGEST_CZ_VUSC_27',
          countryCode: 'CZ',
          regionCode: '27',
          regionKind: 'vusc',
          regionName: 'Středočeský',
          rowCount: 1,
          shardId: 'smart-suggest-cz-vusc-27',
          state: 'active',
        }),
      );
      yield* resolveEffect(
        router.shardRegistry.upsertShardMetadata({
          bindingName: 'SMART_SUGGEST_CZ_VUSC_35',
          countryCode: 'CZ',
          regionCode: '35',
          regionKind: 'vusc',
          regionName: 'Jihočeský',
          rowCount: 1,
          shardId: 'smart-suggest-cz-vusc-35',
          state: 'active',
        }),
      );
      yield* resolveEffect(
        shardPraha.dataSources.registerDataSource({
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
        }),
      );
      yield* resolveEffect(
        shardPraha.addressRecords.upsertAddressRecords([
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
        ]),
      );
      const repositories = createShardedRepositories({
        router,
        shardRepositories: new Map([
          ['SMART_SUGGEST_CZ_VUSC_19', shardPraha],
          ['SMART_SUGGEST_CZ_VUSC_27', shardCentralBohemia],
          ['SMART_SUGGEST_CZ_VUSC_35', shardSouthBohemia],
        ]),
      });
      const testHandler = createSmartSuggestHandler(repositories);
      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&countryCode=CZ&query=K%20Lou%C5%BEi%201258&limit=5'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

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
    }),
  );

  it.effect('fans out unscoped strong queries across many shard repositories', () =>
    Effect.gen(function* unscopedStrongShardFanoutProgram() {
      const router = createInMemorySmartSuggestRepositories();
      const shardEntries = Array.from({ length: 15 }, (_value, index) => {
        const bindingName = `SMART_SUGGEST_TEST_SHARD_${String(index + 1).padStart(2, '0')}`;
        return [bindingName, createInMemorySmartSuggestRepositories()] as const;
      });
      const targetShardEntry = shardEntries.at(14);

      expect(targetShardEntry).toBeDefined();

      if (targetShardEntry === undefined) {
        return;
      }

      const [, targetShard] = targetShardEntry;

      for (const [index, [bindingName]] of shardEntries.entries()) {
        yield* resolveEffect(
          router.shardRegistry.upsertShardMetadata({
            bindingName,
            countryCode: 'CZ',
            regionCode: String(index + 1).padStart(2, '0'),
            regionKind: 'vusc',
            regionName: `Shard ${index + 1}`,
            rowCount: index === 14 ? 1 : 0,
            shardId: `smart-suggest-test-shard-${index + 1}`,
            state: 'active',
          }),
        );
      }

      yield* resolveEffect(
        targetShard.dataSources.registerDataSource({
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
        }),
      );
      yield* resolveEffect(
        targetShard.addressRecords.upsertAddressRecords([
          {
            countryCode: 'CZ',
            displayLabel: 'K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ',
            id: 'ruian-cz:many-shards-1203603',
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
              regionCode: '15',
              stableAddressId: 'ruian-cz:many-shards-1203603',
            },
            searchLabel: 'k louzi 1258 12 101 00 praha 10 vrsovice cz',
            sourceId: 'ruian-cz',
          },
        ]),
      );

      const repositories = createShardedRepositories({
        router,
        shardRepositories: new Map(shardEntries),
      });
      const testHandler = createSmartSuggestHandler(repositories);
      const response = yield* handlerCallEffect(
        testHandler,
        requestFor('/v1/suggest?kind=address&query=K%20Lou%C5%BEi%201258&limit=5'),
      );
      const body = yield* decodeJsonResponse(response, SmartSuggestResponseSchema);

      expect(body.suggestions).toEqual([
        expect.objectContaining({
          displayLabel: 'K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ',
          id: 'ruian-cz:many-shards-1203603',
          source: expect.objectContaining({
            id: 'ruian-cz',
            kind: 'owned-dataset',
          }),
        }),
      ]);
    }),
  );

  it.effect('re-ranks flattened shard repository results before applying the global limit', () =>
    Effect.gen(function* shardedSearchGlobalRankingProgram() {
      const router = createInMemorySmartSuggestRepositories();
      const shardPraha = createInMemorySmartSuggestRepositories();
      const shardCentralBohemia = createInMemorySmartSuggestRepositories();

      yield* resolveEffect(
        router.shardRegistry.upsertShardMetadata({
          bindingName: 'SMART_SUGGEST_CZ_VUSC_19',
          countryCode: 'CZ',
          regionCode: '19',
          regionKind: 'vusc',
          regionName: 'Praha',
          rowCount: 1,
          shardId: 'smart-suggest-cz-vusc-19',
          state: 'active',
        }),
      );
      yield* resolveEffect(
        router.shardRegistry.upsertShardMetadata({
          bindingName: 'SMART_SUGGEST_CZ_VUSC_27',
          countryCode: 'CZ',
          regionCode: '27',
          regionKind: 'vusc',
          regionName: 'Stredocesky',
          rowCount: 1,
          shardId: 'smart-suggest-cz-vusc-27',
          state: 'active',
        }),
      );

      yield* resolveEffect(
        shardPraha.addressRecords.upsertAddressRecords([
          {
            countryCode: 'CZ',
            displayLabel: 'K Louze 1, 110 00 Praha 1, CZ',
            id: 'ruian-cz:fuzzy-k-louze',
            parts: {
              city: 'Praha 1',
              countryCode: 'CZ',
              houseNumber: '1',
              postalCode: '110 00',
              street: 'K Louze',
            },
            quality: 0.99,
            searchLabel: 'k louze 1 110 00 praha 1 cz',
            sourceId: 'ruian-cz',
          },
        ]),
      );
      yield* resolveEffect(
        shardCentralBohemia.addressRecords.upsertAddressRecords([
          {
            countryCode: 'CZ',
            displayLabel: 'K Louzi 1258/12, 101 00 Praha 10, CZ',
            id: 'ruian-cz:exact-k-louzi',
            parts: {
              city: 'Praha 10',
              countryCode: 'CZ',
              houseNumber: '1258',
              orientationNumber: '12',
              postalCode: '101 00',
              street: 'K Louzi',
            },
            quality: 0.7,
            searchLabel: 'k louzi 1258 12 101 00 praha 10 cz',
            sourceId: 'ruian-cz',
          },
        ]),
      );

      const repositories = createShardedRepositories({
        router,
        shardRepositories: new Map([
          ['SMART_SUGGEST_CZ_VUSC_19', shardPraha],
          ['SMART_SUGGEST_CZ_VUSC_27', shardCentralBohemia],
        ]),
      });
      const results = yield* resolveEffect(
        repositories.addressRecords.searchAddressRecords({
          countryCode: 'CZ',
          limit: 1,
          query: 'K Louzi',
        }),
      );

      expect(results.map((record) => record.id)).toEqual(['ruian-cz:exact-k-louzi']);
    }),
  );

  it.effect('routes shard data-source registration and tombstones into shard repositories', () =>
    Effect.gen(function* shardTombstoneRoutingProgram() {
      const router = createInMemorySmartSuggestRepositories();
      const shardPraha = createInMemorySmartSuggestRepositories();
      const shardCentralBohemia = createInMemorySmartSuggestRepositories();
      const repositories = createShardedRepositories({
        router,
        shardRepositories: new Map([
          ['SMART_SUGGEST_CZ_VUSC_19', shardPraha],
          ['SMART_SUGGEST_CZ_VUSC_27', shardCentralBohemia],
        ]),
      });

      yield* resolveEffect(
        router.shardRegistry.upsertShardMetadata({
          bindingName: 'SMART_SUGGEST_CZ_VUSC_19',
          countryCode: 'CZ',
          regionCode: '19',
          regionKind: 'vusc',
          regionName: 'Praha',
          rowCount: 1,
          shardId: 'smart-suggest-cz-vusc-19',
          state: 'active',
        }),
      );
      yield* resolveEffect(
        router.shardRegistry.upsertShardMetadata({
          bindingName: 'SMART_SUGGEST_CZ_VUSC_27',
          countryCode: 'CZ',
          regionCode: '27',
          regionKind: 'vusc',
          regionName: 'Středočeský',
          rowCount: 0,
          shardId: 'smart-suggest-cz-vusc-27',
          state: 'active',
        }),
      );

      const providerSource = yield* resolveEffect(
        repositories.dataSources.registerDataSource({
          attribution: { label: 'Mapy.cz' },
          cachePolicy: { kind: 'permanent' },
          countryCode: 'CZ',
          id: 'live-provider:mapy-cz:CZ',
          name: 'Mapy.cz CZ cache',
          sourceKind: 'live-provider',
        }),
      );

      yield* resolveEffect(
        repositories.addressRecords.upsertAddressRecords([
          {
            countryCode: 'CZ',
            displayLabel: 'Providerova 1, Praha',
            id: 'provider-retained-praha-1',
            parts: {
              city: 'Praha',
              countryCode: 'CZ',
              houseNumber: '1',
              postalCode: '101 00',
              street: 'Providerova',
            },
            quality: 0.91,
            ruian: {
              addressPlaceCode: 'provider-retained-praha-1',
              regionCode: '19',
              stableAddressId: 'provider-retained-praha-1',
            },
            searchLabel: 'providerova 1 praha',
            sourceId: providerSource.id,
          },
        ]),
      );

      const shardSource = yield* resolveEffect(
        shardPraha.dataSources.getDataSource('live-provider:mapy-cz:CZ'),
      );
      const retainedBeforeTombstone = yield* resolveEffect(
        shardPraha.addressRecords.searchAddressRecords({
          countryCode: 'CZ',
          query: 'Providerova 1',
        }),
      );

      yield* resolveEffect(
        repositories.addressTombstones.upsertAddressTombstones([
          {
            countryCode: 'CZ',
            deletedAt: '2026-06-30T00:00:00.000Z',
            id: 'provider-retained-praha-1',
            reason: 'provider-retention-delete',
            ruian: {
              addressPlaceCode: 'provider-retained-praha-1',
              regionCode: '19',
              stableAddressId: 'provider-retained-praha-1',
            },
            sourceId: providerSource.id,
          },
        ]),
      );

      const retainedAfterTombstone = yield* resolveEffect(
        shardPraha.addressRecords.searchAddressRecords({
          countryCode: 'CZ',
          query: 'Providerova 1',
        }),
      );
      const tombstones = yield* resolveEffect(
        repositories.addressTombstones.listAddressTombstones(),
      );

      expect(shardSource).toMatchObject({
        cachePolicy: { kind: 'permanent' },
        id: 'live-provider:mapy-cz:CZ',
      });
      expect(retainedBeforeTombstone).toEqual([
        expect.objectContaining({
          displayLabel: 'Providerova 1, Praha',
          sourceId: 'live-provider:mapy-cz:CZ',
        }),
      ]);
      expect(retainedAfterTombstone).toEqual([]);
      expect(tombstones).toEqual([
        expect.objectContaining({
          id: 'provider-retained-praha-1',
          reason: 'provider-retention-delete',
          sourceId: 'live-provider:mapy-cz:CZ',
        }),
      ]);
    }),
  );

  it.effect(
    'rejects accept telemetry without trusted source and reports storage failures as server errors',
    () =>
      Effect.gen(function* shellEffectTestProgram25() {
        const repositories = createInMemorySmartSuggestRepositories();
        const testHandler = createSmartSuggestHandler(repositories);

        const missingSourceResponse = yield* handlerCallEffect(
          testHandler,
          requestFor('/v1/accept', {
            body: yield* Schema.encodeEffect(InvalidAcceptEventJsonSchema)({
              countryCode: 'CZ',
              requestId: 'request-missing-source',
              suggestionId: 'cz-ruian-vaclavske-namesti-832-19',
            }),
            method: 'POST',
          }),
        );

        expect(missingSourceResponse.status).toBe(400);

        repositories.acceptEvents.recordAcceptEvent = () =>
          Effect.fail(new SmartSuggestStorageError('storage-unavailable', 'storage unavailable'));

        const storageErrorResponse = yield* handlerCallEffect(
          testHandler,
          requestFor('/v1/accept', {
            body: yield* Schema.encodeEffect(SmartSuggestAcceptEventJsonSchema)({
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
      }),
  );
});
