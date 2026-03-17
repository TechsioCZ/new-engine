---
name: setup-storefront-platform-in-next-app
description: >
  Load this skill when wiring @techsio/storefront-data into a Next.js App
  Router storefront through createMedusaStorefrontPreset,
  StorefrontDataProvider, createMedusaSdk, createLocalStorageValueStore, and
  explicit subpath imports. Use it for the app-level composition module,
  provider placement, browser storage seams, and avoiding package-root or
  ad-hoc preset wiring.
type: framework
library: "@techsio/storefront-data"
framework: react
library_version: "0.1.0"
requires: []
sources:
  - "NMIT-WR/new-engine:libs/storefront-data/README.md"
  - "NMIT-WR/new-engine:libs/storefront-data/AGENTS.md"
  - "NMIT-WR/new-engine:libs/storefront-data/package.json"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/medusa-client.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/browser-storage.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/shared/query-client.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/client/provider.tsx"
  - "NMIT-WR/new-engine:libs/storefront-data/src/medusa/preset.ts"
---

# Setup storefront platform in Next app

## Setup

Use one thin storefront composition module, one app-level provider boundary, and explicit file-level imports.

```js
// next.config.mjs
const nextConfig = {
  transpilePackages: ["@techsio/storefront-data"],
}

export default nextConfig
```

```ts
// src/lib/storefront.ts
import { createMedusaSdk } from "@techsio/storefront-data/shared/medusa-client"
import { createLocalStorageValueStore } from "@techsio/storefront-data/shared/browser-storage"
import { createMedusaStorefrontPreset } from "@techsio/storefront-data/medusa/preset"

const sdk = createMedusaSdk({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
})

const cartStorage = createLocalStorageValueStore({
  key: "shop-cart-id",
})

export const storefront = createMedusaStorefrontPreset({
  sdk,
  queryKeyNamespace: "shop",
  cart: {
    hooks: {
      cartStorage,
    },
  },
})
```

```tsx
// app/providers.tsx
"use client"

import type { PropsWithChildren } from "react"
import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"

export function Providers({ children }: PropsWithChildren) {
  return <StorefrontDataProvider>{children}</StorefrontDataProvider>
}
```

## Hooks and Components

### Expose only the preset surface the app actually needs

```ts
// src/lib/storefront-surface.ts
import { storefront } from "@/src/lib/storefront"

export const { auth, cart, catalog, checkout, collections, products, regions } =
  storefront.hooks

export const { cart: cartFlow, checkout: checkoutFlow } = storefront.flows
```

Keep this layer thin. SDK config, local field defaults, address adapters, and storefront-specific policy belong here. Query keys, services, hooks, and flows stay owned by the preset.

### Pass a stable browser QueryClient only when the app really needs overrides

```tsx
// app/providers.tsx
"use client"

import type { PropsWithChildren } from "react"
import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
import { getQueryClient } from "@techsio/storefront-data/shared/query-client"

const client = getQueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: PropsWithChildren) {
  return <StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
}
```

If the app does not need browser-client overrides, keep the provider as `<StorefrontDataProvider>{children}</StorefrontDataProvider>`.

## Common Mistakes

### CRITICAL Package-root imports

Wrong:

```ts
import { StorefrontDataProvider } from "@techsio/storefront-data"
```

Correct:

```ts
import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
import { createMedusaStorefrontPreset } from "@techsio/storefront-data/medusa/preset"
```

The root export is intentionally disabled. Treat explicit subpaths as the supported public surface.

Source: `libs/storefront-data/package.json`, `libs/storefront-data/README.md`

### HIGH Ad-hoc hook assembly instead of a preset

Wrong:

```ts
const products = createProductHooks({ service, queryKeyNamespace: "shop" })
const cart = createCartHooks({ service, queryKeyNamespace: "shop" })
```

Correct:

```ts
const storefront = createMedusaStorefrontPreset({
  sdk,
  queryKeyNamespace: "shop",
})
```

The current architecture expects one preset to own hooks, services, query keys, cache semantics, and flow wrappers for a storefront.

Source: `libs/storefront-data/README.md`, `libs/storefront-data/src/medusa/preset.ts`

### CRITICAL Server helpers inside client code

Wrong:

```tsx
"use client"

import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
```

Correct:

```tsx
"use client"

import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
```

`server/get-query-client` guards against client usage because its request-scoped behavior only makes sense on the server.

Source: `libs/storefront-data/src/server/get-query-client.ts`

### HIGH Late provider config changes rebuild the browser client

Wrong:

```tsx
<StorefrontDataProvider clientConfig={{ defaultOptions: { queries: { staleTime: 0 } } }}>
  {children}
</StorefrontDataProvider>
```

Correct:

```tsx
const client = getQueryClient({
  defaultOptions: { queries: { staleTime: 0 } },
})

<StorefrontDataProvider client={client}>{children}</StorefrontDataProvider>
```

The internal browser QueryClient is a singleton. Only the first internal initialization sees `clientConfig`.

Source: `libs/storefront-data/src/client/provider.tsx`, `libs/storefront-data/src/shared/query-client.ts`

See also: `implement-ssr-prefetch-and-query-client-boundaries` for server-side hydration and query-client ownership.
