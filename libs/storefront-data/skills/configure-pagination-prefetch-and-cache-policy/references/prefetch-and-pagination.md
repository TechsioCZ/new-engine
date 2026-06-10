# Prefetch and pagination reference

## Cache strategies

- `static`: very slow-changing data such as regions
- `semiStatic`: catalog and product reads
- `realtime`: cart or fast-changing state
- `userData`: customer, auth-adjacent, and order reads

Use `createCacheConfig()` in the preset when a storefront needs different defaults. Keep the strategy names intact so the rest of the package still reasons about the same categories.

## Skip modes

- `skipIfCached: false`: always prefetch
- `skipIfCached: true` with `skipMode: "fresh"`: skip only when the cached entry is still fresh
- `skipIfCached: true` with `skipMode: "any"`: skip whenever any cached entry exists, even if stale

The library default is `"fresh"`. Pick `"any"` intentionally in the app when stale-but-present data is acceptable for the prefetch use case.

## Shared page planning

`usePrefetchPages` delegates to the shared page planner in `src/shared/prefetch-pages-plan.ts`. Use it when:

- a listing screen already knows `currentPage`
- the app knows whether next/previous pages exist
- prefetch should follow the same priority rules across storefronts

Avoid rebuilding the plan in the app with ad-hoc loops or timers.

## Query-input hygiene

Treat these as safe input shapes:

- plain objects
- arrays of plain values
- strings, numbers, booleans, null

Avoid these in hook inputs and query-option builders:

- `URLSearchParams`
- functions
- class instances
- circular structures

If the app has richer filter state, normalize it into a plain object before passing it into `storefront.hooks.*`.
