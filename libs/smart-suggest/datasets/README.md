# @techsio/smart-suggest-datasets

Dataset fixtures, source metadata, and import mapping for Smart Suggest.

## Import runner contract

`runAddressDatasetImport` registers source attribution, starts an import run,
normalizes address rows in chunks, upserts runtime address records, and finishes
the run with inserted/failed row counts. Raw snapshots stay outside D1; pass a
`snapshotUri` such as an R2/object-storage URI and keep only normalized runtime
rows in the repository.

Local CZ/SK sample seed:

```ts
await seedSampleAddressDatasets(repositories);
```

Production-style owned-data import:

```ts
await runAddressDatasetImport({
  chunkSize: 500,
  repositories,
  runId: "import-ruian-cz-2026-06-26",
  source: {
    ...RUIAN_CZ_SAMPLE_SOURCE,
    shardCountryCode: "CZ",
    snapshotUri: "r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl",
  },
  rows,
});
```

Use country/region-specific D1 shards for large sources. Do not load global raw
payload blobs into D1; D1 stores source metadata, import-run counts, normalized
address records, and derived search labels/tokens only.
