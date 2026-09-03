# Herbatika SK/RO localization release gate

Read-only browser gate for the current SK and RO storefront deployment. It
checks rendered navigation, curated category and product content/slugs, HTML
language, title, canonical URL, reciprocal `hreflang`, currency, and observed
same-origin 5xx responses. It never adds to cart, submits checkout, or sends a
mutating request.

The default fixture pins the official Herbatika Befungin names and slugs.
Capture the internal SK and shared-inventory protection artifact **before any
backend write or deploy**. Then use its SK hash/count to capture the public SK
semantic baseline before the storefront deploy:

```sh
pnpm -C apps/medusa-be exec medusa exec \
  ./src/scripts/ro-catalog-import-sk-baseline.ts \
  --output /absolute/review/pre-backend-sk-baseline.json

pnpm -C apps/herbatika exec playwright install chromium
pnpm -C apps/herbatika exec node tests/ro-localization/capture-sk-baseline.mjs \
  --backend-sk-count <artifact.skProtection.baseline.count> \
  --backend-sk-hash <artifact.skProtection.baseline.sha256> \
  --output /absolute/path/to/sk-publication-before-deploy.json
```

After the reviewed import has completed, assemble the authoritative population
manifest from the authenticated, read-only source export. Pass the bearer
token only through the environment; never put it in the command line or URL:

```sh
export HERBATIKA_POPULATION_SOURCE_TOKEN='<short-lived population export token>'
pnpm -C apps/herbatika exec tsx \
  tests/ro-localization/population-manifest-cli.ts \
  --source-base-url https://population-export.internal/ \
  --taxonomy-approval /absolute/review/taxonomy-approval.json \
  --generated-at 2026-08-20T18:00:00.000Z \
  --output /absolute/evidence/urlr/population-manifest.json
```

Once the static-taxonomy convergence artifact exists and the Medusa outbox has
finished delivery, generate URLR convergence evidence from read-only database
credentials:

```sh
export DATABASE_URL='<Medusa read-only PostgreSQL URL>'
export URL_REGISTRY_DATABASE_URL='<URL Registry read-only PostgreSQL URL>'
pnpm -C apps/herbatika exec tsx \
  tests/ro-localization/urlr-convergence-cli.ts \
  --import-plan /absolute/path/to/reviewed-import-plan.json \
  --population-manifest /absolute/evidence/urlr/population-manifest.json \
  --static-taxonomy-convergence /absolute/evidence/urlr/static-taxonomy-convergence.json \
  --release-id ro-demo-20260820 \
  --generated-at 2026-08-20T18:05:00.000Z \
  --output /absolute/evidence/urlr/convergence.json
```

Reserve both output paths but do not create them. Both tools write private
`0600` files and fail closed instead of overwriting an existing artifact.
The handoff order is: retain the reviewed import plan and taxonomy approval,
assemble the population manifest, finalize static-taxonomy convergence, wait
for all in-scope outbox histories to be delivered, generate URLR convergence,
then freeze the evidence directory and its receipt. Only after that immutable
bundle is complete should the readiness proof be generated, signed, and passed
to `run-gate.mjs`.

After import and the single storefront deploy, generate the fresh Medusa
readiness report with its mandatory reviewed importer scope plan. Then bind it
to the live deployment and origins with a short-lived HMAC proof:

