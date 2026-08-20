# Romanian catalog readiness audit

`ro-catalog-readiness.ts` is a fail-closed, read-only audit for the Romanian
Herbatika storefront. It performs only Medusa service/query reads and never
creates, updates, or deletes data.

Run it from `apps/medusa-be` against the target Medusa environment. The
expected values must come from the importer's fresh pre-apply dry-run snapshot:

```bash
pnpm exec medusa exec ./src/scripts/ro-catalog-readiness.ts \
  --expected-sk-baseline-hash=<pre-apply-sha256> \
  --expected-sk-baseline-count=<pre-apply-count> \
  --expected-inventory-baseline-hash=<pre-apply-shared-inventory-sha256> \
  --expected-inventory-baseline-count=<pre-apply-variant-count> \
  --expected-scope-plan=/absolute/path/reviewed-import-plan.json \
  --cutover-receipt=/absolute/path/cutover-receipt.json \
  --expected-cutover-receipt-hash=<receipt-sha256> \
  --output=/absolute/path/backend-ro-readiness.json
```

All eight flags are mandatory and may occur exactly once. Every path must be
an absolute `.json` path. The report is written with mode `0600` to a unique
sibling temporary file, synced, and atomically linked into place. The output
path must not already exist; publication never replaces prior evidence, and a
collision or other write failure removes the temporary file and aborts the
command. The audit performs a new database read after apply and never derives
an expected baseline from that post-apply input.

The command logs one JSON report. It exits successfully only when all active
categories and published products satisfy the complete RO contract:

- exact `ro-RO` Translation records exist and every source-backed title,
  description, subtitle, and product-content section has non-empty Romanian
  text;
- every critical Romanian field differs from its normalized source text;
  equality is accepted only through an exact value-bound, reasoned entry in
  the code-reviewed `REVIEWED_RO_NEUTRAL_EQUALITIES` allowlist;
- every published product has a published RO `publicSlug` in
  `metadata.url_registry_publication`;
- every active category owns the exact six-field RO Translation contract;
  207 planned categories have a published RO assignment and the two
  decision-backed ghost duplicates remain draft or unassigned in RO only;
- RO slugs are unique within their route namespace and do not reuse the SK
  slug when the Romanian title differs;
- only products explicitly published to RO require RO content, route and RON
  prices; planned draft/unavailable exclusions remain enumerated while their
  globally published SK projection is protected by the baseline;
- the reviewed importer plan partitions exact product, category and brand ID
  sets. Its canonical `scopeSha256` must match the fresh database projection;
  brands reconcile as 103 RO published plus 25 decision-backed exclusions,
  and collections may authoritatively be zero;
- exactly one active region contains country `ro`, and that region uses
  currency `ron` and has at least one linked, enabled payment provider;
- at least one shipping option has a service-zone geo zone for Romania, and
  every such option has a RON price;
- exactly one country-level Romanian tax region exists and has a positive
  default tax rate;
- every importer-planned sellable variant has exactly the approved RON price;
  each explicitly unavailable variant has no RON price, and every live variant
  in the RO publication scope has exactly one hash-bound availability decision.

Category `description`, `top_description_html`, `bottom_description_html`,
`meta_title`, and `meta_description` must be owned by the exact `ro-RO`
`product_category` Translation record. Every key must exist and be
`string|null`; source-backed values must be non-empty and source-distinct.
`name` must also exist and be non-empty. Missing, invalid, or copied values
block readiness. The storefront runtime must expose this exact record as its
locale-scoped `localized_content` contract and must not leak global SK values.

## Slovak publication preflight

The same report independently preflights the existing SK publication surface
before the strict Translation gate is activated. It checks every published SK
product metadata assignment and every published SK category, brand, and
collection URL assignment for:

- an existing source entity;
- exactly one active `sk-SK` Translation record with the correct reference;
- the required exact field (`title`, or category `name`);
- a valid publication assignment and linked product Sales Channel.

SK does not inherit the RO source-distinct or localized category-rich-content
requirements. Slovak source text may legitimately equal its `sk-SK`
Translation.

`skBaseline.expected` records the explicit pre-apply SHA-256/count handoff and
`skBaseline.observed` records the independently loaded post-apply database
snapshot. `matched` must be true. A missing or malformed CLI handoff fails
before the audit; `SK_BASELINE_MISMATCH`, any `SK_PUBLISHED_*` or
`SK_PRODUCT_PUBLICATION_INVALID` issue, or a non-zero `skPublication.errors`
blocks release before enabling the strict Translation gate.

The shared importer/readiness baseline hashes canonically key-sorted JSON rows
for every published SK product, category, brand, and collection. Rows are
sorted by their complete canonical JSON, not database return order. Each row
contains entity ID/kind, SK public slug and Sales Channel, plus:

