# @techsio/storefront-data - Skill Spec

`@techsio/storefront-data` je preset-first storefront platform core pro Next.js App Router aplikace nad TanStack Query a Medusa.js. Aktuální shape knihovny centralizuje query keys, services, hooks, flows, browser/storage primitivy a checkout/cart semantiku do jednoho composition rootu přes `createMedusaStorefrontPreset`.

Balíček nemá `homepage` ani samostatný `docs/` strom. Skill map je proto postavený z README, AGENTS, aktuálního source, testů, lokálních poznámek v [zmeny.md](D:/025/projects/new-engine/libs/storefront-data/zmeny.md) a maintainer interview.

## Domains

| Domain | Description | Skills |
| ------ | ----------- | ------ |
| Integrate the storefront platform into Next apps | Preset composition, provider boundary, SSR query-client ownership, and explicit subpath imports for Next App Router. | `setup-storefront-platform-in-next-app`, `implement-ssr-prefetch-and-query-client-boundaries` |
| Read and prefetch storefront data safely | Shared read flows, region-aware inputs, pagination, prefetch heuristics, and normalized query keys. | `use-catalog-and-product-read-flows`, `configure-pagination-prefetch-and-cache-policy` |
| Manage customer identity and session state | Shared auth, customer session, and app-level UX callbacks around those flows. | `implement-auth-and-customer-session-flows` |
| Run cart and checkout platform flows | Shared cart cache sync, effective cart state, selected payment session semantics, and canonical flow wrappers. | `implement-cart-and-checkout-platform-flows` |
| Evolve shared platform boundaries across storefronts | Migration, override boundaries, and promotion of repeated backend logic into the shared package. | `migrate-custom-hooks-to-storefront-data`, `decide-app-specific-overrides-vs-shared-platform`, `extend-storefront-data-for-new-backend-use-cases` |
| Audit storefront readiness | Release-time verification of SSR, cache, storage, and checkout invariants. | `audit-storefront-before-release` |

## Skill Inventory

| Skill | Type | Domain | What it covers | Failure modes |
| ------ | ------ | ------ | -------------- | ------------- |
| `setup-storefront-platform-in-next-app` | framework | integrate-storefront-platform-into-next-app | preset composition, provider boundary, browser storage seam, explicit subpaths | 4 |
| `implement-ssr-prefetch-and-query-client-boundaries` | framework | integrate-storefront-platform-into-next-app | `getServerQueryClient`, hydration, SSR memoization, manual prefetch integration | 3 |
| `use-catalog-and-product-read-flows` | core | read-and-prefetch-storefront-data-safely | product/catalog/category/collection/region read flows | 3 |
| `implement-auth-and-customer-session-flows` | core | manage-customer-identity-and-session-state | auth hooks, Medusa auth service, session invalidation, UX callbacks | 3 |
| `implement-cart-and-checkout-platform-flows` | core | run-cart-and-checkout-platform-flows | cart hooks, checkout hooks, flow wrappers, selected-session semantics, cart cache sync | 4 |
| `configure-pagination-prefetch-and-cache-policy` | core | read-and-prefetch-storefront-data-safely | skip modes, page planning, query-key normalization, cache strategy rules | 4 |
| `migrate-custom-hooks-to-storefront-data` | lifecycle | evolve-shared-platform-boundaries-across-storefronts | migration sequencing, legacy cutover, preserving app-specific side effects | 4 |
| `decide-app-specific-overrides-vs-shared-platform` | composition | evolve-shared-platform-boundaries-across-storefronts | thin wrappers, customer-specific DTO boundaries, promotion heuristics | 3 |
| `extend-storefront-data-for-new-backend-use-cases` | core | evolve-shared-platform-boundaries-across-storefronts | new shared domain wiring, normalized query keys, service cancellation, tests | 4 |
| `audit-storefront-before-release` | lifecycle | audit-storefront-readiness | SSR smoke review, storage degradation, checkout edge-case audit | 3 |

