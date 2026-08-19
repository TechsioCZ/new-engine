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
})
