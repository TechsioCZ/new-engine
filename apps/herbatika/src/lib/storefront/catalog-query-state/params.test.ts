import { describe, expect, it } from "vitest"
import { buildCatalogProductsParams } from "./params"

const EMPTY_QUERY_STATE = {
  page: 1,
  q: "",
  sort: "recommended" as const,
  status: [],
  form: [],
  brand: [],
  ingredient: [],
  price_min: null,
  price_max: null,
}

describe("buildCatalogProductsParams", () => {
  it("adds a dynamic sale selection without requiring a category", () => {
    expect(
      buildCatalogProductsParams({
        queryState: EMPTY_QUERY_STATE,
        onSale: true,
      })
    ).toEqual(
      expect.objectContaining({
        category_id: undefined,
        on_sale: true,
      })
    )
  })

  it("preserves the internal Sales Channel field expected by storefront-data", () => {
    const params = buildCatalogProductsParams({
      queryState: EMPTY_QUERY_STATE,
      salesChannelId: "sc_czechia",
    })

    expect(params.salesChannelId).toBe("sc_czechia")
    expect(params).not.toHaveProperty("sales_channel_id")
  })
})
