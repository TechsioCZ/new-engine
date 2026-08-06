# URL registry operations

The registry is owned by the Next.js storefront. Run ordered, checksum-protected
migrations before seeding:

```sh
URL_REGISTRY_DATABASE_URL=postgres://... pnpm url-registry:migrate
URL_REGISTRY_DATABASE_URL=postgres://... \
URL_REGISTRY_MEDUSA_URL=https://medusa.example \
URL_REGISTRY_MARKETS_JSON='{"sk":{"publishableKey":"...","salesChannelId":"...","locale":"sk"},"cz":{"publishableKey":"...","salesChannelId":"...","locale":"cs"},"hu":{"publishableKey":"...","salesChannelId":"...","locale":"hu"},"ro":{"publishableKey":"...","salesChannelId":"...","locale":"ro"}}' \
pnpm url-registry:seed
```

The seed queries products, product categories, collections, and the custom brand
entity once per market using that market's publishable key and sales channel. It
also reads localized Payload article/page categories. Payload document IDs are
stored as `entityId`; localized slugs are never used as identity. Consequently,
all locales of Payload document `42` use `page:42` or `article:42` as their
`equivalenceKey`. Campaigns are not seeded because this repository currently has
no campaign entity or Payload campaign collection.

Runtime selection uses:

- `URL_REGISTRY_DRIVER=postgres|memory` (defaults to `postgres`)
- `URL_REGISTRY_DATABASE_URL` for Postgres
- `URL_REGISTRY_MEMORY_FIXTURE_PATH` for an optional JSON fixture
- `URL_REGISTRY_ADMIN_TOKEN` for every admin route

## CMS publish lifecycle

The Payload publish integration calls the bearer-protected admin API:

1. New localized document: `POST /api/url-registry` with `market`, `kind`
   (`page` or `article`), localized `slug`, stable Payload `entityId`, stable
   `equivalenceKey` (`page:{documentId}` / `article:{documentId}`), and
   `indexable`.
2. Localized slug rename: `POST /api/url-registry/slug-change` with `market`,
   `kind`, the same Payload `entityId`, and `newSlug`. This atomically creates a
   new current record and redirects every historical alias directly to it.
3. Unpublish/delete: `POST /api/url-registry/tombstone` with `market`, `kind`,
   and the same stable `entityId`.

An authenticated Payload webhook adapter with persisted `eventId` deduplication
is a follow-up. Until it exists, the integration must retry only after reading
`GET /api/url-registry?market=...&kind=...&entityId=...` to determine whether the
operation already completed; it must never create a new entity identity after a
slug rename.
