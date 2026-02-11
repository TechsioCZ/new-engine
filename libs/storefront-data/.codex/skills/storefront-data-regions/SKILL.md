---
name: storefront-data-regions
description: Region data integration for @techsio/storefront-data. Use when implementing region list/detail hooks, Medusa region service wiring, or region prefetch used for locale/currency initialization.
---

# Storefront Data Regions

Use regions as foundational data for locale, currency, and region-aware hooks.

## Workflow

1. Create service with `createMedusaRegionService`.
2. Create hooks with `createRegionHooks`.
3. Prefetch regions early (layout/app bootstrap) because many modules depend on region id.
4. Connect selected region to `RegionProvider` from shared module.

## Example

```ts
import {
  createMedusaRegionService,
  createRegionHooks,
  createRegionQueryKeys,
} from "@techsio/storefront-data"
import { cacheConfig, sdk, STOREFRONT_NAMESPACE } from "@/lib/storefront-data/shared"

const regionService = createMedusaRegionService(sdk)
const regionQueryKeys = createRegionQueryKeys(STOREFRONT_NAMESPACE)

export const regionHooks = createRegionHooks({
  service: regionService,
  queryKeys: regionQueryKeys,
  cacheConfig,
})
```

## Returned Hooks

- `useRegions`, `useSuspenseRegions`
- `useRegion`, `useSuspenseRegion`
- `usePrefetchRegions`, `usePrefetchRegion`

## Rules

- Treat region data as `static` cache by default.
- Use region module as source of truth before cart/products load.
- Keep region id selection logic outside module; module only fetches/caches.
