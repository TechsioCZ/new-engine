---
name: decide-app-specific-overrides-vs-shared-platform
description: >
  Load this skill when deciding whether storefront-specific wrappers, DTOs,
  address adapters, or backend behavior should stay in the app or move into
  @techsio/storefront-data. Use it for thin wrapper rules, customer-specific
  read models, and deciding when repeated backend logic becomes shared platform
  behavior.
type: composition
library: "@techsio/storefront-data"
library_version: "0.1.0"
sources:
  - "NMIT-WR/new-engine:libs/storefront-data/README.md"
  - "NMIT-WR/new-engine:libs/storefront-data/zmeny.md"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/address.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/checkout/address.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/auth/hooks.ts"
---

# Decide app-specific overrides vs shared platform

## Setup

Default to the shared preset surface. Add a local wrapper only when the app contributes real policy or UX behavior.

```ts
// src/lib/auth-hooks.ts
import { storefront } from "@/src/lib/storefront"
import { toast } from "sonner"

export function useLoginWithToast() {
  return storefront.hooks.auth.useLogin({
    onSuccess: () => {
      toast.success("Logged in")
    },
  })
}
```

## Core Patterns

### Keep customer-specific DTOs and read models in the app

```ts
// apps/n1/src/lib/customer-models.ts
export type N1ProfileCard = {
  email: string
  loyaltyTier: string
}
```

The shared package should own reusable backend-facing contracts. A storefront-local view model stays local until another storefront needs the same shape.

### Keep address customization behind the shared contract

```ts
// apps/n1/src/lib/address-adapter.ts
import type { CheckoutCartAddressAdapter } from "@techsio/storefront-data/shared/address"

export const checkoutCartAddressAdapter: CheckoutCartAddressAdapter<FormValues> = {
  toCreateInput(values) {
    return {
      first_name: values.firstName,
      last_name: values.lastName,
      address_1: values.street,
      city: values.city,
      country_code: values.countryCode,
      postal_code: values.postalCode,
    }
  },
  toPatchInput(values) {
    return {
      first_name: values.firstName,
      last_name: values.lastName,
      address_1: values.street,
      city: values.city,
      country_code: values.countryCode,
      postal_code: values.postalCode,
    }
  },
}
```

### Promote repeated backend behavior into the shared package

```ts
// apps/n1/src/lib/checkout.ts
export function useCheckoutWithSharedPaymentRule(cartId: string, regionId: string) {
  return storefront.flows.checkout.useCompleteCheckout({
    cartId,
    regionId,
  })
}
```

If another storefront needs the same backend-facing rule, move that rule into `libs/storefront-data` so the next bugfix lands once.

## Common Mistakes

### HIGH Wrappers with no added behavior

Wrong:

```ts
export const useProducts = (params: ProductParams) =>
  storefront.hooks.products.useProducts(params)
```

Correct:

```ts
export const useProducts = storefront.hooks.products.useProducts
```

A wrapper that adds no policy, translation, or side effect only obscures the preset surface.

Source: maintainer interview

### HIGH Customer-specific read models inside the shared package

Wrong:

```ts
// libs/storefront-data/src/customers/types.ts
export type N1ProfileCard = {
  loyaltyTier: string
}
```

Correct:

```ts
// apps/n1/src/lib/customer-models.ts
export type N1ProfileCard = {
  loyaltyTier: string
}
```

The shared package owns reusable backend-facing contracts. A storefront-local read model belongs to the storefront until reuse is proven.

Source: `libs/storefront-data/README.md`, maintainer interview

### HIGH Repeated backend behavior left inside one app

Wrong:

```ts
// apps/n1/src/lib/cart-hooks.ts
export function useSharedCartSemantics() {
  return useMutation({ mutationFn: customCartMutation })
}
```

Correct:

```ts
// libs/storefront-data/src/... shared seam consumed from the preset
export const storefront = createMedusaStorefrontPreset({ sdk })
```

If checkout, cart, or product backend behavior is shared by most storefronts, it belongs in the library so bugfixes propagate once.

Source: maintainer interview, `libs/storefront-data/zmeny.md`

### HIGH UI dependencies leaked into shared platform code

Wrong:

```ts
createMedusaStorefrontPreset({
  sdk,
  auth: {
    hooks: {
      onSuccess: () => toast.success("Logged in"),
    },
  },
})
```

Correct:

```ts
function useLoginWithToast() {
  return storefront.hooks.auth.useLogin({
    onSuccess: () => toast.success("Logged in"),
  })
}
```

Storefront-specific UI dependencies belong in the app layer, even when the backend flow itself stays shared.

Source: `libs/storefront-data/src/auth/hooks.ts`, maintainer interview

See also: `extend-storefront-data-for-new-backend-use-cases` when the behavior is no longer truly storefront-specific.
