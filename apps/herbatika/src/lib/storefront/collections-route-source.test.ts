import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it, vi } from "vitest"
import type { CatalogQueryState } from "./catalog-query-state"
import {
  type CollectionCatalogPage,
  type CollectionRouteSourceDependencies,
  type CollectionRouteSourceMarketBinding,
  readCollectionRouteSource,
} from "./collections-route-source"

const binding: CollectionRouteSourceMarketBinding = {
  countryCode: "SK",
  locale: "sk-SK",
  market: "sk",
  publishableApiKey: "pk_sk",
  regionId: "reg_sk",
  salesChannelId: "sc_sk",
}

const queryState: CatalogQueryState = {
  brand: [],
  form: [],
  ingredient: [],
  page: 1,
  price_max: null,
  price_min: null,
  q: "",
  sort: "recommended",
  status: [],
}

const catalog: CollectionCatalogPage = {
  count: 0,
  facets: {
    brand: [],
    form: [],
    ingredient: [],
    price: { max: null, min: null },
    status: [],
  },
  limit: 12,
  page: 1,
  products: [],
  totalPages: 0,
}

const dependencies = (
  overrides: Partial<CollectionRouteSourceDependencies> = {}
): CollectionRouteSourceDependencies => ({
  resolveMarket: vi.fn(() => binding),
  retrieveAssignment: vi.fn().mockResolvedValue({
    entityId: "pcol_1",
    id: "pcol_1",
    marketCode: "sk",
    publicationStatus: "published",
    publicSlug: "zimna-kolekcia",
    salesChannelId: "sc_sk",
    schemaVersion: 1,
    sourceVersion: "v1",
  }),
  retrieveCatalog: vi.fn().mockResolvedValue(catalog),
  retrieveCollection: vi.fn().mockResolvedValue({
    collection: { id: "pcol_1", title: "Zimná kolekcia" },
  }),
  ...overrides,
})

const statusError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { status })

describe("readCollectionRouteSource", () => {
  it("requires a published assignment for the exact configured market channel", async () => {
    const deps = dependencies()

    const result = await readCollectionRouteSource(
      { collectionId: "pcol_1", market: "sk", queryState },
      deps
    )

    expect(result).toEqual({
      kind: "found",
      value: {
        catalog,
        collection: { id: "pcol_1", title: "Zimná kolekcia" },
      },
    })
    expect(deps.retrieveAssignment).toHaveBeenCalledWith({
      binding,
      collectionId: "pcol_1",
    })
    expect(deps.retrieveCollection).toHaveBeenCalledWith({
      binding,
      collectionId: "pcol_1",
    })
    expect(deps.retrieveCatalog).toHaveBeenCalledWith({
      binding,
      collectionId: "pcol_1",
      queryState: { ...queryState, limit: 12 },
    })
  })

  it("fails closed before Medusa reads when the market is not configured", async () => {
    const deps = dependencies({ resolveMarket: vi.fn(() => null) })

    const result = await readCollectionRouteSource(
      { collectionId: "pcol_1", market: "ro", queryState },
      deps
    )

    expect(result).toEqual({
      causeCode: "MISSING_MARKET_BINDING",
      kind: "invalid-response",
    })
    expect(deps.retrieveAssignment).not.toHaveBeenCalled()
    expect(deps.retrieveCollection).not.toHaveBeenCalled()
    expect(deps.retrieveCatalog).not.toHaveBeenCalled()
  })

  it.each([
    ["draft status", { publicationStatus: "draft" }],
    ["wrong market", { marketCode: "cz" }],
    ["wrong channel", { salesChannelId: "sc_cz" }],
    ["wrong source", { id: "pcol_other" }],
  ])("rejects an assignment with %s", async (_label, patch) => {
    const deps = dependencies({
      retrieveAssignment: vi.fn().mockResolvedValue({
        id: "pcol_1",
        entityId: "pcol_1",
        marketCode: "sk",
        publicationStatus: "published",
        publicSlug: "zimna-kolekcia",
        salesChannelId: "sc_sk",
        schemaVersion: 1,
        sourceVersion: "v1",
        ...patch,
      }),
    })

    const result = await readCollectionRouteSource(
      { collectionId: "pcol_1", market: "sk", queryState },
      deps
    )

    expect(result).toEqual({
      causeCode: "INVALID_COLLECTION_ASSIGNMENT_RESPONSE",
      kind: "invalid-response",
    })
    expect(deps.retrieveCollection).not.toHaveBeenCalled()
    expect(deps.retrieveCatalog).not.toHaveBeenCalled()
  })

  it("rejects a collection response with a mismatched stable ID", async () => {
    const deps = dependencies({
      retrieveCollection: vi.fn().mockResolvedValue({
        collection: { id: "pcol_other", title: "Wrong" },
      }),
    })

    const result = await readCollectionRouteSource(
      { collectionId: "pcol_1", market: "sk", queryState },
      deps
    )

    expect(result).toEqual({
      causeCode: "INVALID_MEDUSA_COLLECTION_RESPONSE",
      kind: "invalid-response",
    })
  })

  it.each([
    408, 425, 429, 500, 503,
  ])("maps retryable HTTP %s to unavailable", async (status) => {
    const deps = dependencies({
      retrieveAssignment: vi.fn().mockRejectedValue(statusError(status)),
    })

    await expect(
      readCollectionRouteSource(
        { collectionId: "pcol_1", market: "sk", queryState },
        deps
      )
    ).resolves.toEqual({ kind: "unavailable" })
  })

  it("maps an absent assignment to a missing source", async () => {
    const deps = dependencies({
      retrieveAssignment: vi.fn().mockRejectedValue(statusError(404)),
    })

    await expect(
      readCollectionRouteSource(
        { collectionId: "pcol_1", market: "sk", queryState },
        deps
      )
    ).resolves.toEqual({ kind: "missing" })
  })

  it("preserves empty published collections as a found source", async () => {
    const result = await readCollectionRouteSource(
      { collectionId: "pcol_1", market: "sk", queryState },
      dependencies()
    )

    expect(result.kind).toBe("found")
    if (result.kind === "found") {
      expect(result.value.catalog.count).toBe(0)
      expect(result.value.catalog.products).toEqual([])
    }
  })

  it("forwards the normalized collection listing query without changing source identity", async () => {
    const deps = dependencies()
    const filteredQuery: CatalogQueryState = {
      brand: ["brand-1"],
      form: ["capsule"],
      ingredient: ["mint"],
      page: 3,
      price_max: 50,
      price_min: 10,
      q: "",
      sort: "price-asc",
      status: ["in-stock"],
    }

    await readCollectionRouteSource(
      { collectionId: "pcol_1", market: "sk", queryState: filteredQuery },
      deps
    )

    expect(deps.retrieveCatalog).toHaveBeenCalledWith({
      binding,
      collectionId: "pcol_1",
      queryState: { ...filteredQuery, limit: 12 },
    })
  })

  it("accepts real Medusa product payloads without routing by handle", async () => {
    const product = {
      id: "prod_1",
      handle: "backend-only-handle",
      title: "Product",
    } as HttpTypes.StoreProduct
    const deps = dependencies({
      retrieveCatalog: vi.fn().mockResolvedValue({
        ...catalog,
        count: 1,
        products: [product],
        totalPages: 1,
      }),
    })

    const result = await readCollectionRouteSource(
      { collectionId: "pcol_1", market: "sk", queryState },
      deps
    )

    expect(
      result.kind === "found" && result.value.catalog.products[0]?.id
    ).toBe("prod_1")
  })
})
