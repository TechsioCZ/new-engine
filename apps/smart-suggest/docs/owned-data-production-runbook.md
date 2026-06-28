# Smart Suggest Owned Data Production Runbook

This runbook is for reviewers and operators preparing the Smart Suggest owned
CZ address rollout. It is public-safe documentation: do not add provider
secrets, private terms, customer queries, or real production address snapshots.

## Operating Model

Smart Suggest serves owned CZ address suggestions from Cloudflare D1 first.
Live providers are fallback-only and must not be required for offline owned-data
acceptance.

The target production topology is one router D1 plus 14 address shards by
official CZ VUSC/kraj code:

| Database                    | Role                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `smart-suggest-router`      | Source-derived routing metadata, active shard versions, health, and import version pointers. |
| `smart-suggest-cz-vusc-19`  | Praha address records and derived search index.                                              |
| `smart-suggest-cz-vusc-27`  | Stredocesky address records and derived search index.                                        |
| `smart-suggest-cz-vusc-35`  | VUSC shard `35`.                                                                             |
| `smart-suggest-cz-vusc-43`  | VUSC shard `43`.                                                                             |
| `smart-suggest-cz-vusc-51`  | VUSC shard `51`.                                                                             |
| `smart-suggest-cz-vusc-60`  | VUSC shard `60`.                                                                             |
| `smart-suggest-cz-vusc-78`  | VUSC shard `78`.                                                                             |
| `smart-suggest-cz-vusc-86`  | VUSC shard `86`.                                                                             |
| `smart-suggest-cz-vusc-94`  | VUSC shard `94`.                                                                             |
| `smart-suggest-cz-vusc-108` | VUSC shard `108`.                                                                            |
| `smart-suggest-cz-vusc-116` | VUSC shard `116`.                                                                            |
| `smart-suggest-cz-vusc-124` | VUSC shard `124`.                                                                            |
| `smart-suggest-cz-vusc-132` | VUSC shard `132`.                                                                            |
| `smart-suggest-cz-vusc-141` | VUSC shard `141`.                                                                            |

D1 stores normalized `address_records`, source metadata, import-run metadata,
tombstone metadata, and derived search rows. D1 must not store raw retained
source snapshots. Raw production snapshots belong in external operator-owned
storage, referenced by URI, checksum, source id, dataset version, import-run
metadata, and the hash of the reviewed modification note.

The paid D1 limit is 10 GB per database. Warn at 5 GB projected or actual shard
size and block normal imports at 6 GB. Overflow, if ever needed, must split a
large region deterministically by source-derived keys such as postal, ORP, or
municipality ranges. Never add a catch-all address database.

The production search index is FTS5-first. Treat FTS virtual tables as
rebuildable derived data: canonical rows and import metadata are the backup
surface, and FTS is rebuilt after import, restore, or reimport.

## Preflight

Run these checks before creating or replacing production data:

```bash
cd apps/smart-suggest
mise install
pnpm install
pnpm format:check
pnpm lint
pnpm build:packages
pnpm typecheck
pnpm skills:check
pnpm i18n:boundaries
pnpm contract:check
pnpm test:smoke
pnpm mf:types
pnpm performance:readiness
```

Before a production import, the operator must also have:

- a retained external baseline snapshot URI outside git;
- a checksum for every baseline or delta artifact;
- source metadata: source id, dataset version, feed id, source URI, generated
  or valid timestamp, source attribution, and modification note for normalized
  runtime rows;
- shard mapping proof showing every CZ row resolves to exactly one VUSC code;
- a rollback target: either the previous active D1 shard version or a previous
  external snapshot plus applied delta list;
- provider fallback disabled for offline owned-data acceptance.

The operations helper validates the generated D1 plan and emits public-safe
backup/export commands without mutating D1:

```bash
pnpm smart-suggest:d1:preflight
pnpm smart-suggest:d1:preflight:production
```

