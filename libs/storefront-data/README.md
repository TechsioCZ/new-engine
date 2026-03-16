# Storefront Data (`@techsio/storefront-data`)

Medusa-first storefront data layer built on TanStack Query.

The library is intentionally opinionated:
- use explicit file-level imports, not package-root barrels
- compose one preset per storefront
- keep Medusa quirks inside Medusa services and preset wiring
- keep app DTOs and read models in the app unless reused by a second storefront

## Recommended integration path

For Medusa storefronts, the primary entrypoint is `createMedusaStorefrontPreset`.

A preset owns:
- query keys
- services
- hooks
- flows
- shared cache semantics
- cart persistence wiring

That lets each storefront keep a thin local composition module for:
- SDK instance
- localized error mapping
- product field defaults
- address adapters
- customer-specific policy

## Install

```json
{
  "dependencies": {
    "@techsio/storefront-data": "workspace:*"
  }
}
```

If you use Next.js, transpile the package:

```js
const nextConfig = {
  transpilePackages: ["@techsio/storefront-data"],
}
```

## Client provider

```tsx
import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"

export function Providers({ children }) {
  return <StorefrontDataProvider>{children}</StorefrontDataProvider>
}
```

## Preset-first example

```ts
import { createLocalStorageCartStorage } from "@techsio/storefront-data/cart/browser-storage"
import { createMedusaStorefrontPreset } from "@techsio/storefront-data/medusa/preset"
import { sdk } from "@/lib/medusa-client"

const cartStorage = createLocalStorageCartStorage({
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

Use the preset from thin app wrappers or directly in app code:

```ts
const { products, cart, checkout } = storefront.hooks
const { cart: cartFlow, checkout: checkoutFlow } = storefront.flows
```

## Sane defaults vs custom adapters

The library exports shared address contracts from `shared/address` and a small opinionated default in `checkout/address`.

Use the default when your storefront shape is close to the built-in checkout address model:

```ts
import {
  createCheckoutCartAddressAdapter,
  createCheckoutCustomerAddressAdapter,
} from "@techsio/storefront-data/checkout/address"
```

If your storefront has its own form DTO, formatting, localization, or patch semantics, keep the adapter local to the app and implement the shared adapter contract instead.

## Query options

The stable public query-options surface is intentionally small.

Use domain hooks for most reads, and use query-option helpers when you need SSR, loader, or manual prefetch integration.

```ts
import { createOrderHooks } from "@techsio/storefront-data/orders/hooks"

const orderHooks = createOrderHooks({
  service,
  buildListParams: (input) => ({ ...input }),
})

const listQuery = orderHooks.getListQueryOptions({ limit: 20, offset: 0 })
const detailQuery = orderHooks.getDetailQueryOptions({ id: "order_1" })
```

```ts
import { createProductHooks } from "@techsio/storefront-data/products/hooks"

const productHooks = createProductHooks({
  service,
  buildListParams: (input) => ({ ...input }),
  buildDetailParams: (input) => ({ ...input }),
})

const listQuery = productHooks.getListQueryOptions({
  limit: 20,
  region_id: "reg_1",
})
```

## SSR example

```tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"

export default async function Page() {
  const queryClient = getServerQueryClient()
  await queryClient.prefetchQuery(productHooks.getListQueryOptions({ limit: 20 }))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsPage />
    </HydrationBoundary>
  )
}
```

## Stable public subpaths

Use explicit file-level imports. There is no supported package-root import.

Core subpaths:
- `@techsio/storefront-data/client/provider`
- `@techsio/storefront-data/server/get-query-client`
- `@techsio/storefront-data/shared/address`
- `@techsio/storefront-data/shared/cache-config`
- `@techsio/storefront-data/shared/medusa-client`
- `@techsio/storefront-data/shared/query-client`
- `@techsio/storefront-data/shared/query-keys`
- `@techsio/storefront-data/shared/region-context`
- `@techsio/storefront-data/medusa/preset`
- `@techsio/storefront-data/cart/browser-storage`

Domain subpaths:
- `@techsio/storefront-data/<domain>/hooks`
- `@techsio/storefront-data/<domain>/medusa-service`
- `@techsio/storefront-data/<domain>/query-keys`
- `@techsio/storefront-data/<domain>/types`

Supported domains:
- `auth`
- `cart`
- `catalog`
- `categories`
- `checkout`
- `collections`
- `customers`
- `orders`
- `products`
- `regions`

## Notes

- Prefetch helpers default to skipping only fresh cache entries (`skipMode: "fresh"`).
- Suspense queries are not cancellable through TanStack Query.
- Query keys normalize plain-object params and strip `enabled` from query-key inputs.
- The default checkout helpers are optional. The shared contract is the stable part.
- App-level read models such as category registries should stay in the app until reused by another storefront.

## Development

```bash
pnpm -C libs/storefront-data build
pnpm -C libs/storefront-data lint
pnpm -C libs/storefront-data test
```
