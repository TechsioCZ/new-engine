# new-engine libraries

This repository holds the shared design system and the storefront utility
libraries. The applications that use them live in a separate repository.

| Library | Package | What it is |
| --- | --- | --- |
| [`libs/ui`](libs/ui/README.md) | `@techsio/ui-kit` | Design system: Zag.js + Tailwind components, tokens, Storybook |
| [`libs/storefront-data`](libs/storefront-data/README.md) | `@techsio/storefront-data` | TanStack Query data layer for Medusa storefronts |
| [`libs/storefront-i18n`](libs/storefront-i18n/README.md) | `@techsio/storefront-i18n` | Market resolution and backend-managed UI messages for storefronts |
| [`libs/analytics`](libs/analytics/README.md) | `@techsio/analytics` | Analytics adapters (Google, Meta, Heureka, Leadhub) |
| [`libs/storefront-security`](libs/storefront-security/README.md) | — | Next.js storefront security headers and CSP presets |

## Requirements

- Node from `.mise.toml` (`mise install`).
- pnpm at the version pinned by `packageManager` in `package.json`
  (for example `npm install -g pnpm@12.11.2`).
- Docker only for the UI component and visual tests
  (`docker/development/playwright/Dockerfile`).

## Common commands

```sh
pnpm install --frozen-lockfile

pnpm nx run-many -t lint test        # all libraries
pnpm lint:nx                         # Nx module boundaries
pnpm --dir libs/ui typecheck
pnpm --dir libs/ui storybook         # Storybook dev server
pnpm --dir libs/ui check:package     # build and validate the published output
```

`mise run dev:install` runs the same install inside the pinned pnpm toolchain
container.

## Releases

- `@techsio/ui-kit` is released by semantic-release from `master`
  (`.github/workflows/ui-release.yml`).
- `@techsio/storefront-data` and `@techsio/storefront-i18n` are released by
  pushing a `storefront-data-v*` or `storefront-i18n-v*` tag
  (`.github/workflows/storefront-packages-release.yml`).
- Storybook is deployed to Vercel (`vercel.json`).
