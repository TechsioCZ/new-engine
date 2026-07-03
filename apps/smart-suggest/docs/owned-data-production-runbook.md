# Smart Suggest Owned Data Production Runbook

This runbook is for reviewers and operators preparing the Smart Suggest owned
CZ address rollout. It is public-safe documentation: do not add provider
secrets, private terms, customer queries, or real production address snapshots.

## Operating Model

Smart Suggest serves owned CZ address suggestions from generated, complete,
source-provenanced static artifacts first on the no-pay path. Live providers
are fallback-only and must not be required for offline owned-data acceptance.
D1 is kept as metadata, health, bounded cache, and delta/control-plane storage
on the free tier. Full D1 address storage is the paid expansion path.

| Profile     | Surface                                 | Role                                                                                         |
| ----------- | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Free tier   | Static owned-data artifacts             | Complete RUIAN-derived address records plus postal/token indexes served from Cloudflare CDN. |
| Free tier   | `smart-suggest-router`                  | Optional source/import metadata, health, active artifact pointer, and bounded deltas/cache.  |
| Free tier   | `smart-suggest-free-tier-<01..09>`      | Optional bounded D1 fallback/delta shards only; not the default full baseline store.         |
| Paid expand | `smart-suggest-router`                  | Same router metadata, reused when expanding.                                                 |
| Paid expand | `smart-suggest-cz-vusc-<19,27,...,141>` | One physical address D1 per official CZ VUSC code after switching to Workers Paid.           |

Static artifacts store normalized runtime rows and derived lookup indexes. D1
stores source metadata, import-run metadata, bounded deltas/cache rows, and
health. Neither static artifacts nor D1 store raw retained source snapshots.
Raw production snapshots belong in external operator-owned storage, referenced
by URI, checksum, source id, dataset version, import-run metadata, and the hash
of the reviewed modification note.

The free D1 limit is 10 databases per account, 500 MB per database, and 5 GB
total storage. The retained RUIAN baseline is larger than the free write-budget
envelope for a one-shot D1 seed, so no-pay production acceptance is artifact
completeness plus strict runtime proof, not a mutating full D1 seed. D1
route-plan gates stay in the runbook because they prove the paid switch and any
bounded fallback topology before writes are allowed. Paid expansion switches to
one physical address D1 per official CZ VUSC code.

When D1 is used as the primary address store, the production search index is
FTS5-first. Treat FTS virtual tables as rebuildable derived data: canonical
rows and import metadata are the backup surface, and FTS is rebuilt after
import, restore, or reimport.

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

The default production preflight must pass before a real import. It requires
the router D1, configured free-tier address D1s, real Cloudflare database ids,
and free-tier physical database ceilings. The full production readiness proof
then parses the retained RUIAN snapshot and proves all 14 logical CZ VUSC
regions are covered by the hash-routed rows. Paid expansion has separate
commands that require all 14 physical VUSC shard databases.

## Free-Tier Static Artifact Build

The no-pay production path builds a complete artifact snapshot from the
retained RUIAN baseline and serves it as static assets. It must not use
`--max-rows`, `--allow-partial-artifact`, local sample data, or any runtime
fixture fallback.

```bash
pnpm smart-suggest:ruian:bootstrap
source /tmp/smart-suggest-ruian-source-env.sh
pnpm build:packages
pnpm smart-suggest:artifacts:build:production
```

The artifact builder reads the same source env values as the paid D1 seed and
fails before reading rows unless production lineage is complete: retained RUIAN
snapshot path, checksum, official source URI, retained snapshot URI, non-proof
dataset version, source id `ruian-cz`, source name, source version,
generated/valid timestamps, feed id, Atom entry id, CSV encoding, CSV delimiter,
and Smart Suggest modification note hash. It refuses fixture URIs, `--max-rows`,
and `--allow-partial-artifact` in production mode. The production report is
written to
`.codex/reports/smart-suggest-owned-artifacts/production.json`; the artifact
directory defaults to `apps/shell-super-app/smart-suggest-owned-data`.
Neither the raw snapshot nor generated production artifacts are committed.

The generated `manifest.json` is the runtime contract. Reviewers must verify:

