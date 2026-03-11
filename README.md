# Local runtime instructions

### Requirements:

* Docker compose + Docker
  * For Mac, <a href="https://orbstack.dev/">OrbStack</a> is recommended instead of Docker Desktop
* make
* mise (preferred for local orchestration and CI-parity helper tasks)

### Steps

1. <b>Create .env file</b>
    * copy .env.docker => .env
    * optionally update config as needed
    * if you also use the Zane-targeted helper scripts, copy .env => .env.zane once and keep Zane-specific values there

2. <b>Install dependencies</b>

    ```shell
    make install
    ```

* alternatively force dependency lock fix:
  ```shell
  make install-fix-lock
  ```

3. <b>Run docker compose</b>

    Preferred local startup path (stepped `mise` orchestration):
    ```shell
    mise run dev
    ```
    This runs in order:
    1. resources (`medusa-db`, `medusa-valkey`, `medusa-minio`, `medusa-meilisearch`)
    2. Meilisearch key provisioning
    3. `medusa-be`
    4. `n1`
    Use `mise run dev:fresh` when you want the explicit `down --remove-orphans` reset first.
    Internal sub-steps are hidden from `mise tasks ls` and can still be run manually when needed:
    * `mise run dev:internal:down`
    * `mise run dev:internal:resources:up`
    * `mise run dev:internal:resources:wait`
    * `mise run dev:internal:meili:sync-env`
    * `mise run dev:internal:backend:up`
    * `mise run dev:internal:backend:wait`
    * `mise run dev:internal:frontend:up`
    * `mise run dev:internal:frontend:wait`
    * (optional operator profile) `mise run dev:operator`
    * (optional rerun) `mise run dev:postgres:bootstrap`
    * (optional rerun) `mise run dev:postgres:bootstrap:verify`

    During step 3, `.env` handling is opinionated:
    * if `DC_MEILISEARCH_BACKEND_API_KEY` / `DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY` are empty, values are written
    * if existing values differ, you are prompted to `override` or `keep`
    * provisioning itself stays in `scripts/ci/*`; only `mise run dev` performs `.env` sync logic
    * `mise run dev` calls provisioning against host URL `http://127.0.0.1:7700` by default (override via `MISE_DEV_MEILI_URL`) so `DC_MEILISEARCH_HOST` can remain container-internal (`http://medusa-meilisearch:7700`)

    * Postgres role bootstrap (`medusa_app`, `medusa_dev`, `zane_operator`) runs automatically from `medusa-db` startup via `/usr/local/bin/run-postgres-with-bootstrap.sh`
    * MinIO bootstrap now runs inside `medusa-minio` startup (idempotent): it ensures `DC_MINIO_BUCKET` exists, enforces public object reads, and provisions a non-root Medusa runtime key with bucket-scoped permissions limited to the Medusa bucket
    * Meilisearch now starts through an in-image bootstrap wrapper (idempotent, swarm-safe) before serving traffic
    * `medusa-minio` uses dedicated MinIO bootstrap env (`MINIO_ROOT_*` + `MINIO_MEDUSA_*`) to avoid deprecated MinIO server env collisions
    * `medusa-meilisearch` continues to use shared Medusa env plus service-specific Meili env
    * `medusa-db` now owns `zane_operator` role/template bootstrap and derives that target from the canonical `DC_ZANE_OPERATOR_*` DB settings
    * `medusa-db` health now means both Postgres readiness and completed role/template bootstrap; operator startup waits on that full convergence
    * Default `mise run dev` does not require operator credentials; operator flow is explicit opt-in and requires:
      * `DC_ZANE_OPERATOR_API_AUTH_TOKEN=<replace-with-long-random-token>`
      * `DC_ZANE_OPERATOR_PGPASSWORD=<replace-with-strong-db-password>`
      * `DC_ZANE_OPERATOR_DB_PREVIEW_APP_PASSWORD_SECRET=<replace-with-long-random-secret>`
    * To exercise the deploy-wrapper endpoints locally as well, also set:
      * `DC_ZANE_OPERATOR_ZANE_BASE_URL=<upstream-zane-url>`
      * `DC_ZANE_OPERATOR_ZANE_CONNECT_BASE_URL=<optional-container-reachable-upstream-url>`
      * `DC_ZANE_OPERATOR_ZANE_CONNECT_HOST_HEADER=<optional-host-header-for-connect-url>`
      * `DC_ZANE_OPERATOR_ZANE_USERNAME=<upstream-zane-username>`
      * `DC_ZANE_OPERATOR_ZANE_PASSWORD=<upstream-zane-password>`
    * First-time upstream ZaneOps setup assumptions for local deploy testing:
      * `DC_ZANE_OPERATOR_ZANE_BASE_URL` must point at the upstream ZaneOps UI/API root you actually log into, for example `http://localhost:3000`
      * `DC_ZANE_OPERATOR_ZANE_CONNECT_BASE_URL` / `...HOST_HEADER` should stay empty by default; they are only needed when the deployed `zane-operator` cannot reach the public Zane hostname directly, such as this local Docker-based Zane stack
      * `DC_ZANE_OPERATOR_ZANE_USERNAME` / `DC_ZANE_OPERATOR_ZANE_PASSWORD` are the login credentials for that ZaneOps instance; `zane-operator` uses session + CSRF login upstream, not a direct Zane token
      * create one canonical Zane project and note its slug; local CI-style deploy tests use that slug as `ZANE_CANONICAL_PROJECT_SLUG`
      * each Zane project gets a protected `production` environment by default; preview clones in this repo always use that environment as the base
      * service names in that Zane project must match `config/stack-manifest.yaml` currently: `medusa-db`, `medusa-valkey`, `medusa-minio`, `medusa-meilisearch`, `medusa-be`, `n1`
      * preview environments are derived in CI script space as `pr-<number>` by default
      * preview teardown is explicit in this repo's CI flow; do not rely on built-in Zane preview auto-teardown for these cloned environments
    * When you run the deploy scripts manually later, export:
      * `ZANE_OPERATOR_BASE_URL=http://localhost:8082`
      * `ZANE_OPERATOR_API_TOKEN=<same value as DC_ZANE_OPERATOR_API_AUTH_TOKEN>`
      * `ZANE_CANONICAL_PROJECT_SLUG=<your-zane-project-slug>`
      * `ZANE_PRODUCTION_ENVIRONMENT_NAME=production`
    * If your Postgres volume already existed before this change, rerun Postgres bootstrap once after setting the operator password:

    ```shell
    make postgres-role-bootstrap
    mise run dev:postgres:bootstrap
    ```

    * Optional idempotency check (runs bootstrap twice):

    ```shell
    make postgres-role-bootstrap-verify
    mise run dev:postgres:bootstrap:verify
    ```

    * Optional grant hardening check (read-only verification):

    ```shell
    make postgres-grants-verify
    ```

    * Existing DB migration note: bootstrap includes idempotent legacy-object migration from `public` schema into `DC_MEDUSA_APP_DB_SCHEMA` (default `medusa`), with conflict fail-fast if same object already exists in target schema.
    * Medusa BE DB connection is derived from `DC_MEDUSA_APP_DB_*`; keep those on app credentials (`medusa_app`), not superuser credentials
    * `MEDUSA_DATABASE_SCHEMA` / `DATABASE_SCHEMA` are derived from `DC_MEDUSA_APP_DB_SCHEMA` and must stay aligned with app schema grants
    * `medusa-db` starts with `-c file_copy_method=clone`; zane-operator preview cloning uses `CREATE DATABASE ... STRATEGY=FILE_COPY`

