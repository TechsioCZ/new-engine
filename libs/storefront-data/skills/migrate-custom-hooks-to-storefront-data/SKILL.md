---
name: migrate-custom-hooks-to-storefront-data
description: >
  Load this skill when replacing app-local Medusa hooks, query utilities, or
  service wrappers with the preset-first @techsio/storefront-data surface. Use
  it for migration cutovers, preserving storefront-specific callbacks, and
  removing dual source-of-truth behavior instead of running legacy and shared
  data layers in parallel.
type: lifecycle
library: "@techsio/storefront-data"
library_version: "0.1.0"
requires:
  - setup-storefront-platform-in-next-app
sources:
  - "NMIT-WR/new-engine:libs/storefront-data/README.md"
  - "NMIT-WR/new-engine:libs/storefront-data/zmeny.md"
  - "NMIT-WR/new-engine:apps/frontend-demo/README.md"
  - "NMIT-WR/new-engine:apps/n1/AGENTS.md"
---

This skill builds on `setup-storefront-platform-in-next-app`. Use it once the new preset seam exists in the app.

# Migrate custom hooks to storefront-data

## Setup

Start by centralizing the new preset seam before replacing feature code.

```ts
// src/lib/storefront.ts
import { createMedusaSdk } from "@techsio/storefront-data/shared/medusa-client"
import { createLocalStorageValueStore } from "@techsio/storefront-data/shared/browser-storage"
import { createMedusaStorefrontPreset } from "@techsio/storefront-data/medusa/preset"

const sdk = createMedusaSdk({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
})

export const storefront = createMedusaStorefrontPreset({
  sdk,
  queryKeyNamespace: "n1",
  cart: {
    hooks: {
      cartStorage: createLocalStorageValueStore({ key: "n1-cart-id" }),
    },
  },
})
```

## Core Patterns

### Replace one vertical feature block at a time

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function ProductList({ regionId }: { regionId: string }) {
  const query = storefront.hooks.products.useProducts({
    region_id: regionId,
    limit: 24,
  })

  if (query.isLoading) return <div>Loading...</div>

  return <div>{query.products.length}</div>
}
```

The goal is a clean cutover for one screen or feature block, followed by deletion of the old implementation for that block.

### Keep storefront-specific UX by wrapping the shared hook, not forking it

```ts
// src/lib/auth-hooks.ts
import { storefront } from "@/src/lib/storefront"

const track = (event: string) => {
  console.log(event)
}

export function useLoginWithAnalytics() {
  return storefront.hooks.auth.useLogin({
    onSuccess: () => {
      track("login_success")
    },
  })
}
```

### Delete the legacy query helpers after the cutover

```ts
// before
export const productQueryKey = (params: ProductParams) => ["n1-products", params]

// after
export const productQueryKey = storefront.queryKeys.products.list
```

If the screen already reads and writes through the preset, keeping the old query helper around only invites drift back into the app.

## Common Mistakes

### CRITICAL Old and new data layers on the same screen

Wrong:

```ts
const legacy = useLegacyProducts(params)
const shared = storefront.hooks.products.useProducts(params)
```

Correct:

```ts
const products = storefront.hooks.products.useProducts(params)
```

Parallel legacy and shared reads create duplicate requests, conflicting query keys, and no single source of truth.

Source: maintainer interview, `libs/storefront-data/zmeny.md`

### HIGH Feature migration before preset centralization

Wrong:

```ts
export const useN1Products = () => storefront.hooks.products.useProducts({})
export const useN1Cart = () => storefront.hooks.cart.useCart({})
```

Correct:

```ts
export const storefront = createMedusaStorefrontPreset({
  sdk,
  queryKeyNamespace: "n1",
})
```

If the preset seam is not centralized first, query keys, storage, field defaults, and adapters stay scattered across the app.

Source: `libs/storefront-data/README.md`, maintainer interview

### HIGH Losing storefront-specific callbacks during replacement

Wrong:

```ts
export const useLogin = storefront.hooks.auth.useLogin
```

Correct:

```ts
export function useLogin() {
  return storefront.hooks.auth.useLogin({
    onSuccess: () => {
      toast.success("Logged in")
      track("login_success")
    },
  })
}
```

Legacy wrappers often exist only because they carry storefront-specific analytics, debug hooks, or UX side effects.

Source: maintainer interview

### MEDIUM Keeping proven common logic app-local

Wrong:

```ts
export const useCustomOrders = () =>
  useQuery({ queryKey: ["n1-orders"], queryFn: loadOrders })
```

Correct:

```ts
const orders = storefront.hooks.orders.useOrders({ limit: 20 })
```

Once a second storefront needs the same backend behavior, leaving it local recreates the duplication problem the migration is trying to remove.

Source: maintainer interview

See also: `decide-app-specific-overrides-vs-shared-platform` for promotion rules.