## Failure Mode Inventory

### `setup-storefront-platform-in-next-app` (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Use package-root imports | CRITICAL | `package.json`, README | - |
| 2 | Assemble hooks ad hoc instead of composing a preset | HIGH | README, `src/medusa/preset.ts`, `zmeny.md` | - |
| 3 | Import server query helpers into client code | CRITICAL | `src/server/get-query-client.ts` | - |
| 4 | Expect later provider `clientConfig` changes to rebuild the browser client | HIGH | `src/client/provider.tsx`, `src/shared/query-client.ts` | - |

### `implement-ssr-prefetch-and-query-client-boundaries` (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Create raw server QueryClients | HIGH | AGENTS, `src/server/get-query-client.ts` | - |
| 2 | Assume `getServerQueryClient` memoizes outside RSC render | HIGH | `src/server/get-query-client.ts`, TanStack Query SSR docs | - |
| 3 | Prefetch with hand-written query keys | CRITICAL | `src/products/hooks.ts`, `src/shared/query-keys.ts`, SSR smoke test | `configure-pagination-prefetch-and-cache-policy` |

### `use-catalog-and-product-read-flows` (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Call suspense read hooks before required params exist | CRITICAL | `src/products/hooks.ts`, `src/collections/hooks.ts`, `src/categories/hooks.ts` | - |
| 2 | Rebuild Medusa reads with app-local `useQuery` | HIGH | AGENTS, maintainer interview | - |
| 3 | Drop region and country inputs on read paths | HIGH | catalog/product services and hooks | - |

### `implement-auth-and-customer-session-flows` (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Rebuild the Medusa auth flow in the app | HIGH | auth service/hooks, maintainer interview | - |
| 2 | Assume multi-step auth is supported | CRITICAL | `src/auth/medusa-service.ts`, auth tests | - |
| 3 | Push analytics or UX side effects into shared auth code | HIGH | `src/auth/hooks.ts`, maintainer interview | `decide-app-specific-overrides-vs-shared-platform` |

### `implement-cart-and-checkout-platform-flows` (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Bypass preset-owned cart and checkout flows | HIGH | flow wrappers, `zmeny.md` | - |
| 2 | Treat the first payment session as the selected provider | CRITICAL | `src/shared/checkout-flow-utils.ts`, flow tests | - |
| 3 | Assume the latest cart argument is always the effective checkout cart | HIGH | `src/shared/checkout-flow-utils.ts`, `src/medusa/checkout-flow.ts` | - |
| 4 | Hardcode active-cart cache matching | HIGH | `src/shared/cart-cache-sync.ts`, query-key-match utils, cart cache tests | `configure-pagination-prefetch-and-cache-policy` |

### `configure-pagination-prefetch-and-cache-policy` (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Hardcode query keys or query options | CRITICAL | `src/shared/query-keys.ts`, regression tests | - |
| 2 | Read `skipIfCached` as any-hit semantics | HIGH | `src/shared/prefetch.ts` | - |
| 3 | Pass non-plain values into normalized query inputs | HIGH | `src/shared/query-keys.ts`, regression tests | - |
| 4 | Rebuild page planning in the app | MEDIUM | `src/shared/prefetch-pages-plan.ts`, page-plan tests | - |

### `migrate-custom-hooks-to-storefront-data` (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Run legacy and shared hooks on the same screen | CRITICAL | maintainer interview, `zmeny.md` | - |
| 2 | Port custom hooks before centralizing the preset seam | HIGH | README, maintainer interview | `setup-storefront-platform-in-next-app` |
| 3 | Lose storefront-specific side effects during migration | HIGH | maintainer interview | `decide-app-specific-overrides-vs-shared-platform` |
| 4 | Keep migrated common logic app-local after reuse is proven | MEDIUM | maintainer interview | `extend-storefront-data-for-new-backend-use-cases` |

