# Segment-registry G1 publication gate

This producer converts one canonical, customer-reviewed
`market-static-content-import-readiness-plan` into four market-scoped G1
approval artifacts. It does not read or emit storefront copy.

Each output is recursively key-canonical JSON with a trailing LF and has kind
`market-segment-registry-g1-approval`, schema version `1`, gate `G1`, status
`approved`, and readiness `true`. The fixed evidence reference convention is:

- `segment-registry-g1/cz.json`
- `segment-registry-g1/hu.json`
- `segment-registry-g1/ro.json`
- `segment-registry-g1/sk.json`

An artifact binds the exact source-plan bytes and semantic plan hash, the
reviewed external segment-registry artifact hash, the current derived taxonomy
hash, and every required indexable root route's static-content artifact plus
independent editorial and legal approval artifacts. The reviewed registry hash
and derived taxonomy hash are intentionally distinct.

The producer freezes this explicit route-to-operation mapping:

- About: `<market>:about:about`
- FAQ: `<market>:faq:faq`
- Terms, privacy, cookies: `<market>:cms-legal:<pageKey>`
- Other root static pages: `<market>:cms-static:<pageKey>`

Missing, duplicated, foreign-market, unreviewed, hash-mismatched, or
non-canonical evidence fails closed. The producer never creates a rejected or
partially ready artifact.

Generate private no-clobber artifacts from `apps/herbatika`:

```sh
pnpm exec tsx scripts/segment-registry-publication/cli.ts \
  --plan /absolute/private/market-static-content-plan.json \
  --output-dir /absolute/private/segment-registry-g1
```

At runtime mount that directory read-only and set:

```sh
HERBATIKA_SEGMENT_REGISTRY_G1_DIR=/absolute/private/segment-registry-g1
```

The SSR loader reads `<dir>/<market>.json`. Missing or invalid approval blocks
an otherwise indexable static page with the existing 503/no-store/noindex
response. Sitemap source validation uses the same decision and omits rejected
routes. Routes already frozen as noindex in the taxonomy do not require G1.
