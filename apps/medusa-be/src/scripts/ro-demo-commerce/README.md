# Romanian demo commerce bootstrap

This script builds a convincing **demo-only** Romanian checkout without
inventing product prices from the Slovak/EUR catalog. It consumes the exact RON
prices from a reviewed, readiness-independent price authority and applies
only RO-scoped region, price, tax, delivery, and payment configuration.

The current official Herbatica.ro demo defaults are:

- RON, tax-inclusive region for country `ro` only;
- RON is merge-added to the store currencies and gets tax-inclusive currency
  and region price preferences; existing currencies/defaults are preserved;
- Packeta pickup: 14.99 RON, free from an item total of 249 RON;
- Packeta address: 32.69 RON;
- Cargus: 26.50 RON;
- the source COD policy is a minimum of 40 RON and a 9.45 RON fee, but COD is
  intentionally **not linked** by this bootstrap until checkout enforces both;
- Romanian VAT 21% or 11%. Product metadata `ro_vat_rate` or
  `top_offer.vat` is accepted only when it is exactly 11 or 21; otherwise the
  demo uses 21% and emits one warning per product;
- the first enabled GoPay provider listed in the binding is preferred. When
  GoPay is unavailable, the tool can link exactly `pp_system_default` as a
  no-debit RO demo fallback labelled `Plată demo (fără debitare)`. The fallback
  is usable only when the region and shipping option carry the same strict,
  plan-bound `ro_demo_checkout` marker. COD is never linked.