The production preflight must pass before a real import. It requires the router
D1 plus all 14 VUSC shard bindings and Cloudflare database ids in the generated
or operator-owned Wrangler config. A non-strict local preflight can pass with a
partial fixture config, but that is not production acceptance.

## Shard Creation

Create the router database and every VUSC shard explicitly. Capture the returned
database ids in deployment-owned configuration, not in git.

```bash
wrangler d1 create smart-suggest-router
wrangler d1 create smart-suggest-cz-vusc-19
wrangler d1 create smart-suggest-cz-vusc-27
wrangler d1 create smart-suggest-cz-vusc-35
wrangler d1 create smart-suggest-cz-vusc-43
wrangler d1 create smart-suggest-cz-vusc-51
wrangler d1 create smart-suggest-cz-vusc-60
wrangler d1 create smart-suggest-cz-vusc-78
wrangler d1 create smart-suggest-cz-vusc-86
wrangler d1 create smart-suggest-cz-vusc-94
wrangler d1 create smart-suggest-cz-vusc-108
wrangler d1 create smart-suggest-cz-vusc-116
wrangler d1 create smart-suggest-cz-vusc-124
wrangler d1 create smart-suggest-cz-vusc-132
wrangler d1 create smart-suggest-cz-vusc-141
```

Generate the deployment env template for the router plus all 14 VUSC shard
database ids, then fill the placeholders from the `wrangler d1 create` output
in deployment-owned environment configuration:

```bash
pnpm smart-suggest:d1:cz-shards:template
```

After `pnpm cloudflare:build` has produced the generated Wrangler config, emit
the exact non-mutating D1 creation plan for the router and every VUSC shard:

```bash
pnpm smart-suggest:d1:provision-plan
```

Run the emitted `wrangler d1 create ...` commands in the deployment-owned
Cloudflare account, then paste the returned database ids into the emitted env
template. The provision plan intentionally does not execute remote creation by
itself; it is a reviewed operator handoff artifact.

The Cloudflare build post-processor can then generate every CZ VUSC D1 binding
without a hand-written JSON array:

```bash
export SMART_SUGGEST_ROUTER_D1_ENABLED=true
export SMART_SUGGEST_ROUTER_D1_DATABASE_ID="<router-database-id>"
export SMART_SUGGEST_D1_CZ_VUSC_SHARDS_ENABLED=true
export SMART_SUGGEST_CZ_VUSC_19_DATABASE_ID="<cz-vusc-19-database-id>"
# ...repeat the generated SMART_SUGGEST_CZ_VUSC_<code>_DATABASE_ID exports...

pnpm cloudflare:build
pnpm smart-suggest:d1:preflight:production
```

Local generated configs may use deterministic placeholder ids so Wrangler can
run local D1 commands. Production preflight rejects those placeholder ids when
`--require-cloudflare-ids` is enabled; passing production preflight requires the
real Cloudflare database ids from D1 creation.

Use active/standby shard versions for destructive rebuilds:

1. Keep current active shard bindings serving traffic.
2. Create or reuse standby databases for the new baseline.
3. Apply migrations and import into standby databases.
4. Validate row counts, source metadata, FTS rebuild, size headroom, and offline
   search proof.
5. Flip router metadata to the validated standby version.
6. Keep the previous active version until the rollback window closes.

The current generated Cloudflare deploy path can wire the router database plus
all 14 CZ VUSC shard bindings. Production rollout still requires
deployment-owned Cloudflare D1 database ids and the external retained RUIAN
snapshot metadata before the strict seed command can execute.

## Migrations

Build the Cloudflare output before remote migration work so generated Wrangler
configuration and copied Smart Suggest migrations are current:

```bash
pnpm cloudflare:build
```

Apply the Smart Suggest storage migrations to the router and every address
shard before import. When the production sharded Wrangler config exists, use the
deployment-owned config for each database:

```bash
wrangler d1 migrations apply smart-suggest-router --remote --config apps/shell-super-app/.output/wrangler.json
wrangler d1 migrations apply smart-suggest-cz-vusc-19 --remote --config apps/shell-super-app/.output/wrangler.json
```

