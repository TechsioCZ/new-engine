---
name: audit-storefront-before-release
description: >
  Load this skill before releasing a storefront that uses
  @techsio/storefront-data. Use it to audit SSR hydration, query-key identity,
  storage degradation, cart cache sync, and selected payment-session checkout
  behavior so the storefront does not ship with a hidden split source of truth.
type: lifecycle
library: "@techsio/storefront-data"
library_version: "0.1.0"
requires:
  - implement-ssr-prefetch-and-query-client-boundaries
  - implement-cart-and-checkout-platform-flows
  - configure-pagination-prefetch-and-cache-policy
sources:
  - "NMIT-WR/new-engine:libs/storefront-data/README.md"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/ssr-hydration.smoke.test.tsx"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/shared.browser-storage.test.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/cart.cache-sync.test.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/medusa.flow.test.tsx"
---

This skill builds on the SSR, cart/checkout, and cache-policy skills. Use it when the app is already wired and you want a release-time audit.

# Audit storefront before release

Run through each section before shipping.

## SSR and hydration checks

### Check: server prefetch reuses the client cache after hydration

Expected:

```tsx
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import { storefront } from "@/src/lib/storefront"

const queryClient = getServerQueryClient()
await queryClient.prefetchQuery(
  storefront.hooks.products.getListQueryOptions({
    region_id: "reg_123",
    country_code: "cz",
    limit: 24,
  })
)
```

Fail condition: the hydrated client immediately refetches the same data because the server and client query inputs differ.
Fix: reuse the exact hook-owned query options and pass the same region-sensitive inputs on both sides.

### Check: no client bundle imports `server/get-query-client`

Expected:

```tsx
"use client"

import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
```

Fail condition: a client component imports `@techsio/storefront-data/server/get-query-client`.
Fix: keep server query-client work in Server Components and the provider in client code.

## Cache and storage checks

### Check: the storefront is not writing active-cart state with app-local query keys

Expected:

```ts
import { syncCartCaches } from "@techsio/storefront-data/shared/cart-cache-sync"
import { storefront } from "@/src/lib/storefront"

syncCartCaches(queryClient, storefront.queryKeys.cart, cart)
```

Fail condition: app code calls `setQueryData` or `invalidateQueries` with hand-written cart keys.
Fix: reuse the shared cart-cache sync helpers and preset query keys.

### Check: cart persistence still behaves when storage is unavailable

Expected:

```ts
import { createLocalStorageValueStore } from "@techsio/storefront-data/shared/browser-storage"

const cartStorage = createLocalStorageValueStore({
  key: "shop-cart-id",
})
```

Fail condition: the app assumes `localStorage` is always available or crashes when storage access fails.
Fix: keep the shared storage seam and test the screen with storage disabled or unavailable.

## Checkout checks

### Check: selected payment-session behavior is exercised

Expected:

```ts
const completeCheckout = storefront.flows.checkout.useCompleteCheckout({
  cartId,
  regionId,
})
```

Fail condition: only the happy path is tested where the first payment session already matches the desired provider.
Fix: exercise selected-session reuse, missing-session cases, and stage-specific checkout errors.

### Check: the flow layer owns checkout completion

Expected:

```ts
const completeCheckout = storefront.flows.checkout.useCompleteCheckout({
  cartId,
  regionId,
})

await completeCheckout.mutateAsync()
```

Fail condition: the app completes checkout through direct SDK calls or custom mutations.
Fix: route checkout completion back through the shared flow wrappers.

## Common Mistakes

### CRITICAL Browser-only happy-path verification

Wrong:

```txt
Only test the screen after `pnpm dev` with client-side navigation.
```

Correct:

```txt
Test an SSR-prefetched route and confirm the hydrated client reuses the prefetched cache.
```

A storefront can look correct in client-only testing while still breaking in App Router SSR or hydration.

Source: `libs/storefront-data/tests/ssr-hydration.smoke.test.tsx`

### HIGH Skipping selected-payment-session edge cases

Wrong:

```txt
Only test one checkout path where the first payment session already matches the final provider.
```

Correct:

```txt
Test selected-session reuse, missing-session cases, and staged checkout errors.
```

The hard checkout failures live in selected-session and stage-specific behavior, not only in the happy path.

Source: `libs/storefront-data/tests/medusa.flow.test.tsx`

### HIGH Ignoring storage degradation and cross-tab behavior

Wrong:

```txt
Assume localStorage always exists and one tab is enough to validate cart persistence.
```

Correct:

```txt
Check cart persistence when storage is unavailable and when another tab mutates the same key.
```

Shared browser storage is part of the platform contract. Release review has to include degraded storage and cross-tab synchronization paths.

Source: `libs/storefront-data/src/shared/browser-storage.ts`, `libs/storefront-data/tests/shared.browser-storage.test.ts`

## Pre-Deploy Summary

- [ ] Server-prefetched routes hydrate without key drift
- [ ] No client code imports `server/get-query-client`
- [ ] Cart cache sync uses shared helpers and preset query keys
- [ ] Storage degradation and cross-tab cart behavior were checked
- [ ] Checkout completion goes through the shared flow layer
- [ ] Selected payment-session and staged error cases were exercised
