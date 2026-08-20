# Romanian catalog public-source extractor

This script collects **candidate evidence only** from the official public
`https://www.herbatica.ro/` storefront. It never calls private API/export
endpoints and never writes to Medusa, Shoptet, Zane, or any other external
system.

The generated JSON is deliberately marked `unapproved` at manifest and product
level. A Romanian catalog owner must review product identity, claims, wording,
category placement, and the current RON price before the data may enter the
curated import manifest.

## Safety defaults

- reads and applies `robots.txt` before the sitemap or pages;
- permits only HTTPS URLs on exactly `www.herbatica.ro`;
- rejects query strings, fragments, foreign redirects, and `/api`, `/export`,
  `/action`, `/admin`, or `/script` paths;
- one worker and at least 1.5 seconds between request starts by default;
- honors a longer `Crawl-delay` from the applicable robots group;
- caps each run at 25 pages and each response at 5 MB;
- keeps a content-addressed local response cache and an atomic resumable
  checkpoint.

## Output fields

Each product candidate contains SKU, EAN/GTIN, Romanian title, short and long
descriptions (normalized HTML, plain text, and SHA-256), canonical slug,
Romanian category breadcrumbs, public source URL, source HTML SHA-256, RON
price/currency, deterministic candidate SHA-256, and quality warnings.

Warnings flag missing fields, non-RON prices, placeholder text, high-confidence
Slovak/Czech markers, and duplicate SKU/EAN/slug/content groups. These checks
are review aids, not proof that Romanian copy is linguistically correct.

The manifest also carries a coverage ledger for every sitemap URL, including
its product hint, classification, and any skip/error reason. Pending bounded
work, fetch errors, safety/robots skips, unsupported/challenge HTML, or a
mismatch between product-hinted and classified product pages set
`approval.blocked: true`. Such output remains evidence only and cannot advance
to catalog-owner approval.

## Bounded usage

From `apps/medusa-be`:

```bash
pnpm exec medusa exec ./src/scripts/ro-catalog-source-extract.ts --max-pages=1
```

The default local artifacts are written under `var/ro-catalog-source/`:

- `candidates.unapproved.json` — review-only candidate manifest;
- `checkpoint.json` — completed/pending URLs and extracted candidates;
- `cache/` — URL-keyed response evidence with timestamps and hashes.

Re-running the same command resumes the checkpoint and uses validated cache
records. Use `--refresh` only for a deliberate evidence refresh. Increase
`--max-pages` gradually; do not launch an unbounded crawl. `--concurrency` is
hard-capped at 2 and `--delay-ms` cannot be lower than 1000.

Set `RO_SOURCE_USER_AGENT` if an operational contact identifier is required.
Run with `--help` for every supported option.
