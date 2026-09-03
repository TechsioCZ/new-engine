# Romanian catalog import

This importer applies curated Romanian catalog content without scraping or
machine-translating at runtime. The manifest is the reviewable source of truth;
every product is resolved by an exact SKU, EAN, external ID, or reviewed Medusa
ID. Categories are
resolved by the stable Shoptet source GUID or source category ID stored by the
existing Herbatica category seed. Exact Medusa IDs are the fail-closed fallback
for source-key collisions; they bind the plan to the inspected environment.

The default mode is a read-only dry run:

```bash
pnpm exec medusa exec ./src/scripts/ro-catalog-import.ts \
  --generation-plan /absolute/generated/bundle.json \
  --manifest ./secure-input/ro-catalog.json \
  --plan-output /absolute/review/ro-catalog-plan.json \
  --post-commerce-envelope /absolute/review/post-commerce-envelope.json \
  --sales-channel-id sc_ro
```

Before any RO commerce or catalog mutation, capture the independent trusted SK
baseline directly from the target database:

```bash
pnpm exec medusa exec ./src/scripts/ro-catalog-import-sk-baseline.ts \
  --output /absolute/review/pre-backend-sk-baseline.json
```

This command performs only the same readiness collector reads used by the
importer, writes a private (`0600`) artifact atomically, and requires no RO
commerce readiness. Publication is no-clobber: an existing target is never
replaced, so each capture must use a new reviewed path. Cutover consumes
`.skProtection.baseline`,
`.skProtection.publication`, and `.skProtection.sharedInventoryBaseline`.
Capture refuses any SK publication audit error. After commerce is ready, the
importer dry-run must emit the same SK baseline and shared-inventory values at
`.plan.expectedSkBaseline` and `.plan.expectedSharedInventoryBaseline`; any
difference is drift and stops apply.

Apply only a reviewed, successful plan:

```bash
pnpm exec medusa exec ./src/scripts/ro-catalog-import.ts \
  --generation-plan /absolute/generated/bundle.json \
  --manifest ./secure-input/ro-catalog.json \
  --plan-output /absolute/review/ro-catalog-plan.json \
  --post-commerce-envelope /absolute/review/post-commerce-envelope.json \
  --sales-channel-id sc_ro \
  --chunk-size 25 \
  --confirm-plan-hash HASH_FROM_DRY_RUN \
  --apply
```

When supplied, `--sales-channel-id` is the authoritative reviewed RO target;
an existing legacy RO assignment is planned onto that target and never silently
wins over it. The channel must already be linked to every included product and
its canonical market metadata must support RO. Category entries
carry their reviewed channel ID and enforce the same RO-market contract. The
importer never links channels implicitly.

## Safety contract

- `--apply` is the only mutation switch; omission always means dry run. Apply
  also requires `--confirm-plan-hash` with the exact SHA-256 emitted by the
  latest dry run.
- `--plan-output` is mandatory and absolute. Dry run atomically writes the full
  non-secret, per-entity reconciliation plan. Apply reads that existing
  artifact and requires its exact content, embedded hash, fresh plan, and
  `--confirm-plan-hash` all to agree; it never silently replaces the reviewed
  artifact. Plan and omission-ledger publication is private (`0600`) and
  no-clobber; choose new review paths instead of overwriting evidence.
- `--generation-plan` is mandatory and absolute. Its canonical plan hash,
  opaque reviewed input hash, embedded manifest hash, omission-ledger hash, and
  exact embedded manifest are revalidated before dry run and again before
  apply. The resulting three-hash generation proof is embedded in the import
  plan and therefore covered by the confirmed plan hash.
- `--post-commerce-envelope` is mandatory and absolute. Its exact byte hash,
  commerce apply/restore receipts, commerce plan, price authority, observed
  snapshot, deployment identity, pre/post SK proof, and shared-inventory proof
  must exactly match the manifest. Apply also requires the current BLUE/GREEN
  deployment environment variables to match the reviewed evidence.
- `RO_DEMO_DATABASE_INSTANCE_ID` and `DATABASE_URL` are normalized through the
  shared credential-free database-instance fingerprint. Dry run, every apply
  chunk, and the final reread must match the exact reviewed database instance;
  a restored clone or endpoint switch fails closed.
- The complete catalog and commerce preflight runs before the first write.
  Every chunk is re-preflighted against the live source snapshot before its
  first mutation; drift invalidates the confirmed plan.
- The final fresh database reread must reproduce the exact confirmed scope and
  report zero remaining product, category, brand, exclusion, translation,
  content, or publication mutations. Matching baselines alone is insufficient.
- The plan carries the full fresh SK publication audit, including per-kind
  publication counts/issues, a semantic SK hash that excludes only allowed RON
  prices, and a shared inventory fingerprint covering variant inventory flags,
  links, required quantities, and location stock/reserved/incoming quantities.
  Publication errors abort. The plan hash binds all fields; every chunk and a
  fresh post-apply database read must match them.
