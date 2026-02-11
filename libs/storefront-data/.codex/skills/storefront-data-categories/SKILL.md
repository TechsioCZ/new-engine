---
name: storefront-data-categories
description: Category list/detail integration for @techsio/storefront-data. Use when implementing product category hooks, Medusa category service mapping, and category query key strategy in storefront apps.
---

# Storefront Data Categories

Implement category data through the module factory to preserve pagination and cache behavior.

## Workflow

1. Create service with `createMedusaCategoryService`.
2. Configure optional list/detail query normalization and transforms.
3. Create hooks with `createCategoryHooks` and shared namespace.
4. Use built-in prefetch hooks for menu/navigation UX.

## Example

```ts
import {
  createCategoryHooks,
  createCategoryQueryKeys,
  createMedusaCategoryService,
} from "@techsio/storefront-data"
import { cacheConfig, sdk, STOREFRONT_NAMESPACE } from "@/lib/storefront-data/shared"

const categoryService = createMedusaCategoryService(sdk, {
  defaultListFields: "id,name,handle,parent_category_id",
  defaultDetailFields: "id,name,handle,parent_category_id",
})

const categoryQueryKeys = createCategoryQueryKeys(STOREFRONT_NAMESPACE)

export const categoryHooks = createCategoryHooks({
  service: categoryService,
  queryKeys: categoryQueryKeys,
  cacheConfig,
})
```

## Returned Hooks

- `useCategories`, `useSuspenseCategories`
- `useCategory`, `useSuspenseCategory`
- `usePrefetchCategories`, `usePrefetchCategory`

## Rules

- Keep category cache `static` unless business rules require quicker refresh.
- Throw early for missing `id` in suspense detail usage.
- Keep query-key params normalized and deterministic.