Repeat for all VUSC shard database names. If the generated config does not yet
contain the sharded bindings, apply migrations through the operator-owned
Wrangler config that does contain them. Do not patch generated deploy config in
this runbook step.

After migrations, verify each database responds to a storage health check and
has the expected ordinary tables before importing data. FTS tables may be empty
until the baseline import rebuilds them.

## Baseline Import

The baseline source is an external retained snapshot, not a committed fixture.
Keep the raw snapshot in object storage or another operator-controlled location
and store only URI/checksum/source metadata in D1.

Baseline import flow:

1. Discover the current source file through the approved public source discovery
   path instead of hardcoding a dated artifact.
2. Download and retain the raw artifact outside git.
3. Record checksum, source URI, snapshot URI, dataset version, generated/valid
   timestamp, source attribution, and attribution/modification metadata.
4. Normalize rows into `AddressSnapshotRow` objects outside git.
5. Partition rows by `countryCode=CZ` and `regionCode=<VUSC_KOD>`.
6. Reject rows missing a stable source row id or VUSC code.
7. Reject rows whose VUSC code does not match the target shard.
8. Import one standby shard at a time with restartable upserts.
9. Run post-import D1 optimization for the router and every imported shard.
10. Record import-run status, total rows, inserted/upserted rows, tombstones,
    failed rows, source checksum, and source URI.
11. Validate every standby shard before router activation.

Use the strict production seed wrapper as the operator entrypoint. Without
`--execute` it validates the snapshot path, expected SHA-256 checksum, required
source metadata, source attribution/modification-note provenance, router
binding, shard bindings, and D1 preflight, then writes a redacted plan report.
With `--execute` it passes the expected checksum and modification-note hash into
the mutating importer, runs the sharded import, D1-safe post-import
optimization, and strict post-import status. The public-safe seed report records
source attribution directly and stores only a hash of the free-form modification
note. Shard D1 `smart_suggest_data_sources` rows store the same
`modification_note_sha256` proof, not the raw note text. The wrapper uses
`SMART_SUGGEST_D1_SHARD_BINDINGS` from the generated Wrangler config when the
operator does not pass `--shard-bindings` or export the env var manually.

```bash
export SMART_SUGGEST_RUIAN_SNAPSHOT_PATH="<local-retained-ruian-snapshot-path>"
export SMART_SUGGEST_RUIAN_SNAPSHOT_CHECKSUM_SHA256="<sha256-hex>"
export SMART_SUGGEST_RUIAN_SOURCE_URI="https://vdp.cuzk.gov.cz/vymenny_format/csv/20260531_OB_ADR_csv.zip"
export SMART_SUGGEST_RUIAN_SNAPSHOT_URI="r2://smart-suggest-snapshots/ruian/20260531_OB_ADR_csv.zip"
export SMART_SUGGEST_RUIAN_DATASET_VERSION="ruian-cz-2026-05-31"
export SMART_SUGGEST_RUIAN_SOURCE_VERSION="20260531"
export SMART_SUGGEST_RUIAN_SOURCE_GENERATED_AT="2026-06-01T07:18:12+02:00"
export SMART_SUGGEST_RUIAN_SOURCE_VALID_AT="2026-05-31T00:00:00+02:00"
export SMART_SUGGEST_RUIAN_ATOM_ENTRY_ID="RUIAN-CSV-ADR-ST-20260531_OB_ADR_csv.zip"
export SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH="<local-retained-ruian-st-uzsz-snapshot-path>"
export SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_CHECKSUM_SHA256="<sha256-hex>"
export SMART_SUGGEST_RUIAN_ATTRIBUTION_LABEL="CUZK RUIAN"
export SMART_SUGGEST_RUIAN_ATTRIBUTION_LICENSE="CC BY 4.0"
export SMART_SUGGEST_RUIAN_ATTRIBUTION_URL="https://ruian.cuzk.cz/"
export SMART_SUGGEST_RUIAN_MODIFICATION_NOTE="Smart Suggest normalizes RUIAN source rows into runtime address suggestions."

pnpm smart-suggest:seed:production

pnpm smart-suggest:seed:production:execute
```