- `schemaVersion` is `smart-suggest-owned-artifacts/v1`;
- `dataset.complete` is `true`;
- `dataset.source.id` is `ruian-cz`;
- `dataset.importRun.checksumSha256` matches the retained source checksum;
- `dataset.importRun.status` is `completed`;
- `indexes.addressRecords.complete` is `true` and the fixed
  `records/{countryCode}/{recordBucket}.json` shard count fits the static
  asset surface;
- `indexes.postalLocalities.complete` and `indexes.addressTokens.complete` are
  both `true`;
- address-token lookup uses fixed `token/{countryCode}/bucket-{tokenBucket}.json`
  buckets that contain candidate record ids, not duplicated full address
  records;
- shard/file count, `tokenBucketCount`, `recordShardCount`,
  `tokenIdReferenceCount`, and total artifact size fit the selected Cloudflare
  static asset surface;
- no raw provider payloads, customer queries, secrets, or source snapshots are
  present.

Build the generated artifact directory under the shell app before Cloudflare
build. UltraModern copies it through `deploy.worker.publicAssets`; Smart Suggest
does not stage or patch generated `.output` files after build. Configure the
BFF to read the manifest and keep D1 address fallback off on the no-pay path:

```bash
pnpm smart-suggest:artifacts:build:production
export ULTRAMODERN_PUBLIC_URL_SHELL_SUPER_APP="https://<public-origin>"
export SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL="https://<public-origin>/smart-suggest-owned-data/manifest.json"
export SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE=false
export SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS=false
export SMART_SUGGEST_OWNED_ARTIFACT_MAX_TOKEN_PAGES=8
pnpm cloudflare:build
pnpm --filter @smart-suggest/shell-super-app exec wrangler deploy --config .output/wrangler.json --dry-run
```

`SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE` must stay false in production.
The runtime refuses incomplete artifact manifests by default. D1 address reads
must stay disabled on the free path unless the operator intentionally deploys a
small reviewed delta/cache shard. The paid switch is then one of:

The reviewed no-pay deploy script keeps this static artifact path separate from
the paid D1 topology and strips generated corpus D1 bindings from Worker output
before deploy:

```bash
export ULTRAMODERN_PUBLIC_URL_SHELL_SUPER_APP="https://<public-origin>"
pnpm cloudflare:deploy:artifact-static
```

Set `SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL` explicitly when the manifest is
hosted on a different static origin.

- keep artifact serving enabled and add D1 for durable deltas/cache;
- enable D1 address fallback only after the bounded D1 data is proven;
- unset the artifact manifest URL and use the paid VUSC D1 topology as the
  primary store after the paid seed completes.

Reviewer proof for the artifact surface uses only synthetic public-safe data:

```bash
pnpm smart-suggest:artifacts:proof
```

This proof is not production evidence. Production evidence is the complete
full-snapshot artifact report plus runtime API/status/search proof against the
published manifest.

### Production vs Proof Guardrail

`build-artifacts` has two explicit modes:

- Production mode starts only when `--snapshot-path` is present through CLI or
  `SMART_SUGGEST_RUIAN_SNAPSHOT_PATH`. It must use real RUIAN metadata listed
  above and cannot inherit fixture defaults.
- Local proof mode starts only when `--fixture` is passed explicitly. It must
  use a proof-marked dataset version such as `synthetic-proof` and a
  `fixture://` snapshot URI. It is reviewer smoke proof only and must never be
  used as production evidence.

The package scripts mirror that split:
`smart-suggest:artifacts:build:production` is production-only after sourcing the
RUIAN env file; `smart-suggest:artifacts:proof` is local proof-only. Generated
artifact directories and reports under `.codex/` remain uncommitted.

### Locality and Postal-Prefix Contract

Follow-up runtime implementation should add these derived indexes without
changing the existing address-record and token contracts:

- City/locality index:
  - manifest key `indexes.localityCities`;
  - country scope `countryCode: "CZ"` and path template
    `locality/{countryCode}/city/{cityKey}.json`;
  - artifact schema `smart-suggest-locality-city-index/v1`;
  - query key `cityKey` is the normalized Czech locality/city token;
  - each entry includes `city`, optional `municipalityCode`, optional
    `districtCode`, optional `regionCode`, `postalCodes`, `recordIds`, and
    `ranking.addressCount`;
  - if no trusted population metadata is present, do not expose or infer city
    size. The ranking metric name is `addressCount`.

- Postal-prefix index:
  - manifest key `indexes.postalPrefixes`;
  - country scope `countryCode: "CZ"` and path template
    `postal-prefix/{countryCode}/{prefix}.json`;
  - artifact schema `smart-suggest-postal-prefix-index/v1`;
  - supported prefixes are normalized postal digits, length 1 through 5;
  - each entry includes `prefix`, matching `postalCodes`, top city/locality
    candidates, `recordIds`, and `ranking.addressCount`.

Both new indexes must carry `complete`, `sourceDatasetVersion`, `generatedAt`,
and ranking metadata in their manifest entries. Production runtime must treat a
missing or `complete: false` city/postal-prefix index as unavailable and fall
back to address-token/postal exact lookup, not D1 full-corpus reads.

## D1 Creation

### Free-Tier Default

For the no-pay artifact-first path, create only the router database when metadata, health, bounded deltas, or cache writes are needed. The full RUIAN baseline stays in owned artifacts, not in D1.

```bash
wrangler d1 create smart-suggest-router
```

The legacy full-D1 free-tier topology remains a capacity proof and paid-readiness guardrail. Use it only for a reviewed bounded fallback/delta plan, not as the default production baseline. It creates the router database plus up to nine address databases. Capture returned database ids in deployment-owned configuration, not in git.

```bash
wrangler d1 create smart-suggest-free-tier-01
wrangler d1 create smart-suggest-free-tier-02
wrangler d1 create smart-suggest-free-tier-03
wrangler d1 create smart-suggest-free-tier-04
wrangler d1 create smart-suggest-free-tier-05
wrangler d1 create smart-suggest-free-tier-06
wrangler d1 create smart-suggest-free-tier-07
wrangler d1 create smart-suggest-free-tier-08
wrangler d1 create smart-suggest-free-tier-09
```

Generate the free-tier deployment env template:

```bash
pnpm smart-suggest:d1:free-tier:template
```

The generated template sets:

```bash
export SMART_SUGGEST_D1_TOPOLOGY=free-tier
export SMART_SUGGEST_ROUTER_D1_DATABASE_ID="<router-database-id>"
export SMART_SUGGEST_D1_FREE_TIER_MAX_SHARDS_ENABLED=true
export SMART_SUGGEST_D1_SHARD_ROUTE_STRATEGY=hash
export SMART_SUGGEST_FREE_TIER_01_DATABASE_ID="<smart-suggest-free-tier-01-database-id>"
# ...repeat through SMART_SUGGEST_FREE_TIER_09_DATABASE_ID...
export SMART_SUGGEST_D1_SHARD_BINDINGS="SMART_SUGGEST_FREE_TIER_01,...,SMART_SUGGEST_FREE_TIER_09"
```

Cloudflare account limits may require fewer physical address databases. Keep `SMART_SUGGEST_D1_TOPOLOGY=free-tier`, provide the existing databases through `SMART_SUGGEST_D1_SHARDS_JSON`, and run the strict gates before any mutating D1 import:

```bash
pnpm cloudflare:build
pnpm smart-suggest:d1:validate-config
pnpm smart-suggest:d1:provision-plan
pnpm smart-suggest:d1:preflight:production
pnpm smart-suggest:proof:index-capacity
pnpm smart-suggest:seed:production:route-plan
pnpm smart-suggest:proof:free-tier-readiness:production
```

`smart-suggest:d1:validate-config` is validation-only. It must never rewrite `.output`, copy migrations, or patch worker/server bundles.

`smart-suggest:proof:free-tier-readiness` is the CI-safe reviewer proof for free-tier topology, FTS-only index-capacity projection, free-tier production seed defaults, and the paid VUSC env-template switch. `smart-suggest:proof:free-tier-readiness:production` adds real Cloudflare D1 id validation, full retained-snapshot route plan, and account-level D1 slot count. JSON summary is written to `.codex/reports/smart-suggest-free-tier-readiness/production-summary.json`.

