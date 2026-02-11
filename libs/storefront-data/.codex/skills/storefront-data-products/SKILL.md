---
name: storefront-data-products
description: Product listing/detail integration for @techsio/storefront-data. Use when implementing product list/detail hooks, infinite pagination, product prefetching, or Medusa product service wiring in a storefront app.
---

# Storefront Data Products

Implement product hooks through factory + service, not ad hoc queries.

## Workflow

1. Create product service.
Prefer `createMedusaProductService(sdk, config)`.

2. Create typed product params mappers.
Map UI input (`page`, `limit`) to API params (`offset`, `limit`).

3. Create hooks using `createProductHooks`.
Keep a shared `queryKeyNamespace` and optionally pass custom `queryKeys`.

4. Use region-aware input.
`requireRegion` defaults to `true`; pass `region_id` directly or via `RegionProvider`.

5. Use prefetch APIs for UX.
Use `usePrefetchProducts`, `usePrefetchProduct`, and `usePrefetchPages` for navigation/hover preloads.

## Example

```ts
import {
  createMedusaProductService,
  createProductHooks,
  createProductQueryKeys,
  type ProductListInputBase,
} from "@techsio/storefront-data"
import { cacheConfig, sdk, STOREFRONT_NAMESPACE } from "@/lib/storefront-data/shared"

type ProductListParams = { limit: number; offset: number; region_id?: string }
type ProductDetailParams = { handle: string; region_id?: string; country_code?: string }

const productService = createMedusaProductService(sdk, {
  defaultListFields: "id,title,handle,thumbnail",
  defaultDetailFields: "id,title,handle,description,*variants.calculated_price",
})

const productQueryKeys = createProductQueryKeys<ProductListParams, ProductDetailParams>(
  STOREFRONT_NAMESPACE
)

const toProductListParams = (input: ProductListInputBase): ProductListParams => {
  const limit = input.limit ?? 24
  const page = input.page ?? 1
  return { limit, offset: (page - 1) * limit, region_id: input.region_id }
}

export const productHooks = createProductHooks({
  service: productService,
  buildListParams: toProductListParams,
  buildPrefetchParams: toProductListParams,
  queryKeys: productQueryKeys,
  cacheConfig,
})
```

## Returned Hooks

- `useProducts`, `useSuspenseProducts`
- `useInfiniteProducts`
- `useProduct`, `useSuspenseProduct`
- `usePrefetchProducts`, `usePrefetchProduct`, `usePrefetchPages`

## Rules

- Keep `handle` required for detail queries.
- Keep `enabled` out of query-key params.
- Use `semiStatic` strategy for standard product data unless you have realtime pricing requirements.