- `ro-RO` Translation rows are created or updated by the exact
  `(locale_code, reference, reference_id)` identity. Ambiguous rows abort.
- Existing non-RO translation fields, product metadata, SK/CZ/HU URL
  assignments, and source `product_content` are preserved.
- Missing `product_content` rows are initialized from existing source metadata,
  never from Romanian text. The RO fields are stored as a separate exact
  `product_content` Translation. This normalization is refused for an already
  SK-published product because creating the physical source row would change
  the protected SK baseline; run and review a separate source-content backfill
  before the RO import instead.
- The RO URL assignment is written last in each chunk, after both translations
  exist. Updating product metadata uses Medusa's product workflow, so the URL
  registry outbox observes the normal product lifecycle event.
- A currently published RO product/category/brand cannot have its visible
  translation mutated in the same run. Preflight requires a separate reviewed
  retirement to draft, confirmed outbox delivery and URL-registry route
  removal, then a fresh dry-run. This closes the asynchronous route-delivery
  window instead of claiming cross-module atomicity.
- Category rich content and SEO are written only to the exact `ro-RO`
  `product_category` Translation. Shared category metadata, base name,
  description, handle, and hierarchy are never mutated.
- Category URL assignments use the generic category assignment plus lifecycle
  outbox transaction. No-op assignments preserve `source_version` and replay
  the deterministic lifecycle event, allowing outbox recovery.
- The import is resumable and idempotent. A failure can leave completed chunks,
  or translations from the current chunk, committed before a later workflow
  fails. A rerun plans committed records as unchanged and completes the rest.
  Medusa workflows provide their normal transaction boundary per batch; there
  is intentionally no advisory lock or unsafe cross-module, whole-catalog
  transaction.
- Reviewed variant sellability/unavailability is persisted before included
  publication in the dedicated market-variant-authority module. Exact reruns
  are semantic no-ops; market-scoped replacement is transactionally serialized
  and the importer verifies every resolved variant against the plan-bound price
  authority and post-commerce source version.
- Source evidence must be an HTTPS `herbatica.ro` URL, retrieval timestamp, and
  SHA-256. The importer performs no network requests.
- `products` and `excludedProducts` must resolve to the exact disjoint union of
  every globally published Medusa product. Missing products, draft extras, and
  identities that resolve twice all stop preflight.
- `categories` plus `excludedCategories` likewise partition every active
  category. Reviewed ghost categories receive their exact safe RO Translation,
  but an existing RO assignment is changed only from published to draft; an
  unassigned ghost remains unassigned. SK active/public state is untouched.
- `brandInventory` is partitioned into 103 exact-Medusa-ID published `brands`
  and 25 decision-backed `excludedBrands` in the current authority. Only a
  published brand's `{title}`
  Translation and generic RO URL assignment are written; shared `handle`, GPSR
  data, base title, SK state, and product relations are preserved. An excluded
  brand's existing published RO assignment is drafted; an unassigned exclusion
  remains unassigned. `collectionInventory.count` is explicitly zero.
- The plan artifact contains sorted exact scope sets
  `productPublishedIds`, `productExcludedIds`, `categoryPublishedIds`,
  `categoryExcludedIds`, published `brandIds`, `brandExcludedIds`, and
  `collectionIds`, plus their canonical SHA-256. Release readiness must bind to
  that same scope hash.

An `excludedProducts` entry is a reviewed claim that no exact official RO
counterpart exists. It contains a stable product key, source evidence, reason,
and approval identity/timestamp/reference. Apply only changes an existing RO
publication from `published` to `draft` through the normal product workflow;
the slug/channel, source product, SK and other markets, translations, variants,
and prices are untouched. Missing or already-draft RO publication is an
idempotent no-op.

For the explicitly reviewed demo-only case where the official source provides
only a full description, set `omissionMode` to
`official-ro-description-only`, provide all four structured fields as exact
empty strings, set a minimum-32-byte `RO_DEMO_OMISSION_AUTHORITY_SECRET`, and
pass an absolute `--omission-ledger-output`. Dry run atomically emits the
standalone readiness ledger and hash. The plan persists a signed,
ledger-bound `__demo_omission_authority` beside the exact empty ro-RO
`product_content` fields. Production readiness remains strict and rejects this
demo exception.

## Fail-closed commerce readiness

The manifest names the exact RO region, shipping options, tax regions, and
payment providers approved for launch. Dry run refuses apply unless:

- the region contains Romania and its actual currency is `ron`;
- every named shipping option has a Romania geo-zone;
- every named tax region is for country `ro`;
- every named payment provider is enabled and linked to the RO region;
- every catalog variant is covered exactly once by SKU or EAN;
- every variant declared `sellable` has exactly one actual RON price equal to
  the business-approved manifest amount.