Free-tier D1 seed execution is deliberately capacity-guarded and is not the default no-pay baseline path. The production seed wrapper defaults free-tier imports to `--search-index-mode fts-only` and `--shard-route-strategy hash`, then passes `--shard-max-rows 400000` and `--shard-max-estimated-size-bytes 500000000` to the sharded importer. This is not sampling: it aborts before D1 writes if a free-tier address shard would exceed the reviewed row or byte ceiling. If an operator explicitly uses `--search-index-mode fts-and-prefix`, the legacy storage-heavy guard remains `--shard-max-rows 125000`. Local `smart-suggest:proof:index-capacity` keeps the FTS-only strategy measured under the free-tier database budget on deterministic RUIAN-like rows. `smart-suggest:seed:production:route-plan` proves retained RUIAN snapshot distribution before any mutating D1 import is allowed.

### Paid Expansion

After switching Workers Paid, create every VUSC shard explicitly. Capture returned database ids in deployment-owned configuration, not in git.

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

Generate the paid deployment env template for router plus 14 VUSC shard database ids:

```bash
pnpm smart-suggest:d1:paid:cz-shards:template
```

After `pnpm cloudflare:build` produces the generated Wrangler config, emit the exact non-mutating D1 creation plan for router plus VUSC shards:

```bash
pnpm smart-suggest:d1:provision-plan:paid
```

Run the emitted `wrangler d1 create ...` commands in the deployment-owned Cloudflare account, then paste returned database ids into the emitted env template:

```bash
export SMART_SUGGEST_D1_TOPOLOGY=paid-vusc
export SMART_SUGGEST_D1_SHARD_ROUTE_STRATEGY=vusc
export SMART_SUGGEST_ROUTER_D1_DATABASE_ID="<router-database-id>"
export SMART_SUGGEST_D1_CZ_VUSC_SHARDS_ENABLED=true
export SMART_SUGGEST_CZ_VUSC_19_DATABASE_ID="<cz-vusc-19-database-id>"
# ...repeat SMART_SUGGEST_CZ_VUSC_<code>_DATABASE_ID for every VUSC code...
```

The provision plan intentionally does not execute remote creation. It is a reviewed operator handoff artifact. Validate the paid topology before import:

```bash
pnpm cloudflare:build
pnpm smart-suggest:d1:validate-config
pnpm smart-suggest:d1:preflight:production:paid
```

Paid expansion removes free-tier row guard configuration. It is a config/script switch, not a storage schema rewrite. Use active/standby rollout for new baselines:

1. Create standby router and shard databases.
2. Apply migrations and import into standby databases.
3. Validate row counts, source metadata, FTS rebuild, size headroom, and search proof.
4. Flip router metadata to the validated standby version.
5. Keep the previous active version until the rollback window closes.

## Migrations

Build Cloudflare output before remote migration work so the generated Wrangler config reflects source-owned D1 bindings:

```bash
pnpm cloudflare:build
pnpm smart-suggest:d1:validate-config
```

Apply Smart Suggest storage migrations to the router and every configured physical address database before import. On free tier this means `smart-suggest-router` plus configured `smart-suggest-free-tier-*` databases, or the custom address databases listed in `SMART_SUGGEST_D1_SHARDS_JSON`:

```bash
wrangler d1 migrations apply smart-suggest-router --remote --config apps/shell-super-app/.output/wrangler.json
wrangler d1 migrations apply smart-suggest-free-tier-01 --remote --config apps/shell-super-app/.output/wrangler.json
```

On paid expansion, repeat for every VUSC shard database name. If the generated config does not yet contain the intended binding, apply migrations through an operator-owned Wrangler config that does contain it. Do not patch generated deploy output in the runbook.

After migrations, verify that each database responds to storage health checks and contains expected ordinary tables before importing data. FTS tables may be empty until baseline import rebuilds them.

## Baseline Import

The baseline source is an external retained snapshot, not a committed fixture.
Keep the raw snapshot in object storage or another operator-controlled location
and store only URI/checksum/source metadata in D1.

