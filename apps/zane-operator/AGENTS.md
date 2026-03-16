# zane-operator

Agent guide for database-role orchestration and preview DB lifecycle.

## Scope

This file is the source of truth for AI agents changing:
- `apps/zane-operator/src/*`
- `docker/development/postgres/initdb/01-zane-role-bootstrap.sh`
- `scripts/apply-postgres-role-bootstrap.sh`
- `scripts/apply-zane-operator-role-bootstrap.sh`
- `docker-compose.yaml` Postgres and zane-operator wiring

## Business Rules (Non-Negotiable)

- Minimum supported PostgreSQL version is `18`.
- PostgreSQL service is shared, but each app environment uses its own database.
- Single app user is used for runtime and migrations (do not split into separate runtime/migrator users unless explicitly requested).
- App login roles are schema-scoped, not database-wide.
- App roles must be able to run migrations and DDL only in allowed app schema(s).
- App roles must not gain write-level access outside allowed schema(s).
- `zane_operator` is not superuser.
- `zane_operator` must manage preview DB lifecycle and per-PR app users.
- `medusa_dev` broad grants are acceptable in non-production only.
- Production defaults must avoid broad grants unless explicitly forced.
- No internal cleanup scheduler in zane-operator. Cleanup is driven externally (GitHub events).
- Bootstrap and migrations must be idempotent.

## PostgreSQL Model (PG18+)

- PostgreSQL cluster/service can host many databases.
- Each database can host many schemas.
- One connection targets one database.
- Preview cloning is database-level from template DB.
- Current default app schema is `medusa`.
- If multi-schema support is added later, it must use an explicit schema allowlist. Never grant app access to all schemas implicitly.
- Required fast clone path:
  - DB server starts with `-c file_copy_method=clone`
  - Preview create uses `CREATE DATABASE ... STRATEGY = FILE_COPY`
- Operator should warn (not fail) when `file_copy_method` is not `clone`.
- Missing template DB is non-fatal by default in bootstrap flows and should remain configurable via `BOOTSTRAP_FAIL_IF_TEMPLATE_MISSING`.

## Role Model

- Superuser (`root`/admin): bootstrap only, not runtime app path.
- `zane_operator`:
  - `LOGIN NOSUPERUSER CREATEDB CREATEROLE NOBYPASSRLS INHERIT`
  - has `pg_signal_backend`
  - can create/drop preview DBs and per-PR app roles
- `medusa_app`:
  - schema-scoped app role
  - can run DDL/DML only in app schema (`medusa` currently)
- `medusa_pr_app_<pr>`:
  - same boundaries as app role, but per preview DB
- `medusa_dev`:
  - non-prod: broad connect + schema/object grants are allowed
  - prod: broad grants must not be default

## Ownership and Grants

- App roles must never own entire databases.
- Database ownership belongs to admin/operator role.
- Template DB should be owned by `zane_operator` when possible.
- `PUBLIC` must be locked down:
  - revoke default database/schema privileges where needed
- App `search_path` should be `<app_schema>, pg_catalog`.

## Environment Contract

- Docker stack is source of truth for local wiring (`.env.docker` -> `.env`).
- Avoid duplicate envs for same concept.
- Reuse shared `DC_` values across services to avoid drift.
- Key variables:
  - `DC_MEDUSA_APP_DB_NAME`: app database name
  - `DC_MEDUSA_APP_DB_SCHEMA`: app schema name
  - `DC_ZANE_OPERATOR_*`: operator runtime credentials/config
  - `DC_POSTGRES_SSLMODE`: shared sslmode
- Bootstrap should reuse runtime operator DB envs and only add minimal admin overrides.

## Migration/Bootstrap Rules

- Fresh DB init path:
  - `docker/development/postgres/initdb/01-zane-role-bootstrap.sh`
- Existing DB path:
  - `make postgres-role-bootstrap`
  - `make postgres-zane-operator-bootstrap`
- Idempotency checks:
  - `make postgres-role-bootstrap-verify`
  - `make postgres-zane-operator-bootstrap-verify`

## Change Rules for Agents

- Keep SQL and grant operations idempotent.
- Prefer explicit grants/revokes over implicit behavior.
- Do not broaden privileges to "make it work".
- If broad prod access is requested, gate it behind explicit opt-in flags.
- When changing role/grant logic, update docs in:
  - `README.md`
  - `apps/zane-operator/README.md`
  - `.env.docker` / `apps/zane-operator/.env.example` if env contract changes
- Preserve deterministic preview DB/user naming and password derivation logic.

## Required Validation Before Reporting Done

- Typecheck:
  - `bunx tsc --noEmit -p apps/zane-operator/tsconfig.json`
- Compose config sanity:
  - `docker compose -f docker-compose.yaml config`
- If role/grant logic changed, run (when docker access available):
  - `make postgres-role-bootstrap-verify`
  - `make postgres-zane-operator-bootstrap-verify`
- Confirm operator startup log includes clone-path status:
  - `file_copy_method`
  - `clone_optimized`

## Guardrails

- Never use superuser credentials as app runtime credentials.
- Never grant app role access to all schemas by default.
- Never silently skip failed privilege operations without logging context.
- Never introduce destructive DB cleanup automation in operator runtime loop.
