---
name: implement-ssr-prefetch-and-query-client-boundaries
description: >
  Load this skill when using @techsio/storefront-data in Next.js Server
  Components with getServerQueryClient, HydrationBoundary, dehydrate, and
  preset-owned getListQueryOptions or getDetailQueryOptions. Use it for SSR
  prefetch, request-scoped query-client ownership, and avoiding query-key drift
  between server prefetch and client hooks.
type: framework
library: "@techsio/storefront-data"
framework: react
library_version: "0.1.0"
requires:
  - setup-storefront-platform-in-next-app
sources:
  - "NMIT-WR/new-engine:libs/storefront-data/README.md"
  - "NMIT-WR/new-engine:libs/storefront-data/src/server/get-query-client.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/query-client.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/query-keys.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/products/hooks.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/ssr-hydration.smoke.test.tsx"
---

This skill builds on `setup-storefront-platform-in-next-app`. Read it first for the preset and provider boundary.

# Implement SSR prefetch and query-client boundaries

## Setup

Use the request-scoped server helper inside Server Components and prefetch through query options that come from the preset.

```tsx
// app/products/page.tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import { storefront } from "@/src/lib/storefront"
import { ProductsPage } from "./products-page"

export default async function Page() {
  const queryClient = getServerQueryClient()

  await queryClient.prefetchQuery(
    storefront.hooks.products.getListQueryOptions({
      region_id: "reg_123",
      country_code: "cz",
      limit: 24,
    })
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsPage />
    </HydrationBoundary>
  )
}
```

## Hooks and Components

### Prefetch detail routes with the same query options the client hook will use

```tsx
// app/products/[handle]/page.tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import { storefront } from "@/src/lib/storefront"
import { ProductPage } from "./product-page"

export default async function Page({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const queryClient = getServerQueryClient()

  await queryClient.prefetchQuery(
    storefront.hooks.products.getDetailQueryOptions({
      handle,
      region_id: "reg_123",
      country_code: "cz",
    })
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductPage handle={handle} />
    </HydrationBoundary>
  )
}
```

### Use `makeQueryClient` when code runs on the server outside RSC render

```ts
// src/lib/server-sitemap.ts
import { makeQueryClient } from "@techsio/storefront-data/shared/query-client"
import { storefront } from "@/src/lib/storefront"

export async function loadSitemapProducts() {
  const queryClient = makeQueryClient()

  await queryClient.prefetchQuery(
    storefront.hooks.products.getListQueryOptions({
      region_id: "reg_123",
      country_code: "cz",
      limit: 100,
    })
  )

  return queryClient.getQueryData(
    storefront.queryKeys.products.list({
      region_id: "reg_123",
      country_code: "cz",
      limit: 100,
    })
  )
}
```

`getServerQueryClient()` is for Server Component render. `makeQueryClient()` is the safe explicit choice for standalone server utilities.

## Common Mistakes

### HIGH Raw server QueryClient instances

Wrong:

```ts
import { QueryClient } from "@tanstack/react-query"

const queryClient = new QueryClient()
await queryClient.prefetchQuery({ queryKey, queryFn })
```

Correct:

```ts
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"

const queryClient = getServerQueryClient()
await queryClient.prefetchQuery(options)
```

A raw QueryClient bypasses the library's documented request-scoped SSR path and makes hydration behavior drift from the preset setup.

Source: `libs/storefront-data/src/server/get-query-client.ts`, `libs/storefront-data/AGENTS.md`

### HIGH Assuming request memoization outside RSC render

Wrong:

```ts
export async function GET() {
  const first = getServerQueryClient()
  const second = getServerQueryClient()
}
```

Correct:

```ts
export default async function Page() {
  const queryClient = getServerQueryClient()
  return <HydrationBoundary state={dehydrate(queryClient)} />
}
```

React `cache()` only gives request-scoped reuse during Server Component render. Outside that context, each call creates a fresh client.

Source: `libs/storefront-data/src/server/get-query-client.ts`

### CRITICAL Hand-written query keys for SSR prefetch

Wrong:

```ts
await queryClient.prefetchQuery({
  queryKey: ["shop", "products", params],
  queryFn: fetchProducts,
})
```

Correct:

```ts
await queryClient.prefetchQuery(
  storefront.hooks.products.getListQueryOptions(params)
)
```

Manual keys drift from the normalized key builders and silently miss the hydrated client cache.

Source: `libs/storefront-data/src/shared/query-keys.ts`, `libs/storefront-data/tests/ssr-hydration.smoke.test.tsx`

### HIGH Missing region-sensitive inputs in prefetch

Wrong:

```ts
await queryClient.prefetchQuery(
  storefront.hooks.products.getListQueryOptions({
    limit: 24,
  })
)
```

Correct:

```ts
await queryClient.prefetchQuery(
  storefront.hooks.products.getListQueryOptions({
    region_id: "reg_123",
    country_code: "cz",
    limit: 24,
  })
)
```

SSR helpers do not know the current region implicitly. If server and client shape the inputs differently, you lose cache identity and can fetch different payloads.

Source: `libs/storefront-data/src/products/hooks.ts`, `libs/storefront-data/src/products/medusa-service.ts`

See also: `configure-pagination-prefetch-and-cache-policy` for skip modes, page planning, and normalized query inputs.
