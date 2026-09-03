# Seed-database handover

Everything a customer needs to import ALL Herbatika data into their OWN
Postgres/S3 deployment, if they don't want Zerops. This is a full-fidelity
export of the demo/QA state of the platform at the time `export.sh` was run,
not a template or fixture set.

## What's in scope

1. **Postgres data** -- products, variants, prices, categories, brands, sales
   channels, regions, shipping, translations, and the URL registry
   (routes/slugs). See "One database, three schemas" below for exactly what
   this means physically.
2. **Payload CMS data** -- pages, articles (including imported section
   articles), categories, media metadata. This lives in the SAME Postgres
   database as Medusa in this deployment (schema `payload`), not a separate
   database -- see below.
3. **Media binaries** -- Payload's `media` collection is backed by the
   `@payloadcms/storage-s3` plugin (`apps/payload/src/payload.config.ts`),
   pointed at a MinIO bucket in dev (`medusa-bucket`, service `medusa-minio`).
   There is **no local-disk media volume** to worry about; media export means
   copying S3 objects, which `export.sh` does via `docker cp` against the
   MinIO container's on-disk object store.
4. **Meilisearch** -- intentionally **not** dumped. It is a derived search
   index, not a source of truth; rebuild it after import (step 5 below).

## One database, three schemas (important finding)

In this deployment, Medusa and Payload are **not** two separate databases.
`docker-compose.yaml` configures both `medusa-be` and `payload` with a
`DATABASE_URL` pointing at the same Postgres host/port/dbname
(`medusa-db:5432/medusa`) -- they differ only in the Postgres **role** and
`search_path`/`schemaName` they connect with:

| Service | DB role | Schema |
|---|---|---|
| Medusa | `medusa_app` (dev default) | `medusa` |
| Payload | `payload` (dev default) | `payload` |
| URL registry | (application-internal) | `url_registry` |

All three schemas -- plus `public` -- live in the single Postgres database
named `medusa`, in the single container `medusa-db`
(`new-engine-medusa-db-1` in local dev). `export.sh` therefore produces **one**
combined dump (`medusa-full.dump`) covering all schemas, not two separate
"Medusa DB" and "Payload DB" dumps.

**If your target deployment intentionally splits Payload into a genuinely
separate database**, `export.sh` supports that too: set `PAYLOAD_DATABASE_URL`
to the source Payload DSN and it will detect that it points at a different
database and produce a second `payload.dump`. `import.sh` mirrors this with
`TARGET_PAYLOAD_DATABASE_URL`.

The `url_registry` schema was present but effectively idle in this dev
environment (`URL_REGISTRY_ENABLED=0` by default) -- it still contains real
route/slug data (12,874 routes at export time) and is included unconditionally.

## Prerequisites

- **Postgres server version**: source is PostgreSQL **18.1**. Use `pg_dump`/
  `pg_restore` client tools of the same or a newer major version on whichever
  side you're running the export/import from (older `pg_restore` clients can
  fail against newer custom-format dumps).
- **Docker** (for `export.sh`'s default docker-based flow against this repo's
  dev stack).
- **A target Postgres database that already exists and is empty** (`import.sh`
  does not run `CREATE DATABASE`).
- **A target S3-compatible bucket** for media (MinIO, AWS S3, R2, etc.) if you
  want Payload media to keep working.
- **Payload/Medusa app checkouts** available locally for the post-import admin
  bootstrap and search-reindex commands (steps 2 and 5 below) -- these are
  `medusa exec` / `payload run` scripts, not standalone binaries.

## Running the export

```bash
scripts/seed-handover/export.sh
```

Defaults match this repo's `docker-compose.yaml` (container names, roles,
bucket name are all auto-detected from the running containers' own env vars --
nothing is hardcoded that doesn't have a documented, overridable default). See
the comment block at the top of `export.sh` for every env var it accepts
(`OUTPUT_DIR`, `DB_CONTAINER`, `DB_SUPERUSER`, `DB_NAME`,
`EXCLUDE_AUTH_TABLE_DATA`, `MINIO_CONTAINER`, `MINIO_BUCKET`, `SKIP_MEDIA`,
`PAYLOAD_DATABASE_URL`).

