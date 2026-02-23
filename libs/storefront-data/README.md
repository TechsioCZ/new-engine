# Storefront Data Library (`@techsio/storefront-data`)

Shared data fetching library for Medusa.js e-commerce storefronts using TanStack Query.

## Overview

This library provides a unified data fetching layer with:
- **Factory pattern hooks** for products, collections, categories, regions, auth, cart, checkout, orders, and customers
- **Smart caching** with configurable cache strategies
- **Prefetching utilities** for optimized navigation
- **SSR support** with hydration helpers
- **Type-safe** generics for custom product/entity types

Behavior notes:
- Prefetch helpers default to skipping only **fresh** cache entries (`skipMode: "fresh"`), not merely existing entries.
- TanStack Query cancellation does not apply to Suspense hooks (`useSuspenseQuery` / `useSuspenseQueries`).
- Query-key factories normalize plain-object params and keep primitive detail params (for example, `id: string`) as-is.

## Installation

### In Nx Monorepo Applications

Add to your app's `package.json`:

```json
{
  "dependencies": {
    "@techsio/storefront-data": "workspace:*"
  }
}
```

Then run:

```bash
pnpm install
```

### Next.js Configuration

Add to `next.config.js` transpilePackages:

```javascript
const nextConfig = {
  transpilePackages: ['@techsio/storefront-data'],
}
```

## Quick Start

### 1. Setup Provider (Client-Side)

```tsx
// app/layout.tsx or providers.tsx
import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"

export function Providers({ children }) {
  return (
    <StorefrontDataProvider
      clientConfig={{
        defaultOptions: {
          queries: { retry: 2 },
        },
      }}
    >
      {children}
    </StorefrontDataProvider>
  )
}
```

`clientConfig` is only applied when the internal singleton QueryClient is first created; later renders do not reconfigure it.

### 2. Create Domain Hooks

```tsx
// hooks/storefront-products.ts
import { createProductHooks } from "@techsio/storefront-data/products/hooks"
import type { ProductService } from "@techsio/storefront-data/products/types"
import type { Product } from "@/types/product"
import { getProducts, getProduct } from "@/services/product-service"

type ProductListParams = {
  page?: number
  limit?: number
  region_id?: string
}

type ProductDetailParams = {
  handle: string
  region_id?: string
}

const productService: ProductService<
  Product,
  ProductListParams,
  ProductDetailParams
> = {
  getProducts: (params) => getProducts(params),
  getProductByHandle: (params) => getProduct(params.handle, params.region_id),
}

export const {
  useProducts,
  useProduct,
  useSuspenseProducts,
  useSuspenseProduct,
  usePrefetchProducts,
  usePrefetchProduct,
  usePrefetchPages,
} = createProductHooks({
  service: productService,
  queryKeyNamespace: "my-app",
})
```

### 3. Use in Components

```tsx
// Client component
"use client"
import { useProducts } from "@/hooks/storefront-products"

function ProductList() {
  const { products, isLoading, totalPages, currentPage } = useProducts({
    page: 1,
    limit: 20,
    region_id: "reg_123",
  })

  if (isLoading) return <Skeleton />
  return <Grid items={products} />
}
```

### 4. Server-Side Prefetching (SSR)

```tsx
// app/products/page.tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import { createProductQueryKeys } from "@techsio/storefront-data/products/query-keys"

export default async function ProductsPage() {
  const queryClient = getServerQueryClient()
  const productQueryKeys = createProductQueryKeys("my-app")
  const listParams = { limit: 20, offset: 0, region_id: "reg_123" }

  await queryClient.prefetchQuery({
    queryKey: productQueryKeys.list(listParams),
    queryFn: () => fetchProducts(listParams),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductList />
    </HydrationBoundary>
  )
}
```

## Package Structure

```text
src/
  auth/                  # auth hooks + medusa service
  cart/                  # cart hooks + medusa service
  catalog/               # catalog hooks + medusa service
  categories/            # category hooks factory
  checkout/              # checkout hooks + medusa service
  client/                # client-side utilities
    provider.tsx         # StorefrontDataProvider
  collections/           # collection hooks factory
  customers/             # customer hooks + medusa service
  orders/                # order hooks + medusa service
  products/              # product hooks factory
  regions/               # region hooks factory
  server/                # server-side utilities
    get-query-client.ts  # per-request QueryClient
  shared/                # shared utilities
    cache-config.ts      # cache strategy configs
    medusa-client.ts     # Medusa SDK factory
    query-client.ts      # QueryClient factory
    query-keys.ts        # query key utilities
```

## Exports

Use explicit file-level subpaths (no barrel entrypoints), for example:
- `@techsio/storefront-data/auth/hooks`
- `@techsio/storefront-data/cart/hooks`
- `@techsio/storefront-data/catalog/hooks`
- `@techsio/storefront-data/checkout/hooks`
- `@techsio/storefront-data/customers/hooks`
- `@techsio/storefront-data/orders/hooks`
- `@techsio/storefront-data/products/hooks`
- `@techsio/storefront-data/products/types`
- `@techsio/storefront-data/client/provider`
- `@techsio/storefront-data/server/get-query-client`
- `@techsio/storefront-data/shared/cache-config`
- `@techsio/storefront-data/shared/query-keys`

## Cache Strategies

```typescript
import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"

const cacheConfig = createCacheConfig({
  // Override defaults as needed
  semiStatic: { staleTime: 30 * 60 * 1000 },
})
```

| Strategy | Stale Time | Use Case |
|----------|------------|----------|
| `static` | 24 hours | Regions, rarely changing data |
| `semiStatic` | 1 hour | Products, collections |
| `realtime` | 30 seconds | Cart, inventory |
| `userData` | 5 minutes | User profile, orders |

## Notes (Short)

- `enabled` is stripped from list/detail inputs before building query params/keys.
- Prefer plain objects for list/detail params in custom builders. Primitive detail params are supported and preserved in keys.
- Cart payloads are normalized by default (Medusa-friendly field names).
- Prefetch default is `skipMode: "fresh"` with `skipIfCached: true`; use `skipMode: "any"` to skip whenever any cache entry exists.
- Prefetch respects `skipIfCached`; pass `false` to force prefetch regardless of cache.
- Some service methods accept `signal` for aborting in-flight requests.
- SSR: use `getServerQueryClient` + `dehydrate` on server, `StorefrontDataProvider` + `HydrationBoundary` on client.

## Peer Dependencies

```json
{
  "@medusajs/js-sdk": ">=2.12.0",
  "@tanstack/react-query": ">=5.0.0",
  "react": ">=19.2.0",
  "react-dom": ">=19.2.0"
}
```

## Development

```bash
# Build library
pnpm -C libs/storefront-data build

# Watch mode
pnpm -C libs/storefront-data dev

# Lint
pnpm -C libs/storefront-data lint

# Tests
pnpm -C libs/storefront-data test
```

## Related Documentation

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Medusa.js SDK Docs](https://docs.medusajs.com/js-sdk)
