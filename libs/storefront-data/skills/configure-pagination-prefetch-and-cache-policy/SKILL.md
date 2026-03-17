---
name: configure-pagination-prefetch-and-cache-policy
description: >
  Load this skill when tuning @techsio/storefront-data cacheConfig,
  skipIfCached, skipMode, usePrefetchProducts, usePrefetchCatalogProducts, or
  usePrefetchPages. Use it for pagination, page planning, normalized query
  inputs, and keeping prefetch behavior aligned with shared query keys and
  cache strategy rules.
type: core
library: "@techsio/storefront-data"
library_version: "0.1.0"
requires:
  - setup-storefront-platform-in-next-app
sources:
  - "NMIT-WR/new-engine:libs/storefront-data/README.md"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/cache-config.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/prefetch.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/prefetch-pages-plan.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/query-keys.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/products/hooks.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/catalog/hooks.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/shared.prefetch-pages-plan.test.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/regression.shared-orders-customers.test.tsx"
---

# Configure pagination, prefetch, and cache policy

## Setup

Use the preset to set cache strategy defaults, then use the shared prefetch helpers instead of app-local loops or hand-written query keys.

```ts
// src/lib/storefront.ts
import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { createMedusaSdk } from "@techsio/storefront-data/shared/medusa-client"
import { createMedusaStorefrontPreset } from "@techsio/storefront-data/medusa/preset"

const sdk = createMedusaSdk({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
})

export const storefront = createMedusaStorefrontPreset({
  sdk,
  queryKeyNamespace: "shop",
  cacheConfig: createCacheConfig({
    semiStatic: {
      staleTime: 30 * 60 * 1000,
    },
  }),
})
```

## Core Patterns

### Use hook-owned prefetch helpers instead of app-local `queryClient.prefetchQuery`

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function ProductCardPrefetch() {
  const { prefetchProduct } = storefront.hooks.products.usePrefetchProduct({
    skipIfCached: true,
    skipMode: "any",
  })

  return (
    <button
      type="button"
      onMouseEnter={() =>
        prefetchProduct({
          handle: "classic-tee",
          region_id: "reg_123",
          country_code: "cz",
        })
      }
    >
      Hover to prefetch
    </button>
  )
}
```

### Use the shared page planner for list pagination prefetch

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function ListingPrefetch({
  regionId,
  countryCode,
  currentPage,
  totalPages,
}: {
  regionId: string
  countryCode: string
  currentPage: number
  totalPages: number
}) {
  storefront.hooks.products.usePrefetchPages({
    baseInput: {
      region_id: regionId,
      country_code: countryCode,
      limit: 24,
    },
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    pageSize: 24,
  })

  return null
}
```

### Use query-option helpers for manual reads and SSR

```ts
import { storefront } from "@/src/lib/storefront"

const listOptions = storefront.hooks.products.getListQueryOptions({
  region_id: "reg_123",
  country_code: "cz",
  limit: 24,
})
```

Treat `getListQueryOptions` and `getDetailQueryOptions` as the canonical source of query keys and query functions whenever you leave the hook path.

## Common Mistakes

### CRITICAL Hand-written query keys or query options

Wrong:

```ts
const queryKey = ["shop", "products", params]
useQuery({ queryKey, queryFn })
```

Correct:

```ts
const options = storefront.hooks.products.getListQueryOptions(params)
useQuery(options)
```

Manual keys drift from normalized key builders and break cache identity across hooks, SSR prefetch, and cart cache sync.

Source: `libs/storefront-data/src/shared/query-keys.ts`, `libs/storefront-data/tests/regression.shared-orders-customers.test.tsx`

### HIGH Reading `skipIfCached` as any-hit semantics

Wrong:

```ts
const { prefetchProducts } = storefront.hooks.products.usePrefetchProducts({
  skipIfCached: true,
})
```

Correct:

```ts
const { prefetchProducts } = storefront.hooks.products.usePrefetchProducts({
  skipIfCached: true,
  skipMode: "any",
})
```

The default skip mode is `"fresh"`. Stale data still refetches unless you explicitly choose `"any"`.

Source: `libs/storefront-data/src/shared/prefetch.ts`, `libs/storefront-data/src/products/hooks.ts`

### HIGH Non-plain values in normalized query inputs

Wrong:

```ts
storefront.hooks.products.useProducts({
  filters: new URLSearchParams(location.search),
  trace: () => console.log("debug"),
})
```

Correct:

```ts
storefront.hooks.products.useProducts({
  q: search,
  category_id: categoryIds,
})
```

The query-key normalizer expects plain serializable structures and only strips known control flags like `enabled`.

Source: `libs/storefront-data/src/shared/query-keys.ts`

### MEDIUM App-local pagination loops

Wrong:

```ts
for (let page = 1; page <= 3; page++) {
  await prefetchPage(page)
}
```

Correct:

```tsx
storefront.hooks.products.usePrefetchPages({
  baseInput,
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  pageSize: 24,
})
```

The shared page planner encodes the platform's tested expectations for immediate and delayed prefetch order.

Source: `libs/storefront-data/src/shared/prefetch-pages-plan.ts`, `libs/storefront-data/tests/shared.prefetch-pages-plan.test.ts`

## References

- [Prefetch and pagination reference](references/prefetch-and-pagination.md)

See also: `implement-ssr-prefetch-and-query-client-boundaries` for Server Component prefetch and hydration.
