# zane-operator

Internal Bun service for preview PostgreSQL database lifecycle operations and thin CI-facing ZaneOps deploy orchestration.

Minimum supported PostgreSQL version: `18`.

## Endpoints

- `GET /healthz`
- `POST /v1/preview-db/ensure`
- `DELETE /v1/preview-db/{pr_number}`
- `POST /v1/zane/environments/resolve`
- `POST /v1/zane/environments/archive`
- `POST /v1/zane/deploy/resolve-targets`
- `POST /v1/zane/deploy/apply-env-overrides`
- `POST /v1/zane/deploy/trigger`
- `POST /v1/zane/deploy/verify`

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
- `DB_PREVIEW_APP_PASSWORD_SECRET`

## Optional env vars

- `PORT` (default: `8080`)
- `PGPORT` (default: `5432`)
- `PGDATABASE` (default: `postgres`)
- `PGSSLMODE` (default: `disable`)
- `DB_TEMPLATE_NAME` (default: `template_medusa`)
- `DB_PREVIEW_PREFIX` (default: `medusa_pr_`)
- `DB_PREVIEW_APP_USER_PREFIX` (default: `medusa_pr_app_`)
- `DB_PREVIEW_DEV_ROLE` (default: `medusa_dev`)
- `DB_APP_SCHEMA` (default: `medusa`)
- `DB_PROTECTED_NAMES` (extra protected DB names, comma-separated)
- `ZANE_BASE_URL` (required only for deploy orchestration endpoints)
- `ZANE_CONNECT_BASE_URL` (optional; defaults empty and falls back to `ZANE_BASE_URL`)
- `ZANE_CONNECT_HOST_HEADER` (optional; local-only host override when `ZANE_CONNECT_BASE_URL` is used)
- `ZANE_USERNAME` (required only for deploy orchestration endpoints)
- `ZANE_PASSWORD` (required only for deploy orchestration endpoints)

## Deploy endpoint notes

- The deploy wrapper requires `project_slug` in requests and returns `project_slug` in responses.
- Preview environment resolution clones from the protected `production` environment only when the requested preview environment does not already exist.
- Env override application performs client-side upsert logic against ZaneOps itemized env-variable changes: unchanged keys are skipped, existing keys use `UPDATE`, and missing keys use `ADD`.
- Deploy trigger uses per-service deploy webhook tokens resolved through authenticated ZaneOps control-plane APIs.

## Onboarding

### 1. Ensure database bootstrap is owned by `medusa-db`

For local Docker Compose environments:
- `medusa_app`, `medusa_dev`, and `zane_operator` are bootstrapped by the Postgres-side role bootstrap script baked into `medusa-db`
- every `medusa-db` start reruns the same bootstrap through `/usr/local/bin/run-postgres-with-bootstrap.sh`

For existing Postgres volumes (already initialized before bootstrap scripts were added), apply once:

```bash
bash ./scripts/apply-postgres-role-bootstrap.sh
```

The Postgres bootstrap migration is idempotent and includes legacy object migration from `public` schema into the configured app schema (`DB_APP_SCHEMA`, default `medusa`).
If an object with the same name already exists in the target app schema, bootstrap fails explicitly so you can resolve collisions safely.

Idempotency verification for existing databases:

```bash
bash ./scripts/apply-postgres-role-bootstrap.sh --verify-idempotent
```
This bootstrap path is idempotent and enforces role attributes for `zane_operator`:
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

The DB-owned bootstrap path on `medusa-db` enforces this ownership transfer automatically whenever the canonical `ZANE_OPERATOR_PG*` / `ZANE_OPERATOR_DB_TEMPLATE_NAME` values are configured and the template DB exists.

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
- `DB_PREVIEW_APP_USER_PREFIX=medusa_pr_app_`
- `DB_PREVIEW_DEV_ROLE=medusa_dev`
- `DB_APP_SCHEMA=medusa`
- `DB_PREVIEW_APP_PASSWORD_SECRET=<long-random-secret>`

Postgres-side bootstrap values now live on `medusa-db`, not on `zane-operator`:
- local compose: `medusa-db` derives its bootstrap target from `DC_ZANE_OPERATOR_PGUSER`, `DC_ZANE_OPERATOR_PGPASSWORD`, and `DC_ZANE_OPERATOR_DB_TEMPLATE_NAME`
- deployed Zane service: `medusa-db` derives its bootstrap target from `ZANE_OPERATOR_PGUSER`, `ZANE_OPERATOR_PGPASSWORD`, and `ZANE_OPERATOR_DB_TEMPLATE_NAME`

### 3. Smoke test before deployment

Start service locally:

```bash
cd apps/zane-operator
bun run start
```

Healthcheck:

```bash
curl -fsS http://localhost:8082/healthz
```

Optional local-stack Caddy route: `https://admin.zane-operator.localhost/healthz` with `curl -kfsS`.

Ensure preview DB:

```bash
curl --fail --show-error --silent \
  -X POST "http://localhost:8082/v1/preview-db/ensure" \
  -H "Authorization: Bearer ${API_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"pr_number":123}'
```

Teardown preview DB:

```bash
curl --fail --show-error --silent \
  -X DELETE "http://localhost:8082/v1/preview-db/123" \
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

Run the service container:

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
- `DB_PREVIEW_APP_USER_PREFIX` (optional)
- `DB_PREVIEW_DEV_ROLE` (optional)
- `DB_APP_SCHEMA` (optional, default `medusa`)
- `DB_PREVIEW_APP_PASSWORD_SECRET` (required)

If `medusa-db` is in Docker Compose, set `PGHOST` in `.env` to the Compose service name (usually `medusa-db`) and run this container on the same Docker network.

Smoke test:

```bash
curl -fsS http://localhost:8082/healthz
```

### 6. First-time ZaneOps setup for deploy orchestration

Use this guide to create the canonical Zane project that CI and `zane-operator` expect.

Important model constraints:
- `zane-operator` authenticates upstream with username/password session + CSRF login, not a direct Zane token
- CI resolves services by exact Zane service name from `apps/new-engine-ctl/config/stack-manifest.yaml`
- preview environments are cloned from the protected `production` environment
- shared variables should live on the `production` environment in Zane; services inherit them and preview clones copy them
- the canonical project should also include `zane-operator` so the deployed stack exposes the same control-plane wrapper used by CI

#### 6.1 Bootstrap the canonical project with the helper script

Preferred path: use the local bootstrap helper instead of creating the project and service envs by hand.

The helper:
- creates or reuses the canonical project
- expects the protected `production` environment and fails if it is missing
- creates or reuses the required services as Git services with Dockerfile builders
- aligns them with these repo Dockerfiles:
  - `docker/development/postgres/Dockerfile`
  - `docker/development/medusa-valkey/Dockerfile`
  - `docker/development/medusa-minio/Dockerfile`
  - `docker/development/medusa-meilisearch/Dockerfile`
  - `docker/development/medusa-be/Dockerfile`
  - `docker/development/n1/Dockerfile`
  - `docker/development/zane-operator/Dockerfile`
- auto-resolves internal service network aliases after service creation
- upserts only the curated shared `production` environment contract needed by the deployed stack, not a full copy of `.env.zane`
- prefixes shared Zane project variables by service/domain to avoid collisions across inherited service environments
- upserts the per-service env blocks using `{{env.VAR}}` references
- upserts the expected per-service healthchecks in Zane so reruns also converge probe configuration
- upserts conservative per-service CPU/memory caps for a local 4-core / 12 GB class machine
- does not create public Zane URL routes; keep those explicit because hostnames/TLS choices are environment-specific
- uses the DB service `global_network_alias` for `MEDUSA_DB_HOST`
- defaults `MINIO_FILE_URL` to the deployed MinIO alias rather than a compose-only hostname; override it once you have a public MinIO route

Run it from the repo root:

```bash
scripts/dev/setup-zane-project.sh \
  --env-file .env.zane \
  --zane-base-url http://localhost \
  --zane-username admin \
  --zane-password 'replace-me' \
  --project-slug new-engine
```

The helper is intentionally interactive for real runs and asks you to confirm the target host/project before mutating a live Zane stack. Use `--yes` only when you deliberately want to bypass that prompt.

Optional overrides worth knowing:
- `--repository-url https://github.com/<org>/<repo>.git`
- `--branch <branch>` when you intentionally want a different deployment source than the current checked-out branch
- `--git-app-id <id>` if the repository is private and Zane must use an installed git app
- `--minio-file-url <url>`
- `--store-cors <csv-or-url>`
- `--admin-cors <csv-or-url>`
- `--auth-cors <csv-or-url>`
- `--operator-upstream-zane-base-url <url>`
- `--operator-upstream-zane-username <user>`
- `--operator-upstream-zane-password <password>`

The helper reads `.env.zane` by default, but it only maps the values that are part of the deployed stack contract. Keep compose/local runtime values in `.env`; use `.env.zane` for Zane-targeted helper runs. The helper forces `NODE_ENV=production` for the Zane environment even if your local compose env uses development mode.

Managed public service URLs are derived from the project slug plus the Zane root-domain route contract. Ambient `.env.zane` frontend URL values do not override those deployed URLs.

`zane-operator` no longer ships a separate bootstrap CLI. Role/template bootstrap is owned by `medusa-db`, so Zane-targeted maintenance should sync `medusa-db` bootstrap envs and redeploy `medusa-db` before redeploying `zane-operator` when those credentials change.

