# Smart Suggest App Config

`apps/smart-suggest` is a Cloudflare Worker app shell. This PR only proves the runtime and route structure; it does not implement suggestions, provider calls, storage, or Module Federation.

## Local Runtime

Run the Worker with Cloudflare tooling:

```bash
pnpm --dir apps/smart-suggest dev
```

Health endpoint:

```bash
curl http://localhost:8787/api/v1/health
```

`/sdk/*` is reserved for a future old-core global vanilla SDK asset. It currently returns `501` and must not be treated as implemented.

## Variables

| Name | Required | Purpose |
| --- | --- | --- |
| `SMART_SUGGEST_ENV` | No | Runtime name: `local`, `preview`, `staging`, `production`, or `test`. Defaults to `local`. |
| `SMART_SUGGEST_VERSION` | No | Service version returned by `/api/v1/health`. Defaults to `0.0.0`. |
| `SMART_SUGGEST_BUILD_ID` | No | Build identifier returned by `/api/v1/health`. Defaults to `local`. |
| `SMART_SUGGEST_ALLOWED_ORIGINS` | No | Comma-separated HTTP(S) origins allowed for CORS. Defaults to local storefront ports. Use `*` only for intentionally public non-credentialed environments. |
| `SMART_SUGGEST_DEFAULT_TENANT_ID` | No | Default tenant id used until API-key/tenant storage lands. Defaults to `default`. |
| `SMART_SUGGEST_TENANT_HEADER` | No | Header used by future API clients to select a tenant. Defaults to `x-tenant-id`. |
| `SMART_SUGGEST_PROVIDER_PRIORITY` | No | Comma-separated provider ids for future routing, for example `owned-data,mapy`. No provider calls exist in this PR. |

## Bindings

Future issues should use these binding names so route code stays stable:

| Binding | Cloudflare type | Purpose |
| --- | --- | --- |
| `SMART_SUGGEST_DB` | D1 | Runtime tables owned by SS-02 and later. |
| `SMART_SUGGEST_CONFIG` | KV | Tenant/API config snapshots when needed outside D1. |
| `SMART_SUGGEST_CACHE` | KV | Owned-data/search cache metadata. |
| `SMART_SUGGEST_PROVIDER_CACHE` | KV | External provider result cache, governed by explicit provider cache policy. |

## Secrets

Provider API keys must be configured with `wrangler secret put`, not committed in `wrangler.toml`.

| Secret | Purpose |
| --- | --- |
| `SMART_SUGGEST_MAPY_API_KEY` | Future Mapy provider access. This PR does not read it for provider calls. |

Raw user queries must not be logged or stored. This app shell has no query endpoint yet.
