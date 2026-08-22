import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getRegionServerContext: vi.fn(),
  prefetchProductAttributes: vi.fn(),
  prefetchProductDetail: vi.fn(),
  prefetchProductList: vi.fn(),
  prefetchProductReviews: vi.fn(),
}))

vi.mock("@tanstack/react-query", () => ({
  dehydrate: vi.fn(() => ({ mutations: [], queries: [] })),
}))
vi.mock("./context", () => mocks)

import { PRODUCT_REVIEWS_PAGE_SIZE } from "../review-query-config"
import { prefetchProductDetailPageStorefrontData } from "./prefetch-product"

describe("product review SSR market locales", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prefetchProductDetail.mockResolvedValue({
      categories: [],
      id: "prod_1",
    })
  })

  it("prefetches RO reviews with the exact Romanian locale", async () => {
    mocks.getRegionServerContext.mockResolvedValue({
      locale: "ro-RO",
      market: "ro",
      queryClient: {},
      region: { country_code: "ro", region_id: "reg_ro" },
    })

    await prefetchProductDetailPageStorefrontData("produs", { market: "ro" })

    expect(mocks.prefetchProductReviews).toHaveBeenCalledWith(
      "ro",
      {},
      {
        productId: "prod_1",
        locale: "ro-RO",
        limit: PRODUCT_REVIEWS_PAGE_SIZE,
        offset: 0,
      }
    )
  })

  it("prefetches SK reviews with the exact Slovak locale", async () => {
    mocks.getRegionServerContext.mockResolvedValue({
      locale: "sk-SK",
      market: "sk",
      queryClient: {},
      region: { country_code: "sk", region_id: "reg_sk" },
    })

    await prefetchProductDetailPageStorefrontData("produkt", { market: "sk" })

    expect(mocks.prefetchProductReviews).toHaveBeenCalledWith(
      "sk",
      {},
      {
        productId: "prod_1",
        locale: "sk-SK",
        limit: PRODUCT_REVIEWS_PAGE_SIZE,
        offset: 0,
      }
    )
  })
})
