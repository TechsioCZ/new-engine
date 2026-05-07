# Herbatica seed fixtures

The XML files committed in this directory are deterministic parser fixtures. They are intentionally small and are used by unit tests to cover category export parsing, category mapping, product metadata, reference resolution, duplicate variant normalization, and hidden product handling.

Do not commit full Herbatica supplier exports to this repository. Production or staging imports should keep full exports in supplier/object storage and pass local paths or HTTP(S) URLs to the opt-in seed script with either:

```bash
HERBATICA_XML_PATH=https://example.test/productsComplete.xml \
HERBATICA_CATEGORIES_XML_PATH=https://example.test/categories.xml \
pnpm --filter medusa-be seedHerbatica
```

or by passing explicit Medusa script arguments:

```bash
pnpm --filter medusa-be medusa exec ./src/scripts/herbatica-seed.ts \
  https://example.test/productsComplete.xml \
  https://example.test/categories.xml
```

Full feed snapshots are large, change frequently, and may contain copied editor, assistant, or conversation markup from supplier content. Keep them in supplier storage, object storage, or another controlled import source instead of git. No supplier feed URL is configured by default; Herbatica import remains explicitly invoked through `seedHerbatica` or `medusa exec`.
