# smart-suggest

Generated UltraModern SuperApp workspace.

This workspace keeps `presetUltramodern(...)` as the single public
UltraModern.js 3.0 SuperApp surface and starts with an explicit shell:

- `apps/shell-super-app` owns shell route assembly, Module Federation host
  wiring, shared SSR/i18n runtime setup, and the boundary debugger.
- `packages/shared-*` provide placeholders for cross-workspace contracts and
  design tokens.
- `verticals/*` is intentionally empty until a real business domain is added.

Add a full-stack MicroVertical when the product needs one:

```bash
pnpm dlx @bleedingdev/modern-js-create transportation --vertical
pnpm dlx @bleedingdev/modern-js-create payments --vertical
```

Each added vertical owns its UI/routes, browser-safe Module Federation exposes,
private-first route metadata, localized URLs, public-route opt-ins, CSS prefix,
Effect BFF handlers, local API contract, and typed client surface. Server
handlers and Effect client/contract modules stay out of browser exposes.

## Private-First Public Surfaces

Generated app routes are private and non-indexable by default. Author route
metadata in colocated `src/routes/**/route.meta.ts` files; the scaffold
regenerates `src/routes/ultramodern-route-metadata.ts` as a compatibility
manifest for config, i18n, public head, and public surface contracts. Private
app, auth, tenant, dashboard, and internal routes publish no discovery output
unless route metadata explicitly marks them `public && indexable`. The default
scaffold therefore emits only a disallowing `robots.txt`; sitemap, web
manifest, `llms.txt`, API catalog, security.txt, and JSON-LD output stay
omitted until a safe public route or public docs/help/product surface exists.
Structured data is never inferred automatically. Add `jsonLd` explicitly in
route metadata for `public && indexable` routes and use
`src/routes/ultramodern-jsonld.ts` when the route fits the generated `WebPage`,
`WebApplication`, `SoftwareApplication`, `BreadcrumbList`, `FAQPage`, or
`Organization` helpers. Private or non-indexable routes emit no JSON-LD even
when they have localized paths, titles, descriptions, BFF APIs, or Module
Federation boundaries.

Public web artifacts are build/deploy outputs generated into `dist/public` and
`.output/public`, not hand-authored source files under `config/public`. Dynamic
public routes can expand sitemap entries through route-owned, Node-safe
`route.sitemap.mjs` providers beside route metadata. The public-surface
generator discovers those providers for dynamic public routes and still honors
explicit `routes.publicSurface.contentSources` entries in the generated
compatibility manifest.

Run the scaffold validator before adding business code and after every
`--vertical` mutation:

```bash
mise install
pnpm install
pnpm check
pnpm build
```

The generated toolchain baseline is Node `>=26` with pnpm `11.9.0`.
`packageManager`, `.mise.toml`, generated validation, and CI should all agree
on that baseline; do not reintroduce Corepack or older pnpm aliases.

Generated CI does not call the local aggregate. It runs format, lint,
typecheck, skills, i18n boundary validation, contract validation, and build as
separate matrix jobs so failures are isolated and parallelizable.

Type checking is TS7-first. `pnpm typecheck` runs
`scripts/ultramodern-typecheck.mjs` in TS-Go build mode over
`tsconfig.json` project references, with native-preview `--checkers` and
`--builders` enabled by default. `@typescript/native-preview` is the TS7 latest
dev compiler lane. The classic `typescript` package is pinned to latest TS6
only where compatibility peers or tooling still require it.

Read-only agent reference repositories under `repos/` (Effect and
UltraModern.js source lookup using squashed git subtrees) are an explicit
opt-in step: run `pnpm agents:refs:install` when you want them. `pnpm install`
never clones repositories.

Vendored agent skills ship with the scaffold. Clone-installed skills (such as
the Module Federation `mf` skill) are fetched only when you explicitly run
`pnpm skills:install`, or when `ULTRAMODERN_AGENT_SKILLS=1` is set during
`pnpm install`. `pnpm skills:check` warns about missing clone-installed skills
without failing the gate.

The topology and ownership metadata are generated under `topology/`. The
workspace also ships `.github/workflows/ultramodern-workspace-gates.yml` and
`.github/renovate.json` with read-only workflow permissions, commit-pinned
actions, frozen installs, StepSecurity audit-mode runner hardening, dependency
dashboard review, one-day release age, grouped updates, and manual approval for
major upgrades.

Package source metadata is generated in
`.modernjs/ultramodern.json`. This workspace uses the published
UltraModern.js install cohort, while generated shared packages still use
`workspace:*` because they are part of this workspace.

## Public URL Environment Variables

This workspace's apps must not bake absolute `http://localhost:<port>` URLs
into asset configuration. Public URL and asset prefix environment variables
have distinct roles, and stale aliases should not be carried forward when
regenerating or updating the workspace.

