# Issue #545 release acceptance harness

This directory is the executable evidence index for the corrected U01–U42,
I01–I44, and E01–E30 matrices. It complements, rather than replaces, the
binding contract in `docs/issue-545-url-architecture-execution.md`.

The source matrix points each U/I row at assertion-bearing Vitest or Postgres
integration files. The release wire runner executes every `wire.*` assertion
against the real production ingress, static Proxy, Pages SSR routes, and system
Route Handlers. It has no response simulator and refuses to run without an
explicit fixture.

## Fixture contract

Copy `fixture.example.json` to an ignored or CI-generated location and replace
the example identities with a freshly seeded acceptance stack. The seed must
provide, for all four markets:

- one equivalent current product plus current category and CMS/article routes;
- direct-current alias, superseded, gone, missing, unassigned, and unavailable
  URLR/Medusa/CMS records;
- at least two listing pages and a bounded sitemap/feed containing the product;
- valid, invalid, used, and expired review-token states;
- a temporary redirect flow;
- a lifecycle product whose old slug is current before the run and whose
  delivery changes it to `lifecycle.newPath`.

`URL_ARCHITECTURE_LIFECYCLE_TOKEN` is read only from the environment. Do not put
it, any market publishable key, or any issued token into the committed fixture.
The string called `secret` is a non-production synthetic canary used only to
detect metadata/header leakage.

The fixture's M00 paths require `URL_ARCHITECTURE_M00_ENABLED=1` in the isolated
acceptance deployment. The real route checks in the same run prevent the M00
probe from being mistaken for full release evidence.

The four canonical `browserOrigin` hosts must resolve to the acceptance ingress
(for example via CI network aliases or an isolated hosts-file entry). Install
the pinned Playwright Chromium binary in the CI image; the browser row does not
skip when the binary or host mapping is absent.

```sh
mise x node@24 -- pnpm --filter=herbatika exec playwright install chromium
```

## Commands (Node 24)

Fast integrity check:

```sh
mise x node@24 -- pnpm --filter=herbatika test:url-architecture:matrix
```

Wire-only run against an already seeded production build:

```sh
URL_ARCHITECTURE_FIXTURE=/absolute/path/to/fixture.json \
URL_ARCHITECTURE_LIFECYCLE_TOKEN=redacted \
mise x node@24 -- pnpm --filter=herbatika test:url-architecture:wire
```

Release gate (matrix, TypeScript, complete Herbatika Vitest suite, PostgreSQL
18 gate, M00 Docker gate, then the seeded live matrix):

```sh
URL_ARCHITECTURE_FIXTURE=/absolute/path/to/fixture.json \
URL_ARCHITECTURE_LIFECYCLE_TOKEN=redacted \
mise x node@24 -- pnpm --filter=herbatika test:url-architecture:release
```

There are no skip flags. Netlify and the unresolved M19 multi-instance decision
remain outside this Docker/standalone evidence and must not be marked passed by
this harness.
