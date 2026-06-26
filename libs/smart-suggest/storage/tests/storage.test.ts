import { describe, expect, it } from "vitest"

import {
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
          postalCode: "11000",
          street: "Václavské náměstí",
        },
        quality: 0.95,
        searchLabel: "vaclavske namesti 1 praha 11000",
        sourceId: source.id,
      },
    ])

    const results = await repositories.addressRecords.searchAddressRecords({
      countryCode: "CZ",
      query: "václavské",
    })

    expect(results).toHaveLength(1)
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

  it("enforces provider cache policy before writing payloads", async () => {
    const repositories = createInMemorySmartSuggestRepositories()

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