| Variable                          | Role                                             | Feeds                                                                |
| --------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| `MODERN_PUBLIC_SITE_URL`          | Canonical site origin for public SEO output only | Canonical, hreflang, sitemap `<loc>`, robots `Sitemap:`              |
| `MODERN_ASSET_PREFIX`             | Preferred JS/CSS/static asset prefix             | Modern/Rspack-emitted asset URLs                                     |
| `ULTRAMODERN_ASSET_PREFIX`        | UltraModern compatibility asset prefix           | Modern/Rspack-emitted asset URLs when `MODERN_ASSET_PREFIX` is unset |
| `ULTRAMODERN_PUBLIC_URL_<APP_ID>` | Per-app deployment/proof URL                     | Cloudflare proof inputs and Module Federation remote URLs            |

Asset URLs use this precedence: `MODERN_ASSET_PREFIX` →
`ULTRAMODERN_ASSET_PREFIX` → origin-relative `/`. `MODERN_PUBLIC_SITE_URL` is
canonical/SEO-only and must not be used as an asset-prefix fallback.
SEO output uses `MODERN_PUBLIC_SITE_URL`; if it is unset, generated local and
preview outputs remain non-public until deployment proof provides explicit
public URLs.

Without public URLs configured, asset paths are origin-relative (`/`), and the
dev server uses `dev.assetPrefix: '/'` — so apps work through tunnels and
reverse proxies (ngrok, cloudflared) without triggering Chrome's Local Network
Access prompt or mixed-content errors. Shell-only workspaces can set
`MODERN_PUBLIC_SITE_URL` for SEO output without changing where assets load
from.

## Cloudflare Proof

Deploy the generated apps, then pass each deployed app's generated public URL
env key into the proof step. The proof script reads the generated contract and
checks the live Worker surface, including public-route sitemap/robots
consistency, preview noindex behavior, unknown-route status, asset headers,
byte budgets, and public sourcemap exposure. A shell-only workspace only needs
the shell URL; added verticals use the same `ULTRAMODERN_PUBLIC_URL_<APP_ID>`
pattern with hyphens converted to underscores and uppercased.

```bash
pnpm cloudflare:deploy
ULTRAMODERN_PUBLIC_URL_SHELL_SUPER_APP=https://shell-super-app.example.workers.dev \
pnpm cloudflare:proof -- --require-public-urls
```

## Smart Suggest Runtime Config

The shell app exposes Smart Suggest through `/api/v1/*` and uses Cloudflare D1
when the Worker provides the `SMART_SUGGEST_D1` binding. Local builds and
previews keep an in-memory fallback so API smoke tests can run without live
Cloudflare resources.

| Variable                               | Role                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| `SMART_SUGGEST_D1_BINDING`             | Wrangler binding name; defaults to `SMART_SUGGEST_D1`   |
| `SMART_SUGGEST_D1_DATABASE_NAME`       | D1 database name; defaults to `smart-suggest`           |
| `SMART_SUGGEST_D1_DATABASE_ID`         | D1 database id; required by `pnpm cloudflare:deploy`    |
| `SMART_SUGGEST_D1_PREVIEW_DATABASE_ID` | Optional preview D1 id; falls back to the production id |
| `SMART_SUGGEST_ALLOWED_ORIGINS`        | Deployment-owned CORS origin allowlist contract         |
| `SMART_SUGGEST_PROVIDER_PRIORITY`      | Deployment-owned provider priority contract             |
| `SMART_SUGGEST_PROVIDER_TIMEOUT_MS`    | Provider fallback timeout override                      |
| `MAPY_CZ_API_KEY`                      | Provider secret contract; server/Worker only            |
| `MAPY_CZ_ENDPOINT_URL`                 | Optional Mapy-compatible endpoint override for testing  |

`pnpm cloudflare:build` post-processes the generated `.output/wrangler.json`
with the D1 binding shape, copies the generated D1 migrations into `.output`,
and removes server-only API/shared files from the public asset directory.
`pnpm cloudflare:deploy` reruns that post-process in strict mode, applies D1
migrations with Wrangler, and fails if `SMART_SUGGEST_D1_DATABASE_ID` is
missing. Provider secrets, provider priority, timeout, and CORS origins are
intentionally deployment/runtime configuration, not browser configuration.

## Smart Suggest Provider Runtime Configuration

Live providers are fallback-only. CZ owned data must keep working when every
provider is missing, disabled, timed out, rate-limited, or circuit-open. Do not
commit provider secrets, raw query samples, or provider response payloads.

Use Cloudflare secrets for credentials:

```bash
wrangler secret put MAPY_CZ_API_KEY --config apps/shell-super-app/.output/wrangler.json
wrangler secret put RADAR_API_KEY --config apps/shell-super-app/.output/wrangler.json
wrangler secret put HERE_API_KEY --config apps/shell-super-app/.output/wrangler.json
```

Use Cloudflare vars or environment-scoped deploy configuration for non-secret
runtime switches:

| Provider           | Required secret or var                                               | Optional vars                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mapy.cz            | `MAPY_CZ_API_KEY`                                                    | `MAPY_CZ_ENDPOINT_URL`                                                                                                                                                 |
| Radar Autocomplete | `RADAR_API_KEY`                                                      | `RADAR_AUTOCOMPLETE_BASE_URL`, `RADAR_AUTOCOMPLETE_COUNTRY_CODE`, `RADAR_AUTOCOMPLETE_DEFAULT_LIMIT`, `RADAR_AUTOCOMPLETE_LAYERS`, `RADAR_AUTOCOMPLETE_NEAR`           |
| HERE Discover      | `HERE_API_KEY`                                                       | `HERE_DISCOVER_BASE_URL`, `HERE_DISCOVER_DEFAULT_LIMIT`, `HERE_DISCOVER_LANGUAGE`, `HERE_DISCOVER_IN_AREA`, `HERE_DISCOVER_AT`, `HERE_DEFAULT_LAT`, `HERE_DEFAULT_LNG` |
| Managed Nominatim  | `NOMINATIM_USER_AGENT` plus an approved managed `NOMINATIM_BASE_URL` | `NOMINATIM_DEFAULT_LIMIT`, `NOMINATIM_EMAIL`, `NOMINATIM_REFERER`                                                                                                      |
| RUIAN geocode      | none for the public endpoint                                         | `RUIAN_GEOCODE_BASE_URL`, `RUIAN_GEOCODE_DEFAULT_LIMIT`, `RUIAN_GEOCODE_DISABLED`                                                                                      |
| Runtime policy     | `SMART_SUGGEST_QUERY_HASH_SECRET` should be a secret                 | `SMART_SUGGEST_PROVIDER_PRIORITY`, `SMART_SUGGEST_PROVIDER_TIMEOUT_MS`, `SMART_SUGGEST_PROVIDER_CACHE_TTL_SECONDS`, `SMART_SUGGEST_ALLOWED_ORIGINS`                    |

Provider priority is a comma-separated provider id list, for example
`ruian-geocode,mapy-cz,radar-autocomplete,here-discover,nominatim`. Only
configured providers are called. Missing provider credentials result in skipped
configuration, not a hard checkout dependency.

Deploy/config checks:

```bash
pnpm cloudflare:build
wrangler secret list --config apps/shell-super-app/.output/wrangler.json
grep -R "MAPY_CZ_API_KEY\\|RADAR_API_KEY\\|HERE_API_KEY" apps/shell-super-app/.output
pnpm test:smoke
```

The `grep` command should find variable names only in generated configuration or
code references, never credential values. `SMART_SUGGEST_QUERY_HASH_SECRET`
keeps cache and telemetry keys keyed without storing raw user query text.
Provider events persist provider ids, statuses, error codes, request ids, and
query hashes only.

## Smart Suggest Owned Import Proof

Use the local import and proof commands for normalized owned-dataset fixtures.
They read JSON or JSONL `AddressSnapshotRow` objects, import through the Smart
Suggest dataset helpers into in-memory repositories, and do not call live
providers.

```bash
pnpm smart-suggest:import:local
pnpm smart-suggest:proof:offline
node scripts/smart-suggest-owned-import.mjs import-d1 \
  --d1-target local \
  --apply-migrations \
  --snapshot-uri fixture://synthetic/k-louzi-1258-12
```

The checked-in fixture is a single synthetic test row that covers the required
`K Louži 1258/12` scenario; do not commit real or bulk production snapshots.
For production imports, pass an external local snapshot path with
`--snapshot-uri` pointing at the retained source, for example an R2 URI plus an
operator-tracked checksum. Output reports contain only scenario ids, source ids,
suggestion labels, provider-event counts, and import row totals. D1 import uses
the generated `apps/shell-super-app/.output/wrangler.json` config and the
`SMART_SUGGEST_D1` binding by default. `--apply-migrations` refreshes that
config's `migrations_dir` from the Smart Suggest storage migrations before
Wrangler applies migrations. Use `--d1-target remote` or `--d1-target preview`
only for explicit operator runs. Production normalized `address_records`,
`data_sources`, and `import_runs` belong in D1, not in git.

## Smart Suggest Source Governance

Source persistence is governed by
[`docs/adr/0002-smart-suggest-source-governance.md`](../../docs/adr/0002-smart-suggest-source-governance.md).
Provider priority and timeout settings only control live fallback order; they do
not grant permission to cache, index, import, or durably store provider results.

