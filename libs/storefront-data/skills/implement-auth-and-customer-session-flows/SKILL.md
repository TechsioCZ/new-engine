---
name: implement-auth-and-customer-session-flows
description: >
  Load this skill when using @techsio/storefront-data for customer auth and
  session state through storefront.hooks.auth.useAuth, useLogin, useRegister,
  useLogout, and invalidateOnAuthChange. Use it for login/register flows,
  session-aware rendering, cross-domain invalidation, and app-level callbacks
  for toasts, analytics, or redirects.
type: core
library: "@techsio/storefront-data"
library_version: "0.1.0"
requires:
  - setup-storefront-platform-in-next-app
sources:
  - "NMIT-WR/new-engine:libs/storefront-data/src/auth/hooks.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/auth/medusa-service.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/auth/query-keys.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/src/medusa/preset.ts"
  - "NMIT-WR/new-engine:libs/storefront-data/tests/auth.medusa-service.test.ts"
---

## Setup

Let the preset own the auth service and invalidation. Keep UX side effects in the app.

```ts
// src/lib/storefront.ts
import { createMedusaSdk } from "@techsio/storefront-data/shared/medusa-client"
import { createMedusaStorefrontPreset } from "@techsio/storefront-data/medusa/preset"

const sdk = createMedusaSdk({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
})

export const storefront = createMedusaStorefrontPreset({
  sdk,
  queryKeyNamespace: "shop",
  auth: {
    hooks: {
      invalidateOnAuthChange: {
        includeDefaults: true,
      },
    },
  },
})
```

## Core Patterns

### Gate account UI through `useAuth`

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function AccountGate() {
  const auth = storefront.hooks.auth.useAuth()

  if (auth.isLoading) return <div>Loading...</div>
  if (!auth.isAuthenticated) return <div>Please sign in</div>

  return <div>{auth.customer?.email}</div>
}
```

### Keep UX side effects in app callbacks

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"
import { toast } from "sonner"

const track = (event: string) => {
  console.log(event)
}

export function LoginButton() {
  const login = storefront.hooks.auth.useLogin({
    onSuccess: () => {
      toast.success("Logged in")
    },
  })

  return (
    <button
      type="button"
      onClick={() => login.mutate({ email: "alice@example.com", password: "secret" })}
    >
      Log in
    </button>
  )
}
```

### Recover registration edge cases through the shared register hook

```tsx
"use client"

import { storefront } from "@/src/lib/storefront"

export function RegisterButton() {
  const register = storefront.hooks.auth.useRegister()

  return (
    <button
      type="button"
      onClick={() =>
        register.mutate({
          email: "alice@example.com",
          password: "secret",
          first_name: "Alice",
          last_name: "Example",
        })
      }
    >
      Register
    </button>
  )
}
```

The shared auth service already handles the Medusa-specific recovery and cleanup semantics. The app should only add storefront policy around it.

## Common Mistakes

### HIGH Rebuilding auth in the app

Wrong:

```ts
const register = async (input: RegisterInput) => {
  await sdk.auth.register("customer", "emailpass", input)
  await sdk.auth.login("customer", "emailpass", input)
}
```

Correct:

```ts
const register = storefront.hooks.auth.useRegister()
register.mutate(input)
```

Local auth re-implementation reintroduces the exact cleanup and invalidation bugs that the shared auth surface is meant to absorb.

Source: `libs/storefront-data/src/auth/medusa-service.ts`, `libs/storefront-data/src/auth/hooks.ts`

### CRITICAL Assuming multi-step auth is already supported

Wrong:

```ts
storefront.hooks.auth.useLogin().mutate({ provider: "google" })
```

Correct:

```ts
storefront.hooks.auth.useLogin().mutate({
  email: "alice@example.com",
  password: "secret",
})
```

The current Medusa auth adapter rejects multi-step flows. The obvious generic-provider shape is misleading here.

Source: `libs/storefront-data/src/auth/medusa-service.ts`, `libs/storefront-data/tests/auth.medusa-service.test.ts`

### HIGH Putting UX callbacks into shared auth code

Wrong:

```ts
const storefront = createMedusaStorefrontPreset({
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
const login = storefront.hooks.auth.useLogin({
  onSuccess: () => {
    toast.success("Logged in")
    track("login_success")
  },
})
```

Toasts, redirects, analytics, and debug behavior belong in the app layer, not inside the shared auth contract.

Source: `libs/storefront-data/src/auth/hooks.ts`, maintainer interview

### HIGH Forgetting cross-domain invalidation needs

Wrong:

```ts
const storefront = createMedusaStorefrontPreset({
  sdk,
  auth: { hooks: { invalidateOnAuthChange: { includeDefaults: false } } },
})
```

Correct:

```ts
const storefront = createMedusaStorefrontPreset({
  sdk,
  auth: {
    hooks: {
      invalidateOnAuthChange: {
        includeDefaults: true,
      },
    },
  },
})
```

Auth changes usually affect customer and order data. If you turn off default invalidation, do it intentionally and replace it with equivalent app-specific rules.

Source: `libs/storefront-data/src/medusa/preset.ts`, `libs/storefront-data/src/auth/hooks.ts`

See also: `decide-app-specific-overrides-vs-shared-platform` for thin wrapper rules.