Output is a timestamped directory containing:

```
medusa-full.dump   # pg_dump -Fc of the whole `medusa` database (all schemas)
media.tar.gz       # tar.gz of the Payload media bucket's objects
manifest.json      # sizes, sha256 checksums, row counts, git commit, pg version
```

**The script never prints a DSN, password, or password hash.** It resolves
container-internal credentials (e.g. `POSTGRES_USER`) only to pass them
straight into `docker exec ... pg_dump`, never echoing them.

**Where dumps go:** by default, `OUTPUT_DIR` is `./seed-handover-output/<UTC
timestamp>` at the repo root -- this is gitignored (see the repo's
`.gitignore`: `seed-handover-output/`, `scripts/seed-handover/*.dump`,
`scripts/seed-handover/*.tar.gz`), but for a real handover, point `OUTPUT_DIR`
somewhere outside the repo entirely to remove any chance of an accidental
commit, e.g.:

```bash
OUTPUT_DIR=/path/outside/repo/herbatika-seed-$(date +%Y%m%d) scripts/seed-handover/export.sh
```

## Running the import

On the target side, with `pg_restore`/`psql` client tools installed and an
empty target database already created:

```bash
TARGET_DATABASE_URL='postgresql://user:pass@host:5432/mydb' \
  scripts/seed-handover/import.sh /path/to/seed-handover-output/<timestamp>
```

This verifies the dump's checksum against `manifest.json`, then runs
`pg_restore --no-owner --no-privileges --clean --if-exists` against the target,
and prints the required manual post-steps (below). If the bundle contains a
separate `payload.dump` (see "One database, three schemas"), also set
`TARGET_PAYLOAD_DATABASE_URL`.

`--no-owner --no-privileges` is used because the source dump's role names
(`medusa_app`, `payload`, etc.) will almost certainly not exist on your target
server; ownership defaults to whichever role you connect as.

## Required post-import steps

`import.sh` prints all of these at the end of a successful restore; they are
not automated because each depends on target-environment specifics (your own
S3 bucket, your own admin email, your own Meilisearch instance).

1. **Sanitize Payload admin credentials** (mandatory before exposing the admin
   panel -- see "Sanitization" below):
   ```bash
   psql "$TARGET_DATABASE_URL" -f scripts/seed-handover/sanitize.sql
   pnpm --dir apps/payload payload run \
     ../../scripts/seed-handover/reset-payload-admin.ts -- \
     --email you@example.com --password 'a-strong-new-password'
   ```
   (Run the second command with `DATABASE_URL` pointed at your target
   database; it uses Payload's own Local API to hash the new password --
   this repo never re-implements password hashing itself.)

2. **Create/verify your Medusa admin user.** Medusa's admin-auth tables
   (`auth_identity`, `provider_identity`, and their dependents) were
   deliberately excluded from the dump's row data (see "Sanitization"), so
   there is no demo admin login carried over:
   ```bash
   SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='...' \
     npx medusa exec ./src/scripts/create-initial-superadmin.ts
   ```
   Run this from `apps/medusa-be` with `DATABASE_URL` pointed at your target.
   It's the same idempotent script the dev stack uses (`docker-compose.yaml`'s
   `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD`).

