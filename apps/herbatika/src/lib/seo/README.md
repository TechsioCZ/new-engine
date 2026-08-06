# SEO system routes

The App Router serves the host-scoped system URLs directly:

- `/robots.txt`
- `/sitemap.xml`
- `/sitemaps/{kind}-{n}.xml`

Each handler derives its market only from a validated `Host` header. Unknown
hosts return 421. `home-1.xml` contains the market home URL. Registry-backed
shards use URL kinds (`product`, `category`, `brand`, `collection`, `campaign`,
`article`, `page`), contain at most 10,000 current/indexable records, and carry
each record's `updatedAt` as `lastmod`. Unknown or empty shards return 404. The
sitemap index only advertises shards that currently contain URLs. All public
locations use the runtime canonical market origin and the shared URL builder.

The registry adapter currently exposes paged listing rather than an aggregate
count/query API, so sitemap index and shard generation retain the existing
bounded scan (at most 100,000 records per URL kind). A dedicated bounded sitemap
query is a follow-up for the registry layer.
