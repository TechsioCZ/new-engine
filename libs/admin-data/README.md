# Admin Data (`@techsio/admin-data`)

Shared TanStack Query data layer for New Engine admin surfaces.

The package is intentionally backend-facing:

- query keys and cache policy live here,
- Admin API services live here,
- reusable business inclusion rules live here,
- admin apps keep UI, route state, confirmations, toasts, and labels.

## Install

```json
{
  "dependencies": {
    "@techsio/admin-data": "workspace:*"
  }
}
```

## Preset

```ts
import { createMedusaAdminDataPreset } from "@techsio/admin-data/medusa/preset"

export const adminData = createMedusaAdminDataPreset({
  baseUrl: import.meta.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  getToken: () => localStorage.getItem("admin-token"),
  queryKeyNamespace: "new-admin",
})
```

When an app already has a Medusa SDK instance, pass it only as the token source
and keep `baseUrl` explicit:

```ts
export const adminData = createMedusaAdminDataPreset({
  baseUrl: import.meta.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  queryKeyNamespace: "new-admin",
  sdk,
})
```

The preset intentionally does not use `sdk.client.fetch` for custom Admin API
endpoints. Medusa SDK drops structured non-2xx response payloads before this
package can read them, while admin-data mutation flows may need payloads such as
`blocked_orders`. This is still an authenticated admin-data client path: the
SDK supplies the token, and admin-data attaches it to the raw request.

Use the preset from thin app wrappers:

```ts
const actionRequired = adminData.hooks.actionRequired.useActionRequiredSummary()
const orderCount = actionRequired.summary?.orders?.count ?? 0
const customerCount = actionRequired.summary?.customers?.count ?? 0
```

`ActionRequiredSummary.orders` and `ActionRequiredSummary.customers` can be
`null`. Summary reads preserve the fulfilled side when the other side has a
non-auth failure, so app badges should use optional chaining.

## Stable Public Subpaths

- `@techsio/admin-data/medusa/preset`
- `@techsio/admin-data/shared/admin-client`
- `@techsio/admin-data/shared/cache-config`
- `@techsio/admin-data/shared/error-utils`
- `@techsio/admin-data/shared/hook-types`
- `@techsio/admin-data/shared/query-keys`
- `@techsio/admin-data/action-required/hooks`
- `@techsio/admin-data/action-required/medusa-service`
- `@techsio/admin-data/action-required/query-keys`
- `@techsio/admin-data/action-required/query-options`
- `@techsio/admin-data/action-required/rules`
- `@techsio/admin-data/action-required/types`
- `@techsio/admin-data/order-expedition/hooks`
- `@techsio/admin-data/order-expedition/invalidation`
- `@techsio/admin-data/order-expedition/medusa-service`
- `@techsio/admin-data/order-expedition/mutations`
- `@techsio/admin-data/order-expedition/query-keys`
- `@techsio/admin-data/order-expedition/query-options`
- `@techsio/admin-data/order-expedition/types`

There is no supported package-root import.
