import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const binding = {
    countryCode: "SK",
    locale: "sk-SK",
    market: "sk",
    publishableApiKey: "pk_sk",
    regionId: "reg_sk",
    salesChannelId: "sc_sk",
  } as const
  return {
    binding,
    getCatalogProducts: vi.fn(),
    sdk: { client: { fetch: vi.fn() } },
  }
})

vi.mock("@techsio/storefront-data/shared/medusa-client", () => ({
  createMedusaSdk: vi.fn(() => mocks.sdk),
}))

vi.mock("@techsio/storefront-data/catalog/medusa-service", () => ({
  createMedusaCatalogService: vi.fn(() => ({
    getCatalogProducts: mocks.getCatalogProducts,
  })),
}))

vi.mock("@/lib/market/market-runtime", () => ({
  getMarketRuntime: vi.fn((_runtime, market) =>
    market === "sk" ? mocks.binding : null
  ),
}))

vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRuntime: vi.fn(() => ({ bindings: [mocks.binding] })),
}))

vi.mock("./runtime-env", () => ({
  resolveMedusaBackendUrl: vi.fn(() => "https://medusa.example.test"),
}))

import { readCollectionRouteSourceFromMedusa } from "./collections-route-source.server"

const queryState = {
  brand: ["brand-1"],
  form: ["capsule"],
  ingredient: ["mint"],
  page: 2,
  price_max: 50,
  price_min: 10,
  q: "",
  sort: "price-asc" as const,
  status: ["in-stock"],
}

describe("readCollectionRouteSourceFromMedusa", () => {
  beforeEach(() => {
    mocks.sdk.client.fetch.mockReset()
    mocks.getCatalogProducts.mockReset()
    mocks.sdk.client.fetch.mockImplementation((path: string) => {
      if (path.endsWith("/assignment")) {
        return Promise.resolve({
          entityId: "pcol_1",
          id: "pcol_1",
          marketCode: "sk",
          publicationStatus: "published",
          publicSlug: "zimna-kolekcia",
          salesChannelId: "sc_sk",
          schemaVersion: 1,
          sourceVersion: "v1",
        })
      }
      return Promise.resolve({
        collection: { id: "pcol_1", title: "Zimná kolekcia" },
      })
    })
    mocks.getCatalogProducts.mockResolvedValue({
      count: 0,
      facets: {
        brand: [],
        form: [],
        ingredient: [],
        price: { max: null, min: null },
        status: [],
      },
      limit: 12,
      page: 2,
      products: [],
      totalPages: 0,
    })
  })

  it("uses stable collection ID and the market-keyed assignment/catalog contract", async () => {
    const result = await readCollectionRouteSourceFromMedusa({
      collectionId: "pcol_1",
      market: "sk",
      queryState,
    })

    expect(result.kind).toBe("found")
    expect(mocks.sdk.client.fetch).toHaveBeenCalledWith(
      "/store/url-registry/collections/pcol_1/assignment",
      { signal: expect.any(AbortSignal) }
    )
    expect(mocks.sdk.client.fetch).toHaveBeenCalledWith(
      "/store/collections/pcol_1",
      { signal: expect.any(AbortSignal) }
    )
    expect(mocks.getCatalogProducts).toHaveBeenCalledWith(
      {
        brand: ["brand-1"],
        collection_id: "pcol_1",
        country_code: "sk",
        form: ["capsule"],
        ingredient: ["mint"],
        limit: 12,
        locale: "sk-SK",
        page: 2,
        price_max: 50,
        price_min: 10,
        region_id: "reg_sk",
        sort: "price-asc",
        status: ["in-stock"],
      },
      expect.any(AbortSignal)
    )
  })
})
