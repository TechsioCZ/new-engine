# zane-operator

Internal Bun service for preview PostgreSQL database lifecycle operations.

Minimum supported PostgreSQL version: `18`.

## Endpoints

- `GET /healthz`
- `POST /v1/preview-db/ensure`
- `DELETE /v1/preview-db/{pr_number}`

All `/v1/*` endpoints require:

- `Authorization: Bearer <API_AUTH_TOKEN>`

## Ensure payload

```json
{
  "pr_number": 123
}
```

`template_db` and `owner` request overrides are disabled. The service always uses configured defaults.

Ensure response includes generated per-preview app credentials:

```json
{
  "db_name": "medusa_pr_123",
  "created": true,
  "app_user": "medusa_pr_app_123",
  "app_password": "..."
}
```

Teardown response includes role cleanup result:

```json
{
  "db_name": "medusa_pr_123",
  "deleted": true,
  "app_user": "medusa_pr_app_123",
  "role_deleted": true,
  "dev_grants_cleaned": true,
  "noop": false,
  "noop_reason": null
}
```

## Required env vars

- `API_AUTH_TOKEN`
- `PGHOST`
- `PGUSER`
- `PGPASSWORD`

## Optional env vars

- `PORT` (default: `8080`)
- `PGPORT` (default: `5432`)
- `PGDATABASE` (default: `postgres`)
- `PGSSLMODE` (default: `disable`)
- `DB_TEMPLATE_NAME` (default: `template_medusa`)
- `DB_PREVIEW_PREFIX` (default: `medusa_pr_`)
- `DB_PREVIEW_OWNER` (default: `zane_operator`)
- `DB_PREVIEW_APP_USER_PREFIX` (default: `medusa_pr_app_`)
- `DB_PREVIEW_DEV_ROLE` (default: `medusa_dev`)
- `DB_APP_SCHEMA` (default: `medusa`)
- `DB_PREVIEW_APP_PASSWORD_SECRET` (required in production; defaults to `API_AUTH_TOKEN` in non-production)
- `DB_PROTECTED_NAMES` (extra protected DB names, comma-separated)

## Onboarding

### 1. Create database role with required permissions

For local Docker Compose environments:
- `medusa_app` and `medusa_dev` are bootstrapped by `docker/development/postgres/initdb/01-zane-role-bootstrap.sh` (first DB init)
- `zane_operator` is bootstrapped by one-shot compose service `zane-operator-bootstrap` before `zane-operator` starts (every run, idempotent)

For existing Postgres volumes (already initialized before bootstrap scripts were added), apply once:

```bash
bash ./scripts/apply-postgres-role-bootstrap.sh
bash ./scripts/apply-zane-operator-role-bootstrap.sh
```

The Postgres bootstrap migration is idempotent and includes legacy object migration from `public` schema into the configured app schema (`MEDUSA_APP_DB_SCHEMA`, default `medusa`).
If an object with the same name already exists in the target app schema, bootstrap fails explicitly so you can resolve collisions safely.

Idempotency verification for existing databases:

```bash
bash ./scripts/apply-postgres-role-bootstrap.sh --verify-idempotent
bash ./scripts/apply-zane-operator-role-bootstrap.sh --verify-idempotent
```

If you need a manual/admin bootstrap (for cloud predeploy hooks), run:

```bash
cd apps/zane-operator
bun run bootstrap:role
```

This command is idempotent and enforces role attributes:
- `LOGIN`
- `NOSUPERUSER`
- `CREATEDB`
- `CREATEROLE` (required for per-preview app role creation)
- `NOBYPASSRLS`
- `INHERIT`
- `pg_signal_backend` membership

`zane_operator` must be able to:
- connect to the server (`PGHOST`/`PGPORT`)
- create preview DBs (`CREATEDB`)
- create per-preview app login roles (`CREATEROLE`)
- drop preview DBs it owns
- terminate active DB sessions during teardown (`pg_signal_backend`)
- clone from template DB (`template_medusa`)

Preview DB cloning uses:
- `CREATE DATABASE ... STRATEGY=FILE_COPY`
- startup recommendation: run PostgreSQL with `-c file_copy_method=clone` for fastest file-copy cloning
- zane-operator logs a startup warning (non-blocking) when `file_copy_method` is not `clone`

`medusa_dev` (or your configured `DB_PREVIEW_DEV_ROLE`) must exist. `ensure` grants it connect+schema/table access on each preview DB.
Preview app users are scoped to one schema only (configured by `DB_APP_SCHEMA`, default `medusa`).

For `CREATE DATABASE ... WITH TEMPLATE ...`, the operator must be superuser or own the template DB.
Preferred setup is ownership transfer of the template DB:

```sql
ALTER DATABASE template_medusa OWNER TO zane_operator;
```

The bootstrap command can enforce this ownership transfer automatically (`BOOTSTRAP_SET_TEMPLATE_OWNER=1`, default).
If you cannot transfer ownership, disable it with `BOOTSTRAP_SET_TEMPLATE_OWNER=0` and run the operator with a role that can clone from `template_medusa`.

