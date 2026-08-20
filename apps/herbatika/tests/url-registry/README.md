# URL registry PostgreSQL 18.1 gate

Run the explicit gate from `apps/herbatika`:

```sh
node tests/url-registry/run-pg18-gate.mjs
```

The default runner creates an isolated container from the exact
`postgres:18.1-alpine` image with a random host port, database, migration user,
and restricted runtime user. It applies the immutable migration plan with the
production migration runner and always removes the named container. Docker or
PostgreSQL unavailability fails the gate; no test is skipped.

For a dedicated CI database, set both
`URL_REGISTRY_PG18_TEST_MIGRATION_DATABASE_URL` and
`URL_REGISTRY_PG18_TEST_RUNTIME_DATABASE_URL`. They must identify distinct
users on PostgreSQL 18.1 and begin without an existing `url_registry` schema.
The database is destructive test infrastructure: the gate first proves the
V4-to-V5 transition with a historical commandless catalog receipt, then the
suite truncates the URL registry tables between scenarios.

The `.integration.ts` files are intentionally absent from normal Vitest
matching and run only through `vitest.pg18.config.mts`. The gate executes the
shared adapter behavior contract, real concurrency and rollback races, a small
command-path throughput sample, and a deterministic 20,000-route mixed bulk
fixture. The scale gate allows 120 seconds for fixture commit and 45 seconds
for 100 public-adapter commands; plan assertions additionally require the
expected indexed access paths, which avoids treating timing alone as proof.