Official RUIAN source discovery uses the CUZK Atom dataset feeds, not a
hardcoded dated ZIP. Check and retain the Atom XML beside the downloaded
snapshots as source metadata:

```bash
pnpm smart-suggest:ruian:bootstrap
source /tmp/smart-suggest-ruian-source-env.sh
pnpm smart-suggest:seed:production:route-plan
```

The bootstrap writes Atom XML, retained ZIP snapshots, checksums, an external
manifest, and `/tmp/smart-suggest-ruian-source-env.sh` outside git. It also
writes the public-safe summary report to
`.codex/reports/smart-suggest-ruian-source-bootstrap/summary.json`. Use
`RUIAN-CSV-ADR-ST` as the full-state address baseline, `RUIAN-S-ZA-U`
`ST_UZSZ` as the VFR hierarchy snapshot for municipality-to-VUSC routing, and
`RUIAN-S-ZA-Z` only for ordered daily deltas after the baseline is active. CUZK
open-data terms are CC BY 4.0; keep the catalog attribution values exactly as
the seed wrapper requires. `smart-suggest:seed:production:route-plan` parses
the real retained snapshot, derives municipality-to-VUSC routing, and writes
`.codex/reports/smart-suggest-production-seed/route-plan.json` without writing
D1 rows. It must pass before `smart-suggest:seed:production:execute`.

Baseline import flow:

1. Discover the current source file through the approved public source discovery
   path instead of hardcoding a dated artifact.
2. Download and retain the raw artifact outside git.
3. Record checksum, source URI, snapshot URI, dataset version, generated/valid
   timestamp, source attribution, and attribution/modification metadata.
4. Normalize rows into `AddressSnapshotRow` objects outside git.
5. Derive each row's VUSC code from the official hierarchy snapshot for
   coverage proof.
6. Route free-tier rows by the deterministic source-id hash route; route paid
   rows by `regionCode=<VUSC_KOD>`.
7. Reject rows missing a stable source row id or a derivable VUSC code.
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
export SMART_SUGGEST_RUIAN_SOURCE_URI="<RUIAN-CSV-ADR-ST entry id/link href>"
export SMART_SUGGEST_RUIAN_SNAPSHOT_URI="<retained-snapshot-uri-outside-git>"
export SMART_SUGGEST_RUIAN_DATASET_VERSION="ruian-cz-<source-valid-date>"
export SMART_SUGGEST_RUIAN_SOURCE_VERSION="<YYYYMMDD from source file>"
export SMART_SUGGEST_RUIAN_SOURCE_GENERATED_AT="<Atom entry updated timestamp>"
export SMART_SUGGEST_RUIAN_SOURCE_VALID_AT="<valid-at date derived from source metadata/file date>"
export SMART_SUGGEST_RUIAN_ATOM_ENTRY_ID="<RUIAN-CSV-ADR-ST Atom entry id>"
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
`ST_UZSZ` VFR snapshot is used to derive municipality-to-VUSC coverage for
route-plan proof; its local path is redacted from public reports, while its
checksum and file name are recorded.

Only export the shard binding allowlist manually when using a custom Wrangler
config or intentionally overriding the generated binding list. Free-tier
production uses row-balanced hash routing across the configured physical
address bindings:

```bash
export SMART_SUGGEST_D1_SHARD_ROUTE_STRATEGY=hash
export SMART_SUGGEST_D1_SHARD_BINDINGS="SMART_SUGGEST_FREE_TIER_01,SMART_SUGGEST_FREE_TIER_02,SMART_SUGGEST_FREE_TIER_03,SMART_SUGGEST_FREE_TIER_04,SMART_SUGGEST_FREE_TIER_05,SMART_SUGGEST_FREE_TIER_06,SMART_SUGGEST_FREE_TIER_07,SMART_SUGGEST_FREE_TIER_08,SMART_SUGGEST_FREE_TIER_09"
```

Paid expansion uses direct VUSC shard bindings:

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

Production freshness gates are stricter than a baseline import proof. A
month-start baseline can become too old for the default 48 hour status and
benchmark freshness windows before the next monthly baseline is published.
Replay accepted `RUIAN-S-ZA-Z` deltas through the latest retained Atom entry, or
record an explicit operator freshness exception before rollout evidence is
claimed.

