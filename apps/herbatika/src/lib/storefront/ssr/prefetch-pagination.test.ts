import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchServerCatalogProducts: vi.fn(),
  fetchServerCategories: vi.fn(),
  getRegionServerContext: vi.fn(),
}))

vi.mock("@tanstack/react-query", () => ({
  dehydrate: vi.fn(() => ({ mutations: [], queries: [] })),
}))
vi.mock("../storefront-server", () => ({
  fetchServerCatalogProducts: mocks.fetchServerCatalogProducts,
  fetchServerCategories: mocks.fetchServerCategories,
}))
vi.mock("./context", () => ({
  getRegionServerContext: mocks.getRegionServerContext,
}))

import { prefetchBrandPageStorefrontData } from "./prefetch-brand"
import { prefetchCategoryPageStorefrontData } from "./prefetch-category"
import { prefetchProductIndexStorefrontData } from "./prefetch-product-index"

const queryState = {
  brand: [],
  form: [],
  ingredient: [],
  page: 7,
  price_max: null,
  price_min: null,
  q: "",
  sort: "recommended" as const,
  status: [],
}

describe("catalog SSR prefetch pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRegionServerContext.mockResolvedValue({
      locale: "sk-SK",
      market: "sk",
      queryClient: {},
      region: { country_code: "sk", region_id: "reg_sk" },
    })
    mocks.fetchServerCategories.mockResolvedValue({
      categories: [
        {
          handle: "herbs",
          id: "cat_1",
          name: "Herbs",
          parent_category_id: null,
        },
      ],
    })
  })

  it("preserves the category catalog totalPages", async () => {
    mocks.fetchServerCatalogProducts.mockResolvedValue({
      products: [{ id: "prod_1" }],
      totalPages: 3,
    })

    const result = await prefetchCategoryPageStorefrontData(
      "herbs",
      queryState,
      { market: "sk" }
    )

    expect(result.totalPages).toBe(3)
  })

  it("preserves the brand catalog totalPages", async () => {
    mocks.fetchServerCatalogProducts.mockResolvedValue({
      products: [{ id: "prod_1" }],
      totalPages: 4,
    })

    const result = await prefetchBrandPageStorefrontData(
      "brand-facet",
      queryState,
      { market: "sk" }
    )

    expect(result.totalPages).toBe(4)
  })

  it("preserves the product index catalog totalPages", async () => {
    mocks.fetchServerCatalogProducts.mockResolvedValue({
      products: [{ id: "prod_1" }],
      totalPages: 5,
    })

    const result = await prefetchProductIndexStorefrontData(queryState, {
      market: "sk",
    })

    expect(result.totalPages).toBe(5)
  })

  it("never sends an absurd requested page to any catalog prefetch", async () => {
    const absurdQueryState = {
      ...queryState,
      page: Number.MAX_SAFE_INTEGER,
    }
    mocks.fetchServerCatalogProducts.mockResolvedValue({
      products: [],
      totalPages: 5,
    })

    await prefetchCategoryPageStorefrontData("herbs", absurdQueryState, {
      market: "sk",
    })
    await prefetchBrandPageStorefrontData("brand-facet", absurdQueryState, {
      market: "sk",
    })
    await prefetchProductIndexStorefrontData(absurdQueryState, {
      market: "sk",
    })

    expect(
      mocks.fetchServerCatalogProducts.mock.calls.map(
        ([, , params]) => params.page
      )
    ).toEqual([1, 1, 1, 1])
  })

  it("loads the exact last catalog page after the page-one bound probe", async () => {
    mocks.fetchServerCatalogProducts.mockImplementation(
      (_market, _queryClient, params) =>
        Promise.resolve({
          products: [],
          totalPages: 7,
          loadedPage: params.page,
        })
    )

    const result = await prefetchProductIndexStorefrontData(queryState, {
      market: "sk",
    })

    expect(mocks.fetchServerCatalogProducts.mock.calls).toEqual([
      expect.arrayContaining([expect.objectContaining({ page: 1 })]),
      expect.arrayContaining([expect.objectContaining({ page: 7 })]),
    ])
    expect(result.totalPages).toBe(7)
  })
})
