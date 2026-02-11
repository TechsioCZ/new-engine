---
name: storefront-data-shared
description: Core setup for @techsio/storefront-data shared module. Use when bootstrapping a new storefront app with Medusa SDK setup, cache strategy config, query-key normalization, RegionProvider wiring, or custom QueryClient configuration.
---

# Storefront Data Shared

Implement the shared foundation before wiring domain hooks.

## Workflow

1. Create one namespace constant for the app.
Use the same `queryKeyNamespace` across all modules (`products`, `cart`, `auth`, `checkout`, `orders`, `customers`).

2. Create Medusa SDK wrapper.
Use `createMedusaSdk` so auth is disabled automatically on server by default.

3. Create cache config once.
Start from `createCacheConfig()` and override only needed strategies.

4. Use query-key helpers, never hardcoded arrays.
Generate keys with `createQueryKey` or module factories.

5. Provide region context if app is region-aware.
Wrap app/client tree with `RegionProvider` and pass `{ region_id, country_code }`.

## Baseline Example

```ts
import {
  createCacheConfig,
  createMedusaSdk,
  createQueryKey,
  RegionProvider,
} from "@techsio/storefront-data/shared"

export const STOREFRONT_NAMESPACE = "new-shop"

export const cacheConfig = createCacheConfig({
  semiStatic: { staleTime: 30 * 60 * 1000 },
})

export const sdk = createMedusaSdk({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_URL!,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  auth: {
    type: "session",
  },
})

export const appHealthQueryKey = createQueryKey(STOREFRONT_NAMESPACE, "health")
```

## Rules

- Keep params plain-object when possible; `normalizeQueryKeyPart` removes `undefined` and stable-sorts object keys.
- For non-cache flags (for example `enabled`), omit from query keys.
- Use cache strategy defaults unless UX explicitly needs fresher data.
- Keep shared module pure; no component-side side effects except `RegionProvider`.
