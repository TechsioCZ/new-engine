import {
  createInMemorySmartSuggestRepositories,
  SmartSuggestStorageError,
} from "@techsio/smart-suggest-storage"
import { squash } from "effect/Cause"
import { exit as effectExit, fail, gen } from "effect/Effect"
import { isFailure } from "effect/Exit"
import { describe, expect, it } from "@effect/vitest"

import {
  CZ_SAMPLE_ADDRESSES,
  createAddressImportRunId,
  createAuthoritativeAddressImportSource,
  OPENADDRESSES_US_CA_SAMPLE_SOURCE,
  REGISTER_ADRIES_SK_SAMPLE_SOURCE,
  RUIAN_CZ_SAMPLE_SOURCE,
  runAddressDatasetImportEffect,
  searchSampleAddressFixtures,
  seedSampleAddressDatasetsEffect,
} from "../src/datasets"

const runAddressDatasetImport = (
  options: Parameters<typeof runAddressDatasetImportEffect>[0]
) => runAddressDatasetImportEffect(options)

const seedSampleAddressDatasets = (
  repositories: Parameters<typeof seedSampleAddressDatasetsEffect>[0]
) => seedSampleAddressDatasetsEffect(repositories)

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
    })
    expect(REGISTER_ADRIES_SK_SAMPLE_SOURCE.countryCode).toBe("SK")
    expect(OPENADDRESSES_US_CA_SAMPLE_SOURCE.region).toBe("CA")
    expect(CZ_SAMPLE_ADDRESSES.length).toBeGreaterThan(0)
  })

  it.effect("seeds source registry and normalized records through repository APIs", () =>
    gen(function* sampleSeedProgram() {
      const repositories = createInMemorySmartSuggestRepositories()
      const result = yield* seedSampleAddressDatasets(repositories)

      expect(result.sources).toHaveLength(3)
      expect(result.records.map((record) => record.searchLabel)).toContain(
        "vaclavske namesti 832 19 110 00 praha praha 1 cz"
      )
      expect(result.records.map((record) => record.searchLabel)).toContain(
        "k louzi 1258 12 101 00 praha 10 vrsovice cz"
      )
      expect(
        result.records.filter((record) => record.parts.street === "K Louži")
      ).toHaveLength(4)

      const source = yield* repositories.dataSources.getDataSource(
        RUIAN_CZ_SAMPLE_SOURCE.id
      )

      expect(source).toMatchObject({
        attribution: expect.objectContaining({ label: "RUIAN sample" }),
      })
    })
  )

  it("searches CZ and SK sample records with diacritics-insensitive ranking", () => {
    expect(
      searchSampleAddressFixtures("vaclavske 832", {
        countryCode: "CZ",
        limit: 1,
      })[0]
    ).toMatchObject({
      id: "cz-ruian-vaclavske-namesti-832-19",
      ranking: expect.objectContaining({
        reasons: expect.arrayContaining(["house-number:match"]),
      }),
    })

    expect(
      searchSampleAddressFixtures("K Louži 1258/12", {
        countryCode: "CZ",
        limit: 1,
      })[0]
    ).toMatchObject({
      id: "cz-ruian-k-louzi-1258-12",
      ranking: expect.objectContaining({
        reasons: expect.arrayContaining(["house-number:pair-exact:1258/12"]),
      }),
    })

    expect(
      searchSampleAddressFixtures("K Lou", {
        countryCode: "CZ",
        limit: 5,
      }).map((record) => record.id)
    ).toEqual([
      "cz-ruian-k-louzi-1258-12",
      "cz-ruian-k-louzi-1258-7",
      "cz-ruian-k-louzi-784-3",
      "cz-ruian-k-louzi-1312-1",
    ])

    expect(
      searchSampleAddressFixtures("zizkova zilina", {
        countryCode: "SK",
        limit: 1,
      })[0]
    ).toMatchObject({
      id: "sk-register-adries-zizkova-45",
    })

    expect(
      searchSampleAddressFixtures("mission san francisco", {
        countryCode: "US",
        limit: 1,
      })[0]
    ).toMatchObject({
      id: "us-openaddresses-ca-mission-1",
    })
  })

  it("creates deterministic authoritative import source and run metadata from the source catalog", () => {
    const metadata = {
      datasetVersion: "2026-06-26",
      modificationNoteSha256: "b".repeat(64),
      shardCountryCode: "CZ",
      snapshotUri: "r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl",
      sourceId: "ruian-cz",
    } as const

    expect(createAddressImportRunId(metadata)).toBe(
      "import-ruian-cz-cz-2026-06-26"
    )
    expect(createAuthoritativeAddressImportSource(metadata)).toMatchObject({
      attribution: {
        label: "CUZK RUIAN",
        license: "CC BY 4.0",
        url: "https://ruian.cuzk.cz/",
      },
      cachePolicy: { kind: "permanent" },
      countryCode: "CZ",
      datasetVersion: "2026-06-26",
      id: "ruian-cz",
      modificationNoteSha256: "b".repeat(64),
      name: "RUIAN Czech Republic",
      shardCountryCode: "CZ",
      snapshotUri: "r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl",
      sourceKind: "owned-dataset",
    })
  })

  it.effect("runs RUIAN chunked imports with bad-row accounting and restartable upserts", () =>
    gen(function* ruianChunkedImportProgram() {
    const repositories = createInMemorySmartSuggestRepositories()
    const source = createAuthoritativeAddressImportSource({
      datasetVersion: "2026-06-26",
      shardCountryCode: "CZ",
      snapshotUri: "r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl",
      sourceId: "ruian-cz",
    })
    const result = yield* runAddressDatasetImport({
      chunkSize: 1,
      repositories,
      rows: [
        {
          id: "cz-ruian-vaclavske-namesti-833-20",
          parts: {
            city: "Praha",
            countryCode: "CZ",
            district: "Praha 1",
            houseNumber: "833",
            orientationNumber: "20",
            postalCode: "110 00",
            street: "Václavské náměstí",
          },
          quality: 0.97,
        },
        {
          id: "bad-row",
          parts: {
            countryCode: "CZ",
          },
        },
        {
          id: "cz-ruian-na-prikope-10",
          parts: {
            city: "Praha",
            countryCode: "CZ",
            houseNumber: "10",
            postalCode: "110 00",
            street: "Na Příkopě",
          },
        },
        {
          id: "wrong-shard",
          parts: {
            city: "Bratislava",
            countryCode: "SK",
            houseNumber: "1",
            postalCode: "811 01",
            street: "Hlavná",
          },
        },
      ],
      runId: "import-ruian-cz-cz-2026-06-26",
      source,
    })

    expect(result).toMatchObject({
      insertedRows: 2,
      rawSnapshotStoredInD1: false,
      restartable: true,
      shardCountryCode: "CZ",
      snapshotUri: "r2://smart-suggest-snapshots/ruian/cz-2026-06-26.jsonl",
      totalRows: 4,
    })
    expect(result.errors).toEqual([
      expect.objectContaining({ index: 1, rowId: "bad-row" }),
      expect.objectContaining({ index: 3, rowId: "wrong-shard" }),
    ])
    expect(result.importRun).toMatchObject({
      failedRows: 2,
      insertedRows: 2,
      status: "completed",
      totalRows: 4,
    })

    const searchResults = yield* repositories.addressRecords.searchAddressRecords({
      countryCode: "CZ",
      query: "prikope",
    })
    const prikopeRecord = yield* repositories.addressRecords.getAddressRecord(
      "cz-ruian-na-prikope-10"
    )

    expect(searchResults).toHaveLength(1)
    expect(prikopeRecord).toMatchObject({
      attribution: {
        label: "CUZK RUIAN",
        license: "CC BY 4.0",
        url: "https://ruian.cuzk.cz/",
      },
      displayLabel: "Na Příkopě 10, 110 00 Praha, CZ",
      quality: 0.95,
      searchLabel: "na prikope 10 110 00 praha cz",
      sourceId: "ruian-cz",
    })

    const restartedResult = yield* runAddressDatasetImport({
        chunkSize: 2,
        repositories,
        rows: [
          {
            id: "cz-ruian-vaclavske-namesti-833-20",
            parts: {
              city: "Praha",
              countryCode: "CZ",
              houseNumber: "833",
              orientationNumber: "20",
              postalCode: "110 00",
              street: "Václavské náměstí",
            },
            quality: 0.97,
          },
        ],
        runId: "import-ruian-cz-cz-2026-06-26",
        source,
      })

    expect(restartedResult).toMatchObject({
      importRun: { insertedRows: 1, status: "completed", totalRows: 1 },
      restartable: true,
    })
    })
  )

  it.effect("requires source catalog bulk-import approval before permanent imports", () =>
    gen(function* bulkImportApprovalProgram() {
    const blockedSources = [
      {
        attribution: { label: "Register adries SK" },
        cachePolicy: { kind: "permanent" },
        countryCode: "SK",
        id: "register-adries-sk",
        name: "Register adries Slovakia",
        shardCountryCode: "SK",
        sourceKind: "owned-dataset",
      },
      {
        attribution: { label: "OpenAddresses" },
        cachePolicy: { kind: "permanent" },
        countryCode: "US",
        id: "openaddresses",
        name: "OpenAddresses blanket source",
        shardCountryCode: "US",
        sourceKind: "owned-dataset",
      },
      {
        attribution: { label: "Mapy.com / Mapy.cz" },
        cachePolicy: { kind: "permanent" },
        countryCode: "CZ",
        id: "mapy-cz",
        name: "Mapy.cz provider policy",
        shardCountryCode: "CZ",
        sourceKind: "live-provider",
      },
      {
        attribution: { label: "HERE Discover" },
        cachePolicy: { kind: "permanent" },
        countryCode: "CZ",
        id: "here-discover",
        name: "HERE Discover provider policy",
        shardCountryCode: "CZ",
        sourceKind: "live-provider",
      },
      {
        attribution: { label: "OpenStreetMap contributors" },
        cachePolicy: { kind: "permanent" },
        countryCode: "CZ",
        id: "nominatim-managed",
        name: "Managed Nominatim provider policy",
        shardCountryCode: "CZ",
        sourceKind: "live-provider",
      },
    ] as const

    for (const source of blockedSources) {
      const repositories = createInMemorySmartSuggestRepositories()
      const runId = `blocked-${source.id}`

      const importExit = yield* effectExit(
        runAddressDatasetImport({
          repositories,
          rows: [
            {
              id: `${source.id}-row`,
              parts: {
                city: "Praha",
                countryCode: source.shardCountryCode,
                houseNumber: "1",
                street: "Testovací",
              },
            },
          ],
          runId,
          source,
        })
      )
      const storedSource = yield* repositories.dataSources.getDataSource(source.id)
      const importRun = yield* repositories.importRuns.getImportRun(runId)

      expect(isFailure(importExit)).toBe(true)

      if (!isFailure(importExit)) {
        return
      }

      expect(squash(importExit.cause)).toMatchObject({
        message: expect.stringContaining("permanent Smart Suggest source writes"),
      })
      expect(storedSource).toBeUndefined()
      expect(importRun).toBeUndefined()
    }
    })
  )

  it.effect("marks import runs failed when repository writes fail", () =>
    gen(function* failedImportRunProgram() {
    const repositories = createInMemorySmartSuggestRepositories()
    const source = createAuthoritativeAddressImportSource({
      datasetVersion: "2026-06-26",
      shardCountryCode: "CZ",
      sourceId: "ruian-cz",
    })

    const failingRepositories = {
      ...repositories,
      addressRecords: {
        ...repositories.addressRecords,
        upsertAddressRecords: () =>
          fail(
            new SmartSuggestStorageError(
              "storage-unavailable",
              "D1 write failed"
            )
          ),
      },
    }

    const importExit = yield* effectExit(
      runAddressDatasetImport({
        repositories: failingRepositories,
        rows: [
          {
            id: "cz-ruian-write-failure",
            parts: {
              city: "Praha",
              countryCode: "CZ",
              houseNumber: "1",
              postalCode: "110 00",
              street: "Na Příkopě",
            },
          },
        ],
        runId: "import-ruian-cz-failed",
        source,
      })
    )

    const failedRun = yield* repositories.importRuns.getImportRun(
      "import-ruian-cz-failed"
    )

    expect(isFailure(importExit)).toBe(true)

    if (!isFailure(importExit)) {
      return
    }

    expect(squash(importExit.cause)).toMatchObject({
      message: expect.stringContaining("D1 write failed"),
    })
    expect(failedRun).toMatchObject({
      errorSummary: "D1 write failed",
      failedRows: 1,
      insertedRows: 0,
      status: "failed",
      totalRows: 1,
    })
    })
  )
})