If your repo is private:
1. install/configure the git app in Zane first
2. rerun the helper with `--git-app-id <id>`

If you want to inspect or patch values manually, the helper entrypoint is:
- `scripts/dev/setup-zane-project.sh`

#### 6.2 Post-bootstrap manual checks

After the helper finishes:
1. Open the `new-engine` project in Zane.
2. Confirm these exact service names exist:
   - `medusa-db`
   - `medusa-valkey`
   - `medusa-minio`
   - `medusa-meilisearch`
   - `medusa-be`
   - `n1`
   - `zane-operator`
3. Confirm the service type for all seven is Git-backed, not direct Docker image pull.
4. Confirm the project `production` environment now contains the shared env variables.
5. Confirm each service has the expected healthcheck configured in Zane.
6. Confirm each service has pending changes in Zane; that is expected until you deploy.

#### 6.3 GitHub downtime approval requirement

Main-lane deploys now resolve downtime risk once after affected services are filtered.

If any selected service is marked `ci.zane.downtime_risk: true`, GitHub Actions expects an environment named `zaneops-main-downtime`.

To require a human approval before downtime-risk deploys:
1. create the `zaneops-main-downtime` environment in GitHub
2. add required reviewers to that environment

If the environment exists without required reviewers, the job still succeeds but will not pause for manual approval by itself.

Public route follow-up remains manual on purpose:
- add a public route for `medusa-be` if you need browser/API access
- add a public route for `n1` if you need storefront access
- add a public route for `medusa-meilisearch` only if the storefront should query Meilisearch directly from the browser
- add a public route for `medusa-minio` if browser-facing file URLs should be served directly from MinIO

Notes:
- `MINIO_FILE_URL` should eventually be a public URL when browsers need direct asset access
- `NEXT_PUBLIC_MEILISEARCH_URL` should eventually be a public URL if the storefront searches directly from the browser
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is usually not known on day one; set it after the first Medusa bootstrap, then redeploy `n1`

#### 6.3 First deploy notes

Before the first real preview/main smoke:
- set local operator env:
  - `DC_ZANE_OPERATOR_ZANE_BASE_URL`
  - `DC_ZANE_OPERATOR_ZANE_CONNECT_BASE_URL` only if the deployed operator cannot reach the public Zane hostname directly
  - `DC_ZANE_OPERATOR_ZANE_CONNECT_HOST_HEADER` only with the connect-base override above
  - `DC_ZANE_OPERATOR_ZANE_USERNAME`
  - `DC_ZANE_OPERATOR_ZANE_PASSWORD`
- set local smoke env:
  - `ZANE_OPERATOR_BASE_URL=http://localhost:8082`
  - `ZANE_OPERATOR_API_TOKEN=<same value as DC_ZANE_OPERATOR_API_AUTH_TOKEN>`
  - `ZANE_CANONICAL_PROJECT_SLUG=<your-zane-project-slug>`
  - `ZANE_PRODUCTION_ENVIRONMENT_NAME=production`

Operational notes:
- preview environments are derived outside Zane as `pr-<number>` by default
- this repo archives preview environments explicitly during teardown; built-in Zane preview auto-teardown does not cover these cloned environments
- `n1` consumes `NEXT_PUBLIC_*` variables in the frontend build. If your Zane service builds the image from source, make those values available before the first build. If your Zane service runs a prebuilt image, changing those values later requires rebuilding and redeploying `n1`

Active GitHub Actions contract:
- workflows:
  - `.github/workflows/zaneops-preview-after-ci.yml`
  - `.github/workflows/zaneops-main-after-ci.yml`
  - `.github/workflows/zaneops-preview-teardown.yml`
- required repository secrets:
  - `ZANEOPS_ZANE_OPERATOR_BASE_URL`
  - `ZANEOPS_ZANE_OPERATOR_API_TOKEN`
  - `ZANEOPS_ZANE_PROJECT_SLUG`
  - `ZANEOPS_ZANE_PRODUCTION_ENVIRONMENT_NAME`

### 7. Create or update dev role via CLI (no HTTP route)

Command:

```bash
cd apps/zane-operator
export DEV_ROLE_PASSWORD='replace-with-strong-password'
bun run create:dev-user -- --username medusa_dev --password-env DEV_ROLE_PASSWORD
```

Required flag:
- `--password-env <VAR>` reads the password from `process.env[VAR]`. Plaintext `--password` is not supported.

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
- variable referenced by `--password-env` (for example `DEV_ROLE_PASSWORD`)
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
export ZANE_OPERATOR_BASE_URL="http://localhost:8082"

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
