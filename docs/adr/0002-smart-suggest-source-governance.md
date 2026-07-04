# ADR 0002: Smart Suggest Source Governance

## Status

Accepted

## Context

Smart Suggest combines owned address datasets with live provider fallbacks. Each
source has different license, attribution, cache, and retention rules. Provider
results must not become durable address data just because they passed through the
same suggestion API as owned records.

ADR 0001 already states that provider result storage is governed by explicit
provider cache policy and that raw user queries must not be stored or logged.
This ADR records the source-by-source decisions that future catalog, fallback,
and ingestion work must follow.

## Decision

Smart Suggest source governance is explicit and source-specific:

| Source | Allowed role | Persistence and cache decision | Attribution and source notes |
| --- | --- | --- | --- |
| RUIAN CZ via CUZK Atom-discovered bulk files | Owned CZ import source | Persistent `address_records` and permanent owned cache are allowed. Discover current source files monthly through CUZK/RUIAN Atom feeds; do not hardcode dated ZIP URLs. | Use CUZK/RUIAN CC BY 4.0 attribution and include a modification note when Smart Suggest normalizes or derives runtime rows. |
| Mapy.cz / Mapy.com REST API | Deployment-approved live provider fallback | Permanent cache and durable retention are controlled by deployment-owned source policy. Bulk import, offline harvesting, and training use remain blocked unless a separate permission is recorded. | Show Mapy attribution near Mapy-powered results and keep source metadata with retained rows. |
| Radar Autocomplete | Live fallback or enrichment | TTL-only cache is allowed for at most 30 days. Radar results must not be written to durable `address_records` or the offline index. | Show Radar attribution when Radar data is displayed. |
| HERE Discover / Autocomplete / Autosuggest | Deployment-approved live provider fallback | Permanent cache and durable retention are controlled by deployment-owned source policy. Bulk import, offline harvesting, and training use remain blocked unless a separate permission is recorded. | Show HERE attribution and supplier notices when HERE data is displayed, and keep source metadata with retained rows. |
| Managed Nominatim endpoint/account | Deployment-approved live provider fallback | Permanent cache and durable retention are controlled by deployment-owned source policy. Bulk import, offline harvesting, and training use remain blocked unless a separate permission is recorded. | Show OSM attribution, preserve required source metadata, and record modification context for normalized retained rows. |
| Public Nominatim service | Not allowed for Smart Suggest autocomplete or production fallback | Do not use public Nominatim for autocomplete, production fallback, bulk import, durable cache, or index building. The configured `nominatim` provider alias resolves to the managed source policy, not this public-service policy. | OSM extracts and self-hosted Nominatim are separate ODbL decisions and require explicit attribution/share-alike review before persistent import. |
| Slovakia Register adries | Candidate owned SK import source | Pending. Do not enable persistent production import until license, attribution, and redistribution terms are confirmed. | Keep as a candidate source only until license confirmation is recorded. |
| OpenAddresses | Candidate backfill or source discovery | Pending per source. Never treat OpenAddresses as one blanket license; persistence depends on each upstream source license/config. | Track source-specific attribution and license before enabling durable use. |

Raw query text must never be stored. Hash-derived or normalized lookup values may
cross persistence boundaries only when they do not reveal the original user
query and the target source policy allows the associated data retention.

Production address data must not be persisted in the repository. Git stores
source catalog policy, parsers, import code, tests, and tiny synthetic fixtures
only. Durable normalized `address_records`, `data_sources`, and `import_runs`
belong in the configured Cloudflare D1 database; raw source snapshots, when
retained, belong in external operator-controlled storage referenced by URI,
checksum, source id, and import run metadata.

Live-provider suggestions must not be written to durable `address_records`
unless the source catalog explicitly allows durable retention for that source.
Mapy, HERE, and the configured managed Nominatim provider use
deployment-approved source policies. Public Nominatim and Radar do not inherit
that permission. TTL-only provider records need an expiry and purge model;
`address_records` has no provider-result expiry and must not be used as a TTL
cache.

Accepted checkout or customer address storage is a separate business-data
question. It must not retain provider payloads, enrichment metadata, or source
metadata unless the source terms allow that retained data.

## Current Risk

The current fallback path can produce live-provider suggestions from providers
with different persistence rules. Any write path that upserts those suggestions
into durable `address_records` before checking a source catalog is unsafe for
Radar, public Nominatim, unverified live RUIAN geocoder results, and any
deployment whose source policy does not allow durable provider-result retention.

Provider fallback caching also needs to remain provider-aware. A single shared
TTL or durable cache policy is not sufficient because Mapy, HERE, and
managed Nominatim permit durable retention only when explicitly enabled by
deployment source policy, Radar permits TTL-only retention capped at 30 days,
and public Nominatim is not a production autocomplete fallback.

## Consequences

- Source catalog entries must record provider/source kind, attribution, cache
  policy, max TTL, durable-retention permission, bulk-import permission, and
  unresolved source status.
- Owned RUIAN CZ imports may populate durable offline records when the import
  keeps CUZK/RUIAN CC BY 4.0 attribution, records a modification-note hash, and
  uses monthly Atom discovery.
- Provider fallback code must skip durable address writes for sources whose
  catalog entry does not allow durable retention.
- Mapy, HERE, and managed Nominatim provider writes must keep attribution and
  source metadata, and must not be treated as bulk-import permissions.
- Open-source geographic data is not automatically owned data. OSM-derived and
  OpenAddresses-derived imports require their own source/license decision before
  durable ingestion.
