---
name: storefront-data-server
description: Server-side SSR integration for @techsio/storefront-data. Use when implementing server prefetch with getServerQueryClient, dehydrate/HydrationBoundary, or per-request TanStack Query cache in Next.js Server Components.
---

# Storefront Data Server

Use server entrypoints for SSR prefetch and hydration.

## Workflow

1. In a Server Component, call `getServerQueryClient()`.
2. Prefetch required queries with exact module query keys.
3. Wrap client subtree with `HydrationBoundary` and `dehydrate(queryClient)`.
4. Keep hooks in client components; server only prefetches and hydrates.

## Example

```tsx
import { dehydrate, getServerQueryClient, HydrationBoundary } from "@techsio/storefront-data/server"
import { productQueryKeys, productService, toProductListParams } from "@/lib/storefront-data/products"

export default async function ProductsPage() {
  const queryClient = getServerQueryClient()
  const params = toProductListParams({ page: 1, limit: 24, region_id: "reg_123" })

  await queryClient.prefetchQuery({
    queryKey: productQueryKeys.list(params),
    queryFn: () => productService.getProducts(params),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsClientPage />
    </HydrationBoundary>
  )
}
```

## Rules

- Never reuse browser query client on server.
- Prefetch with the same query key builder used by client hooks.
- Do not import `server` entry in client components.
