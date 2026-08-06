# SEO system routes

The public system URL scheme is host-scoped and proxy-rewritten:

- `/robots.txt` -> `/~sf/{market}/system/robots`
- `/sitemap.xml` -> `/~sf/{market}/system/sitemap/index`
- `/sitemaps/{kind}-{n}.xml` -> `/~sf/{market}/system/sitemap/shard/{kind}-{n}.xml`

`home-1.xml` contains the market home URL. Registry-backed shards use URL kinds
(`product`, `category`, `brand`, `collection`, `campaign`, `article`, `page`),
contain at most 10,000 current/indexable records, and carry each record's
`updatedAt` as `lastmod`. Unknown or empty shards return 404. The sitemap index
only advertises shards that currently contain URLs. All public locations use the
runtime canonical market origin and the shared URL builder.