The production wrapper defaults to `--csv-encoding windows-1250` and
`--csv-delimiter ";"` for the official RUIAN CSV export. The retained
`ST_UZSZ` VFR snapshot is used only to derive municipality-to-VÚSC shard
routing; its local path is redacted from public reports, while its checksum and
file name are recorded.

Only export the shard binding allowlist manually when using a custom Wrangler
config or intentionally overriding the generated binding list:

```bash
export SMART_SUGGEST_D1_SHARD_BINDINGS="SMART_SUGGEST_CZ_VUSC_19,\
SMART_SUGGEST_CZ_VUSC_27,SMART_SUGGEST_CZ_VUSC_35,\
SMART_SUGGEST_CZ_VUSC_43,SMART_SUGGEST_CZ_VUSC_51,\
SMART_SUGGEST_CZ_VUSC_60,SMART_SUGGEST_CZ_VUSC_78,\
SMART_SUGGEST_CZ_VUSC_86,SMART_SUGGEST_CZ_VUSC_94,\
SMART_SUGGEST_CZ_VUSC_108,SMART_SUGGEST_CZ_VUSC_116,\
SMART_SUGGEST_CZ_VUSC_124,SMART_SUGGEST_CZ_VUSC_132,\
SMART_SUGGEST_CZ_VUSC_141"
```

The low-level importer remains available as
`scripts/smart-suggest-owned-import.mjs import-sharded-d1`, but production
review should use the wrapper because it ties preflight, import, optimize, and
strict status together. Reports redact local snapshot and D1 persistence paths.
They must not include raw rows, raw queries, provider payloads, raw
modification-note text, or secrets.
Import run ids are restartable only for the same source identity. If an existing
run id is retried with a different checksum, feed id, source URI, source
version, Atom entry id, import kind, or shard country, storage rejects the
restart with `import-run-conflict` instead of overwriting lineage.
When preflight, import, optimize, or status stops the seed, the wrapper still
writes the public-safe seed report with `status: blocked`, the failed stage, and
the relevant D1 report path so reviewers can inspect the exact stop condition.
`pnpm smart-suggest:proof:production-seed-blocked` proves this blocked-report
path with a synthetic retained snapshot and placeholder local D1 ids. It must
fail before import in strict production mode.

If the operator uses a Wrangler config outside the generated default, pass it to
both wrapper commands with `-- --wrangler-config <path>`.

## Daily Deltas

Daily deltas are supported through the same restartable import pipeline as
baseline files, with explicit Atom continuity metadata. Apply daily deltas in
source order:

1. Retain each delta artifact outside git and record checksum/source metadata.
2. Pass the Atom entry id of the previous source file with
   `--previous-atom-entry-id`; for RUIAN Atom feeds this is the
   `vf:PredchoziSoubor` value.
3. Partition delta rows by VUSC shard.
4. Upsert changed active records, mark tombstones as not searchable, and keep
   stable source row ids.
5. Let the importer reject deltas whose previous Atom entry does not match the
   latest completed baseline or delta for the same source and shard.
6. Do not run two baseline/delta imports for the same source and shard at once;
   storage rejects overlapping sequenced runs and the D1 schema enforces the
   same active-run guard.
7. Refresh the shard FTS5 table after the delta batch.
8. Update router freshness/import metadata only after the shard delta completes.
9. Alert on failed rows, stale import age, shard size threshold, or provider
   fallback spikes.

Do not use live providers to hide a missing or failed delta import.

## Validation And Status Checks

Before flipping router metadata, verify each standby shard:

- migrations applied cleanly;
- source id and dataset version match the planned baseline or delta;
- import run status is `completed`;
- failed rows are zero or reviewed and accepted;
- row counts match the shard manifest within the documented tolerance;
- tombstone counts match the source delta expectations;
- RUIAN source provenance contains catalog attribution plus the Smart Suggest
  modification-note hash;