### `decide-app-specific-overrides-vs-shared-platform` (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Create wrappers with no added behavior | HIGH | maintainer interview | - |
| 2 | Push customer-specific DTOs or read models into `storefront-data` too early | HIGH | README, maintainer interview | - |
| 3 | Leave repeated backend logic in a single app | HIGH | maintainer interview, `zmeny.md` | `extend-storefront-data-for-new-backend-use-cases` |

### `extend-storefront-data-for-new-backend-use-cases` (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Add a new domain without preset wiring | HIGH | `src/medusa/preset.ts`, `zmeny.md` | - |
| 2 | Hardcode query keys in a new shared domain | CRITICAL | `src/shared/query-keys.ts`, AGENTS | - |
| 3 | Accept `AbortSignal` but never forward it | HIGH | TanStack Query cancellation docs, `src/orders/medusa-service.ts` | - |
| 4 | Add shared behavior without shared tests | HIGH | preset/flow tests, `zmeny.md` | - |

### `audit-storefront-before-release` (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Verify only happy-path browser behavior | CRITICAL | SSR smoke test, TanStack Query SSR docs | - |
| 2 | Skip checkout edge cases around selected payment sessions | HIGH | flow tests | `implement-cart-and-checkout-platform-flows` |
| 3 | Ignore storage and cross-tab degradation paths | HIGH | `src/shared/browser-storage.ts`, storage tests | - |

## Tensions

| Tension | Skills | Agent implication |
| ------- | ------ | ----------------- |
| Centralization versus storefront-specific flexibility | `decide-app-specific-overrides-vs-shared-platform` ↔ `extend-storefront-data-for-new-backend-use-cases` | Agent buď forkuje shared logiku v appce, nebo naopak příliš brzo tlačí customer-specific struktury do knihovny. |
| SSR correctness versus ergonomic setup | `setup-storefront-platform-in-next-app` ↔ `implement-ssr-prefetch-and-query-client-boundaries` | Krátká integrační cesta vypadá hezky, ale často poruší skutečný App Router kontrakt. |
| Aggressive prefetch versus predictable freshness and cancellation | `implement-ssr-prefetch-and-query-client-boundaries` ↔ `configure-pagination-prefetch-and-cache-policy` | Agent snadno zvolí příliš agresivní refresh nebo naopak očekává skip/cancel chování, které platforma negarantuje. |
| Low-level control versus normalized platform flows | `implement-cart-and-checkout-platform-flows` ↔ `decide-app-specific-overrides-vs-shared-platform` | Přímé Medusa volání vypadají pružněji, ale obcházejí sdílenou flow semantiku a znovu zavádějí bugy. |

## Cross-References

| From | To | Reason |
| ---- | -- | ------ |
| `setup-storefront-platform-in-next-app` | `implement-ssr-prefetch-and-query-client-boundaries` | Provider/preset setup dává smysl jen spolu s request-scoped SSR pravidly. |
| `use-catalog-and-product-read-flows` | `configure-pagination-prefetch-and-cache-policy` | Read flows zůstávají správné jen při stejných pagination a cache pravidlech. |
| `implement-auth-and-customer-session-flows` | `decide-app-specific-overrides-vs-shared-platform` | Auth je nejčastější místo, kde se objevují app-local callbacky nad shared backend flow. |
| `implement-cart-and-checkout-platform-flows` | `configure-pagination-prefetch-and-cache-policy` | Checkout a cart sync spoléhají na stejný query-key kontrakt jako zbytek platformy. |
| `migrate-custom-hooks-to-storefront-data` | `setup-storefront-platform-in-next-app` | Migrace má začít centralizací preset seam, ne jednotlivými hooky. |
| `migrate-custom-hooks-to-storefront-data` | `decide-app-specific-overrides-vs-shared-platform` | Během migrace se ukáže, které wrappery jsou skutečně policy seam. |
| `extend-storefront-data-for-new-backend-use-cases` | `decide-app-specific-overrides-vs-shared-platform` | Povýšení feature do shared platformy vyžaduje jasné rozhodnutí, že už nejde o customer-specific logiku. |
| `audit-storefront-before-release` | `implement-cart-and-checkout-platform-flows` | Release audit musí znát selected-payment a effective-cart semantiku z checkout flow. |

