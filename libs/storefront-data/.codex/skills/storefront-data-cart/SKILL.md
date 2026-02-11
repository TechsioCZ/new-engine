---
name: storefront-data-cart
description: Cart lifecycle integration for @techsio/storefront-data. Use when implementing cart retrieval/creation, line item mutations, address updates, cart transfer/complete flow, and cart storage persistence in storefront apps.
---

# Storefront Data Cart

Implement cart behavior with the cart factory to preserve auto-create, region sync, and cache semantics.

## Workflow

1. Create `cartStorage` for persistent cart id.
2. Create service with `createMedusaCartService(sdk)`.
3. Create hooks with `createCartHooks` and pass `cartStorage`.
4. Use `useCart` as cart source of truth in UI.
5. Use provided mutations (`useAddLineItem`, `useUpdateCartAddress`, etc.) for all writes.

## Example

```ts
import {
  createCartHooks,
  createCartQueryKeys,
  createMedusaCartService,
} from "@techsio/storefront-data"
import { cacheConfig, sdk, STOREFRONT_NAMESPACE } from "@/lib/storefront-data/shared"

const cartStorage = {
  getCartId: () => localStorage.getItem("cart_id"),
  setCartId: (id: string) => localStorage.setItem("cart_id", id),
  clearCartId: () => localStorage.removeItem("cart_id"),
}

const cartService = createMedusaCartService(sdk)
const cartQueryKeys = createCartQueryKeys(STOREFRONT_NAMESPACE)

export const cartHooks = createCartHooks({
  service: cartService,
  queryKeys: cartQueryKeys,
  cacheConfig,
  cartStorage,
  requireRegion: true,
})
```

## Returned Hooks

- `useCart`, `useSuspenseCart`
- `useCreateCart`, `useUpdateCart`, `useUpdateCartAddress`
- `useAddLineItem`, `useUpdateLineItem`, `useRemoveLineItem`
- `useTransferCart`, `useCompleteCart`
- `usePrefetchCart`

## Rules

- Keep `autoCreate` enabled unless app explicitly requires manual cart creation.
- Pass region (`region_id`) or provide `RegionProvider` when `requireRegion` is true.
- Use address normalization/validation callbacks for checkout-safe payloads.
- Decide explicitly whether to clear storage after completion via `clearCartOnSuccess` option.
- Use `realtime` cache strategy for cart data.