Sources: [Herbatica transport and payment](https://www.herbatica.ro/transportul-si-plata/),
[Romanian 2026 VAT form](https://legislatie.just.ro/Public/DetaliiDocument/307258),
and [Medusa conditional shipping prices](https://docs.medusajs.com/resources/commerce-modules/pricing/price-rules).

## Input contract

Keep environment-specific IDs outside the repository. The bootstrap manifest
contains only bindings and a relative path to the pre-commerce RON price
authority:

```json
{
  "schemaVersion": 1,
  "demo": true,
  "market": "ro",
  "locale": "ro-RO",
  "priceAuthorityPath": "./ro-price-authority.json",
  "binding": {
    "salesChannelId": "sc_storefront",
    "regionName": "Herbatica Romania Demo",
    "fulfillmentSetId": "fuset_european_warehouse",
    "shippingProfileId": "sp_default",
    "fulfillmentProviderId": "manual_manual",
    "codProviderId": "pp_cash_on_delivery_default",
    "gopayProviderIds": ["pp_gopay_gopay"],
    "systemPaymentProviderId": "pp_system_default"
  }
}
```

The price authority contains only official-source product/variant identity,
availability, exact approved RON amounts, and evidence. It deliberately has no
region, shipping, tax, or payment readiness IDs. Unavailable variants get no
price. Existing EUR and other non-RON base prices
are read, merged into the update payload, and protected by the SK baseline
hash. A variant with any rule-scoped base price fails preflight rather than
risk broadening or deleting its pricing rules. Price-list rows are never sent
through the base-price update workflow.

The currently reviewed production authority exact-byte SHA-256 is
`7c925a58a1753a8f609223ff2b40e21c49846bc97010f410030441a0482f7fb5`.
Supply that independently reviewed value to every fingerprint, dry-run, and
apply invocation. The runtime rehashes the authority bytes on every load; a
canonical but price-modified replay is rejected before a plan or mutation.

Create the environment-specific commerce manifest as a private `0600` file,
review every binding ID, and retain its exact raw-byte SHA-256. The manifest is
not an implicit deployment setting: every fingerprint, dry-run, and apply must
receive that independently reviewed hash through
`--expected-commerce-manifest-sha256`. The plan, restore evidence, and apply
receipt all carry the same hash.

The safe two-phase sequence is:

1. Generate and review `ro-price-authority.json` from official merged evidence.
   Do not add placeholder runtime IDs or derive RON from EUR.
2. Run this commerce dry-run/apply. Runtime creates/reconciles the RO region,
   shipping, tax, payment marker, and exact RON base prices.
3. Re-read those created IDs and prices from Medusa into the post-commerce
   envelope.
4. Regenerate the strict final RO catalog import manifest with the real
   readiness IDs, then run its normal dry-run/apply. The catalog importer is
   intentionally not weakened and must never accept pre-commerce placeholders.

The authority schema is implemented and strictly parsed by
`precommerce-price-authority.ts`. It is canonical JSON with a trailing LF and
contains `kind: "ro-demo-precommerce-price-authority"`, the frozen source-root
hashes, an exhaustive inventory identity hash, exact counts, nested
`products[].variants[]`, and `exclusions[].variants[]`. Every sellable variant
has official RON evidence and an unchanged approval record; every other
published variant is explicitly unavailable. The current frozen scope is
2,151 products / 2,191 variants, partitioned into 2,002 sellable, 29
unavailable, and 160 excluded variants. A fresh Medusa inventory fingerprint
must match the complete authority before planning.

An abbreviated structural example (not a valid production artifact) is:

```json
{
  "amountUnit": "major",
  "authorization": "demo-generated-unreviewed",
  "schemaVersion": 1,
  "kind": "ro-demo-precommerce-price-authority",
  "market": "ro",
  "locale": "ro-RO",
  "currencyCode": "ron",
  "counts": { "inventoryProducts": 2151, "inventoryVariants": 2191 },
  "sourceRoots": { "inventoryEnvelopeSha256": "..." },
  "inventoryIdentitySha256": "...64 lowercase hex...",
  "products": [
    {
      "productId": "prod_...",
      "variants": [
        {
          "variantId": "variant_...",
          "ean": "...",
          "liveSku": "...",
          "officialSku": "...",
          "roAvailability": "sellable",
          "evidence": { "sourceUrl": "https://www.herbatica.ro/..." },
          "price": {
            "amount": 120,
            "currencyCode": "ron",
            "approval": {
              "approvedAt": "2026-08-20T09:00:00.000Z",
              "approvedBy": "user-demo-authorization",
              "reference": "demo-generated-unreviewed:official-ron:..."
            }
          }
        }
      ]
    }
  ],
  "exclusions": []
}
```

## Safe execution

Both dry-run and apply are bound to the exact backend deployment and database.
The runtime verifies `BACKEND_BUILD_HASH`, `ZANE_DEPLOYMENT_ID`, `RELEASE_SHA`,
`ZANE_DEPLOYMENT_SLOT`, `RO_DEMO_ENVIRONMENT_ID`, `DATABASE_URL`, and the
operator-managed non-secret `RO_DEMO_DATABASE_INSTANCE_ID`. The catalog-state
database fingerprint is the canonical SHA-256 of the module identity, sorted
product IDs, variant IDs, store IDs, and the RO sales-channel ID. A separate
`databaseInstanceFingerprint` binds the normalized PostgreSQL host, port and
database name to `RO_DEMO_DATABASE_INSTANCE_ID`; credentials and URL query
parameters are excluded and never logged. This prevents a byte-identical clone
from reusing a reviewed production plan.

Capture that value read-only on the exact deployment first:

```bash
pnpm exec medusa exec ./src/scripts/ro-demo-commerce/runtime.ts \
  --capture-deployment-fingerprint \
  --manifest ./secure-input/ro-demo-commerce.json \
  --fingerprint-output /tmp/ro-demo-commerce-fingerprint.json \
  --expected-environment-id ENVIRONMENT_ID \
  --expected-backend-deployment-id DEPLOYMENT_ID \
  --expected-backend-release-sha 40_HEX_RELEASE_SHA \
  --expected-backend-build-hash BUILD_HASH \
  --expected-backend-slot blue \
  --expected-commerce-manifest-sha256 64_HEX_COMMERCE_MANIFEST_SHA256 \
  --expected-price-authority-sha256 \
    7c925a58a1753a8f609223ff2b40e21c49846bc97010f410030441a0482f7fb5
```

The canonical `0600` no-clobber artifact reports product/variant/store counts,
the sales channel, complete deployment identity, both database fingerprints,
the reviewed authority SHA, and `skCommerceBaseline: { count, sha256 }`. The SK
hash uses exactly the planner's protected non-RON prices, SK regions, SK service
zones, and non-RON store currencies. Use both database fingerprints and the SK
baseline SHA from this pre-deployment capture in the following dry-run and
apply.

Dry-run is the default and performs no commerce writes. All output paths are
absolute, pairwise distinct, and no-clobber:

```bash
pnpm exec medusa exec ./src/scripts/ro-demo-commerce/runtime.ts \
  --manifest ./secure-input/ro-demo-commerce.json \
  --plan-output /tmp/ro-demo-commerce-plan.json \
  --expected-environment-id ENVIRONMENT_ID \
  --expected-backend-deployment-id DEPLOYMENT_ID \
  --expected-backend-release-sha 40_HEX_RELEASE_SHA \
  --expected-backend-build-hash BUILD_HASH \
  --expected-backend-slot blue \
  --expected-commerce-manifest-sha256 64_HEX_COMMERCE_MANIFEST_SHA256 \
  --expected-database-fingerprint 64_HEX_DATABASE_FINGERPRINT \
  --expected-database-instance-fingerprint \
    64_HEX_DATABASE_INSTANCE_FINGERPRINT \
  --expected-price-authority-sha256 \
    7c925a58a1753a8f609223ff2b40e21c49846bc97010f410030441a0482f7fb5 \
  --expected-sk-commerce-baseline-sha256 \
    64_HEX_SK_COMMERCE_BASELINE_FROM_CAPTURE
```

Apply requires both an explicit demo acknowledgement and the exact fresh plan
hash:

```bash
pnpm exec medusa exec ./src/scripts/ro-demo-commerce/runtime.ts \
  --manifest ./secure-input/ro-demo-commerce.json \
  --plan-output /tmp/ro-demo-commerce-plan.json \
  --restore-output /tmp/ro-demo-commerce-restore.json \
  --receipt-output /tmp/ro-demo-commerce-receipt.json \
  --expected-environment-id ENVIRONMENT_ID \
  --expected-backend-deployment-id DEPLOYMENT_ID \
  --expected-backend-release-sha 40_HEX_RELEASE_SHA \
  --expected-backend-build-hash BUILD_HASH \
  --expected-backend-slot blue \
  --expected-commerce-manifest-sha256 64_HEX_COMMERCE_MANIFEST_SHA256 \
  --expected-database-fingerprint 64_HEX_DATABASE_FINGERPRINT \
  --expected-database-instance-fingerprint \
    64_HEX_DATABASE_INSTANCE_FINGERPRINT \
  --expected-price-authority-sha256 \
    7c925a58a1753a8f609223ff2b40e21c49846bc97010f410030441a0482f7fb5 \
  --expected-sk-commerce-baseline-sha256 \
    64_HEX_SK_COMMERCE_BASELINE_FROM_CAPTURE \
  --demo --apply --confirm-plan-hash HASH_FROM_DRY_RUN
```

`--plan-output` is mandatory and absolute. Dry-run writes the complete canonical
per-entity mutation ledger atomically with mode `0600`; its SHA-256 is the plan
hash. Apply reads that reviewed artifact and requires exact byte equality with
the freshly regenerated canonical plan before the first write.

Before the first write, the tool re-loads the manifest and authority exact
bytes, repeats the complete inspection and deployment/database check, rebuilds
the exact plan, and rejects authority, plan, environment, database, or SK drift.
It reserves the restore and receipt paths, then writes a canonical `0600`
restore evidence artifact containing the planner's pre-write inspection
snapshot. It is sufficient for drift and receipt proof, but it is not a
lossless executable rollback image: shipping and tax inspection omit fields
needed to reconstruct every overwritten entity.

The target region is staged without Romania. Store, price preference, service
zone, shipping, tax, and RON price changes are prepared while `ro` still belongs
to its original region. The SK baseline is checked again. Only then does one
Region Module `upsertRegions` call atomically remove `ro` from its former owner
and assign it to the target. A post-handoff failure atomically assigns Romania
back to the original region. Prefix resources remain isolated/tool-owned and
can be reconciled with a new reviewed plan. Exact recovery of every prefix
write requires the separately tested full Medusa database backup; this script
has no restore executor.

After apply it re-reads and proves the exact RO region/payment marker, service
zone, three shipping options, 21%/11% tax IDs, and every approved RON price. It
writes a canonical `0600` receipt bound to the plan hash, authority hash,
deployment/database identity, restore-artifact hash, SK before/after hashes,
and a hash of the complete post-state ledger. Pure strict parsers and hash
helpers for both artifacts live in `artifacts.ts`. Preserve all three artifacts
for the post-commerce envelope and release gate. Never rerun the broad
Herbatika seed as rollback.

The configured COD fee/minimum are recorded in the reviewed plan only. They are
not written as region metadata and the COD provider is not linked. Enabling COD
later requires checkout/server validation of the 40 RON minimum, adding exactly
9.45 RON, COD-marked shipping options, and end-to-end tests. The system fallback
never debits a customer and is accepted only for the exact Romanian demo marker;
outside that marker the normal pickup-only system-provider policy remains.