## Subsystems & Reference Candidates

| Skill | Subsystems | Reference candidates |
| ----- | ---------- | -------------------- |
| `setup-storefront-platform-in-next-app` | - | - |
| `implement-ssr-prefetch-and-query-client-boundaries` | - | - |
| `use-catalog-and-product-read-flows` | - | - |
| `implement-auth-and-customer-session-flows` | - | - |
| `implement-cart-and-checkout-platform-flows` | - | - |
| `configure-pagination-prefetch-and-cache-policy` | - | prefetch skip modes and page planning |
| `migrate-custom-hooks-to-storefront-data` | - | - |
| `decide-app-specific-overrides-vs-shared-platform` | - | - |
| `extend-storefront-data-for-new-backend-use-cases` | - | new domain extension recipe |
| `audit-storefront-before-release` | - | - |

## Remaining Gaps

| Skill | Question | Status |
| ----- | -------- | ------ |
| `use-catalog-and-product-read-flows` | Jaké field bundles mají být výchozí start pro product grid a product detail v novém storefrontu? | open |
| `implement-auth-and-customer-session-flows` | Jaký payload baseline mají agenti předpokládat pro auth a customer session read flow, než storefront vyžádá custom fields? | open |
| `configure-pagination-prefetch-and-cache-policy` | Kdy mají agenti preferovat `skipMode: "any"` před výchozím `fresh`? | open |
| `migrate-custom-hooks-to-storefront-data` | Jaké migrační pořadí je preferované, aby stará a nová vrstva neběžely paralelně déle, než je nutné? | open |
| `decide-app-specific-overrides-vs-shared-platform` | Jaký threshold má rozhodnout, že customer-specific wrapper už má být povýšen do `storefront-data`? | open |
| `implement-cart-and-checkout-platform-flows` | Kdy mají agenti dodat custom active-cart matcher místo defaultního? | open |
| `audit-storefront-before-release` | Jaký je první code smell, podle kterého maintainer okamžitě pozná AI-generated architekturu mimo zamýšlený model? | open |

## Recommended Skill File Structure

- **Core skills:** `use-catalog-and-product-read-flows`, `implement-auth-and-customer-session-flows`, `implement-cart-and-checkout-platform-flows`, `configure-pagination-prefetch-and-cache-policy`, `extend-storefront-data-for-new-backend-use-cases`
- **Framework skills:** `setup-storefront-platform-in-next-app`, `implement-ssr-prefetch-and-query-client-boundaries`
- **Lifecycle skills:** `migrate-custom-hooks-to-storefront-data`, `audit-storefront-before-release`
- **Composition skills:** `decide-app-specific-overrides-vs-shared-platform`
- **Reference files:** `configure-pagination-prefetch-and-cache-policy`, `extend-storefront-data-for-new-backend-use-cases`

## Composition Opportunities

| Library | Integration points | Composition skill needed? |
| ------- | ------------------ | ------------------------- |
| Next.js App Router | provider boundary, SSR hydration, server/client query-client ownership | yes - `setup-storefront-platform-in-next-app`, `implement-ssr-prefetch-and-query-client-boundaries` |
| `@tanstack/react-query` | SSR, hydration, query cancellation expectations, query-key identity | yes - already folded into SSR and cache/prefetch skills |
| `@medusajs/js-sdk` | service adapters, auth/session behavior, checkout/cart backend semantics | yes - already folded into auth, read, cart, checkout, and extension skills |