1. Retain each delta artifact outside git and record checksum/source metadata.
2. Pass the Atom entry id of the previous source file with
   `--previous-atom-entry-id`; for RUIAN Atom feeds this is the
   `vf:PredchoziSoubor` value.
3. Route delta rows with the same active route strategy as the baseline:
   source-id hash on free tier, VUSC on paid.
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

For direct D1 checks, use read-only SQL against each physical address database.
On the free tier, the address database is `smart-suggest`:

```bash
wrangler d1 execute smart-suggest --remote \
  --command "select status, source_id, total_rows, failed_rows, completed_at from smart_suggest_import_runs order by started_at desc limit 5"

wrangler d1 execute smart-suggest --remote \
  --command "select count(*) as active_records from smart_suggest_address_records where search_visible = 1 and replication_status = 'active'"

wrangler d1 execute smart-suggest --remote \
  --command "select id, attribution_label, attribution_license, attribution_url, modification_note_sha256 from smart_suggest_data_sources where id = 'ruian-cz'"
```

Run a postal-fullness query against every physical address database. On the
free tier that is one query. `missing_postal_code` must be zero, and the summed
`active_records` must reconcile with the router shard registry row counts and
the production seed import report:

```bash
wrangler d1 execute smart-suggest --remote \
  --command "select count(*) as active_records, sum(case when postal_code is null or trim(postal_code) = '' then 1 else 0 end) as missing_postal_code, count(distinct replace(coalesce(postal_code, ''), ' ', '')) as distinct_postal_codes from smart_suggest_address_records where search_visible = 1 and replication_status = 'active'"
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
  --shard-route-strategy hash \
  --require-cloudflare-ids \
  --max-d1-databases 10 \
  --max-address-shard-databases 9 \
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
  --shard-route-strategy hash \
  --require-cloudflare-ids \
  --max-d1-databases 10 \
  --max-address-shard-databases 9 \
  --json-out .codex/reports/smart-suggest-d1-operations/optimize-production.json

node scripts/smart-suggest-d1-operations.mjs status \
  --d1-target remote \
  --execute-readonly \
  --shard-route-strategy hash \
  --require-cloudflare-ids \
  --require-size-estimates \
  --max-d1-databases 10 \
  --max-address-shard-databases 9 \
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

| Surface                    | Examples                                                                                                                                                                                                  | Review expectation                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code                       | `libs/smart-suggest/datasets`, `libs/smart-suggest/storage`, `libs/smart-suggest/indexing`, `libs/smart-suggest/integrations`, `apps/smart-suggest/scripts`                                               | Verify package boundaries, source policy checks, import behavior, D1 migrations, status output, and provider fallback handling.                            |
| Synthetic fixtures         | `libs/smart-suggest/datasets/src/sample-fixtures.ts`, `apps/smart-suggest/scripts/fixtures/synthetic-k-louzi-1258-12.jsonl`, `apps/smart-suggest/scripts/fixtures/smart-suggest-benchmark-corpus-v1.json` | Allowed in git only because they are tiny, public-safe, synthetic or RUIAN-like scenarios. They are not production snapshots or runtime BFF seed behavior. |
| Generated or deploy output | `apps/smart-suggest/apps/shell-super-app/.output`, `dist`, `.codex/reports`                                                                                                                               | Do not treat generated output as source of truth. Reports committed to git must be public-safe and contain counts/ids only.                                |
| Generated static artifacts | `apps/shell-super-app/smart-suggest-owned-data`, deployed static asset object paths                                                                                                                       | Full generated production address artifacts stay outside git. Review their public-safe manifest/report, completeness, file count, and size.                |
| External snapshots         | RUIAN baseline and delta artifacts retained in R2 or equivalent storage                                                                                                                                   | Required for production import and rollback. They must stay outside git and be referenced by URI/checksum/source metadata only.                            |
| Production D1 data         | Router plus free-tier hash shard databases, or router plus paid VUSC shard databases                                                                                                                      | Contains normalized runtime rows and metadata only. Raw snapshots and provider payloads must not be stored there.                                          |

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
pnpm smart-suggest:artifacts:proof
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

## Real Data-Plane Acceptance

Synthetic fixture proof is not production data-plane acceptance. A real
data-plane review must attach public-safe evidence for these surfaces:

- Official RUIAN import evidence: Atom-discovered source id and URI, retained
  external snapshot URI, SHA-256 checksum, dataset/source version, generated or
  valid timestamp, modification-note hash, source attribution, total artifact
  row count, failed-row review, tombstone counts for deltas, and complete
  manifest/import-run metadata.
- Free-tier artifact status: generated manifest reports `complete: true`, every
  required postal/token index is complete, static artifact file count and size
  fit the selected Cloudflare static asset surface, the deployed manifest URL is
  configured in `SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL`, incomplete
  artifacts are rejected, and D1 address fallback remains disabled unless a
  bounded reviewed delta/cache shard is intentionally active.
- D1 shard status, when D1 is used as a primary or fallback data store: router
  D1 plus bounded free-tier address shards, or router D1 plus all 14 physical
  CZ VUSC shard bindings on paid expansion. In both cases the generated
  Wrangler config must use real Cloudflare database ids, applied Smart Suggest
  migrations, active router metadata pointing only at validated logical shards,
  estimated physical shard sizes below the threshold, no missing size estimates,
  no stale import age, and zero unreviewed failed rows.
- FTS rebuild evidence, when D1 stores address rows: post-import or post-restore
  rebuild/optimize report for every active shard, read-only status showing FTS
  tables available as derived data, strong-query owned results from FTS plus
  Smart Suggest ranking, weak text-query gating, and backup/restore notes
  confirming FTS is rebuildable and omitted from canonical export surfaces.
- Provider retention audit: configured provider source ids resolved through the
  source catalog, Radar retained only in TTL cache with a max 30 day cap, public
  Nominatim absent from production fallback priority, live RUIAN geocoder
  durable retention still blocked, and no provider payloads, raw queries, or
  unapproved provider rows written to durable `address_records`.
- TTL purge and warmup expectations: documented purge cadence for TTL provider
  cache, expiry evidence for Radar/provider TTL entries, warmup keys represented
  by normalized/hash-derived values only, no raw query persistence, warmup
  reports showing owned high-value suggest cache keys populated after import,
  and post-purge status proving expired provider entries are gone before router
  activation.

Production no-pay rollout proof is artifact-first. Use
`smart-suggest:artifacts:build:production` as the entrypoint after the external
snapshot is retained and `/tmp/smart-suggest-ruian-source-env.sh` is sourced.
The final no-pay evidence must show:

- complete production artifact report and manifest generated from the retained
  RUIAN snapshot without `--max-rows` or `--allow-partial-artifact`;
- deployed manifest URL configured in runtime env, with
  `SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE=false` and
  `SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS=false`;
- runtime `/v1/status`, search, and ZIP/full-locality proof read from the
  artifact manifest and report owned source provenance;
- route-plan report remains current as paid-readiness proof and covers all 14
  logical CZ VUSC regions, or all 14 physical VUSC shards are active in paid
  expansion;
- official external RUIAN baseline snapshot URI and checksum recorded outside
  git with source lineage and modification-note hash;
- `smart-suggest:proof:index-capacity` and
  `smart-suggest:proof:free-tier-readiness` reports are current;
- optional D1 fallback/delta imports are either blocked before writes by the
  address row/byte/write-budget guards or completed under the configured free
  tier database limits with no missing size estimates;
- paid imports, when enabled, completed with every physical VUSC shard under
  the 5 GB warning threshold and no missing size estimates;
- zero unreviewed failed rows and no raw snapshot/provider payload storage;
- post-import D1 optimization plus FTS rebuild evidence completed after import
  when D1 stores address rows;
- provider retention audit proving Radar TTL-only behavior, public Nominatim
  exclusion, and blocked live RUIAN geocoder durable retention;
- TTL purge and cache warmup evidence for approved normalized/hash-derived keys;
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
- all 14 logical CZ VUSC regions are covered by the active route plan;
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