3. **Run outstanding Medusa migrations** against the target (safe/idempotent,
   in case your target Medusa version is newer than the source's):
   ```bash
   npx medusa db:migrate
   ```

4. **Place media.** Extract `media.tar.gz` and mirror it into your own
   S3-compatible bucket:
   ```bash
   tar -xzf media.tar.gz
   mc mirror ./media s3-alias/<your-bucket>
   ```
   Then point Payload's `S3_ENDPOINT` / `S3_BUCKET` / `S3_REGION` /
   `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` env vars at that bucket
   (`apps/payload/src/payload.config.ts`). Object keys are flat filenames
   (e.g. `imported-richtext-<hash>-<name>.jpg`) matching `payload.media.filename`
   / `payload.media.url` (`/api/media/file/<filename>`) 1:1 -- no directory
   restructuring needed.

5. **Rebuild Meilisearch** (not included in the dump):
   ```bash
   npx medusa exec ./src/scripts/search-index.ts full
   ```
   Run from `apps/medusa-be` once `MEILISEARCH_HOST`/`MEILISEARCH_API_KEY`
   point at your target Meilisearch instance. This is the same
   `rebuildSearchDocuments` script the dev stack's package.json exposes.

6. **Smoke checks.** Compare row counts in the target DB against
   `manifest.json`'s `row_counts` block (product/variant/price counts, article
   count, `url_route` count). Confirm the storefront can load a product page,
   the Payload admin can log in with the new password, and search returns
   results after step 5.

## Sanitization decisions

Everything below was verified directly against the live dev database's actual
row/column contents before deciding what to exclude vs. keep -- this is not a
generic "redact everything sensitive" policy.

| Data | Decision | Why |
|---|---|---|
| Medusa admin-auth password hashes (`medusa.provider_identity.provider_metadata`, `medusa.auth_identity`, and 4 dependent tables) | **Row data excluded** from the dump (schema kept, so FK-less leaf tables come back empty). Default `EXCLUDE_AUTH_TABLE_DATA=1`. | These tables have no inbound foreign keys from outside the auth cluster (verified via `information_schema`), so excluding their data is a clean no-op for referential integrity. Recreate access with `create-initial-superadmin.ts` (step 2). |
| Medusa API keys (`medusa.api_key`, 7 rows) | **Kept as-is.** | Verified at export time: all 7 rows are `type=publishable` (design-intent public keys meant to ship in storefront JS), not secret admin keys. Re-verify this at your own export time if the source data has changed. |
| Payload admin password hashes (`payload.users.hash`/`salt`/`reset_password_token`/`api_key`) | **Kept in the raw dump, cleared post-restore** via `sanitize.sql`. | Unlike Medusa's auth tables, `payload.users` IS referenced by foreign keys from `payload.articles.author_id` and others (`NO ACTION`, verified), so deleting or excluding the row would break the restore. The row (id/email/name) is preserved for referential integrity; only credential columns are nulled. Recreate access with `reset-payload-admin.ts` (step 1). |
| Customer PII (`medusa.customer`, 22 rows) | **Kept, documented rather than scrubbed.** | Verified at export time: every email is `@example.com` or `@example.invalid` (demo/QA fixtures, e.g. `qa-verify@example.com`, `demo.checkout.local@example.com`) -- trivially fake, not real customer data. Re-verify this at your own export time before treating it as safe. |
| Orders (`medusa.order`, 1 row) | **Kept, documented.** | The one order belongs to a demo checkout-test customer (`demo.checkout.<timestamp>@example.com`), not a real transaction. |
| Payload admin user's own identity (`admin@example.com`) | **Kept, documented.** | Same demo-data reasoning as above; only its credentials are cleared. |
| Meilisearch index | **Not dumped at all.** | Fully derived from Postgres; rebuilding (step 5) is faster and more correct than trying to snapshot a search index. |

**If you re-run this export against a deployment with real customer data,
re-run the verification queries in this section yourself** (`export.sh`'s
manifest.json flags this explicitly under `sanitization.customer_and_order_rows`
and `sanitization.medusa_api_keys` as "re-verify after import") -- the demo-data
conclusion above is specific to the state of this database at the time this
handover was built (2026-08-23, commit recorded in `manifest.json`).

## Verification performed while building this handover