- shard size is below the 5 GB warning threshold;
- FTS5 search returns expected owned rows for strong address queries;
- weak text does not fan out across all shards;
- provider event count is zero for offline proof;
- status output contains no raw user query, provider payload, or secret value.

Service status is available through the Smart Suggest API:

```bash
curl "$SMART_SUGGEST_BASE_URL/v1/status"
```

Review the response for `db`, `imports.recentRuns`, `metrics`,
`sourcePolicy.rawQueryStorage`, and provider event counters. The response should
show source ids and counters only.

For direct D1 checks, use read-only SQL against each database:

```bash
wrangler d1 execute smart-suggest-cz-vusc-19 --remote \
  --command "select status, source_id, total_rows, failed_rows, completed_at from smart_suggest_import_runs order by started_at desc limit 5"

wrangler d1 execute smart-suggest-cz-vusc-19 --remote \
  --command "select count(*) as active_records from smart_suggest_address_records where search_visible = 1 and replication_status = 'active'"

wrangler d1 execute smart-suggest-cz-vusc-19 --remote \
  --command "select id, attribution_label, attribution_license, attribution_url, modification_note_sha256 from smart_suggest_data_sources where id = 'ruian-cz'"
```

Use the D1 operations helper for router health, shard freshness, import age,
failed-row count, durable source provenance, and D1 size headroom. Source
provenance status reads each shard `smart_suggest_data_sources` row and fails if
the `ruian-cz` catalog attribution or `modification_note_sha256` is missing.
Size headroom comes from the router shard registry `estimated_size_bytes`
metadata because Wrangler D1 does not authorize SQLite page-size PRAGMA queries.
Production status must require that metadata so missing shard estimates fail
loudly. The sharded import writes a deterministic conservative estimate from the
routed canonical shard payload and row count; treat it as a headroom guard, then
reconcile it with Cloudflare's database metrics during production operations.

```bash
pnpm smart-suggest:d1:status:production
```

After a full import or restore, run the D1 optimize step before treating status
as production-readiness evidence. The optimize operation uses D1-compatible
`PRAGMA optimize` for the router and shards, plus the FTS5 optimize command for
address shard search tables. It does not run SQLite-only maintenance PRAGMAs.

```bash
pnpm smart-suggest:d1:optimize:production
pnpm smart-suggest:d1:status:production
```

Use `/v1/status` and the public demo proof for provider fallback counters and
spike detection during owned-data proof. Use the benchmark gate for local
regression detection and the final seeded comparison report for production
cost/latency/quality decisions.

## Backup And Export Limits

Before destructive imports or router flips, keep two rollback surfaces:

- the previous active D1 router and shard databases;
- the external source snapshot plus checksum and import metadata needed to
  rebuild normalized rows.

Cloudflare D1 Time Travel is useful for point-in-time restore of a production
database, but it is an in-place database restore surface. Do not treat it as the
only recovery plan for a bad import or shard flip. The durable recovery source
for Smart Suggest is the retained official snapshot, applied delta list,
importer version, schema version, and router/shard metadata needed to rebuild a
standby shard and flip routing back safely.

D1 export cannot be the only backup plan for Smart Suggest shards because FTS
virtual tables are rebuildable derived data and can block export workflows.
Back up canonical ordinary tables and import metadata, then rebuild FTS after
restore. If an export command fails because a database contains virtual tables,
use one of these safe paths:

- keep the previous active shard database untouched and flip the router back on
  rollback;
- recreate the standby shard from the external snapshot and recorded deltas;
- export only canonical ordinary tables through an operator-owned process that
  omits FTS virtual tables.

Generate the canonical-table backup command plan before each destructive import
or router flip:

```bash
pnpm smart-suggest:d1:preflight:production
node scripts/smart-suggest-d1-operations.mjs backup-plan \
  --d1-target remote \
  --require-14-cz-shards \
  --require-cloudflare-ids \
  --json-out .codex/reports/smart-suggest-d1-operations/backup-plan-production.json
```

The emitted `wrangler d1 export` commands include all ordinary Smart Suggest
tables and intentionally omit the `smart_suggest_address_search_fts` virtual
table. The export output path must stay outside committed source or under
ignored public-safe reports. Production exports, source snapshots, and generated
runtime rows must never be committed.

Run read-only D1 status checks after migrations/imports and before router
activation:

```bash
node scripts/smart-suggest-d1-operations.mjs optimize \
  --d1-target remote \
  --execute \
  --require-14-cz-shards \
  --require-cloudflare-ids \
  --json-out .codex/reports/smart-suggest-d1-operations/optimize-production.json

node scripts/smart-suggest-d1-operations.mjs status \
  --d1-target remote \
  --execute-readonly \
  --require-14-cz-shards \
  --require-cloudflare-ids \
  --require-size-estimates \
  --json-out .codex/reports/smart-suggest-d1-operations/status-production.json
```

This status command fails when required tables are missing, import metadata is
unreadable, shard/router read-only checks fail, import metadata is stale,
failed rows exceed the configured threshold, or required size estimates are
missing.

Never commit exported D1 data, raw snapshots, or generated production address
rows. Backup artifacts and reports stay outside git unless they are synthetic,
redacted, and intentionally public-safe.

## Rollback And Reimport

Rollback uses router metadata first:

1. Stop new destructive import work.
2. Mark the failed standby version inactive or failed in operator notes.
3. Flip the router back to the previous active shard set.
4. Confirm `/v1/status` reports the previous import version and healthy shards.
5. Run offline owned-search proof with live providers disabled.
6. Keep the failed standby databases for inspection until the incident review is
   complete, then delete or rebuild them through the normal change process.

If a shard was already activated and must be rebuilt:

1. Create a new standby shard database.
2. Apply migrations.
3. Reimport the last known-good external baseline.
4. Reapply accepted deltas in order.
5. Rebuild FTS5.
6. Validate counts, metadata, size, and search proof.
7. Flip router metadata to the rebuilt shard.

The import runner is restartable by idempotent upsert for a fixed run id after a
bad snapshot is corrected. Do not retry by editing normalized production rows by
hand.

## Review Boundaries

Reviewers should separate these surfaces:

| Surface                    | Examples                                                                                                                                                    | Review expectation                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Code                       | `libs/smart-suggest/datasets`, `libs/smart-suggest/storage`, `libs/smart-suggest/indexing`, `libs/smart-suggest/integrations`, `apps/smart-suggest/scripts` | Verify package boundaries, source policy checks, import behavior, D1 migrations, status output, and provider fallback handling. |
| Synthetic fixtures         | `apps/smart-suggest/scripts/fixtures/synthetic-k-louzi-1258-12.jsonl`, `apps/smart-suggest/scripts/fixtures/smart-suggest-benchmark-corpus-v1.json`         | Allowed in git only because they are tiny, public-safe, synthetic or RUIAN-like scenarios. They are not production snapshots.   |
| Generated or deploy output | `apps/smart-suggest/apps/shell-super-app/.output`, `dist`, `.codex/reports`                                                                                 | Do not treat generated output as source of truth. Reports committed to git must be public-safe and contain counts/ids only.     |
| External snapshots         | RUIAN baseline and delta artifacts retained in R2 or equivalent storage                                                                                     | Required for production import and rollback. They must stay outside git and be referenced by URI/checksum/source metadata only. |
| Production D1 data         | Router and VUSC shard databases                                                                                                                             | Contains normalized runtime rows and metadata only. Raw snapshots and provider payloads must not be stored there.               |

Code review should focus on durable behavior and boundaries. Data review should
focus on source metadata, checksum, shard manifest, import counts, failure
counts, and freshness. Fixture review should confirm no real customer traffic,
provider payloads, secrets, or bulk production rows were committed.