```sh
pnpm -C apps/medusa-be exec medusa exec ./src/scripts/ro-catalog-readiness.ts \
  --expected-sk-baseline-hash=<pre-apply-hash> \
  --expected-sk-baseline-count=<pre-apply-count> \
  --expected-inventory-baseline-hash=<pre-apply-inventory-hash> \
  --expected-inventory-baseline-count=<pre-apply-inventory-count> \
  --expected-scope-plan=/absolute/path/to/reviewed-import-plan.json \
  --cutover-receipt=/absolute/evidence/receipt.json \
  --expected-cutover-receipt-hash=<sha256-of-canonical-receipt-bytes> \
  --output=/absolute/path/to/backend-ro-readiness.json
export HERBATIKA_READINESS_PROOF_HMAC_KEY='<release secret, at least 32 bytes>'
pnpm -C apps/herbatika exec node tests/ro-localization/sign-backend-proof.mjs \
  --backend-readiness-report /absolute/path/to/backend-ro-readiness.json \
  --expected-scope-plan /absolute/path/to/reviewed-import-plan.json \
  --cutover-evidence-directory /absolute/evidence \
  --cutover-receipt /absolute/evidence/receipt.json \
  --output /absolute/path/to/signed-backend-proof.json
pnpm -C apps/herbatika exec node tests/ro-localization/run-gate.mjs \
  --sk-baseline /absolute/path/to/sk-publication-before-deploy.json \
  --backend-readiness-report /absolute/path/to/signed-backend-proof.json \
  --expected-scope-plan /absolute/path/to/reviewed-import-plan.json \
  --cutover-evidence-directory /absolute/evidence \
  --cutover-receipt /absolute/evidence/receipt.json \
  --live-report-output /absolute/path/to/ro-live-readiness.json
```

Reserve a unique `--live-report-output` path, but do not create the file. The
gate creates it privately (`0600`) and fails closed if that path already exists;
it never overwrites prior release evidence.

The evidence directory is immutable input. Its receipt uses fixed relative
paths for pre-commerce inventory/authority, commerce plan/restore/apply
receipt and its raw reviewed manifest, post-commerce envelope, catalog
artifacts, maintenance, URLR and
Meilisearch convergence. The verifier rejects path escape, symlinks escaping
the directory, non-canonical receipt bytes, any raw-file hash mismatch,
stale/wrong-environment post-commerce evidence, changed SK/shared inventory,
or a broken cross-phase hash.

Override deployment URLs with environment variables:

```sh
HERBATIKA_SK_BASE_URL=https://sk.example.test \
HERBATIKA_RO_BASE_URL=https://ro.example.test \
pnpm -C apps/herbatika exec node tests/ro-localization/run-gate.mjs
```

Equivalent CLI options include `--sk-base-url`, `--ro-base-url`, `--fixture`,
`--sk-baseline`, `--backend-readiness-report`, `--expected-scope-plan`,
`--cutover-evidence-directory`, `--cutover-receipt`,
`--live-report-output`, `--crawl-concurrency`, `--crawl-delay-ms`,
`--proof-max-age-ms`, and `--timeout-ms`. The fixture must use schema version
1. The SK baseline must be captured from the accepted SK
publication before deployment; capturing it after deployment defeats the
preservation check. Its provenance is cryptographically bound to the Medusa
readiness report's expected SK count and SHA-256.

Demo mode additionally requires the exact ledger used by Medusa:

```sh
pnpm -C apps/medusa-be exec medusa exec ./src/scripts/ro-catalog-readiness.ts \
  --expected-sk-baseline-hash=<pre-apply-hash> \
  --expected-sk-baseline-count=<pre-apply-count> \
  --expected-inventory-baseline-hash=<pre-apply-inventory-hash> \
  --expected-inventory-baseline-count=<pre-apply-inventory-count> \
  --expected-scope-plan=/absolute/path/to/reviewed-import-plan.json \
  --cutover-receipt=/absolute/evidence/receipt.json \
  --expected-cutover-receipt-hash=<sha256-of-canonical-receipt-bytes> \
  --readiness-mode=demo \
  --demo-omission-ledger=/absolute/path/to/ledger.json \
  --output=/absolute/path/to/backend-ro-readiness.json

pnpm -C apps/herbatika exec node tests/ro-localization/run-gate.mjs \
  --readiness-mode=demo \
  --demo-omission-ledger=/absolute/path/to/ledger.json \
  <the same proof, plan, receipt/evidence, and pre-deploy baseline arguments shown above>
```