Run once against this repo's live dev stack, entirely read-only against the
live database (`pg_dump` only) plus two scratch databases created and dropped
inside the same Postgres container (never touching the live `medusa`
database):

1. `export.sh` run against the live stack: produced a 209 MB `medusa-full.dump`
   and a 1.9 GB `media.tar.gz` (7,741 files).
2. Restored `medusa-full.dump` into a scratch database (`herbatika_seed_test`)
   via direct `pg_restore` -- zero errors. Row counts for every table listed
   in `manifest.json` matched exactly (products: 2,571; product variants:
   2,626; prices: 10,596; product categories: 218; brands: 118; articles:
   1,107; pages: 20; media rows: 5,353; url_route: 12,874; url_entity_slug:
   24,280; and so on).
3. Confirmed `medusa.auth_identity` / `medusa.provider_identity` restored with
   0 rows (schema present, data correctly excluded).
4. Confirmed `payload.users.hash` was still present pre-sanitize, then ran
   `sanitize.sql` against the scratch database and confirmed `hash`/`salt`
   became `NULL` (`rows_still_credentialed = 0`).
5. Ran `import.sh` itself (not just its underlying `pg_restore` call)
   end-to-end inside a throwaway `postgres:18.1-alpine` container on the same
   Docker network, against a second scratch database
   (`herbatika_seed_test2`), using a real `TARGET_DATABASE_URL`. It completed
   with exit code 0 and printed the full post-import checklist; row counts in
   the restored scratch DB matched again (products: 2,571; articles: 1,107;
   url_route: 12,874).
6. Both scratch databases (`herbatika_seed_test`, `herbatika_seed_test2`) were
   dropped afterward; a follow-up query confirmed neither exists any more.

## Known gaps / needs owner input

- **`PAYLOAD_DATABASE_URL` / `TARGET_PAYLOAD_DATABASE_URL` split-database
  path is implemented but untested end-to-end** (this deployment doesn't
  actually split Payload into a separate database, so there was nothing to
  test it against). If a future deployment does split them, re-verify that
  code path before relying on it.
- **JWT_SECRET / COOKIE_SECRET / PAYLOAD_SECRET are NOT in the dump** (they're
  env vars, not DB rows) and are **independent per deployment by design** --
  the target's own secrets do not need to match the source's. Existing
  session cookies/JWTs issued by the source deployment will simply not
  validate against a target with different secrets, which is the expected/
  safe outcome.
- **Publishable API keys DO carry over** in the dump (`medusa.api_key`, see
  "Sanitization" table) since they're type=publishable at export time. If the
  target deployment wants fresh publishable keys instead of reusing the
  source's, that's a manual Medusa admin action after import (not scripted
  here, since it's a preference, not a safety requirement).
- **Media bucket layout assumption:** this export assumes the source MinIO
  bucket uses a flat single-level object layout (verified: `.minio.sys` sits
  alongside the bucket directory, not inside it, and the bucket itself has no
  subdirectories) -- confirm this still holds if the source deployment's MinIO
  setup changes (e.g. versioning or erasure coding enabled, which changes the
  on-disk layout `docker cp` would copy).
- **Postgres role/schema names in the target** are up to the customer;
  `import.sh` restores with `--no-owner --no-privileges` specifically so the
  target's own role names don't need to match `medusa_app`/`payload` from the
  source. The customer's Medusa/Payload service configs must still point
  their own `DATABASE_URL`s at the correct schema via
  `search_path`/`schemaName`, exactly as `docker-compose.yaml` does for this
  deployment.
- **Row-count assertions in this handover are a smoke test, not a full
  integrity audit** -- they confirm no `pg_restore` errors and no
  silently-dropped rows for the tables listed in `manifest.json`, not that
  every FK/constraint in the full ~320-table `medusa` schema round-trips
  perfectly. The zero-error `pg_restore` output plus `--clean --if-exists`
  dependency-ordered restore is a Postgres-native guarantee here.
