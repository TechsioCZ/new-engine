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

Use the preset from thin app wrappers:

```ts
const summary = adminData.hooks.actionRequired.useActionRequiredSummary()
```

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

There is no supported package-root import.