Current source decisions:

| Source                                     | Runtime role                         | Persistence rule                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RUIAN CZ                                   | Owned CZ import                      | Persistent `address_records` are allowed with CUZK/RUIAN CC BY 4.0 attribution, modification notes, and monthly Atom discovery.                                                      |
| Mapy.cz / Mapy.com                         | Deployment-approved live fallback    | Permanent cache and durable retention are controlled by deployment-owned source policy. Bulk import, offline harvesting, and training use remain blocked unless separately approved. |
| Radar Autocomplete                         | Live fallback/enrichment             | TTL-only cache, max 30 days. Do not write to durable `address_records` or the offline index.                                                                                         |
| HERE Discover / Autocomplete / Autosuggest | Deployment-approved live fallback    | Permanent cache and durable retention are controlled by deployment-owned source policy. Bulk import, offline harvesting, and training use remain blocked unless separately approved. |
| Managed Nominatim endpoint/account         | Deployment-approved live fallback    | Permanent cache and durable retention are controlled by deployment-owned source policy. The configured `nominatim` provider alias resolves to this managed source policy.            |
| Public Nominatim service                   | Not a production autocomplete source | Do not use for autocomplete, production fallback, bulk import, durable cache, or index building. OSM extracts/self-hosted services require a separate ODbL decision.                 |
| Slovakia Register adries                   | Candidate owned SK import            | Pending license/attribution confirmation before production persistent import.                                                                                                        |
| OpenAddresses                              | Candidate backfill/source discovery  | Per-source license only; never treat the whole project as one blanket durable source.                                                                                                |

Raw user query text must never be stored. Live-provider suggestions must not be
written to durable `address_records` unless the source catalog explicitly allows
durable retention for that source. Mapy, HERE, and managed Nominatim use
deployment-approved source policies; that does not grant bulk-import/backfill
rights.

`GET /v1/status` includes a compact `sourcePolicy` section for operational
review. It reports catalog-derived provider source IDs allowed for durable
retention/permanent cache, TTL-only live providers with their max TTL, live
providers that must not durably retain results, and
`rawQueryStorage: "disabled"`. The status response intentionally reports source IDs and counters
only; it does not include raw user queries or provider payloads.

## Smart Suggest Consumption Policy

New-core monorepo consumers, including Herbatika, use direct workspace imports
from the nested Smart Suggest packages first:

```ts
import { AddressSuggestField } from '@techsio/smart-suggest-ui/address-suggest-field';
```

There is intentionally no top-level `@techsio/smart-suggest` facade package in
this phase. Package subpath exports are the review boundary and keep UI wrappers,
validation, storage, provider integrations, and the old-core SDK separate.

Old PHP core integrations use only `/api/v1/*` and the optional tiny vanilla SDK
surface. They must not consume React, Module Federation, storage, or provider
packages.

Module Federation exists as a later/new-core rollout path only. The current shell
exposes `./SmartSuggestAddressField` as an always-latest remote backed by
`@techsio/smart-suggest-ui/address-suggest-field`; it is not the source of truth
for Herbatika. Keep `pnpm mf:types` green after shell builds and verify public
artifacts do not contain provider SDK strings or server-only source directories.

## Troubleshooting

| Symptom                     | Current check                                                                                                                                                     | Owner                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Package cohort mismatch     | Regenerate with one package source strategy, run `mise install`, then rerun `pnpm install` from the activated shell.                                              | Generated workspace package source metadata |
| Install failure             | Check the active Node/pnpm from `mise install`; rerun `pnpm install` after the shell sees the pinned versions.                                                    | Toolchain setup                             |
| Build failure               | Run the matching primitive gate (`pnpm lint`, `pnpm typecheck`, `pnpm i18n:boundaries`, `pnpm contract:check`) before `pnpm build`; fix the owning failure first. | Owning package or generated contract        |
| Missing public URL          | Set the env key from `.modernjs/ultramodern-generated-contract.json`, for example `ULTRAMODERN_PUBLIC_URL_SHELL_SUPER_APP`.                                       | Deployment operator                         |
| Cloudflare credentials      | Confirm Wrangler credentials before `pnpm cloudflare:deploy`; local checks do not prove live Worker access.                                                       | Deployment operator                         |
| Asset or CSS 404            | Rebuild with `pnpm build` or `pnpm cloudflare:deploy` and inspect emitted Modern/Rspack asset paths instead of hardcoding CSS URLs.                               | Framework/runtime asset pipeline            |
| Federation manifest failure | Run the shell and vertical build scripts, then check each deployed `/mf-manifest.json` URL used by the shell.                                                     | Module Federation owner                     |
