---
name: use-catalog-and-product-read-flows
description: >
  Load this skill when reading products, catalog listings, categories,
  collections, or regions from @techsio/storefront-data through
  storefront.hooks.products, storefront.hooks.catalog, and the related read
  hooks. Use it for region-aware inputs, query-option helpers, and suspense
  usage that waits until required params actually exist.
type: core
library: "@techsio/storefront-data"
library_version: "0.1.0"
requires:
  - setup-storefront-platform-in-next-app
sources:
  - "NMIT-WR/new-engine:libs/storefront-data/README.md"
  - "NMIT-WR/new-engine:libs/storefront-data/src/products/hooks.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/products/medusa-service.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/catalog/hooks.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/catalog/medusa-service.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/collections/hooks.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/categories/hooks.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/regions/hooks.ts"
---

## Setup

Start from the preset-owned read hooks. Keep region inputs explicit in the app code that knows them.

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function ProductGrid({
  regionId,
  countryCode,
}: {
  regionId: string
  countryCode: string
}) {
  const query = storefront.hooks.products.useProducts({
    region_id: regionId,
    country_code: countryCode,
    limit: 24,
  })

  if (query.isLoading) return <div>Loading...</div>

  return (
    <ul>
      {query.products.map((product) => (
        <li key={product.id}>{product.title}</li>
      ))}
    </ul>
  )
}
```

## Core Patterns

### Filter catalog listings through the shared catalog hook

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function CategoryListing({
  regionId,
  countryCode,
  categoryId,
}: {
  regionId: string
  countryCode: string
  categoryId: string
}) {
  const query = storefront.hooks.catalog.useCatalogProducts({
    region_id: regionId,
    country_code: countryCode,
    category_id: [categoryId],
    limit: 24,
  })

  if (query.isLoading) return <div>Loading...</div>

  return <div>{query.products.length} products</div>
}
```

### Use suspense detail hooks only after route and region params are ready

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function ProductHero({
  handle,
  regionId,
  countryCode,
}: {
  handle: string
  regionId: string
  countryCode: string
}) {
  const query = storefront.hooks.products.useSuspenseProduct({
    handle,
    region_id: regionId,
    country_code: countryCode,
  })

  if (!query.product) return null

  return <h1>{query.product.title}</h1>
}
```

### Pull option objects from the hooks when SSR or manual cache work is needed

```ts
import { storefront } from "@/src/lib/storefront"

const listQuery = storefront.hooks.products.getListQueryOptions({
  region_id: "reg_123",
  country_code: "cz",
  limit: 24,
})

const detailQuery = storefront.hooks.products.getDetailQueryOptions({
  handle: "classic-tee",
  region_id: "reg_123",
  country_code: "cz",
})
```

Use the hook surface for most reads. Use query-option helpers when SSR, manual prefetch, or loader integration needs the exact query shape.

## Common Mistakes

### CRITICAL Suspense before params exist

Wrong:

```tsx
const query = storefront.hooks.products.useSuspenseProduct({
  handle: params.handle,
  region_id: regionId,
})
```

Correct:

```tsx
const query = storefront.hooks.products.useProduct({
  handle: params.handle,
  region_id: regionId,
  enabled: Boolean(params.handle && regionId),
})
```

Suspense variants assume required inputs already exist. During routing or region bootstrap they throw instead of waiting.

Source: `libs/storefront-data/src/products/hooks.ts`, `libs/storefront-data/src/categories/hooks.ts`, `libs/storefront-data/src/collections/hooks.ts`

### HIGH App-local `useQuery` wrappers for Medusa reads

Wrong:

```ts
const products = useQuery({
  queryKey: ["products", params],
  queryFn: () => sdk.store.product.list(params),
})
```

Correct:

```ts
const products = storefront.hooks.products.useProducts(params)
```

App-local wrappers duplicate the normalization, query-key rules, and bug fixes that the preset is supposed to centralize.

Source: `libs/storefront-data/AGENTS.md`, maintainer interview

### HIGH Dropping region-sensitive inputs

Wrong:

```ts
storefront.hooks.catalog.useCatalogProducts({
  category_id: ["cat_123"],
  limit: 24,
})
```

Correct:

```ts
storefront.hooks.catalog.useCatalogProducts({
  category_id: ["cat_123"],
  region_id: "reg_123",
  country_code: "cz",
  limit: 24,
})
```

Product and catalog services normalize region-aware inputs. Missing them fragments payload shape and cache identity across the storefront.

Source: `libs/storefront-data/src/catalog/medusa-service.ts`, `libs/storefront-data/src/products/medusa-service.ts`

### HIGH Assuming custom field defaults come from the library

Wrong:

```ts
storefront.hooks.products.useProduct({
  handle: "classic-tee",
  region_id: "reg_123",
})
```

Correct:

```ts
storefront.hooks.products.useProduct({
  handle: "classic-tee",
  region_id: "reg_123",
  fields: "+variants,+metadata",
})
```

The README explicitly keeps product field defaults in the local storefront composition layer. Do not assume a universal default bundle for every storefront.

Source: `libs/storefront-data/README.md`, `libs/storefront-data/src/products/types.ts`

See also: `configure-pagination-prefetch-and-cache-policy` for prefetch behavior and normalized query-key rules.
