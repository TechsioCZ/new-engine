---
name: storefront-data-checkout
description: Checkout shipping/payment integration for @techsio/storefront-data. Use when implementing shipping option selection, calculated shipping prices, payment provider loading, and payment session initiation tied to cart state.
---

# Storefront Data Checkout

Wire checkout with cart hooks so shipping/payment mutations keep cart cache consistent.

## Workflow

1. Create checkout service with `createMedusaCheckoutService(sdk)`.
2. Create hooks with `createCheckoutHooks`.
3. Pass `cartQueryKeys` from cart module to sync/refresh cart cache after mutations.
4. Use shipping hook first, then payment hook.

## Example

```ts
import {
  createCheckoutHooks,
  createCheckoutQueryKeys,
  createMedusaCheckoutService,
} from "@techsio/storefront-data"
import { cartQueryKeys } from "@/lib/storefront-data/cart"
import { cacheConfig, sdk, STOREFRONT_NAMESPACE } from "@/lib/storefront-data/shared"

const checkoutService = createMedusaCheckoutService(sdk)
const checkoutQueryKeys = createCheckoutQueryKeys(STOREFRONT_NAMESPACE)

export const checkoutHooks = createCheckoutHooks({
  service: checkoutService,
  queryKeys: checkoutQueryKeys,
  cartQueryKeys,
  cacheConfig,
})
```

## Returned Hooks

- `useCheckoutShipping`, `useSuspenseCheckoutShipping`
- `useCheckoutPayment`, `useSuspenseCheckoutPayment`
- `getPaymentProvidersQueryOptions`, `fetchPaymentProviders`

## Rules

- Require `cartId` for shipping mutation and payment initiation.
- Use shipping method before payment session; `canInitiatePayment` depends on it.
- Use `cacheKey` in shipping queries when option visibility depends on external checkout state.
- Keep payment providers on `semiStatic` cache; shipping options/prices on `realtime` cache.
