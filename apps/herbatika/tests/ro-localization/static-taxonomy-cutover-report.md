# RO static taxonomy cutover plan

This is a deterministic, read-only population contract. It does not apply URL
registry changes and it does not write to Medusa, Payload, Zane, or PostgreSQL.

## Current decision: NO-GO

The target taxonomy is frozen, but population is not yet executable. Two
authoritative inputs are still required:

1. a database preflight produced by the read-only SQL below;
2. the final four-market URLR `PopulationManifest` generated after the
   post-commerce catalog bindings exist.

The RO catalog importer manifest is not a substitute for the URLR manifest.
It does not contain preserved SK/CZ/HU routes or all URLR assignment IDs and
versions. The checker deliberately rejects a partial or fabricated manifest.

## Frozen target

- RO demo roots: `11`
- Policy: `noindex`, exact root routes, omitted from indexable sitemap output
- RO non-demo roots: `about` and `faq` remain `indexable`
- RO-only roots: `affiliate`, `dropshipping`, `giftVoucher`, `privateLabel`,
  and `wholesale`
- SK/CZ/HU route projections: unchanged
- Target taxonomy approval hash:
  `sha256:a532ad08f718b0a8ff5d58026144a24314dd53f1c7bb38a0840efb5fe59aae39`
- Target static cutover plan hash:
  `sha256:0f7c1615586b9f1397290b87d2210dd47143d0dd17fcb53b0832e699221f6896`

Market route projections bound by the plan:

| Market | Routes | Projection SHA-256 |
| --- | ---: | --- |
| SK | 35 | `69892509406fbfb3217eec78cb33a60f760f25230cbd2b2009d6089e8df2e2f2` |
| CZ | 35 | `99006f3e9b786bbe949b7b3be840c2800dfd8887f071edcc9ae6133084b94f06` |
| HU | 35 | `1cf63588b378ef18985cb03fc48bb8ecd7dbb9b8a9d3355431fdc77f337ce5bc` |
| RO | 40 | `141b2adc93bbf06d95e4d327dc2bba5b9ecfc4b333eb79487e6c0b6c3758be13` |

## Population manifest refresh

Once the authoritative catalog population manifest exists, refresh only its
build taxonomy hash and RO demo approval references:

```sh
pnpm -C apps/herbatika exec tsx \
  tests/ro-localization/static-taxonomy-generate.ts \
  --manifest /absolute/path/to/authoritative-population-manifest.json \
  --preflight /absolute/path/to/static-taxonomy-preflight.json \
  --output /absolute/path/to/ro-static-population-artifact.json
```

The generator preserves SK/CZ/HU approvals, bindings, entities, source
snapshot, and generation provenance. It parses the resulting complete
population manifest through the production contract and emits its exact
`populationManifestHash`. It requires exactly one binding for each of
`sk-SK`, `cs-CZ`, `hu-HU`, and `ro-RO`, and the exact RO entity partition:
2,002 products, 207 categories, 103 brands, and zero collections. Output uses
exclusive creation and refuses an `--apply` option.

## Existing-route preflight

Emit the deterministic SQL, run it with a read-only database role, and keep
its single JSON result as release evidence:

```sh
pnpm -C apps/herbatika exec tsx \
  tests/ro-localization/static-taxonomy-generate.ts \
  --print-preflight-sql > /absolute/path/to/static-taxonomy-preflight.sql

psql -X -A -t "$URL_REGISTRY_DATABASE_URL" \
  -f /absolute/path/to/static-taxonomy-preflight.sql \
  > /absolute/path/to/static-taxonomy-preflight.json
```

The SQL contains only a CTE and `SELECT`. It reads `url_registry.url_route`
and the current rows in `url_registry.static_route_path`; it performs no DML.

The checker accepts only these inventory shapes:

- zero existing roots: greenfield population may create all eleven;
- all eleven active roots with exact identity and paths;
- any partial inventory, terminal route, ambiguous current path, changed
  equivalence, or other mismatch is a hard blocker.

If all eleven exist as `indexable`, the artifact remains `NO_GO` and emits
eleven explicit `update-route` actions. Each action contains the live route
ID, optimistic `expectedVersion`, exact static identity, deterministic source
event and idempotency key, and the approved `noindex` metadata. These actions
must be sent through the URLR command adapter as
`registry.updateRoute(createUrlRegistryCommand(action.apply))`. Direct SQL
updates are forbidden because they bypass the command ledger, audit record,
version CAS, and invalidation outbox.

After the lifecycle actions, rerun the SQL and generator. Population dry-run
may proceed only when the artifact says `GO_FOR_POPULATION_DRY_RUN`, contains
no blockers, and the transition plan has no remaining actions.

The generated manifest must then be passed to `populate:url-registry` in its
default dry-run mode. Its blockers, retirement plan, taxonomy hash, source
snapshot hash, and exact manifest hash must be archived. Live apply remains a
separate, manually confirmed cutover step outside this generator.

After the population artifact is converged, emit the gate authority at the
fixed release path:

```sh
pnpm -C apps/herbatika exec tsx \
  tests/ro-localization/static-taxonomy-convergence-generate.ts \
  --input /absolute/path/to/ro-static-population-artifact.json \
  --artifact-root /absolute/path/to/release-artifacts \
  --captured-at 2026-08-20T20:00:00.000Z \
  --environment-id zane-production-ro \
  --release-id ro-demo-20260820
```

This exclusively creates
`urlr/static-taxonomy-convergence.json`. The strict schema freezes both
approval hashes, zero actions/blockers, the exact `2` indexable and `11`
noindex root sets, manifest SHA-256, and release provenance. The release gate
hashes these exact bytes; this markdown report is never gate authority.

Every transition action includes a reverse `rollbackTemplate`. It is not an
automatic or directly executable rollback. First pass the original action and
the successful apply receipt to `authorizeStaticTaxonomyRollback`; it verifies
the apply request fingerprint, idempotency key, source event, route ID, applied
outcome, prior/result versions, and resulting `noindex` state. A fresh
preflight alone cannot authorize rollback, because another owner may have
written the same post-update version. Dispatch only the command returned by
the authorizer through the same adapter. URLR history must never be deleted
and no migration down/direct SQL rollback is permitted.

## Verification

```sh
pnpm -C apps/herbatika exec vitest run \
  tests/ro-localization/static-taxonomy-plan.test.ts \
  tests/ro-localization/static-taxonomy-convergence.test.ts \
  tests/ro-localization/static-taxonomy-preflight.test.ts \
  tests/ro-localization/static-taxonomy-transition-dispatch.test.ts
```

The checker fails closed if any of the 11 RO demo roots is indexable, has a
different path, is not an exact root, changes RO `about`/`faq`, drifts the
frozen SK/CZ/HU projection, or if the production parser rejects the refreshed
population manifest. It also tests greenfield, converged,
indexable-transition, partial, terminal, path-conflict database inventories,
real in-memory command dispatch, and receipt-bound rollback authorization.
