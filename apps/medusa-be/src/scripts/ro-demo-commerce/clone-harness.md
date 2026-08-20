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

pnpm exec ts-node --swc ./src/scripts/ro-demo-commerce/clone-harness-cli.ts \
  --manifest ./secure-input/ro-demo-commerce.json \
  --plan-output /absolute/private/ro-commerce-plan.json \
  --snapshot-output /absolute/private/ro-commerce-before.sql \
  --report-output /absolute/private/ro-commerce-clone-report.json
```

From the monorepo root, use the app-local toolchain explicitly:

```bash
pnpm --dir apps/medusa-be exec ts-node --swc \
  ./src/scripts/ro-demo-commerce/clone-harness-cli.ts \
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
2. runs dry-run and proves its normalized dump is unchanged;
3. applies only the exact reviewed plan hash;
4. generates and applies a fresh second plan to exercise convergence;
5. terminates clone-only sessions and fully drops/recreates the disposable
   database from the pre-apply snapshot;
6. proves the restored normalized dump matches the original.

On any failure after the snapshot, it attempts the guarded restore before
returning the error. Keep the original snapshot until the report says
`rollbackVerified: true`. This disposable proof complements, but never replaces,
the separate encrypted live backup and pre-deploy SK semantic baseline.
