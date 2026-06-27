import { createInMemorySmartSuggestRepositories } from "@techsio/smart-suggest-storage";
import { describe, expect, it } from "vitest";

import {
  CZ_SAMPLE_ADDRESSES,
  OPENADDRESSES_US_CA_SAMPLE_SOURCE,
  REGISTER_ADRIES_SK_SAMPLE_SOURCE,
  RUIAN_CZ_SAMPLE_SOURCE,
  runAddressDatasetImport,
  searchSampleAddressFixtures,
  seedSampleAddressDatasets,
} from "../src/index";

describe("sample smart suggest datasets", () => {
  it("defines source attribution and sample address records", () => {
    expect(RUIAN_CZ_SAMPLE_SOURCE).toMatchObject({
      attribution: expect.objectContaining({
        label: "RUIAN sample",
        license: "CC BY 4.0",
      }),
      cachePolicy: { kind: "permanent" },
      countryCode: "CZ",
      sourceKind: "owned-dataset",
    });
    expect(REGISTER_ADRIES_SK_SAMPLE_SOURCE.countryCode).toBe("SK");
    expect(OPENADDRESSES_US_CA_SAMPLE_SOURCE.region).toBe("CA");
    expect(CZ_SAMPLE_ADDRESSES.length).toBeGreaterThan(0);
  });

  it("seeds source registry and normalized records through repository APIs", async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const result = await seedSampleAddressDatasets(repositories);

    expect(result.sources).toHaveLength(3);
    expect(result.records.map((record) => record.searchLabel)).toContain(
      "vaclavske namesti 832 19 110 00 praha praha 1 cz",
    );
    expect(await repositories.dataSources.getDataSource(RUIAN_CZ_SAMPLE_SOURCE.id)).toMatchObject({
      attribution: expect.objectContaining({ label: "RUIAN sample" }),
    });
  });

  it("searches CZ and SK sample records with diacritics-insensitive ranking", () => {
    expect(
      searchSampleAddressFixtures("vaclavske 832", {
        countryCode: "CZ",
        limit: 1,
      })[0],
    ).toMatchObject({
      id: "cz-ruian-vaclavske-namesti-832-19",
      ranking: expect.objectContaining({
        reasons: expect.arrayContaining(["house-number:match"]),
      }),
    });

    expect(
      searchSampleAddressFixtures("zizkova zilina", {
        countryCode: "SK",
        limit: 1,
      })[0],
    ).toMatchObject({
      id: "sk-register-adries-zizkova-45",
    });

    expect(
      searchSampleAddressFixtures("mission san francisco", {
        countryCode: "US",
        limit: 1,
      })[0],
    ).toMatchObject({
      id: "us-openaddresses-ca-mission-1",
    });
  });

  it("runs chunked imports with bad-row accounting and restartable upserts", async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const source = {
      ...OPENADDRESSES_US_CA_SAMPLE_SOURCE,
      shardCountryCode: "US",
      snapshotUri: "r2://smart-suggest-snapshots/openaddresses/us-ca.jsonl",
    } as const;
    const result = await runAddressDatasetImport({
      chunkSize: 1,
      repositories,
      rows: [
        {
          id: "oa-us-ca-mission-2",
          parts: {
            city: "San Francisco",
            countryCode: "US",
            houseNumber: "2",
            postalCode: "94105",
            region: "CA",
            street: "Mission St",
          },
          quality: 0.91,
        },
        {
          id: "bad-row",
          parts: {
            countryCode: "US",
          },
        },
        {
          id: "oa-us-ca-market-10",
          parts: {
            city: "San Francisco",
            countryCode: "US",
            houseNumber: "10",
            postalCode: "94105",
            region: "CA",
            street: "Market St",
          },
        },
        {
          id: "wrong-shard",
          parts: {
            city: "Praha",
            countryCode: "CZ",
            houseNumber: "1",
            postalCode: "110 00",
            street: "Na Příkopě",
          },
        },
      ],
      runId: "import-openaddresses-us-ca",
      source,
    });

    expect(result).toMatchObject({
      insertedRows: 2,
      rawSnapshotStoredInD1: false,
      restartable: true,
      shardCountryCode: "US",
      snapshotUri: "r2://smart-suggest-snapshots/openaddresses/us-ca.jsonl",
      totalRows: 4,
    });
    expect(result.errors).toEqual([
      expect.objectContaining({ index: 1, rowId: "bad-row" }),
      expect.objectContaining({ index: 3, rowId: "wrong-shard" }),
    ]);
    expect(result.importRun).toMatchObject({
      failedRows: 2,
      insertedRows: 2,
      status: "completed",
      totalRows: 4,
    });
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "US",
        query: "market",
      }),
    ).resolves.toHaveLength(1);
    await expect(
      repositories.addressRecords.getAddressRecord("oa-us-ca-market-10"),
    ).resolves.toMatchObject({
      quality: 0.95,
    });

    await expect(
      runAddressDatasetImport({
        chunkSize: 2,
        repositories,
        rows: [
          {
            id: "oa-us-ca-mission-2",
            parts: {
              city: "San Francisco",
              countryCode: "US",
              houseNumber: "2",
              postalCode: "94105",
              region: "CA",
              street: "Mission St",
            },
            quality: 0.91,
          },
        ],
        runId: "import-openaddresses-us-ca",
        source,
      }),
    ).resolves.toMatchObject({
      importRun: { insertedRows: 1, status: "completed", totalRows: 1 },
      restartable: true,
    });
  });

  it("marks import runs failed when repository writes fail", async () => {
    const repositories = createInMemorySmartSuggestRepositories();
    const source = {
      ...OPENADDRESSES_US_CA_SAMPLE_SOURCE,
      shardCountryCode: "US",
    } as const;

    repositories.addressRecords.upsertAddressRecords = () =>
      Promise.reject(new Error("D1 write failed"));

    await expect(
      runAddressDatasetImport({
        repositories,
        rows: [
          {
            id: "oa-us-ca-mission-failure",
            parts: {
              city: "San Francisco",
              countryCode: "US",
              houseNumber: "1",
              postalCode: "94105",
              street: "Mission St",
            },
          },
        ],
        runId: "import-openaddresses-us-ca-failed",
        source,
      }),
    ).rejects.toThrow("D1 write failed");

    await expect(
      repositories.importRuns.getImportRun("import-openaddresses-us-ca-failed"),
    ).resolves.toMatchObject({
      errorSummary: "D1 write failed",
      failedRows: 1,
      insertedRows: 0,
      status: "failed",
      totalRows: 1,
    });
  });
});
