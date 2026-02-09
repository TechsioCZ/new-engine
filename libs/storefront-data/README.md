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
- Query-key factories normalize plain-object params and keep primitive detail params (for example `id: string`) as-is.

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
import { StorefrontDataProvider } from "@techsio/storefront-data/client"

export function Providers({ children }) {
  return (
    <StorefrontDataProvider>
      {children}
    </StorefrontDataProvider>
  )
}
```

### 2. Create Domain Hooks

```tsx
// hooks/storefront-products.ts
import { createProductHooks, type ProductService } from "@techsio/storefront-data"
import type { Product } from "@/types/product"
import { getProducts, getProduct } from "@/services/product-service"

const productService: ProductService<Product, ListParams, DetailParams> = {
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
import { getServerQueryClient, dehydrate, HydrationBoundary } from "@techsio/storefront-data/server"

export default async function ProductsPage() {
  const queryClient = getServerQueryClient()

  await queryClient.prefetchQuery({
    queryKey: ["my-app", "products", "list", {}],
    queryFn: () => fetchProducts(),
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
├── index.ts              # Main exports
├── client/               # Client-side utilities
│   ├── provider.tsx      # StorefrontDataProvider
│   └── index.ts
├── server/               # Server-side utilities
│   ├── get-query-client.ts  # Per-request QueryClient
│   └── index.ts
├── shared/               # Shared utilities
│   ├── cache-config.ts   # Cache strategy configs
│   ├── medusa-client.ts  # Medusa SDK factory
│   ├── query-client.ts   # QueryClient factory
│   └── query-keys.ts     # Query key utilities
├── products/             # Product hooks factory
│   ├── hooks.ts          # createProductHooks
│   ├── types.ts          # Product types
│   └── query-keys.ts
├── collections/          # Collection hooks factory
├── categories/           # Category hooks factory
└── regions/              # Region hooks factory
```

## Exports

### Main Entry (`@techsio/storefront-data`)

All domain hooks factories and shared utilities.

### Client Entry (`@techsio/storefront-data/client`)

- `StorefrontDataProvider` - React Query provider wrapper
- `getQueryClient` - Browser singleton QueryClient

### Server Entry (`@techsio/storefront-data/server`)

- `getServerQueryClient` - Per-request QueryClient with React.cache()
- `dehydrate`, `HydrationBoundary` - SSR hydration helpers

### Shared Entry (`@techsio/storefront-data/shared`)

- `createCacheConfig` - Cache strategy factory
- `createMedusaSdk` - Medusa SDK factory
- `createQueryKey`, `createQueryKeyFactory` - Query key utilities
- `normalizeQueryKeyParams` - Stable params normalization for query keys
- `normalizeQueryKeyPart` - Safe query-key part normalization (object normalize + primitive passthrough)

## Cache Strategies

```typescript
import { createCacheConfig } from "@techsio/storefront-data/shared"

const cacheConfig = createCacheConfig({
  // Override defaults as needed
  semiStatic: { staleTime: 30 * 60 * 1000 },
})
```

| Strategy | Stale Time | Use Case |
|----------|------------|----------|
| `static` | 24 hours | Regions, rarely-changing data |
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
  "react": ">=19.0.0",
  "react-dom": ">=19.0.0"
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