## Final Acceptance Gates

A production rollout is not accepted until all applicable gates pass and their
public-safe evidence is attached to the review.

Generated UltraModern gates:

```bash
cd apps/smart-suggest
pnpm format:check
pnpm lint
pnpm build:packages
pnpm typecheck
pnpm skills:check
pnpm i18n:boundaries
pnpm contract:check
pnpm test:smoke
pnpm mf:types
pnpm performance:readiness
pnpm build
```

Focused package tests:

```bash
pnpm --filter @techsio/smart-suggest-datasets test:runtime
pnpm --filter @techsio/smart-suggest-storage test:runtime
pnpm --filter @techsio/smart-suggest-indexing test:runtime
pnpm --filter @techsio/smart-suggest-validation test:runtime
pnpm --filter @techsio/smart-suggest-ui test:runtime
```

Current synthetic import and offline proof:

```bash
pnpm smart-suggest:import:local
pnpm smart-suggest:proof:offline
pnpm smart-suggest:proof:search-quality
pnpm smart-suggest:proof:d1-status
pnpm smart-suggest:proof:production-seed-blocked
node scripts/smart-suggest-owned-import.mjs import-d1 \
  --d1-target local \
  --apply-migrations \
  --snapshot-uri fixture://synthetic/k-louzi-1258-12
```

`smart-suggest:proof:d1-status` creates an isolated local Wrangler D1 state,
imports two synthetic official-style rows into two shards, executes local D1
optimization, and runs strict read-only status with required shard size
estimates. This proves the status/optimize path without depending on any
operator-owned local D1 state.

Production sharded import proof is required before rollout. Use
`smart-suggest:seed:production` and `smart-suggest:seed:production:execute` as
the entrypoint after the external snapshot and all remote D1 bindings exist.
The final evidence must show:

- router D1 plus all 14 VUSC shards created and migrated;
- external baseline snapshot URI and checksum recorded outside git;
- one completed import run per active shard;
- no shard over the 5 GB warning threshold;
- zero unreviewed failed rows;
- post-import D1 optimization completed after import;
- router metadata flipped only after validation;
- offline owned-search proof with provider events at zero;
- rollback proof using previous active shards or external-snapshot reimport.

Benchmark acceptance requires a generated report comparing owned search against
approved baselines with live providers disabled by default. The branch now has a
CI-safe local benchmark gate, an opt-in owned HTTP/API all-caches path, and
benchmark-only external baseline scaffolding:

```bash
node scripts/benchmark/validate-smart-suggest-benchmark-fixtures.mjs
pnpm smart-suggest:proof:search-quality
pnpm smart-suggest:benchmark:gate
pnpm smart-suggest:proof:final-boss-preflight
pnpm smart-suggest:proof:final-boss-assertion
pnpm smart-suggest:proof:http-cache-levels
SMART_SUGGEST_BENCHMARK_API_BASE_URL="$SMART_SUGGEST_BASE_URL" \
  pnpm smart-suggest:proof:search-quality:http
SMART_SUGGEST_BENCHMARK_API_BASE_URL="$SMART_SUGGEST_BASE_URL" \
  pnpm smart-suggest:benchmark:http
```

The final-boss comparison uses explicitly enabled external baselines as the
no-cache API-call side and `owned-db-all-caches` as the optimized owned DB/cache
side. The report keeps individual provider paths for diagnostics, then compares
the optimized candidate against the aggregate `naive-live-provider-no-cache`
baseline. The preflight must also see public-safe RUIAN source provenance in
`/v1/status`: the source row is present as `owned-dataset`, the attribution
matches the source catalog, and the Smart Suggest modification-note hash is
recorded without exposing the raw modification note. The final assertion also
requires `owned-db-all-caches` to expose enabled telemetry for every advertised
cache level on measured owned results and to prove active hit/write coverage
across the optimized strategy for browser memory, worker memory, edge cache, D1
read-through, and owned DB. It does not require every layer to hit on the same
request, because real cache stacks terminate at the first layer that can serve a
response. The final-boss command uses three measured iterations per scenario
with no warmup: the first two passes must call the deployed API with browser
memory missed, the measured API passes must include server cache write-through
and server-cache-hit evidence, and the third pass proves browser-memory hits
with zero Smart Suggest network requests and no lower-layer hit attribution.

