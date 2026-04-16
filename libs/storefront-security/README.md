# storefront-security

Shared Next.js storefront security config for this monorepo.

The library is intentionally narrow:
- it provides a reusable storefront security baseline
- it exposes a preset-based API with overrides
- it does not hardcode app-specific integrations like analytics or checkout vendors

## What it solves

It centralizes the common parts of storefront hardening:
- response security headers
- CSP generation
- production-only HSTS
- public backend URL validation
- dev HMR websocket origins

The goal is that a new storefront can start from a safe shared preset and only
declare what is unique to that project.

## Recommended API

Use `createStorefrontSecurityConfig()` with:
- `preset` for the shared baseline
- `extend` for additive changes
- `replace` for full overrides

```ts
import { createStorefrontSecurityConfig } from "../../libs/storefront-security/index.mjs"

const storefrontSecurity = createStorefrontSecurityConfig({
  preset: "medusaStorefront",
})

const nextConfig = {
  ...storefrontSecurity,
  reactStrictMode: true,
}

export default nextConfig
```

## Available preset

### `medusaStorefront`

Use this for the standard Medusa + Next storefront case.

It includes:
- baseline response headers
- CSP skeleton
- validated public backend origin in `connect-src`
- dev HMR websocket origins
- common storefront defaults for images, fonts, workers, and manifests

It does **not** include:
- analytics hosts
- checkout widget hosts
- marketplace/integration-specific allowlists

Those must be added per app.

## Extend vs replace

### `extend`

Use `extend` when you want to add more sources or headers without throwing away
the shared baseline.

```ts
const storefrontSecurity = createStorefrontSecurityConfig({
  preset: "medusaStorefront",
  extend: {
    csp: {
      scriptSrc: ["https://www.googletagmanager.com"],
      connectSrc: ["https://www.google-analytics.com"],
      frameSrc: ["https://www.ppl.cz"],
      styleSrc: ["https://www.ppl.cz"],
    },
    headers: [
      { key: "Cache-Control", value: "public, max-age=60" },
    ],
  },
})
```

`extend.permissionsPolicy` adds directives on top of the preset baseline.

### `replace`

Use `replace` when a project needs to take ownership of a full directive,
policy, or header value.

```ts
const storefrontSecurity = createStorefrontSecurityConfig({
  preset: "medusaStorefront",
  replace: {
    permissionsPolicy: [
      "camera=()",
      "microphone=()",
      "geolocation=(self)",
    ],
    csp: {
      frameSrc: ["'self'"],
    },
    headers: [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
    ],
  },
})
```

`replace.permissionsPolicy` replaces the entire policy list.

## Common options

### `allowedDevOrigins`

Adds custom dev websocket origins for HMR.

```ts
createStorefrontSecurityConfig({
  preset: "medusaStorefront",
  allowedDevOrigins: ["shop.localhost"],
})
```

### `publicBackendUrl`

Overrides the backend URL source used by the preset. If omitted, the library
reads `NEXT_PUBLIC_MEDUSA_BACKEND_URL`.

In production:
- missing URL throws
- invalid absolute URL throws

In development:
- it falls back to `http://localhost:9000`

### `source`

Overrides the Next header matcher. Defaults to `/:path*`.

## CSP behavior

The library generates a baseline CSP with:
- `default-src 'self'`
- `frame-ancestors 'none'`
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'self'`

And storefront defaults for:
- `script-src`
- `style-src`
- `img-src`
- `font-src`
- `connect-src`
- `frame-src`
- `worker-src`
- `manifest-src`

Notes:
- `unsafe-inline` is still present for the current App Router baseline
- `unsafe-eval` is added only in development
- `upgrade-insecure-requests` is added only in production

## Legacy compatibility

The library still supports the older transition options:
- `additionalScriptSrc`
- `additionalStyleSrc`
- `additionalConnectSrc`
- `additionalFrameSrc`
- `additionalImgSrc`
- `additionalFontSrc`
- `permissionsPolicyDirectives`

These are treated as additive extensions. New consumers should prefer
`preset + extend + replace`.

## Public exports

```ts
import {
  createStorefrontSecurityConfig,
  resolvePublicBackendUrl,
  resolvePublicBackendOrigin,
  buildStorefrontContentSecurityPolicy,
  buildDevHmrOrigins,
  storefrontSecurityPresets,
} from "../../libs/storefront-security/index.mjs"
```

## Suggested rollout

1. Start every new storefront with `preset: "medusaStorefront"`.
2. Add project-specific integrations through `extend.csp`.
3. Use `replace` only when a project must intentionally diverge.
4. Keep runtime SDK setup separate from this library.
