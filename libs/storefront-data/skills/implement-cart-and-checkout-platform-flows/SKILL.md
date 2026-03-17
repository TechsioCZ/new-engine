---
name: implement-cart-and-checkout-platform-flows
description: >
  Load this skill when implementing cart and checkout through
  @techsio/storefront-data with storefront.flows.cart,
  storefront.flows.checkout, useCart, useAddToCart, useCheckoutShipping,
  useCheckoutPayment, useCompleteCheckout, and shared cart cache sync. Use it
  for active cart lifecycle, effective cart state, selected payment-session
  semantics, and canonical checkout orchestration.
type: core
library: "@techsio/storefront-data"
library_version: "0.1.0"
requires:
  - setup-storefront-platform-in-next-app
sources:
  - "NMIT-WR/new-engine:libs/storefront-data/README.md"
  - "NMIT-WR/new-engine:libs/storefront-data/src/cart/types.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/cart-cache-sync.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/checkout-flow-utils.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/medusa/cart-flow.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/medusa/checkout-flow.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/cart.cache-sync.test.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/medusa.flow.test.tsx"
---

## Setup

Use the flow layer as the default app surface for cart and checkout. Drop to low-level hooks only for exceptional cases.

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function AddToCartButton({
  regionId,
  variantId,
}: {
  regionId: string
  variantId: string
}) {
  const cart = storefront.flows.cart.useCart({
    region_id: regionId,
    autoCreate: true,
    autoUpdateRegion: true,
  })
  const addToCart = storefront.flows.cart.useAddToCart()

  return (
    <button
      type="button"
      disabled={cart.isLoading || addToCart.isPending}
      onClick={() =>
        addToCart.mutate({
          cartId: cart.cart?.id,
          region_id: regionId,
          variantId,
          quantity: 1,
          autoCreate: true,
        })
      }
    >
      Add to cart
    </button>
  )
}
```

## Core Patterns

### Use checkout shipping through the flow wrapper

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function ShippingOptions({ cartId }: { cartId: string }) {
  const shipping = storefront.flows.checkout.useCheckoutShipping({ cartId })

  return (
    <ul>
      {shipping.shippingOptions.map((option) => (
        <li key={option.id}>
          <button type="button" onClick={() => shipping.setShipping(option.id)}>
            {option.name}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

### Use checkout payment through the flow wrapper

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function PaymentOptions({
  cartId,
  regionId,
}: {
  cartId: string
  regionId: string
}) {
  const payment = storefront.flows.checkout.useCheckoutPayment({
    cartId,
    regionId,
  })

  return (
    <ul>
      {payment.paymentProviders.map((provider) => (
        <li key={provider.id}>
          <button
            type="button"
            onClick={() => payment.initiatePayment(provider.id)}
          >
            {provider.id}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

### Complete checkout through the canonical flow

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function CompleteCheckoutButton({
  cartId,
  regionId,
}: {
  cartId: string
  regionId: string
}) {
  const completeCheckout = storefront.flows.checkout.useCompleteCheckout({
    cartId,
    regionId,
  })

  return (
    <button type="button" onClick={() => completeCheckout.mutate()}>
      Complete checkout
    </button>
  )
}
```

## Common Mistakes

### HIGH Direct Medusa calls instead of the flow layer

Wrong:

```ts
await sdk.store.cart.createLineItem(cartId, payload)
await sdk.store.cart.complete(cartId)
```

Correct:

```ts
const addToCart = storefront.flows.cart.useAddToCart()
const completeCheckout = storefront.flows.checkout.useCompleteCheckout({ cartId })

await addToCart.mutateAsync({ cartId, ...payload })
await completeCheckout.mutateAsync()
```

The flow wrappers normalize cache sync, result shapes, and checkout orchestration. Direct SDK calls bypass those shared semantics.

Source: `libs/storefront-data/src/medusa/cart-flow.ts`, `libs/storefront-data/src/medusa/checkout-flow.ts`

### CRITICAL First payment session wins

Wrong:

```ts
const providerId = cart.payment_collection?.payment_sessions?.[0]?.provider_id
```

Correct:

```ts
const providerId = resolveSelectedPaymentProviderId(cart)
```

Checkout now derives the active provider from selected payment-session semantics, not whichever session happens to be first.

Source: `libs/storefront-data/src/shared/checkout-flow-utils.ts`, `libs/storefront-data/tests/medusa.flow.test.tsx`

### HIGH Latest local cart argument is always authoritative

Wrong:

```ts
const complete = () => checkout.mutate({ cart })
```

Correct:

```ts
const completeCheckout = storefront.flows.checkout.useCompleteCheckout({
  cartId: cart.id,
})

const complete = () => completeCheckout.mutate()
```

The checkout flow resolves effective cart state from the shared caches and selected state. A stale local cart object is not always the right source of truth.

Source: `libs/storefront-data/src/shared/checkout-flow-utils.ts`, `libs/storefront-data/src/medusa/checkout-flow.ts`

### HIGH App-local active-cart cache heuristics

Wrong:

```ts
const activeCartKey = ["shop", "cart", "active"]
queryClient.setQueryData(activeCartKey, cart)
```

Correct:

```ts
syncCartCaches(queryClient, storefront.queryKeys.cart, cart)
```

Active-cart matching is now shared platform behavior. Hand-written heuristics drift from the tested cache contract.

Source: `libs/storefront-data/src/shared/cart-cache-sync.ts`, `libs/storefront-data/tests/cart.cache-sync.test.ts`

See also: `configure-pagination-prefetch-and-cache-policy` for shared query-key behavior and cache semantics.