```bash
SMART_SUGGEST_BENCHMARK_API_BASE_URL="$SMART_SUGGEST_BASE_URL" \
  pnpm smart-suggest:benchmark:preflight-final-boss

SMART_SUGGEST_BENCHMARK_API_BASE_URL="$SMART_SUGGEST_BASE_URL" \
  pnpm smart-suggest:benchmark:final-boss
```

Run the final-boss command only after the production owned dataset is seeded and
the operator has configured provider credentials/rate limits for the approved
baselines. The final-boss command first runs a preflight gate that checks:

- `SMART_SUGGEST_BENCHMARK_API_BASE_URL` points at the deployed Smart Suggest
  API; when it is missing, preflight reports `api-base-config` and skips
  status/suggest network probes;
- `/v1/status` is reachable on the deployed Smart Suggest API;
- a completed owned baseline or delta import exists and is marked
  `status: completed`;
- owned freshness is inside the configured SLA window;
- all 14 CZ VUSC shards are active;
- shard size guard status is ok;
- `/v1/suggest` returns an owned-dataset match for a public-safe benchmark
  scenario without provider fallback;
- live-provider benchmark opt-in is explicit;
- required provider configuration names are present.

Only after preflight passes does the command run the live external baselines.
The live benchmark runner also validates the ready preflight report before it
starts a final-boss-shaped run, so manual `--live-providers` invocation with the
owned deployed API path cannot skip this gate. It then chains the strict
final-boss report assertion, which requires:

- `owned-db-all-caches` from the deployed Smart Suggest API with owned-data
  freshness evidence from `/v1/status`;
- validated final-boss preflight evidence recorded in the benchmark report,
  including `api-base-config`, deployed status, completed import, shard health,
  owned-suggest, source-provenance, live opt-in, and provider config checks;
- live-provider opt-in recorded in the report;
- `naive-live-provider-no-cache` as the comparison baseline, aggregated from the
  configured real external provider paths;
- no-cache live-provider evidence for every approved external baseline in the
  final-boss script;
- every measured external baseline scenario result records disabled cache
  levels, at least one external API request, and an active provider event;
- every aggregate `naive-live-provider-no-cache` scenario result carries active
  provider evidence from each required external provider;
- every selected scenario has exactly the recorded measured-iteration count for
  `owned-db-all-caches`, `naive-live-provider-no-cache`, and every required
  concrete external baseline;
- `corpus.selection` covers every scenario in the public-safe benchmark corpus
  file passed to the assertion, preventing narrowed final-boss runs;
- owned DB hit-rate evidence for the deployed `owned-db-all-caches` candidate;
- provider events at zero for the owned path;
- no raw query, secret, provider payload, or absolute local path leakage.

Live-provider comparison is never part of the default CI-safe gate. The
assertion proof can be run without live providers; it regenerates a synthetic
full-provider final-boss report and negative cases for cached external results,
missing aggregate provider ids, wrong aggregate provider events, and a
single-provider comparison baseline. It also proves mismatched measured
iterations, out-of-selection scenario results, and partial corpus selections
fail the parity and full-corpus checks. The HTTP cache-level proof uses a
throwaway local HTTP endpoint to prove the three measured optimized-path passes
without live providers:

```bash
pnpm smart-suggest:proof:final-boss-assertion
pnpm smart-suggest:proof:http-cache-levels
```

The assertion can also be run directly against an existing operator report:

```bash
pnpm smart-suggest:benchmark:assert-final-boss
```

The final rollout remains blocked until the sharded production import proof and
production-scale benchmark comparison evidence exist and produce public-safe
evidence.
