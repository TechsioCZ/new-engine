# @techsio/smart-suggest-datasets

Source metadata, official owned-data import mapping, and explicitly named
fixture helpers for Smart Suggest.

## Import runner contract

`runAddressDatasetImportEffect` registers source attribution, starts an import
run, normalizes address rows in chunks, upserts runtime address records, and
finishes the run with inserted/failed row counts. Raw snapshots stay outside D1;
pass a `snapshotUri` such as an R2/object-storage URI and keep only normalized
runtime rows in the repository. Repository and dataset failures stay in the
Effect error channel.

Sample fixtures are intentionally separate from production import inputs. They
live behind `sample-fixtures` helpers for dataset tests, import-proof tests, and
synthetic demos only:

```ts
import { seedSampleAddressFixtureDatasetsEffect } from "./src/sample-fixtures";

yield * seedSampleAddressFixtureDatasetsEffect(repositories);
```

The sample fixture seed also registers the OpenAddresses US/CA fixture so test
and demo proofs have a tiny non-CZ/SK open-data path. It is intentionally small,
is not a volume benchmark, and is not runtime BFF startup or production seed
behavior. The production import runner rejects sample fixture source ids such as
`ruian-cz-sample` because they are not source-catalog entries.

Production-style owned-data import:

```ts
import {
  createAuthoritativeAddressImportSource,
  runAddressDatasetImportEffect,
} from "./src/datasets";

yield *
  runAddressDatasetImportEffect({
    chunkSize: 500,
    repositories,
    runId: "import-ruian-cz-2026-06-26",
    source: createAuthoritativeAddressImportSource({
      datasetVersion: "2026-06-26",
      sourceId: "ruian-cz",
      shardCountryCode: "CZ",
      snapshotUri: "r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl",
    }),
    rows,
  });
```

Node entry scripts and benchmarks should execute `runAddressDatasetImportEffect`
at the CLI boundary. Runtime and server code should compose the Effect APIs
directly against configured repositories. Runtime code must not silently seed
sample fixtures when D1 or provider configuration is missing.

Use country/region-specific D1 shards for large sources. Do not load global raw
payload blobs into D1; D1 stores source metadata, import-run counts, normalized
address records, and derived search labels/tokens only.

## Operational import shape

For CZ/SK production imports, run one source/shard at a time from a Worker job,
CI job, or local operator script that constructs repositories from the target D1
binding and passes an object-storage snapshot URI:

```ts
yield *
  runAddressDatasetImportEffect({
    chunkSize: 500,
    repositories,
    runId: `import-${source.id}-${source.datasetVersion}`,
    source: {
      ...source,
      shardCountryCode: source.countryCode,
      snapshotUri: `r2://smart-suggest-snapshots/${source.id}/${source.datasetVersion}.jsonl`,
    },
    rows,
  });
```

The runner is restartable by idempotent upsert, not by cursor checkpoint. Re-run
the same `runId` after fixing a failed source snapshot; the import run is
replaced with the latest counts and address records are upserted by record id.

Rows whose `parts.countryCode` does not match `shardCountryCode` are rejected as
bad rows. Repository write failures mark the import run `failed` before the
error is rethrown. When a row omits explicit `quality`, import quality is derived
from address completeness via the indexing quality metric.

## Volume and sharding notes

- RUIAN CZ and Register adries SK should use separate country shards.
- Larger countries should split by country plus region/state where the source
  supports it, for example `US/CA` for OpenAddresses.
- Keep raw snapshots in R2 or equivalent object storage. D1 should contain only
  source metadata, import status, normalized address rows, search labels, and
  derived token rows.
- Avoid a single global address D1 database for all future sources; route reads
  by country/region before falling back to live providers.