This importer deliberately does **not** change region currency, shipping, tax,
payment, availability, or prices. In particular it never converts or
reinterprets EUR as RON. Those business changes require their own reviewed
workflow, followed by another dry run here.

Category import requires exhaustive reconciliation. When `categories` is
present, `categoryInventory` is mandatory, every active category must resolve
exactly once, and active/root/direct-child/direct-product counts plus every
parent relationship must match live Medusa state. Every category Translation
owns all six runtime fields: `name`, `description`, `top_description_html`,
`bottom_description_html`, `meta_title`, and `meta_description`. Nullable fields
must use explicit `null` when intentionally empty.

The repository source extractor currently produces product candidates and
category breadcrumbs only. It must not be treated as an approved category
manifest. Category values must come from a separately reviewed official
Herbatica.ro/Shoptet category export with per-entry source hashes. Product-only
manifests remain useful for staged maintenance, but do not prove full RO release
readiness; the catalog readiness gate must still require complete categories.

## Manifest formats

JSON uses one envelope:

```json
{
  "schemaVersion": 1,
  "market": "ro",
  "locale": "ro-RO",
  "brandInventory": { "count": 1 },
  "brands": [
    {
      "key": { "kind": "medusa_id", "value": "brand_example" },
      "translation": { "title": "Marcă românească" },
      "publicSlug": "marca-romaneasca",
      "publicationStatus": "published",
      "salesChannelId": "sc_ro",
      "source": {
        "url": "https://herbatica.ro/marci/marca-romaneasca/",
        "retrievedAt": "2026-08-20T10:00:00.000Z",
        "contentSha256": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
      }
    }
  ],
  "collectionInventory": { "count": 0 },
  "readiness": {
    "regionId": "reg_ro",
    "currencyCode": "ron",
    "shippingOptionIds": ["so_ro_standard"],
    "taxRegionIds": ["txreg_ro"],
    "paymentProviderIds": ["pp_card_ro"]
  },
  "categoryInventory": {
    "activeCount": 1,
    "rootCount": 1
  },
  "categories": [
    {
      "key": { "kind": "source_guid", "value": "CATEGORY-GUID-1" },
      "parentKey": null,
      "expectedDirectChildCount": 0,
      "expectedDirectProductCount": 12,
      "source": {
        "url": "https://herbatica.ro/suplimente-nutritive/",
        "retrievedAt": "2026-08-20T10:00:00.000Z",
        "contentSha256": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
      },
      "translation": {
        "name": "Suplimente nutritive",
        "description": "Descriere aprobată",
        "top_description_html": null,
        "bottom_description_html": null,
        "meta_title": "Suplimente nutritive",
        "meta_description": "Descriere SEO aprobată"
      },
      "publicSlug": "suplimente-nutritive",
      "publicationStatus": "published",
      "salesChannelId": "sc_ro"
    }
  ],
  "excludedProducts": [
    {
      "key": { "kind": "medusa_id", "value": "prod_unmapped" },
      "reason": "No exact product exists in the reviewed official RO catalog",
      "decision": {
        "approvedAt": "2026-08-20T12:00:00.000Z",
        "approvedBy": "catalog-owner@example.com",
        "reference": "RO-EXCLUSION-2026-001"
      },
      "source": {
        "url": "https://herbatica.ro/sitemap_index.xml",
        "retrievedAt": "2026-08-20T10:00:00.000Z",
        "contentSha256": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
      }
    }
  ],
  "products": [
    {
      "key": { "kind": "sku", "value": "HERB-001" },
      "source": {
        "url": "https://herbatica.ro/example-produs",
        "retrievedAt": "2026-08-20T10:00:00.000Z",
        "contentSha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      },
      "translation": {
        "title": "Titlu românesc aprobat",
        "description": "Descriere românească aprobată"
      },
      "productContent": {
        "usage": "Utilizare aprobată",
        "composition": "Compoziție aprobată",
        "warning": "Avertisment aprobat",
        "other": ""
      },
      "publicSlug": "titlu-romanesc-aprobat",
      "publicationStatus": "published",
      "variants": [
        {
          "key": { "kind": "ean", "value": "8580000000001" },
          "roAvailability": "sellable",
          "ronPrice": {
            "currencyCode": "ron",
            "amount": 4990,
            "approval": {
              "approvedAt": "2026-08-20T09:00:00.000Z",
              "approvedBy": "commercial-team@example.com",
              "reference": "RO-PRICE-2026-001"
            }
          }
        }
      ]
    }
  ]
}
```

JSONL uses one object per product with exact keys `schemaVersion`, `market`,
`locale`, `readiness`, and `product`. `readiness` must be identical on every
line. JSONL remains product-only; category imports require the canonical JSON
envelope so hierarchy and inventory can be reviewed together. Keep production
manifests outside the repository if they contain commercially sensitive review
metadata.
