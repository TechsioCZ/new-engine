---
name: storefront-data-orders
description: Customer order history/detail integration for @techsio/storefront-data. Use when implementing authenticated order list/detail views with order query factories, pagination mapping, and user-data cache behavior.
---

# Storefront Data Orders

Use order hooks for authenticated order history and detail pages.

## Workflow

1. Create service with `createMedusaOrderService`.
2. Configure optional `defaultFields` for list/detail payload trimming.
3. Create hooks with `createOrderHooks` and shared namespace.
4. Build UI pagination using `currentPage`, `totalPages`, `hasNextPage`, `hasPrevPage`.

## Example

```ts
import {
  createMedusaOrderService,
  createOrderHooks,
  createOrderQueryKeys,
} from "@techsio/storefront-data"
import { cacheConfig, sdk, STOREFRONT_NAMESPACE } from "@/lib/storefront-data/shared"

const orderService = createMedusaOrderService(sdk, {
  defaultFields: "id,display_id,status,total,items,created_at",
})

const orderQueryKeys = createOrderQueryKeys(STOREFRONT_NAMESPACE)

export const orderHooks = createOrderHooks({
  service: orderService,
  queryKeys: orderQueryKeys,
  cacheConfig,
})
```

## Returned Hooks

- `useOrders`, `useSuspenseOrders`
- `useOrder`, `useSuspenseOrder`

## Rules

- Keep orders under `userData` cache strategy.
- Require `id` for suspense detail query.
- Use same namespace as auth module so auth invalidation can refresh order data.
