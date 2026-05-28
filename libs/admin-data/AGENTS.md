# Admin Data Library (`@techsio/admin-data`)

This package is the shared backend-facing data layer for custom admin apps.

## Scope

- Own Admin API clients, query keys, query options, React Query hooks, services, mutation helpers, invalidation helpers, pagination helpers, error normalization, and reusable pure business rules.
- Do not add UI components, router state, labels, confirmation UX, toasts, app shell state, or page layout.
- Do not depend on `@techsio/storefront-data` at runtime. Storefront data is an architectural reference, not an admin dependency.
- Do not add backend endpoints to make this package easier to write. Document backend gaps first.

## Public Surface

- Use explicit subpath imports only, for example `@techsio/admin-data/action-required/hooks`.
- The package root export is intentionally disabled.
- Query services must accept `AbortSignal` for reads.
- Auth is injected through client config such as `getToken`; never import app-local auth singletons.
- Query keys must be exported through factories and reused for invalidation.

## First Domain

`action-required` is the initial contract domain. It owns:

- order action-required scanning rules,
- pending B2B customer scanning rules,
- Admin API service reads,
- summary query options and hooks.

`apps/admin` migrations should happen in follow-up changes after this package foundation is tested.

## Source of truth
`~/.local/share/medusa-js/`

## Commands

```bash
pnpm -C libs/admin-data build
pnpm -C libs/admin-data test
pnpm -C libs/admin-data lint
```