Important runtime assumption:
- preview grant/ownership sync expects cloned objects to be owned by the executing role for zane-operator (normally `zane_operator` when following this guide)
- if template object ownership differs, preview app role ownership transfer may be partial and you may need to normalize template owners before enabling automation

### 2. Configure service environment

Use `apps/zane-operator/.env.example` as baseline.

Required production values:
- `API_AUTH_TOKEN` must be a strong random secret
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
- `DB_TEMPLATE_NAME=template_medusa`
- `DB_PREVIEW_PREFIX=medusa_pr_`
- `DB_PREVIEW_OWNER=zane_operator`
- `DB_PREVIEW_APP_USER_PREFIX=medusa_pr_app_`
- `DB_PREVIEW_DEV_ROLE=medusa_dev`
- `DB_APP_SCHEMA=medusa`
- `DB_PREVIEW_APP_PASSWORD_SECRET=<long-random-secret>`

Optional bootstrap-only values (for one-shot predeploy/init command):
- Reuses operator `PG*` and `DB_*` values above for target role/template behavior.
- `BOOTSTRAP_ADMIN_PGUSER`, `BOOTSTRAP_ADMIN_PGPASSWORD` (admin credentials for role bootstrap)
- Optional admin endpoint overrides: `BOOTSTRAP_ADMIN_PGHOST`, `BOOTSTRAP_ADMIN_PGPORT`, `BOOTSTRAP_ADMIN_PGDATABASE`, `BOOTSTRAP_ADMIN_PGSSLMODE`
- `BOOTSTRAP_SET_TEMPLATE_OWNER=1` (default)
- `BOOTSTRAP_FAIL_IF_TEMPLATE_MISSING=0` (set `1` to fail hard when template DB is missing)
- `BOOTSTRAP_VERIFY_IDEMPOTENT=0` (set `1` to run the bootstrap twice)

### 3. Smoke test before deployment

Start service locally:

```bash
cd apps/zane-operator
bun run start
```

Healthcheck:

```bash
curl -fsS http://localhost:8080/healthz
```

Ensure preview DB:

```bash
curl --fail --show-error --silent \
  -X POST "http://localhost:8080/v1/preview-db/ensure" \
  -H "Authorization: Bearer ${API_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"pr_number":123}'
```

Teardown preview DB:

```bash
curl --fail --show-error --silent \
  -X DELETE "http://localhost:8080/v1/preview-db/123" \
  -H "Authorization: Bearer ${API_AUTH_TOKEN}"
```

### 4. Prepare deployment artifacts

Build compiled binary:

```bash
cd apps/zane-operator
bun run build
```

Container build (from repository root):

```bash
docker build -f docker/development/zane-operator/Dockerfile -t zane-operator:latest .
```

### 5. Run Docker image

Run one-shot role bootstrap first (admin credentials required):

```bash
docker run --rm --name zane-operator-bootstrap \
  --env-file .env \
  --entrypoint /app/zane-operator-bootstrap-role \
  zane-operator:latest
```

Then run the service container:

```bash
docker run --rm --name zane-operator \
  -p 8080:8080 \
  --env-file .env \
  zane-operator:latest
```

Required values in `.env` for this container:
- `API_AUTH_TOKEN`
- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `PORT` (optional, defaults to `8080`)
- `DB_TEMPLATE_NAME` (optional)
- `DB_PREVIEW_PREFIX` (optional)
- `DB_PREVIEW_OWNER` (optional)
- `DB_PREVIEW_APP_USER_PREFIX` (optional)
- `DB_PREVIEW_DEV_ROLE` (optional)
- `DB_APP_SCHEMA` (optional, default `medusa`)
- `DB_PREVIEW_APP_PASSWORD_SECRET` (required in production)

Required extra values for bootstrap container:
- Reuses runtime `PG*` + `DB_TEMPLATE_NAME` + `DB_PREVIEW_OWNER` values
- `BOOTSTRAP_ADMIN_PGUSER`
- `BOOTSTRAP_ADMIN_PGPASSWORD`

Optional bootstrap hardening values:
- `BOOTSTRAP_SET_TEMPLATE_OWNER` (default `1`)
- `BOOTSTRAP_FAIL_IF_TEMPLATE_MISSING` (default `0`)
- `BOOTSTRAP_VERIFY_IDEMPOTENT` (default `0`)
- Optional admin endpoint overrides: `BOOTSTRAP_ADMIN_PGHOST`, `BOOTSTRAP_ADMIN_PGPORT`, `BOOTSTRAP_ADMIN_PGDATABASE`, `BOOTSTRAP_ADMIN_PGSSLMODE`

If `medusa-db` is in Docker Compose, set `PGHOST` in `.env` to the Compose service name (usually `medusa-db`) and run this container on the same Docker network.

Smoke test:

```bash
curl -fsS http://localhost:8080/healthz
```

### 6. Prepare GitHub Actions integration

Set repository secrets:
- `ZANEOPS_ZANE_OPERATOR_BASE_URL`
- `ZANEOPS_ZANE_OPERATOR_API_TOKEN`

Preview workflow template is present in:
- `.github/workflows/deploy-zaneops-preview.yml`

zane-operator calls are intentionally commented out for now. Uncomment them when you are ready to enable preview DB lifecycle from PR events.

### 7. Create or update dev role via CLI (no HTTP route)

Command:

```bash
cd apps/zane-operator
bun run create:dev-user -- --username medusa_dev --password 'replace-with-strong-password'
```

Optional flag:
- `--no-grant-connect-all-dbs` skips broad cross-database grant sync and revokes broad database-level grants (`CONNECT`, `TEMPORARY`, `CREATE`) from the target role on all non-template databases.
- `--allow-prod-broad-grants` allows broad grants when `NODE_ENV=production` (default behavior blocks this)

Behavior:
- creates the role when missing
- always enforces role attributes: `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS INHERIT LOGIN`
- grants explicit read/write privileges on existing objects for all non-system schemas (including schema `CREATE`)
- attempts to apply matching default privileges for discovered schema owners
- by default grants `CONNECT` on all non-template databases
- in `--no-grant-connect-all-dbs` mode, strips broad database-level grants so access can be granted back manually with narrow scope
- returns idempotent output for existing roles

Required env vars for CLI run:
- `PGHOST`
- `PGUSER`
- `PGPASSWORD`
- `PGPORT` (optional, default `5432`)
- `PGDATABASE` (optional, default `postgres`)
- `PGSSLMODE` (optional, default `disable`)

### 8. Manually refresh `template_medusa` from a different source DB

Use this flow when you want preview DBs to be cloned from a new upstream data snapshot.

Prerequisites:
- PostgreSQL client tools available (`pg_dump`, `pg_restore`, `psql`)
- root-level PostgreSQL role access on the target cluster (role `root` or equivalent)
- ability to pause preview creation during refresh window

The commands below assume host-provided PostgreSQL environment defaults are already available (Docker Compose context), especially `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`.

1. Pause preview DB operations
- temporarily disable zane-operator deployment hooks/workflow calls
- ensure no new `/v1/preview-db/ensure` requests are running

2. Export source database

```bash
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file /tmp/template_medusa.dump
```

3. Restore into a staging DB on target cluster

```bash
TEMPLATE_STAGING_DB="template_medusa_staging_$(date +%Y%m%d%H%M%S)"

PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE ${TEMPLATE_STAGING_DB} OWNER zane_operator;"
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  --username "$POSTGRES_USER" \
  --dbname "$TEMPLATE_STAGING_DB" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  /tmp/template_medusa.dump
```

4. Validate staging content
- run critical checks in `${TEMPLATE_STAGING_DB}` (schema, core tables, expected row counts)
- verify app compatibility (migrations/scripts expected by preview environments)

5. Swap staging into `template_medusa`

```bash
TEMPLATE_EXISTS="$(PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -c "SELECT 1 FROM pg_database WHERE datname = 'template_medusa'")"
if [ "$TEMPLATE_EXISTS" = "1" ]; then
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 <<'SQL'
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'template_medusa'
    AND pid <> pg_backend_pid();
SQL

  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE template_medusa;"
fi

STAGING_EXISTS="$(PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -c "SELECT 1 FROM pg_database WHERE datname = '${TEMPLATE_STAGING_DB}'")"
if [ "$STAGING_EXISTS" = "1" ]; then
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEMPLATE_STAGING_DB}' AND pid <> pg_backend_pid();"

  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    -c "ALTER DATABASE ${TEMPLATE_STAGING_DB} RENAME TO template_medusa;"
else
  PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE template_medusa OWNER zane_operator;"
  PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
    --username "$POSTGRES_USER" \
    --dbname "template_medusa" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    /tmp/template_medusa.dump
fi

PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 \
  -c "ALTER DATABASE template_medusa OWNER TO zane_operator;"
```

6. Re-enable preview operations and verify
- re-enable workflow/hooks calling zane-operator
- run one ensure/teardown smoke test against a throwaway PR number:

```bash
export ZANE_OPERATOR_BASE_URL="http://localhost:8080"

curl --fail --show-error --silent \
  -X POST "${ZANE_OPERATOR_BASE_URL}/v1/preview-db/ensure" \
  -H "Authorization: Bearer ${API_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"pr_number":999999}'

curl --fail --show-error --silent \
  -X DELETE "${ZANE_OPERATOR_BASE_URL}/v1/preview-db/999999" \
  -H "Authorization: Bearer ${API_AUTH_TOKEN}"
```

Critical note: this process drops and replaces `template_medusa`. Run it in a controlled maintenance window and keep a backup dump of the previous template if rollback may be needed.
