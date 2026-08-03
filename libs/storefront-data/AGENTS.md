# Storefront Data (`@techsio/storefront-data`)

TanStack Query + Medusa data layer. This file is canonical; `CLAUDE.md` is its symlink.

## Boundaries

- Export explicit package subpaths; the package root stays unavailable. Never import `dist` or add re-export-only barrels.
- Keep client, server, and shared modules separated. Mark client/server-only entry points explicitly.
- Prefer existing factories, query options, query keys, cache policies, SSR helpers, and Medusa adapters.
- Promote reusable Medusa communication/cache behavior here; keep app localization, UI, analytics, and app read models in apps.

## Correctness

- No `any`, double casts, `@ts-ignore`, or hard-coded query keys.
- SDK/network/storage data begins as `unknown`; validate/narrow before exposing typed domain values.
- Every list/read path has explicit page size/limit and cancellation. Mutations own precise cache updates/invalidation.
- Reuse `@techsio/std` before adding generic helpers.
- Add tests for cache synchronization, pagination boundaries, SSR ownership, error translation, and mutation semantics.

## Verification

```sh
pnpm exec ultracite check <changed-paths> # advisory
pnpm exec tsc --noEmit -p scripts/typescript/projects/libs/storefront-data/tsconfig.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/libs/storefront-data/tsconfig.json
pnpm exec tsc --noEmit -p scripts/typescript/projects/libs/storefront-data/tsconfig.type-tests.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/libs/storefront-data/tsconfig.type-tests.json
pnpm -C libs/storefront-data test
pnpm -C libs/storefront-data build
```
