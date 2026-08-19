# Issue #545 release evidence

This is an evidence template, not a completion claim. Attach immutable logs or
CI artifacts for every command and record the exact release SHA. Do not paste
credentials, publishable keys, lifecycle tokens, or issued customer tokens.

## Release identity

- Commit SHA: `TBD`
- Docker image digest: `TBD`
- Next.js version: `TBD` (must be `16.3.0-preview.5`)
- Playwright/Chromium version: `TBD`
- Route taxonomy hash: `TBD`
- Deployment binding hash: `TBD`
- Fixture schema/hash: `TBD`
- Runtime mode: `standalone, single-instance`
- Evidence timestamp (UTC): `TBD`

## Automated gates

| Gate | Exact command | Result | Artifact |
|---|---|---|---|
| Matrix integrity | `mise x node@24 -- pnpm --filter=herbatika test:url-architecture:matrix` | TBD | TBD |
| Herbatika TypeScript | included by release runner | TBD | TBD |
| Herbatika full suite | included by release runner | TBD | TBD |
| PostgreSQL 18 behavior/concurrency/load | included by release runner | TBD | TBD |
| M00 Docker HTTP/1.1 + HTTP/2 | included by release runner | TBD | TBD |
| Seeded four-host wire/crawler | included by release runner | TBD | TBD |
| Full release command | `mise x node@24 -- pnpm --filter=herbatika test:url-architecture:release` | TBD | TBD |

The matrix integrity artifact must report exactly 42 U rows, 44 I rows, and 30
E rows. The wire artifact must contain every named `wire.*` subtest with no
skip, todo, or cancellation.

## Required independent observations

- [ ] Four canonical hosts were tested through the production ingress.
- [ ] Ordinary and adversarial RSC-header GET/HEAD probes retained
  `200/308/404/410/503` and empty HEAD bodies.
- [ ] Raw malformed target/authority and over-2048-byte target returned
  `400/414`; unknown host returned `421`; OPTIONS/non-action methods returned
  `204/405` with `Allow: GET, HEAD`.
- [ ] Current HTML canonical, `og:url`, primary JSON-LD URL/ID and reciprocal
  hreflang agreed; page-2/facet/search/private policy remained distinct.
- [ ] Robots, sitemap index/shards, feed, manifest, favicon, and well-known
  behavior were host-correct for all markets.
- [ ] Every sitemap URL independently returned canonical indexable `200`.
- [ ] The bounded internal-link crawl found the seeded product and no alias,
  legacy, tracking, cross-market, internal-namespace, or redirecting link.
- [ ] URLR, Medusa, and CMS outage fixtures returned `503` with `Retry-After`
  and no-store/noindex rather than a soft `404`.
- [ ] Lifecycle delivery converged old `308` / new `200`, with canonical,
  alternates, and sitemap updated without restart.
- [ ] Review-token canary was absent from response headers and document head;
  invalid/used/expired states were uniform `404`.
- [ ] Ingress/application access logs, traces, analytics payloads, and error
  reporting were separately searched for the canary and contained no match.
- [ ] Empty initial-release legacy inventory was independently confirmed.

## External decisions that automation cannot approve

- G1 native/editorial/legal approval and frozen registry hashes: `TBD`
- Netlify release-target decision: `BLOCKED-PENDING-ISSUE-DECISION`
- M19 release-versus-post-release decision: `BLOCKED-PENDING-ISSUE-DECISION`
- RSC wording and token-legacy wording owner decisions: `TBD`
