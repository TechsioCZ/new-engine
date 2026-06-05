# Medusa backend API snapshot

This script snapshots the deployed Medusa backend through Admin and Store APIs
into a local gitignored artifact directory.

```bash
MEDUSA_ADMIN_EMAIL='admin@example.com' \
MEDUSA_ADMIN_PASSWORD='test' \
node scripts/dev/snapshot-medusa-backend.mjs \
  --base-url 'https://test-engine-medusa-be-zane.web-revolution.cz' \
  --label zane-demo
```

By default it writes to:

```text
local/medusa-backend-snapshots/<label-or-timestamp>/
```

The snapshot includes catalog data, categories, collections, regions, shipping
options, promotions, producers, business status summaries, Packeta/PPL/QR
config, publishable API keys, Store API products/categories/regions/producers,
and Medusa-backed CMS summary endpoints. Tokens and passwords are not printed.

Orders and customers are skipped by default because they can contain PII. Add
these flags only when that data is explicitly needed for local integration:

```bash
node scripts/dev/snapshot-medusa-backend.mjs \
  --include-orders \
  --include-customers
```
