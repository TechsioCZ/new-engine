# Disposable clone verification

This harness proves the RO commerce dry-run, apply, repeat apply, and rollback
against a disposable local PostgreSQL clone. It never accepts a remote host and
never reads a live database URL.

## Required safety envelope

The target must satisfy all four checks:

1. `RO_DEMO_DISPOSABLE_DATABASE_URL` uses `localhost`, `127.0.0.1`, or `::1`.
2. Its database name starts with `ro_demo_disposable_`.
3. The database object comment contains the marker version and token.
4. The marker token exactly matches `RO_DEMO_DISPOSABLE_MARKER` and is checked
   again immediately before every restore. A database comment survives schema
   rollback, unlike a marker table that a failed apply could accidentally drop.

Provision the marker only after restoring a sanitized backup into a newly
created local database:

```sql
-- Replace only these two psql variables; never run this on staging/live.
COMMENT ON DATABASE :"disposable_database_name"
IS 'herbatica-ro-demo-disposable-v1:GENERATE-A-UNIQUE-LOCAL-TOKEN-OF-32-CHARS';
```

Do not add this marker to staging or production. Do not point the harness at a
port-forward to a remote database: loopback is necessary, but the in-database
marker is the authoritative safety boundary.

## Run

`psql` and `pg_dump` must come from the same PostgreSQL major version as the
clone. Paths are resolved relative to the caller and then made absolute;
artifacts are written privately. The CLI locates `apps/medusa-be` itself.
The disposable URL must use a local PostgreSQL superuser: the runner verifies
this before any commerce command because exact rollback terminates clone-only
sessions, drops/recreates the database, and restores owners and ACLs.

```bash
export RO_DEMO_DISPOSABLE_DATABASE_URL='postgresql://postgres:LOCAL_PASSWORD@127.0.0.1:55432/ro_demo_disposable_20260820?sslmode=disable'
export RO_DEMO_DISPOSABLE_MARKER='GENERATE-A-UNIQUE-LOCAL-TOKEN-OF-32-CHARS'
export RO_DEMO_DATABASE_INSTANCE_ID='ro-demo-disposable-postgres-20260820'

pnpm exec ts-node --swc ./src/scripts/ro-demo-commerce/clone-harness-cli.ts \
  --expected-backend-build-hash LOCAL_BUILD_ID \
  --expected-backend-deployment-id LOCAL_DEPLOYMENT_ID \
  --expected-backend-release-sha 0123456789abcdef0123456789abcdef01234567 \
  --expected-backend-slot blue \
  --expected-environment-id herbatika-ro-demo-local \
  --expected-commerce-manifest-sha256 fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 \
  --expected-price-authority-sha256 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
  --manifest ./secure-input/ro-demo-commerce.json \
  --plan-output /absolute/private/ro-commerce-plan.json \
  --snapshot-output /absolute/private/ro-commerce-before.sql \
  --report-output /absolute/private/ro-commerce-clone-report.json
```

From the monorepo root, use the app-local toolchain explicitly:

```bash
pnpm --dir apps/medusa-be exec ts-node --swc \
  ./src/scripts/ro-demo-commerce/clone-harness-cli.ts \
  --expected-backend-build-hash LOCAL_BUILD_ID \
  --expected-backend-deployment-id LOCAL_DEPLOYMENT_ID \
  --expected-backend-release-sha 0123456789abcdef0123456789abcdef01234567 \
  --expected-backend-slot blue \
  --expected-environment-id herbatika-ro-demo-local \
  --expected-commerce-manifest-sha256 fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210 \
  --expected-price-authority-sha256 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
  --manifest /absolute/private/ro-demo-commerce.json \
  --plan-output /absolute/private/ro-commerce-plan.json \
  --snapshot-output /absolute/private/ro-commerce-before.sql \
  --report-output /absolute/private/ro-commerce-clone-report.json
```

The runner forces local Medusa providers, disables Redis, Meilisearch, Payload,
S3, and carrier integrations, and replaces both database URLs with the
disposable target. The commerce runtime argument is resolved from the harness
module itself, not from the caller's current directory. A host-wide
per-database lock prevents concurrent harness
runs; `SIGINT`/`SIGTERM` abort the active commerce child and enter guarded
rollback. It then:

1. captures the pre-apply SQL snapshot;
2. invokes the real runtime fingerprint mode and proves it did not mutate the
   database;
3. binds dry-run/apply to the captured database fingerprint, database-instance
   fingerprint, expected commerce-manifest SHA-256, price-authority SHA-256,
   and SK commerce baseline;
4. runs dry-run and proves its normalized dump is unchanged;
5. applies only the exact reviewed plan hash and writes distinct private
   restore/receipt artifacts;
6. generates and applies a fresh second plan with its own no-clobber artifacts
   to exercise convergence;
7. terminates clone-only sessions and fully drops/recreates the disposable
   database from the pre-apply snapshot;
8. proves the restored normalized dump matches the original.

The runner refuses to start if any requested or derived plan, fingerprint,
restore, receipt, snapshot, or verification output already exists. The derived
runtime evidence paths are based on `--plan-output` and remain private for
review after success.

On any failure after the snapshot, it attempts the guarded restore before
returning the error. Keep the original snapshot until the report says
`rollbackVerified: true`. This disposable proof complements, but never replaces,
the separate encrypted live backup and pre-deploy SK semantic baseline.