Production mode rejects any ledger or demo warning. Demo mode permits only
`RO_DEMO_STRUCTURED_CONTENT_OMITTED` warnings whose product IDs and counts
exactly match the hash-bound ledger.

The gate generates readiness evidence itself. It recursively loads each
configured origin's sitemap index and same-origin shards, then checks every
published product, category, brand, and collection page with bounded
concurrency. SK/RO
identity comes from sitemap `hreflang`; localization requires a Romanian HTML
language, exact canonical, different SK/RO title and description, different
localized slug, embedded catalog identity, and exact `RON` structured
currency, including rejection of mixed visible/structured non-RON prices.
Counts therefore come from live URLs and cannot be supplied by a
fixture-shaped report. The backend readiness proof supplies exact-locale
database completeness and provenance, but its exact published/excluded ID
partitions and scope hash are reconciled against the independently supplied
reviewed importer plan and live sitemap identities.

The generated report has this shape:

```json
{
  "schemaVersion": 1,
  "market": "ro",
  "ready": true,
  "generatedAt": "2026-08-20T18:00:00.000Z",
  "origins": { "sk": "https://sk.example.test", "ro": "https://ro.example.test" },
  "builds": {
    "sk": { "hash": "deployment-hash", "slot": "blue" },
    "ro": { "hash": "deployment-hash", "slot": "blue" }
  },
  "evidenceSource": "live-sitemap-and-public-pages",
  "evidenceHash": "sha256-of-canonical-live-evidence",
  "summary": { "errors": 0, "issues": 0 },
  "skBaseline": { "unchanged": true },
  "skPublication": { "errors": 0 },
  "sitemap": {
    "productUrls": 2002,
    "checkedProductUrls": 2002,
    "failedUrls": []
  },
  "localization": {
    "products": { "total": 2002, "localized": 2002, "identityComplete": 2002, "ronComplete": 2002, "identicalSlugsToSk": 0, "missingSlugs": 0 },
    "categories": { "total": 207, "localized": 207, "identityComplete": 207, "ronComplete": 207, "identicalSlugsToSk": 0, "missingSlugs": 0 },
    "brands": { "total": 103, "localized": 103, "identityComplete": 103, "ronComplete": 103, "identicalSlugsToSk": 0, "missingSlugs": 0 },
    "collections": { "total": 0, "localized": 0, "identityComplete": 0, "ronComplete": 0, "identicalSlugsToSk": 0, "missingSlugs": 0 }
  }
}
```

Counts are live observations, not fixture inputs or hardcoded thresholds. The
current reviewed plan partitions the global catalog into 2,002 RO-published
and 149 excluded products, 207 RO-published and two excluded categories, 103
RO-published and 25 excluded brands, and zero collections. Those values are
not trusted as CLI numbers: the gate checks the exact sorted ID sets and their
canonical scope hash from the reviewed plan against the backend proof and live
sitemap. The gate requires every live sitemap product URL to be checked, zero
failed URLs, all entities localized, and zero missing or SK-identical slugs.
The SHA-256 evidence hash
binds the report to the configured origins, build headers, generation time,
backend proof, trusted pre-deploy SK publication fingerprint, and sorted live
results. The optional output path only persists this generated evidence; it is
never read back as authority. A 200 response is not enough: any SK content,
identity, canonical, locale, currency, or URL mutation changes the publication
fingerprint and fails the gate. Deployment hash/slot and raw HTML are not part
of the pre-deploy SK semantic fingerprint, so an unchanged SK storefront can
survive an intentional new build. Post-deploy, however, every sitemap shard
and catalog page must expose one common nonempty deployment hash and the same
valid Zane slot (`blue` or `green`) across both hosts.

Run the focused contract tests without a browser:

```sh
pnpm -C apps/herbatika exec node --test tests/ro-localization/*.node-test.mjs
```
