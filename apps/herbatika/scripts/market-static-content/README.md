# Market static-content authority

This tool builds a deterministic, readiness-only plan for reviewed CZ, HU, RO,
and SK static storefront content. It never reads or emits the content itself.
Source manifests may contain only references and hashes for external JSON
artifacts, official-source provenance, and independent editorial and legal
approvals.

## Required source scope

Provide exactly one manifest for each market and locale pair: `cz/cs-CZ`,
`hu/hu-HU`, `ro/ro-RO`, and `sk/sk-SK`. Every manifest must cover `about`,
`faq`, `cms-legal`, `cms-static`, `footer`, `homepage-hero`, and
`operator-identity`. About, FAQ, footer, homepage hero, and operator identity
are singletons; CMS kinds may contain multiple reviewed entries.

Each entry binds:

- an official HTTPS Herbatika source URL, retrieval timestamp, and raw snapshot
  SHA-256;
- a market-scoped `market-static-content/<market>/<id>.json` artifact reference
  and SHA-256;
- separate editorial and legal approval artifacts at
  `market-static-content/<market>/approvals/<role>/<id>.json`; each approval
  carries its own SHA-256 and is bound to the static artifact and source
  snapshot hashes;
- the shared segment-registry artifact
  `market-static-content/shared/segment-registry.json`; all four market
  manifests must bind to the same SHA-256.

Each market also requires an independent `operatorContactAuthority` review,
hash-bound to its operator-identity artifact. It must attest approved coverage
for legal entity, email, phone, support origin, and social IDs. The plan carries
only this field-level coverage state, never the contact values. A shared SK
phone, email, or other cross-market contact therefore remains blocked until a
market-specific reviewer approves the exact artifact and source snapshot.

## Per-market aggregate artifacts

The source manifest exposes exactly three aggregate refs for each market under
`marketArtifacts`: `staticContent`, `editorialApproval`, and `legalApproval`.
Their fixed paths are:

- `market-static-content/<market>/static-content.json`;
- `market-static-content/<market>/approvals/editorial.json`;
- `market-static-content/<market>/approvals/legal.json`.

Every aggregate is canonical JSON with `schemaVersion: 1`, the exact market and
locale, `ready: true`, the shared segment-registry SHA, and policy versions
`checkoutConsent: 2026-08-21` and `registrationTerms: 2026-08-21`. Its entries
are unique and sorted by `<contentKind>:<entryId>` with exhaustive required-kind
coverage. The static collection cross-binds every child static ref/hash and
reviewed payload ref/hash. Each approval collection cross-binds its child
approval ref/hash, static ref/hash, and source snapshot hash.

The plan contains only these authorities and refs. Reviewed payload files can
contain customer-approved copy, but this tool neither reads that copy into the
plan nor generates a fallback.

The parser rejects extra fields, embedded `body`, `html`, or other copy,
cross-market URLs and artifact references, non-canonical timestamps, and any
`demo-generated`, `unreviewed`, or `unapproved` authority. Missing source pages
must remain missing until reviewed evidence exists; the tool does not generate
fallback copy.

## Generate a plan

Run from `apps/herbatika`:

```sh
pnpm exec tsx scripts/market-static-content/cli.ts \
  --manifest /absolute/reviewed/cz.json \
  --manifest /absolute/reviewed/hu.json \
  --manifest /absolute/reviewed/ro.json \
  --manifest /absolute/reviewed/sk.json \
  --output /absolute/private/market-static-content-plan.json
```

The output is recursively key-canonical JSON with a trailing newline. It binds
the exact source-manifest bytes, operations, coverage counts, and a semantic
plan hash. Publication is private (`0600`), crash-safe, and no-clobber; an
existing output fails closed. There is deliberately no apply mode.

Focused verification:

```sh
pnpm exec vitest run scripts/market-static-content/market-static-content.test.ts
pnpm exec tsc --project scripts/market-static-content/tsconfig.json
pnpm exec biome check scripts/market-static-content
```