### Cloud predeploy note

`zane_operator` role/template bootstrap is now owned by `medusa-db`, not `zane-operator`.

Operational consequence:
* rotating `zane-operator` DB credentials requires updating both:
  * `medusa-db` bootstrap envs
  * `zane-operator` runtime envs
* then redeploy `medusa-db` first so it can reconcile the role/template state before redeploying `zane-operator`

### GitHub approval requirement

Main-lane deploys now resolve downtime risk once after affected-service filtering.

If any affected service is marked with `ci.zane.downtime_risk: true` in `config/stack-manifest.yaml`, the workflow expects a GitHub environment named `zaneops-main-downtime`.

To make the workflow actually pause for human approval:
* create the `zaneops-main-downtime` environment in GitHub
* configure required reviewers on that environment

Without required reviewers, the approval job still runs, but it will not enforce a real manual pause on its own.

### Manual live `.env` updates (not automated)

When DB env wiring changes, apply these actions manually on the live `.env` file:

1. Open live `.env`.
2. Set medusa-be DB connection values to APP credentials (`medusa_app`-style account), not superuser credentials.
3. Ensure DB host, port, and database match the compose service defaults used in your environment.
4. Keep operator-only credentials separate from app credentials.
5. Restart services that consume `.env`.
6. Validate with one read and one write operation from medusa-be.

4. <b>Migrate database</b> (if needed)
    * <i>(optional)</i> `medusa` schema needs to exist, which it should, unless it was manually dropped
    ```shell
    make medusa-migrate
    ```

