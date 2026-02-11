---
name: storefront-data-auth
description: Customer authentication integration for @techsio/storefront-data. Use when implementing auth state, login/register/logout mutations, customer profile updates, and auth-related cache invalidation with Medusa.
---

# Storefront Data Auth

Implement auth through the auth module to keep session and cache invalidation coherent.

## Workflow

1. Create service with `createMedusaAuthService(sdk)`.
2. Create hooks with `createAuthHooks` and shared namespace.
3. Optionally define `invalidateOnAuthChange` for custom cross-domain keys.
4. Use `useAuth` for session state and mutation hooks for auth actions.

## Example

```ts
import {
  createAuthHooks,
  createAuthQueryKeys,
  createMedusaAuthService,
} from "@techsio/storefront-data"
import { cacheConfig, sdk, STOREFRONT_NAMESPACE } from "@/lib/storefront-data/shared"

const authService = createMedusaAuthService(sdk)
const authQueryKeys = createAuthQueryKeys(STOREFRONT_NAMESPACE)

export const authHooks = createAuthHooks({
  service: authService,
  queryKeys: authQueryKeys,
  cacheConfig,
  invalidateOnAuthChange: {
    includeDefaults: true,
  },
})
```

## Returned Hooks

- `useAuth`, `useSuspenseAuth`
- `useLogin`, `useRegister`, `useLogout`
- `useCreateCustomer`, `useUpdateCustomer`, `useRefreshAuth`

## Rules

- Prefer `createMedusaAuthService` registration flow: register -> login -> customer create -> refresh.
- Keep `useAuth` query `retry: false` behavior for auth-state checks.
- On logout, assume auth cache is removed; refresh dependent modules after logout redirect.
- Use `userData` cache strategy for auth profile data.
