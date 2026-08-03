# Zane Operator

Database-role orchestration and preview database lifecycle. PostgreSQL 18 minimum.

## Invariants

- Shared PostgreSQL service; isolated app databases. One schema-scoped app role handles runtime and migrations.
- App roles never own databases or receive implicit all-schema access.
- `zane_operator` is `NOSUPERUSER NOBYPASSRLS`; production broad grants require explicit opt-in.
- Preview cloning is database-level and deterministic. Bootstrap/migrations are idempotent.
- No internal cleanup scheduler; GitHub events drive cleanup.
- Never silently skip failed privilege operations. Validate identifiers/inputs and report actionable context.
- External input is `unknown` until schema-validated. Bound retries, polling, listing, and cleanup loops with timeouts and terminal states.

## Owned integration surfaces

`apps/zane-operator/src`, PostgreSQL bootstrap/readiness scripts, `scripts/apply-postgres-role-bootstrap.sh`, and matching Docker Compose wiring. Keep environment contracts synchronized with README and example env files.

## Verification

```sh
pnpm exec ultracite check <changed-paths> # advisory
pnpm exec tsc --noEmit -p scripts/typescript/projects/apps/zane-operator/tsconfig.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/apps/zane-operator/tsconfig.json
pnpm -C apps/zane-operator test
docker compose -f docker-compose.yaml config
```

When role/grant logic changes, run `mise run dev:postgres:bootstrap:verify` when Docker is available and verify health waits for bootstrap readiness.
