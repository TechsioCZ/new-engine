# Payload CMS module

This module provides a read-only integration with Payload CMS for store-facing
content (pages, articles, hero carousels, and category groupings). It wraps the
Payload REST API and optionally caches responses via Medusa's caching module.

## Enable the module

The module is feature-flagged in `medusa-config.ts`.

```ts
const FEATURE_PAYLOAD_ENABLED = process.env.FEATURE_PAYLOAD_ENABLED === "1"

// medusa-config.ts
...(FEATURE_PAYLOAD_ENABLED
  ? [
      {
        resolve: "./src/modules/payload",
        options: {
          serverUrl: process.env.PAYLOAD_BASE_URL,
          apiKey: process.env.PAYLOAD_API_KEY,
          contentCacheTtl: process.env.CMS_CACHE_TTL
            ? Number(process.env.CMS_CACHE_TTL)
            : 3600,
          listCacheTtl: process.env.CMS_LIST_CACHE_TTL
            ? Number(process.env.CMS_LIST_CACHE_TTL)
            : 600,
        },
      },
    ]
  : []),
```

Required environment variables:

- `FEATURE_PAYLOAD_ENABLED=1` to register the module.
- `PAYLOAD_BASE_URL` (Payload base URL, e.g. `http://payload:8083`).
- `PAYLOAD_API_KEY` (Payload users API key).

Optional environment variables:

- `CMS_CACHE_TTL` (seconds, default `3600`).
- `CMS_LIST_CACHE_TTL` (seconds, default `600`).

## Service API

Resolve the service with the module key `payload`.

```ts
import { PAYLOAD_MODULE } from "../../modules/payload"
import type PayloadModuleService from "../../modules/payload/service"

const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)
```

Available methods:

- `getPublishedPage(slug, locale?)`
- `getPublishedArticle(slug, locale?)`
- `listPageCategoriesWithPages({ locale?, categorySlug? })`
- `listArticleCategoriesWithArticles({ locale?, categorySlug? })`
- `listHeroCarousels({ limit?, page?, sort?, locale? })`
- `invalidateCache(collection, slug?, locale?)`

Notes:

- `getPublishedPage` and `getPublishedArticle` filter on `status=published`.
- `serverUrl` is normalized and `/api` is appended internally.

## Payload API expectations

The module calls these Payload endpoints (relative to `/api`):

- `/pages`
- `/articles`
- `/hero-carousels`
- `/page-categories-with-pages`
- `/article-categories-with-articles`

## Store API routes

These routes are backed by the module:

- `GET /store/cms/pages/:slug?locale=`
- `GET /store/cms/articles/:slug?locale=`
- `GET /store/cms/page-categories?locale=&categorySlug=`
- `GET /store/cms/article-categories?locale=&categorySlug=`
- `GET /store/cms/hero-carousels?locale=&limit=&page=&sort=`

## Cache behavior

- Uses `Modules.CACHING` when available; otherwise requests hit Payload directly.
- Content endpoints use `contentCacheTtl`.
- List endpoints use `listCacheTtl`.
- Cache tags are scoped by collection and locale (for list endpoints).

## Webhook cache invalidation

`POST /hooks/cms/invalidate` clears cached CMS data. Payload webhooks should
send a JSON body with the collection name and optional doc details:

```json
{
  "collection": "pages",
  "doc": {
    "slug": "about",
    "locale": "en"
  }
}
```

Supported collection values:

- `pages`
- `articles`
- `hero-carousels`
- `page-categories`
- `article-categories`
