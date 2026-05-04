# Herbatica seed fixtures

The XML files committed in this directory are deterministic parser fixtures. They are intentionally small and are used by unit tests to cover category export parsing, category mapping, product metadata, reference resolution, duplicate variant normalization, and hidden product handling.

Do not commit full Herbatica supplier exports to this repository. Production or staging imports should fetch the current supplier export outside normal code review and pass it to the seed script with either:

```bash
HERBATICA_XML_PATH=/path/to/productsComplete.xml \
HERBATICA_CATEGORIES_XML_PATH=/path/to/categories.xml \
pnpm --filter medusa-be seedHerbatica
```

or by passing explicit Medusa script arguments:

```bash
pnpm --filter medusa-be medusa exec ./src/scripts/herbatica-seed.ts \
  /path/to/productsComplete.xml \
  /path/to/categories.xml
```

Full feed snapshots are large, change frequently, and may contain copied editor, assistant, or conversation markup from supplier content. Keep them in supplier storage, object storage, or another controlled import source instead of git.