- products: stable source fields (excluding volatile `updated_at`), every
  non-RO metadata market, brand/category/collection relations, sorted Sales
  Channels, complete source product-content records, variants with SKU/EAN and
  sorted non-RON price records including amount, currency, rules, quantity
  bounds, and price-list identity;
- categories: complete queried source projection including name, description,
  handle, hierarchy, active state, and all rich/SEO metadata;
- brands: title, handle, and GPSR storefront content;
- collections: title, handle, and metadata;
- every active exact `sk-SK` Translation JSON record belonging to the row,
  including linked `product_content` translations.

The RO product-publication member is removed from product metadata and RON
prices are removed from the semantic SK projection because the RO import is
expected to change them. Technical timestamps are excluded for the same
reason. All SK/non-RO publication inputs, non-RON prices, and stable storefront
content remain protected. A separate `sharedInventoryBaseline` hashes every
variant ID, SKU, EAN and inventory policy, exact inventory-item links and
required quantity, plus location-level incoming, reserved, and stocked
quantities. RON-only price changes do not affect this physical inventory proof.
Both baselines must match. Importer dry-run, chunk re-preflight, final importer
read, and readiness CLI all call the same collector and hash builders;
independent reimplementations are not accepted.

## Machine-readable completeness proof

The exact JSON artifact contains `roCompletenessProof`:

```json
{
  "algorithm": "sha256-canonical-json-v1",
  "dataHash": "<64 lowercase hexadecimal characters>",
  "locale": "ro-RO",
  "provenance": "fresh-medusa-database-read",
  "schemaVersion": 1
}
```

It also contains `scopePlanProof` with expected/observed canonical hashes and
`matched`, the exact published/excluded IDs in `roProductScope`,
`roCategoryScope`, and `roBrandScope`, and `roVariantScope` with the canonical
sellable/unavailable decision hash and counts. `cutoverChainProof` binds the
validated receipt, commerce/post-commerce artifacts, importer `planHash` and
`scopeSha256`, and the maintenance, URL Registry, and Meilisearch convergence
proofs. It separately binds the approved static-taxonomy convergence artifact,
so an otherwise-green URL Registry proof cannot omit the reviewed indexable and
noindex route partition. The side-effect-free runtime parser for release tooling is
`ro-catalog-readiness-contract.ts`.

The receipt is exact-schema and replay-resistant. Its top-level `releaseId`
is the sole release identity. `releaseIdentity` binds the reviewed environment
and database fingerprint, RO Sales Channel, backend and storefront release
SHAs, Zane deployment/build identities and BLUE/GREEN slots, plus the exact SK
and RO origins. A distinct `databaseInstanceFingerprint` binds the physical
PostgreSQL endpoint/database/instance identity and is recomputed by readiness,
so switching to a semantically identical clone fails closed. The post-commerce
section separately proves zero SK
publication errors, unchanged SK semantic count/hash, and unchanged shared
inventory count/hash. It also binds the commerce plan file and semantic hash,
commerce manifest, pre-commerce SK baseline artifact, apply receipt, restore
artifact, fresh post-commerce payload, and all operation proof references. The
readiness runtime additionally requires these receipt
baselines to equal its explicit CLI handoff and requires the receipt Sales
Channel to be the sole fresh RO publication Sales Channel.

Demo mode additionally requires:

```bash
--readiness-mode=demo \
--demo-omission-ledger=/absolute/path/ro-demo-omissions.json
```

An omission is accepted only when all four structured fields are exact empty
strings, the official Romanian description has renderable visible content,
the external ledger matches its hashes/IDs, and the persisted Translation
contains a valid HMAC authority signed with
`RO_DEMO_OMISSION_AUTHORITY_SECRET` (minimum 32 bytes). Accepted products emit
exactly one `RO_DEMO_STRUCTURED_CONTENT_OMITTED` warning. Production mode is
the default and rejects every omission.

`dataHash` covers the stable, canonically sorted Medusa input actually audited:
products and variants, source product content, categories, brands,
collections, all active RO/SK translation JSON, URL assignments, reviewed
neutral exceptions, and the queried region/payment/shipping/tax readiness
projection. Volatile product `updated_at` is excluded. A consumer must require
`ready === true`, zero errors, exact locale/provenance/schema/algorithm, a
valid `dataHash`, and a matched expected/observed SK baseline. The hash is an
evidence fingerprint, not a substitute for those readiness assertions.

Any failed invariant is returned in `issues` with a stable `code`, entity kind,
entity ID where available, and a human-readable message. A non-ready report
ends with `RO_CATALOG_NOT_READY`; the report printed immediately before that
error is the remediation checklist.

The audit intentionally does not infer or generate translations and slugs. It
only proves that the data already stored in Medusa is complete enough for a
full Romanian storefront.

RO publication scope is explicit and hash-bound to the reviewed importer plan.
Products or brands not meant for Romania remain exact exclusions; fake
translations or prices must never be added merely to silence the audit.
