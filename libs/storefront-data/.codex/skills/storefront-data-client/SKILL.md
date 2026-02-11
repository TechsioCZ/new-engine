---
name: storefront-data-client
description: Client-side setup for @techsio/storefront-data. Use when adding StorefrontDataProvider, browser QueryClient lifecycle, or client hydration boundaries in a React/Next.js storefront app.
---

# Storefront Data Client

Implement the client provider once and reuse it in all routes.

## Workflow

1. Create `providers.tsx` client component in app.
2. Wrap tree with `StorefrontDataProvider`.
3. Optionally pass `clientConfig` only on first initialization.
4. Keep provider in client boundary (`"use client"`).

## Example

```tsx
"use client"

import type { ReactNode } from "react"
import { StorefrontDataProvider } from "@techsio/storefront-data/client"

export function Providers({ children }: { children: ReactNode }) {
  return <StorefrontDataProvider>{children}</StorefrontDataProvider>
}
```

## Advanced

Use custom query client config only when needed:

```tsx
<StorefrontDataProvider
  clientConfig={{
    defaultOptions: {
      queries: { retry: false },
    },
  }}
>
  {children}
</StorefrontDataProvider>
```

## Rules

- Do not create multiple browser singletons manually; prefer `StorefrontDataProvider`.
- Do not place `StorefrontDataProvider` in server component files.
- If you need isolated cache (tests/storybook), pass explicit `client` prop.
