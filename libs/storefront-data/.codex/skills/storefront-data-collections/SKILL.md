---
name: storefront-data-collections
description: Collection list/detail integration for @techsio/storefront-data. Use when wiring collection hooks, Medusa collection service transforms, and collection prefetch behavior in a storefront app.
---

# Storefront Data Collections

Use the collection factory to keep list/detail behavior and cache policies consistent.

## Workflow

1. Create service with `createMedusaCollectionService`.
2. Optionally normalize list/detail queries and map Medusa payload to app entity.
3. Create hooks via `createCollectionHooks`.
4. Use prefetch hooks for list/detail route transitions.

## Example

```ts
import {
  createCollectionHooks,
  createCollectionQueryKeys,
  createMedusaCollectionService,
} from "@techsio/storefront-data"
import { cacheConfig, sdk, STOREFRONT_NAMESPACE } from "@/lib/storefront-data/shared"

const collectionService = createMedusaCollectionService(sdk, {
  defaultListFields: "id,title,handle",
  defaultDetailFields: "id,title,handle,metadata",
})

const collectionQueryKeys = createCollectionQueryKeys(
  STOREFRONT_NAMESPACE
)

export const collectionHooks = createCollectionHooks({
  service: collectionService,
  queryKeys: collectionQueryKeys,
  cacheConfig,
})
```

## Returned Hooks

- `useCollections`, `useSuspenseCollections`
- `useCollection`, `useSuspenseCollection`
- `usePrefetchCollections`, `usePrefetchCollection`

## Rules

- Use `static` cache strategy as default for collections.
- Require `id` for detail suspense hook.
- Keep `enabled` and UI flags out of API payload/query keys.