5. <b>Create user for medusa admin</b> (if needed)
    ```shell
    make medusa-create-user EMAIL=[some@email.com] PASSWORD=[PASSWORD]
    ```

6. <b>Prepare file storage</b> (automatic in compose; manual fallback only if needed)
    ```shell
    make medusa-minio-init
    ```

7. <b>Seed initial data</b> (only first time)
    * seeded data also add regions that are required to be set
    * optionally this step can be skipped, but you need to manually add at least 1 region in medusa BE settings page
   ```shell
   make medusa-seed
   ```


8. <b>Create & set PUBLISHABLE_API_KEY</b> for Store front (only first time)
    * Restart services (commands below)
    * Go to <a href="http://localhost:9000/app">localhost:9000/app</a>
    * Login via user created in previous step
    * Go to settings -> Publishable API Keys
    * Create or copy existing key
    * Update DC_N1_NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY in .env
    * Restart services
    ```shell
   make down
   make dev
    ```

8b. <b>Provision and verify scoped Meilisearch keys</b> (recommended before frontend production builds)
    * local via `mise` wrappers (no `.env` writes; outputs are printed):
    ```shell
   mise run ci:meili:provision
   mise run ci:meili:verify
    ```
    * CI can call the same scripts directly (source of truth):
    ```shell
   bash ./scripts/ci/provision-meili-keys.sh
   bash ./scripts/ci/verify-meili-keys.sh
    ```
    * `provision-meili-keys.sh` acts as a reconcile step: missing keys are created and drifted fixed-UID keys are patched back to policy.
    * script policy is fixed (hardcoded):
        * backend uid/description: `2f2e1f59-7b5a-4f2f-9f28-7a9137f7e6c1` / `backend-medusa`
        * frontend uid/description: `3a6b6d2c-1e2f-4b8c-8d4f-0f7c2b9a1d55` / `frontend-medusa`
        * backend actions: `search`, `documents.add`, `documents.delete`, `indexes.get`, `indexes.create`, `settings.update`
        * backend indexes: `products`, `categories`, `producers`
        * frontend actions: `search`
        * frontend indexes: `products`, `categories`, `producers`

9. <b>Explore local envs</b>
    * N1 FE should be available at:
        * <a href="http://localhost:8000">localhost:8000</a>
        * <a href="https://n1.medusa.localhost">https://n1.medusa.localhost</a>
    * Medusa BE should be available at:
        * <a href="http://localhost:9000/app">localhost:9000/app</a>
        * <sup>(1)</sup><a href="https://admin.medusa.localhost/app">https://admin.medusa.localhost/app</a>
    * Minio console should be available at:
        * <a href="http://localhost:9003">localhost:9003</a>
        * <a href="https://admin.minio.localhost">https://admin.minio.localhost</a>
            * credentials: `DC_MINIO_ROOT_USER`/`DC_MINIO_ROOT_PASSWORD` (defaults: `minioadmin`/`minioadmin`)
            * Medusa runtime should use `DC_MINIO_ACCESS_KEY`/`DC_MINIO_SECRET_KEY` (non-root identity; object-level policy only)
    * Meilisearch console should be available at:
        * <a href="http://localhost:7700">localhost:7700</a>
        * <a href="https://admin.meilisearch.localhost">https://admin.meilisearch.localhost</a>
            * credentials: `DC_MEILISEARCH_MASTER_KEY`
            * backend key: `DC_MEILISEARCH_BACKEND_API_KEY` (scoped, server-only)
            * frontend key: `DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY` (read-only search key, never master)
            * (optional) if plugin was disabled before adding products:
                * `make medusa-meilisearch-reseed`
    * zane-operator should be available at:
        * <a href="http://localhost:8082/healthz">localhost:8082/healthz</a>
        * optional local-stack Caddy route: <a href="https://admin.zane-operator.localhost/healthz">https://admin.zane-operator.localhost/healthz</a>
            * bearer token: `DC_ZANE_OPERATOR_API_AUTH_TOKEN`
    * Redis compatible ValKey storage can be connected at `localhost:6379`
        * password: `DC_VALKEY_PASSWORD` (default in `.env`: `valkey_dev_change_me`)
    * Postgres DB can be connected at `localhost:5432`
        * default credentials: `root`/`root`
        * adminer can be accessed on <a href="http://localhost:8081">localhost:8081</a>

* <sup>(1)</sup> Caddyfile currently works inside of docker, and SSL cert is not exposed to host system,
  Admin for Medusa BE fails to connect websockets for Vite server due to SSL errors when visiting
  `https://admin.medusa.localhost/app`.

10. <b>Optional steps</b>

