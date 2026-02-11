# Storefront Data Library (`@techsio/storefront-data`)

TanStack Query + Medusa.js data fetching library with factory pattern hooks.

NOTE: `libs/storefront-data/AGENTS.md` is the canonical source of truth.
- `libs/storefront-data/CLAUDE.md` is a symlink to this file.
- Edit only `AGENTS.md`.
- Windows: enable Developer Mode and set `git config core.symlinks true` so symlinks work.

## Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| TanStack Query | 5+ | Data fetching, caching, SSR hydration |
| Medusa.js SDK | 2.12+ | E-commerce backend API |
| React | 19+ | UI framework |
| TypeScript | 5+ | Type safety with generics |

## Structure

```text
src/
  client/             # StorefrontDataProvider, browser QueryClient
  server/             # getServerQueryClient, hydration helpers
  shared/             # cache-config, query-keys, medusa-client
  products/           # createProductHooks factory
  collections/        # createCollectionHooks factory
  categories/         # createCategoryHooks factory
  regions/            # createRegionHooks factory
  auth/               # createAuthHooks factory + Medusa auth adapter
  cart/               # createCartHooks factory + cart lifecycle
  checkout/           # createCheckoutHooks factory + checkout flow
  orders/             # createOrderHooks factory
  customers/          # createCustomerHooks factory
  index.ts            # Re-exports all modules
```

## Commands

- `pnpm -C libs/storefront-data build`   # Build (tsc)
- `pnpm -C libs/storefront-data dev`     # Watch mode
- `pnpm -C libs/storefront-data lint`    # Biome lint

## Critical Rules (Do not break these)

**NEVER:**
- Import from `./dist/` paths - use source
- Use `any` type - use proper generics
- Hardcode query keys - use `createQueryKey()` utility
- Mix server/client code in same file
- Create barrel files except at module boundaries

**ALWAYS:**
- Use factory pattern (`createProductHooks`, etc.)
- Type service interfaces with generics
- Use cache strategies from `CacheConfig` (static, semiStatic, realtime, userData)
- Keep `"use client"` directive only in client components
- Use `getServerQueryClient` from `server/` entry for Server Components

## Hook Factory Pattern

```typescript
import { createProductHooks, type ProductService } from "@techsio/storefront-data"

const productService: ProductService<Product, ListParams, DetailParams> = {
  getProducts: (params, signal) => api.getProducts(params, signal),
  getProductByHandle: (params) => api.getProduct(params),
}

export const {
  useProducts,
  useSuspenseProducts,
  useProduct,
  useSuspenseProduct,
  usePrefetchProducts,
  usePrefetchProduct,
  usePrefetchPages,
} = createProductHooks({
  service: productService,
  queryKeyNamespace: "my-app",
  buildListParams: (input) => ({ ...input, offset: (input.page - 1) * input.limit }),
})
```

## Cache Strategies

| Strategy | Stale Time | Use Case |
|----------|------------|----------|
| `static` | 24h | Regions, rarely-changing data |
| `semiStatic` | 1h | Products, collections (default) |
| `realtime` | 30s | Cart, inventory |
| `userData` | 5 min | User profile, orders |

## SSR Hydration

```typescript
// Server Component
import { getServerQueryClient, dehydrate, HydrationBoundary } from "@techsio/storefront-data/server"

export default async function Page() {
  const queryClient = getServerQueryClient()
  await queryClient.prefetchQuery({ queryKey, queryFn })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientComponent />
    </HydrationBoundary>
  )
}
```

## App Integration

```json
// package.json
{ "dependencies": { "@techsio/storefront-data": "workspace:*" } }
```

```javascript
// next.config.js
{ transpilePackages: ['@techsio/storefront-data'] }
```

## Research

- TanStack Query: check official docs before implementing SSR/prefetch patterns.
- Medusa SDK: reference for API response types and SDK methods.
- Before changing or modifying the code, please read this: clone repos to `~/.local/share/tanstack-query` and `~/.local/share/medusa` for local search.
