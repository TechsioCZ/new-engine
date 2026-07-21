# Storefront I18n Library (`@techsio/storefront-i18n`)

Shared market resolution and remote storefront-message integration for frontend applications.

## Boundaries

- Keep market definitions, domains, metadata, and translation keys in each application.
- Keep translation storage and administration in the application's backend.
- Keep this package framework-light: core modules must not import React, Next.js, Medusa, or app code.
- Use `next-intl` directly in components. Do not add custom translation hooks or providers here.
- Expose explicit package subpaths only; do not add a package-root barrel export.

## Commands

- `pnpm -C libs/storefront-i18n build`
- `pnpm -C libs/storefront-i18n test`
- `pnpm -C libs/storefront-i18n typecheck`
