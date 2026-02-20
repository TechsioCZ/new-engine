# Local runtime instructions

### Requirements:

* Docker compose + Docker
  * For Mac, <a href="https://orbstack.dev/">OrbStack</a> is recommended instead of Docker Desktop
* make

### Steps

1. <b>Create .env file</b>
    * copy .env.docker => .env
    * optionally update config as needed

2. <b>Install dependencies</b>

    ```shell
    make install
    ```

* alternatively force dependency lock fix:
  ```shell
  make install-fix-lock
  ```

3. <b>Run docker compose</b>
    ```shell
    make dev
    ```
    * Postgres role bootstrap (`medusa_app`, `medusa_dev`) runs automatically on first DB initialization via `docker/development/postgres/initdb/01-zane-role-bootstrap.sh`
    * `zane_operator` role bootstrap runs as one-shot service `zane-operator-bootstrap` before `zane-operator` starts (idempotent)
    * If your Postgres volume already existed before this change, run bootstrap migration once:
    ```shell
    make postgres-role-bootstrap
    make postgres-zane-operator-bootstrap
    ```
    * Optional idempotency check (runs bootstrap twice):
    ```shell
    make postgres-role-bootstrap-verify
    make postgres-zane-operator-bootstrap-verify
    ```
    * Optional grant hardening check (read-only verification):
    ```shell
    make postgres-grants-verify
    ```
    * Existing DB migration note: bootstrap includes idempotent legacy-object migration from `public` schema into `DC_MEDUSA_APP_DB_SCHEMA` (default `medusa`), with conflict fail-fast if same object already exists in target schema.
    * Medusa BE DB connection is derived from `DC_MEDUSA_APP_DB_*`; keep those on app credentials (`medusa_app`), not superuser credentials
    * `MEDUSA_DATABASE_SCHEMA` / `DATABASE_SCHEMA` are derived from `DC_MEDUSA_APP_DB_SCHEMA` and must stay aligned with app schema grants
    * `medusa-db` starts with `-c file_copy_method=clone`; zane-operator preview cloning uses `CREATE DATABASE ... STRATEGY=FILE_COPY`

### Cloud predeploy hook (idempotent)

If you deploy `zane-operator` separately in cloud, run role bootstrap once before service start:

```shell
/app/zane-operator-bootstrap-role
```

Required env vars for this hook:
* Reuses operator envs (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE`, `DB_TEMPLATE_NAME`, `DB_PREVIEW_OWNER`)
* Add only admin override credentials: `BOOTSTRAP_ADMIN_PGUSER`, `BOOTSTRAP_ADMIN_PGPASSWORD`

Optional hardening toggles:
* `BOOTSTRAP_SET_TEMPLATE_OWNER=1` (default)
* `BOOTSTRAP_FAIL_IF_TEMPLATE_MISSING=0` (set to `1` to fail hard if template DB does not exist yet)
* `BOOTSTRAP_VERIFY_IDEMPOTENT=1` (runs bootstrap twice in the same hook)
* Optional admin endpoint overrides (if admin connects to different DB endpoint): `BOOTSTRAP_ADMIN_PGHOST`, `BOOTSTRAP_ADMIN_PGPORT`, `BOOTSTRAP_ADMIN_PGDATABASE`, `BOOTSTRAP_ADMIN_PGSSLMODE`

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

6. <b>Prepare file storage</b> (only first time setup)
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
            * credentials: `minioadmin`/`minioadmin`
    * Meilisearch console should be available at:
        * <a href="http://localhost:7700">localhost:7700</a>
        * <a href="https://admin.meilisearch.localhost">https://admin.meilisearch.localhost</a>
            * credentials: `MEILI_MASTER_KEY_FOR_DEVELOPMENT_ONLY`
            * (optional) if plugin was disabled before adding products:
                * `make medusa-meilisearch-reseed`
    * Redis compatible ValKey storage can be connected at `localhost:6379`
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

Postgres Docker image `18+` changed its default `PGDATA` layout. This repo now pins Postgres to
`postgres:18.1-alpine` and stores cluster files in `./.docker_data/db18` (mounted to `/var/lib/postgresql`,
with `PGDATA=/var/lib/postgresql/18/docker`).

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
