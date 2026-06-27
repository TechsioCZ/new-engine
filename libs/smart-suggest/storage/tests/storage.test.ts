import { describe, expect, it } from "vitest"

import {
  createD1SmartSuggestRepositories,
  createInMemorySmartSuggestRepositories,
  createSuggestCacheKey,
  createSuggestQueryHash,
  SmartSuggestStorageError,
  smartSuggestSchema,
} from "../src/index"

describe("smart suggest storage", () => {
  it("exposes Drizzle tables for migration generation", () => {
    expect(Object.keys(smartSuggestSchema).sort()).toEqual([
      "smartSuggestAcceptEvents",
      "smartSuggestAddressRecords",
      "smartSuggestAddressSearchTokens",
      "smartSuggestApiKeys",
      "smartSuggestCacheEntries",
      "smartSuggestDataSources",
      "smartSuggestImportRuns",
      "smartSuggestProviderEvents",
      "smartSuggestTenants",
    ])
  })

  it("exposes a D1 repository factory for Worker runtime bindings", () => {
    expect(createD1SmartSuggestRepositories).toBeTypeOf("function")
  })

  it("stores repository data without raw user query fields", async () => {
    const repositories = createInMemorySmartSuggestRepositories()
    const source = await repositories.dataSources.registerDataSource({
      attribution: {
        label: "RUIAN sample",
        license: "CC BY 4.0",
        url: "https://ruian.cuzk.cz/",
      },
      cachePolicy: { kind: "permanent" },
      countryCode: "CZ",
      id: "ruian-cz-sample",
      name: "RUIAN CZ sample",
      sourceKind: "owned-dataset",
    })

    await repositories.addressRecords.upsertAddressRecords([
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

    const results = await repositories.addressRecords.searchAddressRecords({
      countryCode: "CZ",
      query: "václavské",
    })

    expect(results).toHaveLength(1)
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        query: "vaclavske nam",
      })
    ).resolves.toHaveLength(1)
    await expect(
      repositories.addressRecords.searchAddressRecords({
        countryCode: "CZ",
        query: "11000",
      })
    ).resolves.toHaveLength(1)
    expect(JSON.stringify(results)).not.toContain("rawQuery")
    expect(JSON.stringify(results)).not.toContain("query:")
  })

  it("hashes normalized queries and builds cache keys from derived data only", async () => {
    const firstHash = await createSuggestQueryHash({
      countryCode: "CZ",
      kind: "address",
      query: "  Václavské   náměstí ",
      tenantId: "tenant-a",
    })
    const secondHash = await createSuggestQueryHash({
      countryCode: "CZ",
      kind: "address",
      query: "václavské náměstí",
      tenantId: "tenant-a",
    })

    expect(firstHash).toBe(secondHash)
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

  it("reports cache miss, hit, stale, and policy violation states", async () => {
    const repositories = createInMemorySmartSuggestRepositories()

    await expect(
      repositories.suggestCache.readSuggestCache("missing")
    ).resolves.toBeUndefined()

    await repositories.suggestCache.writeSuggestCache({
      cacheKey: "owned-hit",
      cachePolicy: { kind: "permanent" },
      expiresAt: "2999-01-01T00:00:00.000Z",
      kind: "address",
      payload: [],
      queryHash: "derived-hash",
    })
    await expect(
      repositories.suggestCache.readSuggestCache("owned-hit")
    ).resolves.toMatchObject({ status: "hit" })

    await repositories.suggestCache.writeSuggestCache({
      cacheKey: "owned-stale",
      cachePolicy: { kind: "ttl", ttlSeconds: 60 },
      expiresAt: "2000-01-01T00:00:00.000Z",
      kind: "address",
      payload: [],
      queryHash: "derived-hash",
    })
    await expect(
      repositories.suggestCache.readSuggestCache("owned-stale")
    ).resolves.toMatchObject({ status: "stale" })

    await expect(
      repositories.suggestCache.writeSuggestCache({
        cacheKey: "provider-none",
        cachePolicy: { kind: "none" },
        kind: "address",
        payload: [],
        queryHash: "hash",
      })
    ).rejects.toBeInstanceOf(SmartSuggestStorageError)
  })

  it("lists recent import runs for operational status without raw query data", async () => {
    const repositories = createInMemorySmartSuggestRepositories()

    await repositories.importRuns.startImportRun({
      id: "import-a",
      shardCountryCode: "CZ",
      sourceId: "source-a",
    })
    await repositories.importRuns.finishImportRun({
      completedAt: "2026-06-26T12:00:00.000Z",
      failedRows: 0,
      id: "import-a",
      insertedRows: 1,
      status: "completed",
      totalRows: 1,
    })

    await expect(
      repositories.importRuns.listRecentImportRuns(1)
    ).resolves.toEqual([
      expect.objectContaining({
        id: "import-a",
        shardCountryCode: "CZ",
        status: "completed",
      }),
    ])
  })

  it("records provider and accept events without raw query storage", async () => {
    const repositories = createInMemorySmartSuggestRepositories()

    await repositories.providerEvents.recordProviderEvent({
      id: "provider-event-1",
      providerId: "owned-cz",
      queryHash: "derived-hash",
      requestId: "request-1",
      status: "success",
    })
    await repositories.acceptEvents.recordAcceptEvent({
      acceptedAt: "2026-06-26T12:00:00.000Z",
      id: "accept-1",
      requestId: "request-1",
      sourceId: "owned-cz",
      suggestionId: "suggestion-1",
    })

    expect(
      await repositories.providerEvents.listProviderEvents("request-1")
    ).toHaveLength(1)
    expect(
      await repositories.acceptEvents.listAcceptEvents("request-1")
    ).toHaveLength(1)
  })
})
