# Issue #545 release evidence

This is an evidence template, not a completion claim. Attach immutable logs or
CI artifacts for every command and record the exact release SHA. Do not paste
credentials, publishable keys, lifecycle tokens, or issued customer tokens.

Local/static results are code-complete evidence only. They do not establish a
deployed image, production ingress behavior, live crawl result, external
approval, or operational log review. Leave post-deploy fields `TBD` until the
named release artifact has actually been deployed and observed. An isolated
pre-deploy Docker/ingress run is integration evidence for the candidate image,
not post-deploy evidence for a released image.

## Release identity

- Commit SHA: `TBD`
- Docker image digest: `TBD`
- Next.js version: `TBD` (must be `16.3.0-preview.5`)
- Playwright/Chromium version: `TBD`
- Route taxonomy hash: `TBD`
- Deployment binding hash: `TBD`
- Fixture schema/hash: `TBD`
- Deployment target: `existing Zane Docker/standalone service`
- Runtime mode: `standalone, single-instance`
- Evidence timestamp (UTC): `TBD`

## Code-complete and deployment gates

| Gate | Evidence phase | Exact command | Result | Artifact |
|---|---|---|---|---|
| Matrix integrity | code-complete | `mise x node@24 -- pnpm --filter=herbatika test:url-architecture:matrix` | TBD | TBD |
| Herbatika TypeScript | code-complete | included by release runner | TBD | TBD |
| Herbatika full suite | code-complete | included by release runner | TBD | TBD |
| PostgreSQL 18 behavior/concurrency/load | code-complete | included by release runner | TBD | TBD |
| M00 Docker HTTP/1.1 + HTTP/2 | pre-deploy integration | included by release runner | TBD | TBD |
| Seeded four-host wire/crawler | post-deploy acceptance | included by release runner | TBD | TBD |
| Full release command | mixed; identify artifacts by phase | `mise x node@24 -- pnpm --filter=herbatika test:url-architecture:release` | TBD | TBD |

The matrix integrity artifact must report exactly 42 U rows, 44 I rows, and 30
E rows. The wire artifact must contain every named `wire.*` subtest with no
skip, todo, or cancellation.

## Required independent observations

- [ ] Four canonical hosts were tested through the existing Zane production
  ingress.
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
- [ ] Old reset/review token and payment return/callback paths returned `404`
  without `Location`; no rewrite, redirect, fallback, or dual routing appeared.
- [ ] `/o-nas` returned canonical indexable `200` on SK/CZ and hard `404`
  without `Location` on HU/RO.

## Post-deploy evidence still required

- [ ] The deployed commit SHA and immutable Docker image digest were captured.
- [ ] The deployed Next.js version, route-taxonomy hash, deployment-binding
  hash, and seeded fixture schema/hash were captured from that same release.
- [ ] All live four-host ingress, wire, browser, sitemap, feed, crawl, outage,
  lifecycle, and hard-status observations above were attached as immutable
  artifacts with timestamps.
- [ ] Ingress/application logs, traces, analytics, and error reporting for the
  deployed acceptance run were searched for the synthetic token canary and the
  resulting evidence was attached.

## Resolved release scope

- Release adapter: existing Zane Docker/standalone service; Netlify is excluded
  and no Netlify release claim is permitted.
- Runtime topology: single-instance; M19 is post-release and not counted
  complete. Any later multi-instance rollout must satisfy M19 first.
- Navigation: public links use full-document navigation. RSC-header rows are
  adversarial spoofing/hard-status probes only.

## External approval that automation cannot provide

- G1 native/editorial/legal approval and frozen registry hashes: `TBD`