* Due to Server side rendering on FE and Client side rendering on BE for images, BE images are broken unless you
  edit hosts file on your host machine and add `127.0.0.1 medusa-minio` record
    * the issue is described here: <a href="https://github.com/curl/curl/issues/11104">curl/issues/11104</a>

---

## Local Postgres 18 Upgrade (Safe Path)

Postgres Docker image `18+` changed its default `PGDATA` layout. This repo now pins Postgres via
`docker/development/postgres/Dockerfile` (currently `postgres:18.1-alpine`) and stores cluster files in
`./.docker_data/db18` (mounted to `/var/lib/postgresql`, with `PGDATA=/var/lib/postgresql/18/docker`).

If you already have local data in `./.docker_data/db` from Postgres `<18`, run:

```shell
make postgres18-migrate-local
```

What the migration script does:
* stops `medusa-db` (if running)
* creates a physical backup archive of `./.docker_data/db`
* creates a logical SQL backup using `pg_dumpall`
* restores into a fresh Postgres 18 data dir at `./.docker_data/db18`
* leaves old data untouched for rollback

After migration:

```shell
make dev
```

Rollback path:
* keep using `./.docker_data/db` with a Postgres 17 image
* restore from the generated SQL/tar backups in `./.docker_data/backups/postgres18-migration`

When migration looks good and you want to keep only the PG18 state:

```shell
make postgres18-verify
make postgres18-finalize
```

`make postgres18-verify` checks that old cluster DBs/roles exist in the new cluster and compares structure, sequence values, and per-table row counts.
If old `./.docker_data/db` cannot be started, it falls back to verifying against the newest
`./.docker_data/backups/postgres18-migration/pg_dumpall_*.sql` backup.
`make postgres18-finalize` runs the same verification and then deletes `./.docker_data/db` and `./.docker_data/backups/postgres18-migration`.

---

## Testing Production Build Locally

To test the production Docker build locally:

```shell
make prod
```

This builds a production-optimized image and starts the container. Access the admin at:
* <a href="https://admin.medusa.localhost/app">https://admin.medusa.localhost/app</a> (requires HTTPS for session cookies)

Note: Production mode uses secure cookies, so you must access via HTTPS (Caddy) rather than `http://localhost:9000`.
Note: `make prod` now starts `medusa-be`, waits for health, regenerates `apps/n1/src/data/static/categories.ts` from Medusa data, then builds the `n1` prod image.

---

## ZaneOps Deploy Setup

Active Zane deployment for this repo is no longer driven by a checked-in swarm compose file.
The supported setup is:

* create one canonical Zane project with the service names from `config/stack-manifest.yaml`
* configure the shared production-environment variables and per-service env blocks described in `apps/zane-operator/README.md`
* let CI orchestrate preview/main deploys through `zane-operator`

For first-time local Zane setup, follow:

```shell
apps/zane-operator/README.md
```

Use `.env` for local compose/runtime and `.env.zane` for Zane-targeted helper scripts such as:
- `scripts/dev/setup-zane-project.sh`
- `scripts/dev/refresh-zane-template-db.sh`
- `mise run dev:zane:project:sync`
- `mise run dev:zane:template-db:sync`

---

# WrSearch

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is almost ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/nx-api/js?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Finish your CI setup

[Click here to finish setting up your workspace!](https://cloud.nx.app/connect/6uDqdlKDOV)

## Generate a library

```sh
npx nx g @nx/js:lib packages/pkg1 --publishable --importPath=@my-org/pkg1
```

## Run tasks

To build the library use:

```sh
npx nx build pkg1
```

To run any task with Nx use:

```sh
npx nx <target> <project-name>
```

These targets are
either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Versioning and releasing

To version and release the library use

```
npx nx release
```

Pass `--dry-run` to see what would happen without actually releasing the library.

[Learn more about Nx release &raquo;](hhttps://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Keep TypeScript project references up to date

Nx automatically updates
TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) in `tsconfig.json`
files to ensure they remain accurate based on your project dependencies (`import` or `require` statements). This sync is
automatically done when running tasks such as `build` or `typecheck`, which require updated references to function
correctly.

To manually trigger the process to sync the project graph dependencies information to the TypeScript project references,
run the following command:

```sh
npx nx sync
```

You can enforce that the TypeScript project references are always in the correct state when running in CI by adding a
step to your CI job configuration that runs the following command:

```sh
npx nx sync:check
```

[Learn more about nx sync](https://nx.dev/reference/nx-commands#sync)

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and
improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/nx-api/js?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:

- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

----

## ZCLI (Zerops zCLI)

https://github.com/zeropsio/zcli

```shell
curl -L https://zerops.io/zcli/install.sh | sh
```
