import { Cause, Effect, Exit } from "effect"
import { describe, expect, it } from "@effect/vitest"

import {
  createAddressRecordFromSuggestion,
  createAddressSearchFtsQuery,
  createD1SmartSuggestRepositories,
  createInMemorySmartSuggestRepositories,
  createSuggestCacheKey,
  createSuggestQueryHashEffect,
  type SmartSuggestD1Binding,
  type SmartSuggestStorageEffect,
  SmartSuggestStorageError,
  smartSuggestSchema,
} from "../src/storage"

const hmacSha256HashPattern = /^hmac-sha256:[a-f0-9]{64}$/u

const resolveStorageEffect = <T>(effect: SmartSuggestStorageEffect<T>) =>
  effect

const assertStorageEffect = <T>(
  effect: SmartSuggestStorageEffect<T>,
  assertion: (value: T) => void
) => Effect.map(effect, assertion)

const assertStorageFailure = <T>(
  effect: SmartSuggestStorageEffect<T>,
  assertion: (error: unknown) => void
) =>
  Effect.map(Effect.exit(effect), (result) => {
    expect(Exit.isFailure(result)).toBe(true)

    if (!Exit.isFailure(result)) {
      return
    }

    assertion(Cause.squash(result.cause))
  })

describe("smart suggest storage", () => {
  it("exposes Drizzle tables for migration generation", () => {
    expect(Object.keys(smartSuggestSchema).sort()).toEqual([
      "smartSuggestAcceptEvents",
      "smartSuggestAddressRecords",
      "smartSuggestAddressSearchTokens",
      "smartSuggestAddressTombstones",
      "smartSuggestApiKeys",
      "smartSuggestCacheEntries",
      "smartSuggestDataSources",
      "smartSuggestImportRuns",
      "smartSuggestProviderEvents",
      "smartSuggestShardRegistry",
      "smartSuggestTenants",
    ])
  })

  it("exposes a D1 repository factory for Worker runtime bindings", () => {
    expect(createD1SmartSuggestRepositories).toBeTypeOf("function")
  })

  it.effect("runs D1 repository checks through Drizzle Effect D1", () =>
    Effect.gen(function* () {
    const preparedQueries: string[] = []
    const binding = {
      prepare: (query: string) => {
        preparedQueries.push(query)

        return {
          bind: () => ({
            all: async () => ({ results: [] }),
            raw: async () => [],
          }),
        }
      },
    } as unknown as SmartSuggestD1Binding

    const repositories = createD1SmartSuggestRepositories(binding)

    yield* assertStorageEffect(repositories.health.check(), (result) => {
      expect(result).toMatchObject({ ok: true })
    })
    expect(preparedQueries).toContain("select 1")
    })
  )

  it.effect(
    "orders FTS address candidates before applying the candidate limit",
    () =>
      Effect.gen(function* () {
    const preparedQueries: string[] = []
    const binding = {
      prepare: (query: string) => {
        preparedQueries.push(query)

        return {
          bind: () => ({
            all: async () => ({ results: [] }),
            raw: async () => [],
          }),
        }
      },
    } as unknown as SmartSuggestD1Binding
    const repositories = createD1SmartSuggestRepositories(binding)

    yield* resolveStorageEffect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        limit: 1,
        query: "Lou",
      })
    )

    const ftsQuery = preparedQueries.find(
      (query) =>
        query.includes("smart_suggest_address_search_fts") &&
        query.includes(" match ")
    )

    expect(ftsQuery?.replaceAll(/\s+/g, " ").toLowerCase()).toContain(
      "order by rank limit"
    )
      })
  )

  it.effect("stores and resolves CZ VUSC shard routing metadata", () =>
    Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()
    const praha = yield* resolveStorageEffect(
      repositories.shardRegistry.upsertShardMetadata({
        bindingName: "SMART_SUGGEST_CZ_VUSC_19",
        countryCode: "CZ",
        estimatedSizeBytes: 421_600_000,
        importVersion: "ruian-cz-2026-06-26",
        lastImportCompletedAt: "2026-06-26T12:00:00.000Z",
        municipalityCodes: ["554782"],
        municipalityHints: ["Hlavní město Praha"],
        postalPrefixes: ["110", "111"],
        regionCode: "19",
        regionKind: "vusc",
        regionName: "Praha",
        rowCount: 123_456,
        shardId: "smart-suggest-cz-vusc-19",
        sourceFreshnessAt: "2026-06-26T00:00:00.000Z",
        state: "active",
      })
    )

    const updatedPraha = yield* resolveStorageEffect(
      repositories.shardRegistry.upsertShardMetadata({
        bindingName: "SMART_SUGGEST_CZ_VUSC_19",
        countryCode: "CZ",
        estimatedSizeBytes: 421_700_000,
        importVersion: "ruian-cz-2026-06-27",
        municipalityCodes: ["554782", "554782"],
        municipalityHints: ["Hlavní město Praha", "hlavni mesto praha"],
        postalPrefixes: ["110 00", "110"],
        regionCode: "19",
        regionKind: "vusc",
        regionName: "Praha",
        rowCount: 123_789,
        shardId: "smart-suggest-cz-vusc-19",
        state: "active",
      })
    )

    yield* resolveStorageEffect(
      repositories.shardRegistry.upsertShardMetadata({
        bindingName: "SMART_SUGGEST_CZ_VUSC_19_STANDBY",
        countryCode: "CZ",
        importVersion: "ruian-cz-2026-06-28-build",
        regionCode: "19",
        regionKind: "vusc",
        regionName: "Praha",
        rowCount: 0,
        shardId: "smart-suggest-cz-vusc-19-standby",
        state: "standby",
      })
    )
    yield* resolveStorageEffect(
      repositories.shardRegistry.upsertShardMetadata({
        bindingName: "SMART_SUGGEST_CZ_VUSC_116",
        countryCode: "CZ",
        municipalityCodes: ["582786"],
        postalPrefixes: ["602"],
        regionCode: "116",
        regionKind: "vusc",
        regionName: "Jihomoravský",
        rowCount: 300_000,
        shardId: "smart-suggest-cz-vusc-116",
        state: "disabled",
      })
    )
    yield* resolveStorageEffect(
      repositories.shardRegistry.upsertShardMetadata({
        bindingName: "SMART_SUGGEST_CZ_VUSC_19",
        countryCode: "CZ",
        municipalityCodes: ["539686"],
        postalPrefixes: ["252"],
        regionCode: "86",
        regionKind: "vusc",
        regionName: "Středočeský",
        rowCount: 250_000,
        shardId: "smart-suggest-cz-vusc-86",
        state: "active",
      })
    )

    expect(updatedPraha.createdAt).toBe(praha.createdAt)
    expect(updatedPraha).toMatchObject({
      bindingName: "SMART_SUGGEST_CZ_VUSC_19",
      countryCode: "CZ",
      estimatedSizeBytes: 421_700_000,
      importVersion: "ruian-cz-2026-06-27",
      municipalityCodes: ["554782"],
      municipalityHints: ["hlavni mesto praha"],
      postalPrefixes: ["11000", "110"],
      regionCode: "19",
      regionKind: "vusc",
      regionName: "Praha",
      rowCount: 123_789,
      shardId: "smart-suggest-cz-vusc-19",
      state: "active",
    })
    yield* assertStorageEffect(
      repositories.shardRegistry.listShardMetadata({
        countryCode: "CZ",
        state: "active",
      }),
      (result) =>
        expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19" }),
        expect.objectContaining({ shardId: "smart-suggest-cz-vusc-86" }),
      ])
    )
    )
    yield* assertStorageEffect(
      repositories.shardRegistry.resolveShardMetadata({
        countryCode: "CZ",
        regionCode: "19",
      }),
      (result) =>
        expect(result).toEqual([
          expect.objectContaining({ bindingName: "SMART_SUGGEST_CZ_VUSC_19" }),
        ])
    )
    yield* assertStorageEffect(
      repositories.shardRegistry.resolveShardMetadata({
        countryCode: "CZ",
        postalCode: "110 00",
      }),
      (result) =>
        expect(result).toEqual([
          expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19" }),
        ])
    )
    yield* assertStorageEffect(
      repositories.shardRegistry.resolveShardMetadata({
        countryCode: "CZ",
        municipalityCode: "554782",
      }),
      (result) =>
        expect(result).toEqual([
          expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19" }),
        ])
    )
    yield* assertStorageEffect(
      repositories.shardRegistry.resolveShardMetadata({
        countryCode: "CZ",
        municipalityHint: "Hlavní město Praha",
      }),
      (result) =>
        expect(result).toEqual([
          expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19" }),
        ])
    )
    yield* assertStorageEffect(
      repositories.shardRegistry.resolveShardMetadata({
        countryCode: "CZ",
        regionCode: "116",
      }),
      (result) => expect(result).toEqual([])
    )
    yield* assertStorageEffect(
      repositories.shardRegistry.resolveShardMetadata({
        countryCode: "CZ",
        regionCode: "86",
      }),
      (result) =>
        expect(result).toEqual([
          expect.objectContaining({
            bindingName: "SMART_SUGGEST_CZ_VUSC_19",
            shardId: "smart-suggest-cz-vusc-86",
          }),
        ])
    )
    yield* assertStorageEffect(
      repositories.shardRegistry.resolveShardMetadata({
        countryCode: "CZ",
        regionCode: "19",
        states: ["active", "standby"],
      }),
      (result) =>
        expect(result).toEqual([
          expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19" }),
          expect.objectContaining({ shardId: "smart-suggest-cz-vusc-19-standby" }),
        ])
    )
    })
  )

  it.effect("stores repository data without raw user query fields", () =>
    Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()
    const source = yield* resolveStorageEffect(
      repositories.dataSources.registerDataSource({
        attribution: {
          label: "RUIAN sample",
          license: "CC BY 4.0",
          url: "https://ruian.cuzk.cz/",
        },
        cachePolicy: { kind: "permanent" },
        countryCode: "CZ",
        id: "ruian-cz-sample",
        modificationNoteSha256: "a".repeat(64),
        name: "RUIAN CZ sample",
        sourceKind: "owned-dataset",
      })
    )

    const storedSource = yield* resolveStorageEffect(
      repositories.dataSources.getDataSource(source.id)
    )

    expect(storedSource).toMatchObject({
      modificationNoteSha256: "a".repeat(64),
    })

    yield* resolveStorageEffect(
      repositories.addressRecords.upsertAddressRecords([
        {
          countryCode: "CZ",
          displayLabel: "Václavské náměstí 1, 110 00 Praha",
          id: "cz-1",
          parts: {
            city: "Praha",
            countryCode: "CZ",
            houseNumber: "1",
            postalCode: "110 00",
            street: "Václavské náměstí",
          },
          quality: 0.95,
          searchLabel: "vaclavske namesti 1 110 00 praha",
          sourceId: source.id,
        },
      ])
    )

    const results = yield* resolveStorageEffect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        query: "václavské",
      })
    )

    expect(results).toHaveLength(1)
    yield* assertStorageEffect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        query: "vaclavske nam",
      }),
      (searchResults) => expect(searchResults).toHaveLength(1)
    )
    yield* assertStorageEffect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        query: "11000",
      }),
      (searchResults) => expect(searchResults).toHaveLength(1)
    )
    expect(JSON.stringify(results)).not.toContain("rawQuery")
    expect(JSON.stringify(results)).not.toContain("query:")
    })
  )

  it.effect(
    "stores RUIAN lineage and hides invalid or tombstoned address records from search",
    () =>
      Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()
    const source = yield* resolveStorageEffect(
      repositories.dataSources.registerDataSource({
        attribution: {
          label: "RUIAN CZ",
          license: "CC BY 4.0",
          url: "https://ruian.cuzk.gov.cz/",
        },
        cachePolicy: { kind: "permanent" },
        countryCode: "CZ",
        datasetVersion: "2026-06-26",
        id: "ruian-cz",
        name: "RUIAN CZ",
        sourceKind: "owned-dataset",
      })
    )

    yield* resolveStorageEffect(
      repositories.addressRecords.upsertAddressRecords([
        {
          countryCode: "CZ",
          displayLabel: "K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ",
          id: "ruian-cz:1203603",
          parts: {
            city: "Praha 10",
            countryCode: "CZ",
            district: "Vršovice",
            houseNumber: "1258",
            orientationNumber: "12",
            postalCode: "101 00",
            street: "K Louži",
          },
          quality: 0.99,
          ruian: {
            addressPlaceCode: "1203603",
            buildingObjectCode: "2168187",
            municipalityCode: "554782",
            postalCode: "10100",
            regionCode: "19",
            stableAddressId: "ruian-cz:1203603",
            streetCode: "456891",
          },
          searchLabel: "k louzi 1258 12 101 00 praha 10 vrsovice cz",
          sourceId: source.id,
          sourceLineage: {
            checksumSha256: "sha256-test-checksum",
            datasetVersion: "2026-06-26",
            feedId: "RUIAN-S-ZA-U",
            fileKind: "baseline",
            lastImportRunId: "import-ruian-cz-2026-06-26",
            sourceId: "ruian-cz",
            sourceRecordId: "1203603",
            sourceRecordType: "address-place",
            sourceRowId: "1203603",
            sourceUri: "https://atom.cuzk.gov.cz/RUIAN-S-ZA-U/example.zip",
          },
          visibility: {
            replicationStatus: "active",
            searchVisible: true,
            sourceStatus: "platný",
            validFrom: "2026-01-01",
          },
        },
        {
          countryCode: "CZ",
          displayLabel: "K Louži 999/99, 101 00 Praha 10, Vršovice, CZ",
          id: "ruian-cz:999999",
          parts: {
            city: "Praha 10",
            countryCode: "CZ",
            houseNumber: "999",
            orientationNumber: "99",
            postalCode: "101 00",
            street: "K Louži",
          },
          quality: 0.99,
          replicationStatus: "invalid",
          ruian: {
            addressPlaceCode: "999999",
            regionCode: "19",
          },
          searchLabel: "k louzi 999 99 101 00 praha 10 vrsovice cz",
          searchVisible: false,
          sourceId: source.id,
          sourceLineage: {
            sourceId: "ruian-cz",
            sourceRecordId: "999999",
            sourceRowId: "999999",
          },
          visibility: {
            invalid: true,
            reason: "invalid by source",
            replicationStatus: "invalid",
            searchVisible: false,
            validTo: "2026-06-26",
          },
        },
      ])
    )

    const activeSearchResults = yield* resolveStorageEffect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        query: "K Louži",
      })
    )
    const invalidRecord = yield* resolveStorageEffect(
      repositories.addressRecords.getAddressRecord("ruian-cz:999999")
    )

    expect(activeSearchResults).toEqual([
      expect.objectContaining({
        id: "ruian-cz:1203603",
        ruian: expect.objectContaining({
          addressPlaceCode: "1203603",
          regionCode: "19",
        }),
        sourceLineage: expect.objectContaining({
          feedId: "RUIAN-S-ZA-U",
          sourceRecordId: "1203603",
        }),
      }),
    ])
    expect(invalidRecord).toMatchObject({
      replicationStatus: "invalid",
      searchVisible: false,
      visibility: { invalid: true, reason: "invalid by source" },
    })

    yield* resolveStorageEffect(
      repositories.addressTombstones.upsertAddressTombstones([
        {
          countryCode: "CZ",
          deletedAt: "2026-06-27",
          id: "ruian-cz:1203603",
          reason: "removed by RUIAN delta",
          ruian: {
            addressPlaceCode: "1203603",
            regionCode: "19",
          },
          sourceId: source.id,
          sourceLineage: {
            feedId: "RUIAN-S-ZA-Z",
            fileKind: "delta",
            sourceId: "ruian-cz",
            sourceRecordId: "1203603",
            sourceRowId: "1203603",
          },
        },
      ])
    )

    const tombstonedSearchResults = yield* resolveStorageEffect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        query: "K Louži 1258",
      })
    )
    const tombstonedRecord = yield* resolveStorageEffect(
      repositories.addressRecords.getAddressRecord("ruian-cz:1203603")
    )
    const tombstones = yield* resolveStorageEffect(
      repositories.addressTombstones.listAddressTombstones()
    )

    expect(tombstonedSearchResults).toEqual([])
    expect(tombstonedRecord).toMatchObject({
      replicationStatus: "tombstoned",
      searchVisible: false,
      visibility: {
        reason: "removed by RUIAN delta",
        replicationStatus: "tombstoned",
      },
    })
    expect(tombstones).toEqual([
      expect.objectContaining({
        id: "ruian-cz:1203603",
        reason: "removed by RUIAN delta",
        ruian: expect.objectContaining({ addressPlaceCode: "1203603" }),
      }),
    ])
      })
  )

  it("builds gated FTS5 queries for address-specific input", () => {
    expect(createAddressSearchFtsQuery("K")).toBeUndefined()
    expect(createAddressSearchFtsQuery("K L")).toBeUndefined()
    expect(createAddressSearchFtsQuery("Lo")).toBeUndefined()
    expect(createAddressSearchFtsQuery("Lou")).toBe("lou*")
    expect(createAddressSearchFtsQuery("K Louži 1258/12")).toBe(
      "louzi* 1258* 12*"
    )
    expect(createAddressSearchFtsQuery("10100 K Louzi")).toBe("10100* louzi*")
  })

  it.effect("lets the prefix index handle short address queries", () =>
    Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()
    const source = yield* resolveStorageEffect(
      repositories.dataSources.registerDataSource({
        attribution: {
          label: "Live provider cache",
        },
        cachePolicy: { kind: "ttl", ttlSeconds: 43_200 },
        countryCode: "CZ",
        id: "live-provider:nominatim:CZ",
        name: "Nominatim CZ cache",
        sourceKind: "live-provider",
      })
    )

    yield* resolveStorageEffect(
      repositories.addressRecords.upsertAddressRecords([
        {
          countryCode: "CZ",
          displayLabel:
            "1312/1, K Louži, Vršovice, Praha 10, Praha, 101 00, Česko",
          id: "cz-k-louzi",
          parts: {
            city: "Praha",
            countryCode: "CZ",
            houseNumber: "1312",
            line1: "K Louži 1",
            orientationNumber: "1",
            postalCode: "101 00",
            street: "K Louži",
          },
          quality: 0.95,
          searchLabel: "1312 1 k louzi vrsovice praha 10 praha 101 00 cesko",
          sourceId: source.id,
        },
        {
          countryCode: "CZ",
          displayLabel: "Vinohradská 12/34, 120 00 Praha, Praha 2, CZ",
          id: "cz-vinohradska",
          parts: {
            city: "Praha",
            countryCode: "CZ",
            houseNumber: "12",
            orientationNumber: "34",
            postalCode: "120 00",
            street: "Vinohradská",
          },
          quality: 0.95,
          searchLabel: "vinohradska 12 34 120 00 praha praha 2 cz",
          sourceId: source.id,
        },
      ])
    )

    const kLouziResults = yield* resolveStorageEffect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        limit: 5,
        query: "K Louži Praha",
      })
    )
    const shortKResults = yield* resolveStorageEffect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        limit: 5,
        query: "K",
      })
    )
    const shortLoResults = yield* resolveStorageEffect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        limit: 5,
        query: "Lo",
      })
    )

    expect(kLouziResults).toEqual([expect.objectContaining({ id: "cz-k-louzi" })])
    expect(shortKResults).toEqual([])
    expect(shortLoResults).toEqual([expect.objectContaining({ id: "cz-k-louzi" })])
    })
  )

  it.effect(
    "keeps K Louži typo, weak-query, number-order, and wrong-city behavior bounded",
    () =>
      Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()
    const source = yield* resolveStorageEffect(
      repositories.dataSources.registerDataSource({
        attribution: {
          label: "RUIAN synthetic benchmark rows",
        },
        cachePolicy: { kind: "permanent" },
        countryCode: "CZ",
        id: "ruian-cz-benchmark",
        name: "RUIAN CZ benchmark rows",
        sourceKind: "owned-dataset",
      })
    )

    yield* resolveStorageEffect(
      repositories.addressRecords.upsertAddressRecords([
        {
          countryCode: "CZ",
          displayLabel: "K Louži 1258/12, 101 00 Praha 10, Vršovice, CZ",
          id: "ruian-cz:1203603",
          parts: {
            city: "Praha 10",
            countryCode: "CZ",
            district: "Vršovice",
            houseNumber: "1258",
            orientationNumber: "12",
            postalCode: "101 00",
            street: "K Louži",
          },
          quality: 0.99,
          searchLabel: "k louzi 1258 12 101 00 praha 10 vrsovice cz",
          sourceId: source.id,
        },
        {
          countryCode: "CZ",
          displayLabel: "K Louži 1258/7, 101 00 Praha 10, Vršovice, CZ",
          id: "ruian-cz:1203604",
          parts: {
            city: "Praha 10",
            countryCode: "CZ",
            district: "Vršovice",
            houseNumber: "1258",
            orientationNumber: "7",
            postalCode: "101 00",
            street: "K Louži",
          },
          quality: 0.99,
          searchLabel: "k louzi 1258 7 101 00 praha 10 vrsovice cz",
          sourceId: source.id,
        },
        {
          countryCode: "CZ",
          displayLabel: "K Louži 1258/12, 602 00 Brno, Stránice, CZ",
          id: "ruian-cz:4401258",
          parts: {
            city: "Brno",
            countryCode: "CZ",
            district: "Stránice",
            houseNumber: "1258",
            orientationNumber: "12",
            postalCode: "602 00",
            street: "K Louži",
          },
          quality: 0.99,
          searchLabel: "k louzi 1258 12 602 00 brno stranice cz",
          sourceId: source.id,
        },
      ])
    )

    const searchIds = (query: string) =>
      Effect.map(
        resolveStorageEffect(
          repositories.addressRecords.searchAddressRecords({
            countryCode: "CZ",
            limit: 5,
            query,
          })
        ),
        (records) => records.map((record) => record.id)
      )

    expect(yield* searchIds("K L")).toEqual([])
    expect(yield* searchIds("K Louzy 1258/12 Praha 10")).toEqual([
      "ruian-cz:1203603",
    ])
    expect(yield* searchIds("1258 K Louži")).toEqual([
      "ruian-cz:1203603",
      "ruian-cz:4401258",
      "ruian-cz:1203604",
    ])
    expect(yield* searchIds("12 K Louži")).toEqual([
      "ruian-cz:1203603",
      "ruian-cz:4401258",
    ])
    expect(yield* searchIds("K Louži 1258/12 Brno")).toEqual([
      "ruian-cz:4401258",
    ])
      })
  )

  it("builds searchable address records from sanitized live-provider suggestions", () => {
    expect(
      createAddressRecordFromSuggestion({
        countryCode: "CZ",
        sourceId: "live-provider:here-discover:CZ",
        suggestion: {
          address: {
            city: "Praha",
            countryCode: "CZ",
            line1: "K Louži 1",
            postalCode: "101 00",
          },
          confidence: 0.95,
          displayLabel: "K Louži 1, Praha",
          id: "here-discover:abc",
          kind: "address",
          metadata: {
            latitude: "50.03",
            longitude: "14.5",
          },
          source: {
            id: "here-discover",
            kind: "live-provider",
            name: "HERE Discover",
          },
        },
      })
    ).toMatchObject({
      countryCode: "CZ",
      displayLabel: "K Louži 1, Praha",
      id: "live:live-provider:here-discover:CZ:here-discover-abc",
      latitude: 50.03,
      longitude: 14.5,
      searchLabel: "k louzi 1 praha",
      sourceId: "live-provider:here-discover:CZ",
    })
  })

  it.effect("stores tenant API key metadata by hash without exposing raw keys", () =>
    Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()

    yield* resolveStorageEffect(
      repositories.tenants.upsertTenant({
        allowedOrigins: ["https://shop.example"],
        countryConfig: {},
        id: "tenant-api-key-test",
        name: "Tenant API Key Test",
        providerPriority: [],
        status: "active",
      })
    )

    const activeKey = yield* resolveStorageEffect(
      repositories.apiKeys.upsertApiKey({
        id: "key-1",
        keyHash: "sha256:active-key-hash",
        label: "Checkout client",
        status: "active",
        tenantId: "tenant-api-key-test",
      })
    )

    expect(activeKey).toMatchObject({
      keyHash: "sha256:active-key-hash",
      status: "active",
      tenantId: "tenant-api-key-test",
    })

    const keyByHash = yield* resolveStorageEffect(
      repositories.apiKeys.getApiKeyByHash("sha256:active-key-hash")
    )

    expect(keyByHash).toMatchObject({
      id: "key-1",
      label: "Checkout client",
    })

    const revokedKey = yield* resolveStorageEffect(
      repositories.apiKeys.upsertApiKey({
        id: "key-1",
        keyHash: "sha256:active-key-hash",
        label: "Checkout client",
        revokedAt: "2026-06-27T12:00:00.000Z",
        status: "revoked",
        tenantId: "tenant-api-key-test",
      })
    )
    const tenantKeys = yield* resolveStorageEffect(
      repositories.apiKeys.listApiKeysForTenant("tenant-api-key-test")
    )

    expect(revokedKey).toMatchObject({
      revokedAt: "2026-06-27T12:00:00.000Z",
      status: "revoked",
    })
    expect(tenantKeys).toHaveLength(1)
    expect(JSON.stringify(tenantKeys)).not.toContain("sk_live_raw_secret")
    })
  )

  it.effect("hashes normalized queries and builds cache keys from derived data only", () =>
    Effect.gen(function* () {
      const firstHash = yield* resolveStorageEffect(
      createSuggestQueryHashEffect({
        countryCode: "CZ",
        kind: "address",
        query: "  Václavské   náměstí ",
        tenantId: "tenant-a",
      })
    )
      const secondHash = yield* resolveStorageEffect(
      createSuggestQueryHashEffect({
        countryCode: "CZ",
        kind: "address",
        query: "václavské náměstí",
        tenantId: "tenant-a",
      })
    )
      const limitedHash = yield* resolveStorageEffect(
      createSuggestQueryHashEffect({
        countryCode: "CZ",
        kind: "address",
        limit: 1,
        query: "václavské náměstí",
        tenantId: "tenant-a",
      })
    )

    expect(firstHash).toBe(secondHash)
    expect(limitedHash).not.toBe(firstHash)
    expect(firstHash).toHaveLength(64)
    expect(
      createSuggestCacheKey({
        countryCode: "CZ",
        kind: "address",
        queryHash: firstHash,
        tenantId: "tenant-a",
      })
    ).not.toContain("Václavské")
    })
  )

  it.effect("supports keyed query hashes for telemetry that may be exposed outside storage", () =>
    Effect.gen(function* () {
      const input = {
      countryCode: "CZ",
      kind: "address" as const,
      query: "K Louži 1258/12",
      tenantId: "tenant-a",
    } satisfies Parameters<typeof createSuggestQueryHashEffect>[0]
      const unkeyedHash = yield* resolveStorageEffect(
      createSuggestQueryHashEffect(input)
    )
      const firstKeyedHash = yield* resolveStorageEffect(
      createSuggestQueryHashEffect(input, {
        secret: "operator-secret-a",
      })
    )
      const secondKeyedHash = yield* resolveStorageEffect(
      createSuggestQueryHashEffect(
        { ...input, query: "  k   louži 1258/12 " },
        { secret: "operator-secret-a" }
      )
    )
      const otherSecretHash = yield* resolveStorageEffect(
      createSuggestQueryHashEffect(input, {
        secret: "operator-secret-b",
      })
    )

    expect(firstKeyedHash).toBe(secondKeyedHash)
    expect(firstKeyedHash).not.toBe(unkeyedHash)
    expect(otherSecretHash).not.toBe(firstKeyedHash)
    expect(firstKeyedHash).toMatch(hmacSha256HashPattern)
    })
  )

  it.effect("reports cache miss, hit, stale, and policy violation states", () =>
    Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()

    const missingCache = yield* resolveStorageEffect(
      repositories.suggestCache.readSuggestCache("missing")
    )

    expect(missingCache).toBeUndefined()

    yield* resolveStorageEffect(
      repositories.suggestCache.writeSuggestCache({
        cacheKey: "owned-hit",
        cachePolicy: { kind: "permanent" },
        expiresAt: "2999-01-01T00:00:00.000Z",
        kind: "address",
        payload: [],
        queryHash: "derived-hash",
      })
    )

    const cacheHit = yield* resolveStorageEffect(
      repositories.suggestCache.readSuggestCache("owned-hit")
    )

    expect(cacheHit).toMatchObject({
      status: "hit",
    })

    yield* resolveStorageEffect(
      repositories.suggestCache.writeSuggestCache({
        cacheKey: "owned-stale",
        cachePolicy: { kind: "ttl", ttlSeconds: 60 },
        expiresAt: "2000-01-01T00:00:00.000Z",
        kind: "address",
        payload: [],
        queryHash: "derived-hash",
      })
    )

    const staleCache = yield* resolveStorageEffect(
      repositories.suggestCache.readSuggestCache("owned-stale")
    )

    expect(staleCache).toMatchObject({
      status: "stale",
    })

    yield* assertStorageFailure(
      repositories.suggestCache.writeSuggestCache({
          cacheKey: "provider-none",
          cachePolicy: { kind: "none" },
          kind: "address",
          payload: [],
          queryHash: "hash",
        }),
      (error) => {
        expect(error).toBeInstanceOf(SmartSuggestStorageError)
        expect(error).toMatchObject({
          _tag: "SmartSuggestStorageError",
          code: "cache-policy-violation",
        })
      }
    )
    })
  )

  it.effect("lists recent import runs for operational status without raw query data", () =>
    Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()

    yield* resolveStorageEffect(
      repositories.importRuns.startImportRun({
        id: "import-a",
        shardCountryCode: "CZ",
        sourceId: "source-a",
      })
    )
    yield* resolveStorageEffect(
      repositories.importRuns.finishImportRun({
        completedAt: "2026-06-26T12:00:00.000Z",
        failedRows: 0,
        id: "import-a",
        insertedRows: 1,
        status: "completed",
        totalRows: 1,
      })
    )

    const importRuns = yield* resolveStorageEffect(
      repositories.importRuns.listRecentImportRuns(1)
    )

    expect(importRuns).toEqual([
      expect.objectContaining({
        id: "import-a",
        shardCountryCode: "CZ",
        status: "completed",
      }),
    ])
    })
  )

  it.effect(
    "finds the latest completed import run for one source and shard without relying on recent global runs",
    () =>
      Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()

    yield* resolveStorageEffect(
      repositories.importRuns.startImportRun({
        atomEntryId: "baseline-entry",
        id: "ruian-cz-baseline",
        importKind: "baseline",
        shardCountryCode: "CZ",
        sourceId: "ruian-cz",
      })
    )
    yield* resolveStorageEffect(
      repositories.importRuns.finishImportRun({
        completedAt: "2026-06-26T12:00:00.000Z",
        failedRows: 0,
        id: "ruian-cz-baseline",
        insertedRows: 1,
        status: "completed",
        totalRows: 1,
      })
    )

    yield* resolveStorageEffect(
      repositories.importRuns.startImportRun({
        atomEntryId: "delta-entry",
        id: "ruian-cz-delta",
        importKind: "delta",
        shardCountryCode: "CZ",
        sourceId: "ruian-cz",
      })
    )
    yield* resolveStorageEffect(
      repositories.importRuns.finishImportRun({
        completedAt: "2026-06-27T12:00:00.000Z",
        failedRows: 0,
        id: "ruian-cz-delta",
        insertedRows: 1,
        status: "completed",
        totalRows: 1,
      })
    )

    for (let index = 0; index < 55; index += 1) {
      const id = `unrelated-import-${index}`
      yield* resolveStorageEffect(
        repositories.importRuns.startImportRun({
          id,
          importKind: "baseline",
          shardCountryCode: "SK",
          sourceId: "register-adries-sk",
        })
      )
      yield* resolveStorageEffect(
        repositories.importRuns.finishImportRun({
          completedAt: `2026-06-28T12:${String(index).padStart(2, "0")}:00.000Z`,
          failedRows: 0,
          id,
          insertedRows: 1,
          status: "completed",
          totalRows: 1,
        })
      )
    }

    const latestRun = yield* resolveStorageEffect(
      repositories.importRuns.findLatestCompletedImportRun({
        importKinds: ["baseline", "delta"],
        shardCountryCode: "CZ",
        sourceId: "ruian-cz",
      })
    )

    expect(latestRun).toMatchObject({
      atomEntryId: "delta-entry",
      id: "ruian-cz-delta",
    })
      })
  )

  it.effect("allows only one running baseline or delta import per source and shard", () =>
    Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()

    yield* resolveStorageEffect(
      repositories.importRuns.startImportRun({
        id: "ruian-cz-running-baseline",
        importKind: "baseline",
        shardCountryCode: "CZ",
        sourceId: "ruian-cz",
      })
    )

    yield* assertStorageFailure(
      repositories.importRuns.startImportRun({
        id: "ruian-cz-competing-delta",
        importKind: "delta",
        shardCountryCode: "CZ",
        sourceId: "ruian-cz",
      }),
      (error) =>
        expect(error).toMatchObject({
          _tag: "SmartSuggestStorageError",
          code: "import-run-conflict",
          message: expect.stringContaining("ruian-cz-running-baseline"),
        })
    )

    const unrelatedRun = yield* resolveStorageEffect(
      repositories.importRuns.startImportRun({
        id: "ruian-sk-unrelated-source",
        importKind: "baseline",
        shardCountryCode: "SK",
        sourceId: "register-adries-sk",
      })
    )
    const manualRun = yield* resolveStorageEffect(
      repositories.importRuns.startImportRun({
        id: "ruian-cz-manual-repair",
        importKind: "manual",
        shardCountryCode: "CZ",
        sourceId: "ruian-cz",
      })
    )

    expect(unrelatedRun).toMatchObject({
      id: "ruian-sk-unrelated-source",
      status: "running",
    })
    expect(manualRun).toMatchObject({
      id: "ruian-cz-manual-repair",
      status: "running",
    })

    yield* resolveStorageEffect(
      repositories.importRuns.finishImportRun({
        completedAt: "2026-06-26T12:00:00.000Z",
        failedRows: 0,
        id: "ruian-cz-running-baseline",
        insertedRows: 1,
        status: "completed",
        totalRows: 1,
      })
    )

    const nextDeltaRun = yield* resolveStorageEffect(
      repositories.importRuns.startImportRun({
        id: "ruian-cz-next-delta",
        importKind: "delta",
        shardCountryCode: "CZ",
        sourceId: "ruian-cz",
      })
    )

    expect(nextDeltaRun).toMatchObject({
      id: "ruian-cz-next-delta",
      status: "running",
    })
    })
  )

  it.effect("rejects reused import run ids with different source checksum metadata", () =>
    Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()

    yield* resolveStorageEffect(
      repositories.importRuns.startImportRun({
        checksumSha256: "checksum-a",
        id: "import-restart-guard",
        importKind: "baseline",
        shardCountryCode: "CZ",
        sourceFeedId: "RUIAN-CSV-ADR-ST",
        sourceId: "ruian-cz",
        sourceUri: "https://example.invalid/ruian-a.zip",
        sourceVersion: "20260626",
      })
    )
    yield* resolveStorageEffect(
      repositories.importRuns.finishImportRun({
        completedAt: "2026-06-26T12:00:00.000Z",
        failedRows: 0,
        id: "import-restart-guard",
        insertedRows: 1,
        status: "completed",
        totalRows: 1,
      })
    )

    const restartedRun = yield* resolveStorageEffect(
      repositories.importRuns.startImportRun({
        checksumSha256: "checksum-a",
        id: "import-restart-guard",
        importKind: "baseline",
        shardCountryCode: "CZ",
        sourceFeedId: "RUIAN-CSV-ADR-ST",
        sourceId: "ruian-cz",
        sourceUri: "https://example.invalid/ruian-a.zip",
        sourceVersion: "20260626",
      })
    )

    expect(restartedRun).toMatchObject({
      checksumSha256: "checksum-a",
      id: "import-restart-guard",
      status: "running",
    })

    yield* assertStorageFailure(
      repositories.importRuns.startImportRun({
        checksumSha256: "checksum-b",
        id: "import-restart-guard",
        importKind: "baseline",
        shardCountryCode: "CZ",
        sourceFeedId: "RUIAN-CSV-ADR-ST",
        sourceId: "ruian-cz",
        sourceUri: "https://example.invalid/ruian-b.zip",
        sourceVersion: "20260627",
      }),
      (error) =>
        expect(error).toMatchObject({
          _tag: "SmartSuggestStorageError",
          code: "import-run-conflict",
          message: expect.stringContaining("checksumSha256"),
        })
    )
    })
  )

  it.effect("records provider and accept events without raw query storage", () =>
    Effect.gen(function* () {
    const repositories = createInMemorySmartSuggestRepositories()

    yield* resolveStorageEffect(
      repositories.providerEvents.recordProviderEvent({
        id: "provider-event-1",
        providerId: "owned-cz",
        queryHash: "derived-hash",
        requestId: "request-1",
        status: "success",
      })
    )
    yield* resolveStorageEffect(
      repositories.acceptEvents.recordAcceptEvent({
        acceptedAt: "2026-06-26T12:00:00.000Z",
        id: "accept-1",
        requestId: "request-1",
        sourceId: "owned-cz",
        suggestionId: "suggestion-1",
      })
    )

    const providerEvents = yield* resolveStorageEffect(
      repositories.providerEvents.listProviderEvents("request-1")
    )
    const acceptEvents = yield* resolveStorageEffect(
      repositories.acceptEvents.listAcceptEvents("request-1")
    )

    expect(providerEvents).toHaveLength(1)
    expect(acceptEvents).toHaveLength(1)
    })
  )
})
