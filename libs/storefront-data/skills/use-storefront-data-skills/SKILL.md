---
name: use-storefront-data-skills
description: >
  Load this skill first for any work involving @techsio/storefront-data skills,
  app integration, shared storefront hooks, product lists, cart, checkout,
  auth, SSR prefetch, cache policy, or deciding whether behavior belongs in an
  app or in the shared storefront-data platform. Use it as the orchestrator
  that selects the smallest relevant storefront-data skill set before editing.
type: orchestrator
library: "@techsio/storefront-data"
library_version: "0.1.0"
sources:
  - "TechsioCZ/new-engine:libs/storefront-data/README.md"
  - "TechsioCZ/new-engine:libs/storefront-data/AGENTS.md"
  - "TechsioCZ/new-engine:libs/storefront-data/src/medusa/preset.ts"
  - "TechsioCZ/new-engine:libs/storefront-data/src/product-lists/hooks.ts"
  - "TechsioCZ/new-engine:libs/storefront-data/src/product-lists/medusa-service.ts"
---

# Use storefront-data skills

Start here when a task touches `@techsio/storefront-data` or an app that
consumes it. Pick only the skills needed for the current work.

## Selection

| Task | Load |
| --- | --- |
| Wire `@techsio/storefront-data` into a Next storefront | `setup-storefront-platform-in-next-app` |
| Replace app-local Medusa hooks, services, or query keys | `migrate-custom-hooks-to-storefront-data` |
| Decide app wrapper vs shared platform ownership | `decide-app-specific-overrides-vs-shared-platform` |
| Add or extend a shared backend-facing capability | `extend-storefront-data-for-new-backend-use-cases` |
| Read products, catalog, categories, collections, or regions | `use-catalog-and-product-read-flows` |
| Implement product-list behavior in an app | `migrate-custom-hooks-to-storefront-data` + `decide-app-specific-overrides-vs-shared-platform` |
| Extend product-list shared service, hooks, query keys, or SSR reads | `extend-storefront-data-for-new-backend-use-cases` + `configure-pagination-prefetch-and-cache-policy` |
| Work on cart, active-cart state, checkout, or payment flow | `implement-cart-and-checkout-platform-flows` |
| Work on login, register, session, logout, or auth invalidation | `implement-auth-and-customer-session-flows` |
| Add SSR prefetch, hydration, loaders, or query options | `implement-ssr-prefetch-and-query-client-boundaries` |
| Tune cache, prefetch, skip modes, or pagination | `configure-pagination-prefetch-and-cache-policy` |
| Review before release | `audit-storefront-before-release` |

## Operating rules

- Prefer the preset surface: `storefront.hooks.*`, `storefront.flows.*`,
  `storefront.queries.*`, and preset-owned `queryKeys`.
- Keep app code thin: UI, localized text, toasts, analytics, app DTOs,
  customer-specific mapping, and adapters can stay local.
- Move repeated backend communication, query keys, cache sync, SSR query
  options, and mutation invalidation into `libs/storefront-data`.
- Do not keep old and new data layers active for the same screen. Finish one
  vertical migration before starting another.
- Use explicit subpath imports. Do not add package-root imports or barrel
  re-exports.

## Product-list notes

Product lists are a shared platform domain in this package:

- service: `src/product-lists/medusa-service.ts`
- hooks: `src/product-lists/hooks.ts`
- query keys: `src/product-lists/query-keys.ts`
- query options and SSR read support: `src/product-lists/query-options.ts`
- utilities: `src/product-lists/utils.ts`
- preset wiring: `src/medusa/preset.ts` and `src/medusa/server-read.ts`

Apps should normally consume product lists through
`storefront.hooks.productLists` and keep only storefront-specific wrappers for
labels, errors, UI behavior, and analytics.

## Validation

After editing skills, run:

```bash
npx @tanstack/intent@latest validate libs/storefront-data/skills
npx @tanstack/intent@latest stale libs/storefront-data/skills
```

If skills must be published with `@techsio/storefront-data`, ensure
`libs/storefront-data/package.json` includes the `tanstack-intent` keyword,
ships the `skills` directory, and pins `@tanstack/intent` for validation.
