# Romanian demo localization fallback

This library creates an importer-compatible `RoCatalogManifest` from official
Romanian product/category JSONL and a read-only Medusa inventory snapshot. It
does not access Medusa services, write data, or apply an import.

The output is deliberately labelled `demo-generated-unreviewed`. A product is
published only when an exact bijective identity has both an official Romanian
title and description. Identity-only or ambiguous records are decision-backed
RO exclusions; the generator never derives visible product copy from SK.
Categories require an explicit, fluent six-field Romanian record keyed by exact
Medusa ID. Agent-generated category records are distinguished from official RO
records in provenance, and rich-category links are stripped fail-closed so no
SK slug leaks into RO. Slugs are ASCII-safe, bounded, stable across input order,
and use a hash suffix for collisions.

Safety-sensitive product fields (`composition`, `usage`, `warning`, `other`)
are never translated or invented. When official Romanian content is absent,
an otherwise mapped official RO product leaves unsupported structured fields
empty so the storefront can hide those tabs; the official RO description still
renders. No SK safety text is copied into a published RO product. Every omitted
field receives provenance and blocking-quality warnings for later editorial
review. Prices are never converted from EUR or generated. The pre-commerce
authority carries exact reviewed RON major-unit amounts from frozen official
Romanian evidence. The final manifest accepts those prices only after a fresh
post-commerce read proves the exact amounts exist in Medusa.

The only supported omission evidence mode is
`official-ro-description-only`. It always omits all four structured fields.
Even if an input happens to contain a partial structured value, this mode does
not mix it in; separately proven structured content requires a future distinct
evidence schema.

`generationPlanSha256`, `manifestSha256`, and `inputSha256` are hashes of
canonical, key-sorted JSON. Timestamps are inputs, never read from the system
clock, so identical inputs produce byte-identical plans. Feed only the nested
`manifest` to `ro-catalog-import`; keep the surrounding audit bundle alongside
the demo as the review ledger. The importer must still run in dry-run mode and
produce its own live-snapshot plan hash before any separately authorized apply.
The bundle also contains exact official/matched/generated coverage counts.
Unmatched official products are retained in the external exclusion ledger;
unmatched Medusa products are exact `medusa_id`, decision-backed manifest
exclusions. Categories fail closed unless every inventory ID has explicit RO
copy. The two known ghost categories are translated but partitioned into
`excludedCategories`. Brands are exact Medusa-ID records and collections are
authoritatively empty.
`demoOmissionLedgerSha256` is the exact canonical hash of the standalone
omission artifact and is also covered by `generationPlanSha256`.

The two-phase CLIs consume the frozen raw merged schemas directly. Product
input must partition exactly `2,099 = 2,002 published + 97 excluded`; category
input must partition exactly `209 = 207 published + 2 excluded`. Truncated,
unbound, fuzzy, or differently counted artifacts fail before output creation.

Phase 1 emits an explicitly non-importable, readiness-free price authority.
It binds the exact bytes of the merged evidence, pre-commerce inventory
envelope, and raw live identity snapshot. It covers all `2,191` variants:
`2,002` reviewed sellable RON variants, `29` unavailable variants on published
products, and `160` variants under `149` excluded products. The file appears
atomically with mode `0600` and there is no apply switch:

```bash
pnpm exec medusa exec ./src/scripts/ro-demo-localization/precommerce-cli.ts \
  --inventory /run/secrets/herbatika/pre-commerce-inventory-envelope.json \
  --merged-products /run/secrets/herbatika/ro-merged-products.jsonl \
  --raw-live-inventory /run/secrets/herbatika/raw-live-inventory.json \
  --pre-commerce-price-authority-output /run/secrets/herbatika/ro-demo-precommerce-price-authority.json
```

Commerce dry-run/apply consumes that reviewed authority and creates or
reconciles only RO-scoped RON commerce state. A new read-only post-commerce
capture must then produce `ro-demo-post-commerce-envelope`. The final generator
requires the independently reviewed SHA-256 of its exact bytes. A plain
pre-commerce inventory envelope, recomputed inner self-hash, empty readiness,
or missing approved live RON price fails before output creation.

Phase 2 generates one atomic directory containing `bundle.json`,
`manifest.json`, and `omission-ledger.json`. Files are written into a sibling
temporary directory and become visible together through one directory rename:

```bash
pnpm exec medusa exec ./src/scripts/ro-demo-localization/cli.ts \
  --catalog-entities /run/secrets/herbatika/ro-catalog-entities.json \
  --category-source /run/secrets/herbatika/ro-merged-categories.jsonl \
  --merged-products /run/secrets/herbatika/ro-merged-products.jsonl \
  --post-commerce-envelope /run/secrets/herbatika/ro-demo-post-commerce-envelope.json \
  --post-commerce-envelope-sha256 REVIEWED_EXACT_BYTE_SHA256 \
  --output-directory /run/secrets/herbatika/ro-demo-artifacts
```

The post-commerce wrapper payload contains every `DemoLocalizationFileInput`
field: exact
`generatedAt`, `fallbackSource`, the full Medusa `inventory`, existing
business-approved `readiness`, and `salesChannelId`. Every inventory product
also includes its exact Medusa `id` and `productContentId` for the omission
ledger. It also includes explicit `brandExclusionAuthority`; the catalog
entities artifact is strictly partitioned as 103 official published brands and
25 decision-backed exclusions, plus immutable `mergedEvidenceCapturedAt`. The
payload deliberately excludes the two source arrays because those are supplied
by the frozen JSONL evidence files.

Keep all three outputs mounted outside the image. The bundle is the provenance
ledger, the standalone manifest is passed to the importer dry run, and the
standalone omission ledger must exactly match the dry-run plan. This generator
has no apply flag and performs no Medusa mutations. The final bundle exposes a
`bootstrap` hash chain for the source inventory, price authority, commerce
plan, exact post-commerce wrapper bytes, and observed commerce snapshot.
