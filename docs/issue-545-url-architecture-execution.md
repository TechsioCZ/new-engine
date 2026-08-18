# Issue #545 URL architecture execution contract

Status: implementation contract for the replacement of PR #551

Base: `origin/master@f324a4a4d3bbf8991d6e56c854e73e3afe89a451`
Legacy PR reference only: `3a332177ec5087a3892a77895d8f380ed6d65380`

This document does not redefine product requirements. It resolves the ordering
and implementation conflicts in issue #545 into one executable contract. The
issue and its normative comments remain authoritative:

- [Issue #545](https://github.com/TechsioCZ/new-engine/issues/545)
- [Part 01/5: global invariants](https://github.com/TechsioCZ/new-engine/issues/545#issuecomment-5198268306)
- [Part 02/5: routes and localized segments](https://github.com/TechsioCZ/new-engine/issues/545#issuecomment-5198268536)
- [Part 03/5: binding routing correction and data contracts](https://github.com/TechsioCZ/new-engine/issues/545#issuecomment-5198268749)
- [Part 04/5: final SEO/query/status tables and M00-M22](https://github.com/TechsioCZ/new-engine/issues/545#issuecomment-5198268915)
- [Part 05/5: release evidence and Definition of Done](https://github.com/TechsioCZ/new-engine/issues/545#issuecomment-5198269075)

## 1. Conflict resolution and open decisions

Later explicit corrections and narrower security rules win over earlier generic
tables. The implementation uses these resolutions:

| Conflict | Executable decision |
|---|---|
| App Router public HTML versus Part 03 sections 5.1-5.3 | All public HTML is Pages Router SSR with `getServerSideProps`. App Router owns Route Handlers only. |
| Proxy-owned URLR resolution in Part 02 versus Part 03 sections 5.7-5.8 | Proxy is static and never reads URLR, Medusa, or CMS. Pages SSR owns dynamic resolution and hard statuses. |
| Unsafe noncanonical requests returning `404` in Part 01 versus Part 03 section 5.7 and Part 04 section 7.5 | Final method contract wins: non-action `POST`, `PUT`, `PATCH`, and `DELETE` return `405` with `Allow: GET, HEAD`; `OPTIONS` returns `204` with the same `Allow`; unsafe methods are never canonicalized or redirected. |
| Mutable alias targets in the early URLR sketch versus corrected Part 03 section 5.10 | Alias rows store no canonical target. They are immutable history rows associated with one logical route; resolution joins that route to its one current slug. |
| Repeated facet keys merged in an older table versus final section 7.4 | A repeated query key is `404`. CSV is the only multivalue representation. |
| Empty `q` redirect in an older table versus final sections 7.1/7.4 | Missing or trimmed-empty `q` renders a useful `200 noindex` search landing. |
| Generic legacy `308` rows versus token secrecy rules | Issued reset/review token URLs use an internal compatibility rewrite without a redirect until their expiry window closes, then `404`. Tokens never enter `Location`. |
| `/homepage-promo` alias in an older table versus final section 7.9 | It was not a public route. Do not create an alias. |
| `/o-nas` market behavior | Preserve SK and CZ because their current canonical target is already `/o-nas`; HU and RO use a direct `308` to their localized root-static target. |
| `cacheComponents` conditional behavior | Release configuration is `cacheComponents: false`. Re-enabling it is a separate post-release change. |
| Medusa assignment rule in an older table versus M21/DoD | Product, category, brand, collection, and campaign publication require an explicit Medusa-owned, admin-editable, channel-scoped assignment contract. URLR current state alone is not availability. |
| Netlify release status | Docker/standalone M00 is mandatory. The issue both rejects an unproven Netlify release adapter and asks M00 to test Netlify. Netlify remains `BLOCKED-PENDING-ISSUE-DECISION`; it must not delay the Docker implementation, but release scope must be decided explicitly. |
| Single-instance release versus mandatory backlog row M19 | The release remains standalone single-instance unless M19's shared-cache, tag-coordination, encryption-key, deployment-ID, and hash gates are implemented and accepted. Whether M19 is required for this release or is moved post-release remains `BLOCKED-PENDING-ISSUE-DECISION`. |
| Normal navigation versus RSC acceptance rows | Public links are document `<a href>` navigation without RSC or `/_next/data` prefetch. Adversarial requests carrying RSC headers must still preserve the correct hard status. |

The localized segment registry is `proposed, unverified` until G1 records a
native reviewer, date, and frozen registry hash for every market. Legal routes
also require legal approval. Code and fixtures must retain that status; they
must not claim the translations are approved.

Open decisions are tracked explicitly and must not be silently resolved in code:

| Decision | Executable state until resolved | Owner and deadline |
|---|---|---|
| Netlify as a supported release adapter | Docker/standalone is mandatory; no Netlify release claim or adapter-specific acceptance waiver is permitted. | `TBD — issue owner; required before S8` |
| M19 shared multi-instance runtime | Production remains single-instance. M19 cannot be counted complete or removed from M20 without a normative issue decision. | `TBD — issue owner; required before S8` |
| RSC/client-navigation rows I37/E25/E28 | Normal public navigation is document navigation. Only an adversarial RSC-header request is retained as a hard-status/spoofing probe. | `TBD — issue owner; required before S8` |
| Reset/review token rows in section 7.9/E30 | Token-bearing legacy requests use a compatibility rewrite without `Location`; the broad `308` wording is not applied to secrets. | `TBD — issue owner; required before S8` |
| G1 native/editorial/legal approval | Registry values remain `proposed, unverified`; publishing them is blocked. | `TBD — issue owner; required before S8` |

## 2. Non-negotiable architecture

- Next.js is exactly `16.3.0-preview.5`; CI verifies both manifest and installed
  package versions.
- Public HTML lives under semantic Pages Router targets rooted at
  `pages/~sf/[market]/...`. No public App Router page may remain at cutover.
- Pages Router provides its own `_app.tsx`, `_document.tsx`, `_error.tsx`, and
  `404.tsx`. Pages and App Router compose the same storefront shell, locale
  resources, design-system components, market configuration, and URL API;
  Pages-specific copies of navigation or URL logic are forbidden.
- App Router remains for APIs, callbacks, webhooks, robots, sitemap, manifest,
  feed, health, and other explicit technical Route Handlers.
- `proxy.ts` is a static trust boundary. It validates the trusted adapter
  origin, scrubs client `x-sf-*` and equivalent internal headers, resolves one
  host to one market, blocks direct `/~sf`, preserves the raw query sequence,
  and rewrites to a semantic internal route.
- Proxy never reads URLR, Medusa, CMS, catalog, or an alias database.
- `getServerSideProps` resolves before rendering and owns `308`, `400`, `404`,
  `410`, and `503` decisions. `421` belongs to Proxy; raw `400`/`414` and the
  optional TLS hop belong to the ingress adapter.
- Public links use ordinary document `<a href>` navigation. Public Server
  Functions are forbidden; mutations use explicit `/api` handlers.
- `skipProxyUrlNormalize: true`, `skipTrailingSlashRedirect: true`,
  `redirects: []`, and `cacheComponents: false` are release settings.
- Pages HTML is dynamically rendered and is not shared-cacheable.
- The release deployment is standalone and single-instance. The same build may
  be deployed separately with an `ALLOWED_MARKETS` subset, but every deployment
  is still single-instance until the unresolved M19 gate is accepted.
- Separate deployments use the same `routeTaxonomyHash`; every instance of one
  deployment uses the same taxonomy and `deploymentBindingHash`. The binding
  hash contains only a publishable-key fingerprint, never the key value.
- Multi-instance traffic is forbidden without a shared cache handler,
  cross-instance tag coordination, a shared Server Functions encryption key
  where applicable, a deployment ID for rolling releases, and matching route
  and binding hashes.
- A single typed URL API serves parser, resolver, metadata, JSON-LD, sitemap,
  feed, internal links, emails, and payment URLs.

The shared URL API surface is:

```ts
parsePublicPath(input): ParsedPublicRoute
resolvePublicRoute(input): Promise<ResolvedPublicRoute>
buildPath(target, market): string
buildAbsoluteUrl(target, market): URL
normalizeQuery(kind, searchParams): NormalizedQueryResult
buildAlternates(target): Promise<AlternateMap>
classifySeo(route): SeoClassification
resolveNavigationMode(target): "document" | "client"
```

All public HTML targets resolve to `navigation: "document"`.

Client Components receive a completed canonical `href` or serializable
`RouteTarget`; they never infer business market or canonical origin from
`window.location`. Internal links never contain a historical alias, tracking,
default query value, noncanonical host/case, or trailing slash. Product cards,
navigation, cart, orders, autocomplete, CMS links, breadcrumbs, emails, and
payment return URLs all use this contract. A market switcher links to a real
explicit equivalent; if none exists, its UI may link to that market's homepage,
but hreflang always omits the missing equivalent.

### 2.1 Proxy matcher and ingress/decode boundary

The static Proxy matcher includes public HTML, `/robots.txt`, `/sitemap.xml`,
`/sitemaps/*`, `/manifest.webmanifest`, `/feeds/products.xml`, `/favicon.ico`,
explicit `/.well-known/*`, and every recognizable direct `/~sf` variant. It
excludes `/_next/static/*`, `/_next/image/*`, ordinary public assets, `/api/*`,
and the internal health endpoint. API Route Handlers own an equivalent explicit
host/market/auth boundary rather than inheriting a Proxy bypass.

Ingress validates the raw request-target and authority before Next.js:

- malformed `%`, malformed authority, raw control characters, and invalid UTF-8
  return `400`;
- a raw request-target longer than 2048 bytes returns `414`;
- encoded slash/backslash (`%2F`, `%5C`) are rejected according to the tested
  adapter policy;
- forwarding headers are always removed and replaced by the trusted ingress;
- HTTPS may add the one permitted redirect before the application `308`.

Proxy and resolver then enforce decode-once semantics. The resolver never calls
an unconditional second `decodeURIComponent`. Parsed control, bidi, zero-width,
empty, `.`, `..`, encoded-separator, and malformed values are rejected. Direct
`/~sf`, `/~SF`, `/%7Esf`, double-encoded `%257E` variants, and equivalent
case/percent forms return external `404` before any internal rewrite.

## 3. Market and source boundary

| Market | Locale | Country | Canonical origin |
|---|---|---|---|
| `sk` | `sk-SK` | `SK` | `https://herbatica.sk` |
| `cz` | `cs-CZ` | `CZ` | `https://herbatica.cz` |
| `hu` | `hu-HU` | `HU` | `https://herbatica.hu` |
| `ro` | `ro-RO` | `RO` | `https://herbatica.ro` |

At boot, every market must map to exactly one region, sales channel, and
server-only publishable key. Each key must be linked to exactly one expected
sales channel. Unknown or ambiguous hosts fail closed with `421`; there is no
`Accept-Language`, origin-content, or Slovak fallback. No `NEXT_PUBLIC_*` value
is authoritative for market, origin, channel, region, or publishable key.

The runtime binding stores `canonicalOrigin`, verified `acceptedHosts`, locale,
country, `regionId`, `salesChannelId`, publishable-key value, and the distinct
internal `publishableApiKeyId`. Boot fails unless every `ALLOWED_MARKETS` entry
has a complete route definition and binding, canonical HTTPS origin outside
local development, a host owned by exactly one market, a key scoped to exactly
the expected single channel, an existing region containing the market country,
and taxonomy/binding hashes matching the deployment manifest. An alias host is
not accepted or redirected until DNS, TLS, and operational ownership have been
recorded; an unverified host returns `421`.

Every URLR, Medusa, and CMS reader returns a discriminated result:

```ts
type SourceReadResult<T> =
  | { kind: "found"; value: T }
  | { kind: "missing" }
  | { kind: "unavailable"; retryAfterSeconds?: number }
  | { kind: "invalid-response"; causeCode: string }
```

`missing` maps to `404`; `unavailable` and `invalid-response` map to `503`.
Nullable readers that merge those outcomes are forbidden. Catalog and CMS reads
carry the exact market locale with no fallback; catalog reads additionally use
the server-asserted market/channel scope described below.

Every reader has a bounded timeout, cancellation, and bounded retry. Standard
Medusa Store API catalog reads derive channel scope from the server-selected
publishable key and must not blindly add `sales_channel_id` as a generic query
parameter. Custom Store routes use `MedusaStoreRequest`, inspect the resolved
publishable-key scope, and assert that it equals the one expected channel.

Payload build-time and runtime locales are exactly `sk`, `cs`, `hu`, and `ro`.
Publishing a catalog entity requires a real Translation record for its exact
BCP-47 market locale; a non-empty Store API fallback value is not evidence of a
translation. Product, category, brand, collection, and campaign publication
also requires the explicit Medusa-owned channel assignment described by M21.

Primary category is Medusa merchandising data, never URLR data. A valid
`metadata.primary_category_id` wins; otherwise the deterministic fallback is
the deepest available leaf category, then lower rank, then lowest stable ID.
It affects breadcrumb, navigation, merchandising, and structured data, never
the product URL.

## 4. URL registry contract

URLR is a Next-owned Postgres model, but never a duplicate owner of catalog or
taxonomy data. The corrected Part 03 section 5.10 model separates logical route
lifecycle from immutable slug history:

- `url_route`: market, kind, target type, stable source/static identity,
  equivalence, index policy, `active | retired | superseded`, optional direct
  successor, timestamps, version, and optimistic-lock state.
- `url_entity_slug`: market, kind, normalized slug, optional route ID,
  `current | alias | gone`, and creation timestamp.
- `static_route_path`: market, route key, optional parent route key, segment,
  `exact | prefix` match mode, `current | alias` disposition, and the version in
  which the path was introduced. Static current and historical paths compile
  into one immutable Proxy snapshot and contribute to `routeTaxonomyHash`.

For `url_route`, `target_type=entity` requires a stable source entity ID and no
static route key; `target_type=static` requires a static route key and no source
entity ID. For `url_entity_slug`, current and alias rows require a route ID;
standalone gone rows may omit it. Alias rows contain no target column: lookup
joins their logical route to that route's one current slug.

Database and command invariants:

- unique `(market, kind, normalized_slug)`;
- at most one current slug per route;
- unique active `(market, kind, equivalence_key)`;
- immutable aliases with no stored canonical target, no chain, cycle,
  reassignment, tombstone reclaim, or slug reuse;
- stable source system/type/ID and optimistic locking for every command;
- an atomic slug transaction demotes the old current to alias and inserts the
  new current exactly once;
- `retired` maps every historical path to `410`;
- `superseded` maps every historical path directly to the successor current
  path with `308`;
- command writes and their required invalidation state commit atomically.

### 4.1 Repo-local hardening beyond the literal issue contract

The following are additional implementation hardening decisions for this
replacement branch, not requirements quoted from issue #545:

- URLR commands use a versioned, replay-safe idempotency key and record source
  version/event ID;
- write, audit, and invalidation-outbox records commit in one transaction;
- Payload and Medusa lifecycle producers use transactional outboxes rather than
  synchronous cross-service HTTP inside a pre-commit hook;
- no deferred row trigger scans the complete registry for every changed row;
- bounded invalidation records add a coarse `route-family:{market}:{kind}` tag
  so large history/cascade mutations remain correct without enumerating every
  exact route tag;
- S3 includes a 20,000-record Postgres load gate in addition to behavior,
  replay, and concurrency tests.

### 4.2 Slug normalization and collision contract

Entity slugs match `[a-z0-9]+(?:-[a-z0-9]+)*`, are at most 80 characters, and
are created only during a publish or explicit SEO-slug edit transaction. A
Medusa handle is allowed only as a one-time seed candidate; runtime route lookup
uses the stable source ID. Runtime slugification from handle, title, or label,
fallback to an ID/random value, and automatic `-2`/timestamp suffixes are
forbidden.

The frozen, versioned publish pipeline is exactly:

1. trim;
2. Unicode NFKC;
3. Romanian legacy cedilla to comma-below normalization;
4. locale-aware lowercase;
5. frozen SK/CZ/HU/RO transliteration;
6. versioned fallback for other Latin characters;
7. separators to `-`;
8. collapse repeated `-`;
9. remove leading/trailing `-`;
10. schema and collision validation.

An empty result or any transliteration/path collision blocks publication.
`libs/std/src/string.ts` is not a valid slugifier for this contract.

The validator compares complete normalized public paths per market across
static paths, prefixes, current slugs, aliases, gone paths, historical prefixes,
old-prefix/old-slug combinations, sibling account/auth/checkout/review paths,
facet values, case/percent equivalents, transliterations, host assignments,
equivalence mappings, and route-kind/source-kind pairs. It rejects direct or
encoded `~sf` and reserves at least `api`, `_next`, `~sf`, `.well-known`,
`robots.txt`, `sitemap.xml`, `sitemaps`, `favicon.ico`,
`manifest.webmanifest`, `feeds`, `healthz`, `.`, and `..`. A collision is a
hard build/publish failure; runtime precedence or "first wins" is forbidden.

## 5. Localized route registry

The following values mirror Part 02 and remain unverified until G1:

| Key | SK | CZ | HU | RO |
|---|---|---|---|---|
| products | `produkty` | `produkty` | `termekek` | `produse` |
| categories | `kategorie` | `kategorie` | `kategoriak` | `categorii` |
| brands | `znacky` | `znacky` | `markak` | `marci` |
| collections | `kolekcie` | `kolekce` | `gyujtemenyek` | `colectii` |
| campaigns | `akcie` | `akce` | `akciok` | `promotii` |
| advice | `poradna` | `poradna` | `tanacsok` | `sfaturi` |
| information | `informacie` | `informace` | `informaciok` | `informatii` |
| search | `vyhladavanie` | `vyhledavani` | `kereses` | `cautare` |
| cart | `kosik` | `kosik` | `kosar` | `cos` |
| checkout | `pokladna` | `pokladna` | `penztar` | `finalizare-comanda` |
| account | `ucet` | `ucet` | `fiok` | `cont` |
| reviews | `recenzie` | `recenze` | `velemenyek` | `recenzii` |

Root-static pages are never children of `information`:

| Key | SK | CZ | HU | RO |
|---|---|---|---|---|
| about | `o-nas` | `o-nas` | `rolunk` | `despre-noi` |
| contact | `kontakt` | `kontakt` | `kapcsolat` | `contact` |
| faq | `casto-kladene-otazky` | `caste-dotazy` | `gyakori-kerdesek` | `intrebari-frecvente` |
| shipping | `doprava` | `doprava` | `szallitas` | `livrare` |
| returns | `vratenie-tovaru` | `vraceni-zbozi` | `visszakuldes` | `retururi` |
| terms | `obchodne-podmienky` | `obchodni-podminky` | `altalanos-szerzodesi-feltetelek` | `termeni-si-conditii` |
| privacy | `ochrana-osobnych-udajov` | `ochrana-osobnich-udaju` | `adatvedelmi-tajekoztato` | `politica-de-confidentialitate` |
| cookies | `cookies` | `cookies` | `cookie-tajekoztato` | `politica-cookies` |

| Checkout key | SK | CZ | HU | RO |
|---|---|---|---|---|
| `checkout.contact` | `kontakt` | `kontakt` | `kapcsolat` | `contact` |
| `checkout.shipping` | `doprava` | `doprava` | `szallitas` | `livrare` |
| `checkout.payment` | `platba` | `platba` | `fizetes` | `plata` |
| `checkout.review` | `kontrola` | `kontrola` | `ellenorzes` | `verificare` |
| `checkout.paymentReturn` | `navrat-z-platby` | `navrat-z-platby` | `fizetesi-visszateres` | `retur-plata` |
| `checkout.confirmation` | `potvrdenie-objednavky` | `potvrzeni-objednavky` | `rendeles-visszaigazolas` | `confirmare-comanda` |
| `checkoutResult` (Part 03 section 5.13) | `vysledok` | `vysledek` | `eredmeny` | `rezultat` |

| Account/review key | SK | CZ | HU | RO |
|---|---|---|---|---|
| `account.lists` | `zoznamy` | `seznamy` | `listak` | `liste` |
| `account.orders` | `objednavky` | `objednavky` | `rendelesek` | `comenzi` |
| `account.settings` | `nastavenia` | `nastaveni` | `beallitasok` | `setari` |
| `account.login` | `prihlasenie` | `prihlaseni` | `bejelentkezes` | `autentificare` |
| `account.register` | `registracia` | `registrace` | `regisztracio` | `inregistrare` |
| `account.forgotPassword` | `zabudnute-heslo` | `zapomenute-heslo` | `elfelejtett-jelszo` | `parola-uitata` |
| `account.resetPassword` | `obnova-hesla` | `obnova-hesla` | `jelszo-visszaallitas` | `resetare-parola` |
| `reviews.product` | `produkt` | `produkt` | `termek` | `produs` |

Every child is an exact typed sibling; a generic account `[section]` must not
capture orders or auth actions. The information root without a slug always
returns `404`. Campaign routes are enabled only when a tested
`StorefrontCampaign` source and M21 assignment exist; otherwise the complete
family is absent from the release registry.

### 5.1 G1 approval evidence

The values above remain fixtures marked `proposed, unverified` until every cell
below is replaced by recorded evidence. A shared or inferred approval cannot
stand in for a market-specific approval.

| Market | Native/editorial reviewer and date | Legal-route reviewer and date | Frozen registry hash |
|---|---|---|---|
| SK | `TBD — issue owner; required before S8` | `TBD — issue owner; required before S8` | `TBD — issue owner; required before S8` |
| CZ | `TBD — issue owner; required before S8` | `TBD — issue owner; required before S8` | `TBD — issue owner; required before S8` |
| HU | `TBD — issue owner; required before S8` | `TBD — issue owner; required before S8` | `TBD — issue owner; required before S8` |
| RO | `TBD — issue owner; required before S8` | `TBD — issue owner; required before S8` | `TBD — issue owner; required before S8` |

### 5.2 Route behavior matrix

In this table, `indexable` means `200`, absolute self-canonical, matching
`og:url` and primary JSON-LD `url`/`@id`, explicit current/source-available
reciprocal alternates including self, and sitemap membership. `noindex` means
crawlable HTML with no canonical, hreflang, sitemap, OG URL, or public JSON-LD.

| Route family | Required behavior |
|---|---|
| Homepage `/` | `200 indexable`; unknown host `421`; CMS/Medusa/URLR unavailable or invalid response `503`. |
| Product root `/{products}` | Clean root `200 indexable`; `page>=2` distinct slice is indexable without hreflang/sitemap; facet/sort variants are `200 noindex`; source failure `503`. |
| Product `/{products}/{slug}` | No category/brand parent in path. Current and channel-available `200 indexable`; market/channel miss `404`; sold-out published product remains `200 indexable` and in sitemap with availability matching UI and JSON-LD; alias `308`; retired `410`; real successor direct `308`; source failure `503`. Primary category only affects breadcrumb/JSON-LD/merchandising. |
| Product `?variant=` | Exact case-preserving variant belonging to the path product opens as initial state with `200`; canonical and hreflang are the base product; no separate sitemap entry; unknown, removed, or foreign variant `404`. |
| Category root/detail | Root is a real `200 indexable` page. Detail URL is flat. Tree move never changes URL and invalidates breadcrumb/navigation/JSON-LD; descendants are bounded and navigation shows at most five levels. Clean/page/facet policy matches product listings. Empty published listing is `200 noindex` without canonical/hreflang/sitemap. Miss `404`, retired `410`, successor `308`, source failure `503`. |
| Brand root/detail | Root is real content. Detail uses URLR brand slug and explicit channel assignment; runtime title-to-slug generation is forbidden. Listing, empty, lifecycle, query, and source outcomes match category. |
| Collection root/detail | `source_type=medusa_collection`; listing, empty, lifecycle, query, assignment, and source outcomes match category. |
| Evergreen SEO landing | Shares the collection namespace and route kind, with `source_type=cms_landing`; no runtime probing between CMS landing and Medusa collection. It needs curated content/filter definition. Clean route is indexable; ad-hoc facet/sort and empty listing are noindex. |
| Campaign root/detail | Entire family is omitted unless `StorefrontCampaign` and M21 are tested. Active useful detail is indexable. Ended archive may remain `200 noindex` without canonical/hreflang/sitemap; hard removal is `410`; real successor `308`; source failure `503`. Internal promotion eligibility/rules are never exposed. |
| Advice root/detail | Clean root and current useful article are indexable; root `page>=2` uses pagination policy; missing article `404`, retired `410`, successor `308`, CMS failure `503`. |
| Information | `/{information}` is always `404`. Only `/{information}/{slug}` exists: published useful current page is indexable; miss `404`, retired `410`, successor `308`, CMS failure `503`. |
| Eight root-static pages | Paths are exactly the root-static registry above, never information children. Published/index-policy-allowed content is indexable. Missing/unpublished content cannot return indexable `200`; CMS failure `503`. Missing approved legal content blocks publication. |
| Search `/{search}` | Missing/trimmed-empty `q` and zero results render a useful `200 noindex` landing; duplicate or invalid `q` `404`; source failure `503`. Discovery must not depend only on search. |
| Cart `/{cart}` | `200 noindex`; missing cart renders an empty-cart state; backend failure `503`; cart ID is not a public path segment. |
| Checkout root/steps | `noindex`. Root with valid cart redirects `307` to default step; without valid cart `307` to localized cart. Unreachable/invalid step `307` to the first/default valid step; invalid provider state `404`; backend failure `503`. |
| Payment callback/result | New callback is `/api/payments/{provider}/return` with exact case-preserving allowlist, required signature/state validation, timeout, replay protection, and no generic query normalizer. Success returns `303` to `/{checkout}/{checkoutResult}`; state is server session or one-time opaque state. Result is noindex. |
| Order confirmation | `/{checkout}/{confirmation}/{publicOrderId}`, with guest `?ot={orderToken}`. Session ownership or guest token is mandatory. Unknown, foreign, wrong-case, invalid, used, or expired values return the same `404`; backend failure `503`. ID/token preserve case and never enter metadata, logs, or redirect targets. |
| Account dashboard/sections/orders | `noindex`. Unauthenticated request `307` to localized login. Order detail verifies owner and market; foreign/missing/wrong-case ID returns uniform `404`; never `410` or a guessed redirect; backend failure `503`. |
| Login/register/forgot/reset | `noindex`; return target is an allowlisted internal path only. Form/business validation may remain `200`; forgot-password response never reveals account existence. Reset token is exact and case-preserving; invalid/used/expired states are uniform `404`; backend failure `503`. |
| Review token | `/{reviews}/{reviews.product}/{token}`; valid flow `200 noindex`; invalid/used/expired token uniform `404`; backend failure `503`; no token in title, description, canonical, OG, JSON-LD, analytics, logs, or redirect target. |

## 6. Query contract

Canonical key order:

```text
page, sort, status, form, brand, ingredient, price_min, price_max, q, variant
```

Exact value contracts:

| Key | Value contract |
|---|---|
| `page` | Singleton `^[1-9][0-9]*$`; `1` is stripped. `0`, `01`, signed values, duplicate, overflow, and beyond-last page are `404`. |
| `sort` | Singleton lowercase enum: `recommended` (default), `newest`, `price-asc`, `price-desc`, `name-asc`, `name-desc`, `bestsellers`. |
| `status` | CSV of `in-stock`, `sale`, `new`. |
| `form` | CSV of `capsules`, `tablets`, `powder`, `tea`, `oil`, `drops`, `syrup`, `cream`. |
| `brand` | CSV of current market URLR brand slugs. One batch lookup resolves them; alias/superseded values compose one `308` to current values, while unknown/retired values are `404`. |
| `ingredient` | CSV of versioned market facet-registry tokens mapped to stable Medusa attribute/value IDs; runtime label slugification is forbidden. |
| `price_min`, `price_max` | Singleton `^[0-9]+(?:\.[0-9]{1,2})?$`, with `price_min <= price_max`; market implies currency. |
| `q` | Singleton case-preserving user input, at most 200 decoded Unicode code points. |
| `variant` | Singleton exact opaque case-preserving Medusa variant ID/SKU belonging to the path product. |

Per-route non-tracking allowlists:

| Route | Allowed keys |
|---|---|
| Product detail | `variant` |
| Product root and category/collection/campaign detail | `page, sort, status, form, brand, ingredient, price_min, price_max` |
| Brand detail | `page, sort, status, form, ingredient, price_min, price_max` |
| Category/brand/collection/campaign roots | none |
| Advice root | `page` |
| Advice detail, information, root-static page, homepage | none |
| Search | `q, page, sort, status, form, brand, ingredient, price_min, price_max` |
| Account orders root | `page` |
| Payment/provider, reset, and review flows | only their exact route-specific schema; never the generic allowlist |

The final Part 04 section 7.4 contract applies:

- invalid known value wins and returns `404` before any unknown-key redirect;
- duplicate singleton or repeated facet key returns `404`;
- CSV is the only multivalue form; trim, remove empty entries, deduplicate, and
  lexically sort; a valid noncanonical CSV gets one composed `308`;
- if CSV normalization leaves no value, or exceeds 10 values, return `404`;
- unknown non-tracking keys, including uppercase variants, are stripped by one
  `308` for GET/HEAD;
- `page=1` and `sort=recommended` are stripped by `308`;
- `page>=2` renders a real distinct slice, is indexable and self-canonical,
  but has neither hreflang nor sitemap membership;
- a page beyond the result set is `404`;
- a nondefault sort or any facet is `200 noindex` without canonical,
  hreflang, or sitemap membership;
- missing or trimmed-empty `q` renders a useful `200 noindex` search landing;
- `variant` is exact and case-preserving, selects the requested product
  variant, and canonicalizes to the base product;
- tracking-only requests remain `200`; tracking is preserved in another
  normalization redirect's `Location`, but never enters canonical, hreflang,
  sitemap, or internal links;
- limits are 20 query parameters, 10 values per facet, 256 UTF-8 bytes per
  value, 200 Unicode code points for `q`, and 10 `utm_*` entries;
- signed payment/provider parameters use a dedicated exact schema and never
  enter the generic normalizer.
- WHATWG URL serialization is authoritative; golden fixtures cover spaces,
  Unicode, and percent encoding.

## 7. HTTP and SEO outcome matrix

| Outcome | Required behavior |
|---|---|
| current indexable | `200`; absolute self-canonical; matching `og:url` and primary JSON-LD URL/ID; explicit current reciprocal alternates plus self; sitemap membership |
| alias/case/slash/host/query repair | one application `308` for GET/HEAD; at most one preceding ingress TLS hop |
| temporary flow | `307`; successful POST flow uses `303` |
| definitive missing/invalid/market unavailable | `404`; no public SEO surface |
| retired/gone public route | `410`; no public SEO surface; never used for private or token routes |
| superseded route | direct `308` to the successor current route, never a homepage or generic category |
| source unavailable/invalid | `503`, `Retry-After`, `no-store`; never `404` |
| unknown host | `421`; no locale fallback |
| malformed/too long raw request | ingress `400` / `414` |
| non-action POST/PUT/PATCH/DELETE | `405` and `Allow: GET, HEAD`; no redirect |
| OPTIONS | `204` and `Allow: GET, HEAD` |
| HEAD | same status and headers as GET, empty body |

Canonical URLs use HTTPS, the canonical non-`www` host, lowercase static
segments and entity slug, no trailing slash except `/`, standardized percent
encoding, and normalized query. Raw `Host` and the internal `/~sf` path are
never canonical authorities. Canonical, `og:url`, primary JSON-LD `url`/`@id`,
sitemap URL, feed URL, email URL, and internal links for the same target come
from the same builder.

Hreflang is HTML-only and uses `sk-SK`, `cs-CZ`, `hu-HU`, and `ro-RO`. Every set
contains self and reciprocal current, source-found, indexable `200` equivalents.
A missing market is omitted rather than replaced by a homepage or same-slug
guess. There is no `x-default`, no cross-domain canonical, and no sitemap
hreflang. Search, facets, sort, `page>=2`, account, auth, cart, checkout, and
token routes emit no hreflang. Separate deployments need a shared/atomically
replicated URLR equivalence snapshot or must not emit hreflang.

Facets, sort, search, cart, checkout, account, auth, orders, and token routes
remain crawlable but `noindex`; they have no canonical, hreflang, sitemap, OG
URL, or public JSON-LD. `robots.txt` disallows only `/~sf/` and `/api/` and
contains the absolute sitemap URL for its own canonical host.

All `400`, `404`, `410`, unhandled `500`, and `503` HTML error surfaces emit
meta and `X-Robots-Tag` noindex, `Cache-Control: no-store`, and no canonical,
hreflang, redirect, OG URL, or JSON-LD. A `503` always includes `Retry-After`;
when the source does not provide one, the status layer uses a bounded configured
default.

Sitemaps contain only current, canonical, source-available, channel-available,
indexable `200` URLs. Reads are bounded and paginated; shard protocol limits are
50,000 URLs/50 MB, with a project target around 10,000 URLs/25 MB. Every staging
sitemap URL is crawled independently and any redirect or non-200 blocks release.
Aliases, tombstones, redirects, errors, facets, sort, search, tracking URLs,
`page>=2`, private/token routes, and `/~sf` are excluded. Per-URL `lastModified`
is `max(contentModifiedAt, routeModifiedAt)`, never generation time. A taxonomy
move updates `taxonomyModifiedAt` and invalidates breadcrumb/navigation/JSON-LD;
it changes sitemap last-modified only when it also changes listing content and
therefore `contentModifiedAt`.

### 7.1 System route contract

| Route | Contract |
|---|---|
| `/robots.txt` | Host-specific content and own absolute sitemap; unknown host `421`, config failure `503`. |
| `/sitemap.xml` | Host-specific index; source failure `503`, never an incomplete `200`. |
| `/sitemaps/{kind}-{n}.xml` | Existing shard `200`; unknown kind/shard `404`; bounded generation and source failure `503`. |
| `/manifest.webmanifest` | Host-specific name, locale, icons, and start URL. |
| `/feeds/products.xml` | Bounded/paginated market- and channel-scoped canonical product feed; source failure `503`. |
| `/favicon.ico` | Shared asset, but served only for a verified host. |
| `/.well-known/{name}` | Exact registered allowlist only; everything else `404`; ACME is ingress-owned and not implicitly enabled in Next. |
| `/api/healthz` | Internal network/platform health checker only. |
| `/api/*` | Route-specific schema, method, market, authentication, authorization, and ownership boundary; unknown endpoint `404`, unsupported method `405`. |
| `/~sf/*` | Never public; all direct case/percent variants return `404`. |

### 7.2 Cache and invalidation contract

Pages SSR HTML is dynamic and never shared cached. URLR resolution reads the
authoritative Postgres/read replica; process-local cache is not routing
authority. Every market-dependent key includes market and, where needed, the
expected sales-channel ID.

Required tags are:

```text
market:{market}
route-family:{market}:{kind}
route:{market}:{kind}:{routeId}
route-slug:{market}:{kind}:{slug}
static-route:{market}:{routeKey}
equivalence:{equivalenceKey}
facet:{market}:{facetKind}:{sourceId}
{entityKind}:{market}:{entityId}
sitemap:{market}
```

`market` and the repo-local `route-family` hardening tag are mandatory on every
URLR resolution cache entry, including miss, alias, superseded, and equivalence
reads. Exact route/slug tags from the issue remain required on cache entries
when that identity is known. A bounded invalidation record prioritizes the old
and new exact paths, then may omit additional historical/cascade exact tags;
correctness for that overflow relies on the coarse family tag. Cross-market
equivalence reads carry the family tag for every queried market.

Slug, assignment, publishability, lifecycle, equivalence, or static-segment
changes invalidate the old and new path as applicable, entity/source data,
metadata, alternates, feed, and sitemap. Webhook/consumer handlers are
authenticated, validate payloads as unknown, are idempotent by event ID, and use
bounded batch, retry, and timeout. Route Handlers use `revalidateTag` with an
explicit cache-life profile; `updateTag` is not used there.

## 8. Immutable new-site migration manifest

Shoptet history is out of scope. The already published routes in the current
new-engine storefront are in scope:

Compatibility aliases apply only to `GET` and `HEAD`; unsafe methods receive
the public HTML method outcome and are never redirected or normalized. Each
concrete path is seeded only in a market where it was actually published, and
every legacy target is the direct current canonical rather than another alias.

| Legacy route | Required decision |
|---|---|
| `/p/{handle}` | direct `308` to the localized current product path via imported stable mapping, never runtime handle slugification |
| `/c/{slug}` | direct `308` to the localized current category path |
| `/znacka`, `/znacka/{slug}` | direct `308` to localized brands root/current detail |
| `/blog`, `/blog/{slug}` | direct `308` to localized advice root/explicit CMS-mapped detail; unknown detail `404` |
| `/search` | direct `308` to localized search, preserving valid `q` |
| `/faq` | direct `308` to localized root-static FAQ |
| `/o-nas` | preserve SK/CZ; HU/RO direct `308` to localized about |
| `/account` and known children | per-child direct `308`; opaque IDs preserve case |
| plain `/auth/login`, `/auth/register`, `/auth/forgot-password` | per-child direct `308` when no token/secret state is exposed |
| issued `/auth/reset-password` and `/reset-password` token flows | compatibility rewrite without redirect until token expiry window closes, then `404` |
| `/checkout` and ordinary known steps | mapped direct `308`; unknown legacy step then follows the localized default-step `307` flow |
| `/checkout/platba-navrat` | no generic redirect; compatibility payment handler and then validated `303` |
| `/reviews/product/{token}` | compatibility rewrite without redirect until token expiry window closes, then `404` |
| published root CMS `/{slug}` | direct `308` only from a frozen inventory to localized `/{information}/{slug}`; unknown root slug `404` |
| retired published public URL | `410`, or direct `308` when a real successor exists |
| `/api/*`, favicon, fonts/assets | preserve as explicit system surface |
| `/homepage-promo` | no route and no alias |

The manifest is immutable and build-validated against the old filesystem/config
route inventory. No unresolved row may reach release.

The frozen root-CMS inventory, issued-token expiry cutoffs, and provider return
cutover status are release artifacts with evidence, not runtime guesses:

| Artifact | Owner and deadline |
|---|---|
| Published root CMS path export per market | `TBD — issue owner; required before S8` |
| Reset/review token last-valid cutoff | `TBD — issue owner; required before S8` |
| Payment-provider return URL cutover evidence | `TBD — issue owner; required before S8` |

## 9. Master behavior that must survive

The replacement starts from master and must preserve, with regression tests:

- AccountShell auth guard, navigation/loading/logout, stale-session refetch, and
  public account-deactivation confirmation.
- `variant=<Medusa variant key>` deep links and actual initial selection.
- product field selection and rendering for GPSR/atomic metadata.
- quantity-tier discounts with customer, variant, region, and sales-channel
  identity.
- sale price-list selection, original/calculated prices, and `on_sale` in SSR,
  cache keys, listings, cards, autocomplete, saved lists, cart, and orders.
- explicit locale through Meilisearch, hydrated products, fallback search, and
  facets.
- structured CMS articles, authors, content segments, product references,
  sidebar, TOC, ordering, pagination, sanitization, and upstream error mapping.
- latest reactive autofill validation behavior from master PR #575.

Stable Medusa IDs are runtime source identity. A Medusa handle remains a backend
field and may be used only as a one-time URLR seed candidate; it is never public
or runtime routing identity. A public current slug is a separate projection and
must never overwrite `product.handle`.

## 10. Incremental delivery graph

1. **S0 — contract and baseline.** Record this contract, master/PR refs, clean
   unit baseline, and known environment-dependent build baseline.
2. **S1 — M00 risk gate.** Prove Pages Router `200/308/404/410/503` and GET/HEAD
   behavior in the exact production build before migrating public routes.
3. **S2 — pure URL boundary.** Exact-version gate, market config, typed segment
   registry, query normalizer, collision validator, static Proxy contract, and
   exhaustive unit/golden tests.
4. **S3 — URLR core.** Corrected schema, migrations, memory/Postgres behavior
   parity, versioned/idempotent command API, audit and invalidation outbox,
   concurrency tests, and the 20k load gate, behind a disabled feature flag.
5. **S4 — product vertical slice.** Localized product Pages route, stable-ID
   source read, variant, metadata/JSON-LD, canonical links, direct legacy alias,
   lifecycle producer, and Docker wire tests while preserving all master product
   behavior.
6. **S5 — catalog/content slices.** Category, brand, collection, optional
   campaign, advice, information, and root-static routes with their assignment,
   locale, pagination, lifecycle, and SEO contracts.
7. **S6 — private and transactional flows.** Search, cart, checkout/payment,
   account/auth/deactivation/orders, reset/review compatibility, and all email
   URL producers.
8. **S7 — system SEO.** Robots, sitemap index/shards, feed, manifest,
   alternates, bounded crawler, and invalidation integration.
9. **S8 — cutover.** Freeze and validate the migration manifest, remove public
   App HTML routes, enable producers then resolver in staged order, run all
   Docker/Postgres/browser/wire/crawler gates, and only then open the replacement
   PR for merge.

No PR #551 commit is cherry-picked wholesale. Only small independently tested
primitives may be manually ported; master remains the behavior baseline.

## 11. Verification gates

Completion means M00-M22 plus the corrected U01-U42, I01-I44, and E01-E30
matrices from issue #545. At minimum, CI/release must prove:

The following correction overlay is part of this contract; the uncorrected
issue wording must not be copied into test expectations:

| Test/backlog row | Corrected executable expectation |
|---|---|
| U35 | Public Server Functions are forbidden. GET/HEAD enter the public resolver; non-action POST/PUT/PATCH/DELETE return `405` with `Allow: GET, HEAD`; OPTIONS returns `204` with the same Allow. Explicit `/api` handlers use their own route-specific method schema. |
| I37 | This is an adversarial RSC-header spoofing/rewritten-path preservation test only. A request carrying RSC headers cannot spoof `x-sf-*`, bypass routing, or turn a hard status into `200`; it is not proof of supported public client navigation. |
| E25 | On Docker/standalone, direct HTML and explicit adversarial RSC-header requests prove current `200`, alias `308`, miss `404`, tombstone `410`, and outage `503` before flush for GET/HEAD. The Netlify variant is pending the explicit release-target decision and cannot be marked passed or waived implicitly. |
| E28 | Clicking public links performs document navigation and emits neither an RSC request nor `/_next/data` prefetch. The resulting full document retains correct market, public path, status, canonical, and metadata. |
| I44 | Each section 8 legacy row asserts its classified outcome: direct `308`, preserve, compatibility rewrite without `Location`, `410`, or `404`, including the recorded token/provider cutoff state. |
| E30 | Crawl only the alias subset expecting one application `308`. Separately assert preserved system/current routes, dev-only/unknown `404`, retired `410`, and token/payment compatibility behavior. The full inventory must not be asserted to be all redirects. |
| M19 | Remains unresolved. Production is single-instance; M19 is neither silently waived nor counted complete until the issue owner decides release versus post-release scope. |
| Netlify-dependent rows | Remain blocked pending the release-target decision. Docker evidence is mandatory and is recorded independently. |

- exact Next version and config capabilities;
- all unit and integration suites for Herbatika, storefront-data, Medusa, and
  Payload;
- Postgres behavior, replay, concurrency, and 20k scale with no skipped DB gate;
- Payload/Medusa transactional-outbox rollback, replay, and locale/channel
  assignment behavior;
- production standalone behind the real Docker ingress for HTTP/1.1 and HTTP/2;
- GET/HEAD parity and pre-flush hard statuses;
- raw path/authority, spoofed-header, method, and cross-host poisoning tests;
- every sitemap URL independently returns canonical indexable `200`;
- legacy crawl has no chain, alias link, cross-market URL, soft-404, or
  contradictory canonical;
- token redaction in access logs, traces, errors, metadata, analytics, and
  redirects;
- G1 native/editorial/legal approvals and frozen route-taxonomy hash;
- explicit resolution of the Netlify release-target contradiction.
- explicit resolution of M19, RSC-row, and token-legacy wording before S8.

## 12. Baseline recorded before implementation

- Branch base: `f324a4a4d`; PR #551 head remains `3a332177` in its untouched
  worktree.
- Divergence at branch creation: PR #551 is 18 commits ahead and 167 behind.
- Exact runtime: `Next.js v16.3.0-preview.5`.
- Herbatika baseline after building injected workspace packages:
  `29/29` test files and `145/145` tests passed.
- Production build compiles and passes TypeScript, then fails during static page
  generation because the baseline environment has no market publishable key and
  the CMS article-categories request returns `400`. This is pre-existing master
  configuration behavior, not a replacement-branch regression.

## 13. Implementation evidence log

### 2026-08-17 — S1 Docker/standalone M00

- Exact `Next.js 16.3.0-preview.5` optimized build: **PASS**, including the
  standalone artifact/config assertion.
- Production Herbatika `prod` image behind Caddy TLS: **PASS**.
- Wire suite: **91/91 passed**, with no skips, for HTTP/1.1 and HTTP/2, all four
  SNI hosts, ordinary and adversarial RSC-header profiles, all five
  `200/308/404/410/503` outcomes, and GET/HEAD parity before body delivery.
- The same wire run proves forged market/internal headers cannot change market,
  unsafe methods return `405`, OPTIONS returns `204`, and a cross-market direct
  `/_next/data/{buildId}/~sf/...` request returns `404`.
- The pinned Next adapter classifies spoofed RSC headers before application
  Proxy code and otherwise emits a framework `307`. The supported Docker ingress
  therefore strips those client-controlled framework headers before forwarding;
  Proxy scrubbing and trusted `x-sf-*` replacement remain defense in depth.
- Herbatika unit suite after S1: **33/33 files and 191/191 tests passed**;
  TypeScript, Biome, Actionlint, Compose validation, and Caddy validation pass.
- Docker S1 evidence is complete. The issue's contradictory Netlify row remains
  `BLOCKED-PENDING-ISSUE-DECISION`; M00 must not be called globally release-ready
  until that ownership decision is recorded.
