---
name: extend-storefront-data-for-new-backend-use-cases
description: >
  Load this skill when adding a new shared backend-facing capability to
  @techsio/storefront-data through preset wiring, normalized query keys,
  service-layer cancellation, and test-backed invariants. Use it when app code
  has proven a backend concern is no longer customer-specific and should become
  part of the shared storefront platform.
type: core
library: "@techsio/storefront-data"
library_version: "0.1.0"
requires:
  - decide-app-specific-overrides-vs-shared-platform
sources:
  - "NMIT-WR/new-engine:libs/storefront-data/AGENTS.md"
  - "NMIT-WR/new-engine:libs/storefront-data/src/medusa/preset.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/query-keys.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/orders/medusa-service.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/medusa.preset.test.tsx"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/medusa.flow.test.tsx"
---

This skill builds on `decide-app-specific-overrides-vs-shared-platform`. Use it only after deciding the behavior should become shared.

# Extend storefront-data for new backend use cases

## Setup

Treat new shared behavior as a coordinated change across types, query keys, service wiring, preset composition, and tests.

```ts
// src/inventory/query-keys.ts
import { createQueryKey, type QueryNamespace } from "../shared/query-keys"

export const createInventoryQueryKeys = (namespace: QueryNamespace) => ({
  all: () => createQueryKey(namespace, "inventory"),
  list: (input: { sku?: string }) => createQueryKey(namespace, "inventory", "list", input),
})
```

```ts
// src/inventory/medusa-service.ts
import type { MedusaSdk } from "../shared/medusa-client"

export function createMedusaInventoryService(sdk: MedusaSdk) {
  return {
    async getInventory(input: { sku?: string }, signal?: AbortSignal) {
      return sdk.client.fetch({
        method: "GET",
        path: "/store/inventory",
        query: input,
        signal,
      })
    },
  }
}
```

## Core Patterns

### Wire new shared behavior through the preset

```ts
// src/medusa/preset.ts
const services = {
  ...existingServices,
  inventory: config.inventory?.service ?? createMedusaInventoryService(config.sdk),
}
```

The preset is the canonical composition root. If the new domain never reaches the preset, it does not reach the intended integration path.

### Reuse normalized query-key helpers

```ts
// src/inventory/hooks.ts
const queryKeys =
  config.queryKeys ?? createInventoryQueryKeys(config.queryKeyNamespace ?? "storefront-data")
```

Treat `createQueryKey()` and the existing key factories as mandatory infrastructure, not optional style.

### Pin the new invariant with tests in `libs/storefront-data/tests`

```ts
// tests/inventory.smoke.test.ts
import { describe, expect, it } from "vitest"

describe("inventory preset wiring", () => {
  it("exposes the inventory surface from the preset", () => {
    expect(true).toBe(true)
  })
})
```

Use the test file as the place where the new shared contract becomes explicit.

## Common Mistakes

### HIGH New domain outside the preset

Wrong:

```ts
export const useInventory = createInventoryHooks({
  service,
  queryKeyNamespace: "shop",
})
```

Correct:

```ts
export const storefront = createMedusaStorefrontPreset({
  sdk,
  inventory: {
    service,
  },
})
```

The preset is the main composition root. A new capability that lives outside it immediately diverges from the intended integration path.

Source: `libs/storefront-data/src/medusa/preset.ts`, `libs/storefront-data/zmeny.md`

### CRITICAL Hardcoded query keys

Wrong:

```ts
const queryKey = ["storefront", "inventory", params]
```

Correct:

```ts
const queryKey = createQueryKey(namespace, "inventory", "list", params)
```

Shared domains must participate in normalized key generation or they drift from invalidation and cache-matching behavior everywhere else.

Source: `libs/storefront-data/src/shared/query-keys.ts`, `libs/storefront-data/AGENTS.md`

### HIGH `AbortSignal` accepted but ignored

Wrong:

```ts
async function getInventory(params: InventoryInput, signal?: AbortSignal) {
  return sdk.store.product.list(params)
}
```

Correct:

```ts
async function getInventory(params: InventoryInput, signal?: AbortSignal) {
  return sdk.client.fetch({
    method: "GET",
    path: "/store/inventory",
    query: params,
    signal,
  })
}
```

TanStack Query passes cancellation signals into query functions. Dropping them creates fake cancellation support.

Source: `libs/storefront-data/src/orders/medusa-service.ts`, TanStack Query query cancellation docs

### HIGH Shared behavior without shared tests

Wrong:

```ts
// add new flow logic with no regression coverage
```

Correct:

```ts
// add the new logic and pin the invariant in libs/storefront-data/tests/*
```

The library now treats tests as part of the consumer-facing contract. Missing regression coverage pushes risk back into each storefront.

Source: `libs/storefront-data/tests/medusa.preset.test.tsx`, `libs/storefront-data/tests/medusa.flow.test.tsx`

## References

- [Extension recipe](references/extension-recipe.md)
