# Smart Suggest Libraries

These packages own the reusable Smart Suggest domain surface. Keep package
boundaries explicit and do not move provider, storage, UI, React, or
Cloudflare-only concerns across the package that owns them.

## Package Boundaries

- `core`: serialization-safe contracts only. No React, UI-kit, Drizzle,
  Cloudflare, or provider SDK imports. Keep exports small, named, and stable.
  Do not add contracts that move plaintext user search text into persisted
  records, cache payloads, or events. Query identity belongs in deterministic
  hashes/cache keys, not raw query fields. Use discriminated string codes for
  errors and status values.
- `client`: browser-safe API client code. No provider SDK, Drizzle, D1,
  Cloudflare runtime, React, or UI-kit imports.
- `datasets`: dataset fixtures, parsers, import mapping, and source attribution
  metadata. No UI or provider SDK imports.
- `indexing`: normalization, tokenization, prefix generation, and deterministic
  ranking helpers. No UI, storage, provider SDK, or Cloudflare-only imports.
- `integrations`: live provider adapters and provider registry code. Provider
  payloads must be normalized before leaving this package.
- `react`: React hooks over the Smart Suggest client. No UI-kit, storage,
  provider SDK, Drizzle, D1, or Cloudflare runtime imports.
- `storage`: Drizzle/D1 schema and repository APIs. Persist search data only as
  normalized address labels, prefix-token index rows, hashed suggest-cache
  identities, source lineage, and attribution metadata. Do not add raw user
  query columns, repository inputs, event payload fields, or helpers that store
  plaintext queries. Address search must filter to active/search-visible
  records, collect prefix-token candidates with deterministic usefulness
  ordering before any candidate-window limit, then use the shared ranking helper
  before applying the public result limit.
- `ui`: domain wrappers that compose `@techsio/ui-kit` primitives and Smart
  Suggest hooks. No provider SDK, storage, Drizzle, D1, or Cloudflare runtime
  imports.
- `validation`: reusable validation logic and policy. No UI, React, storage,
  Cloudflare, or provider SDK imports.
- `vanilla`: tiny old-core browser SDK. No React, Module Federation, provider
  SDK, storage, Drizzle, D1, or Cloudflare runtime imports.

## Commands

- `pnpm --filter @techsio/smart-suggest-* build`
- `pnpm --filter @techsio/smart-suggest-* test`
- `pnpm --filter @techsio/smart-suggest-* typecheck`
