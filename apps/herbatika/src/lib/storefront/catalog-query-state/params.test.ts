import { describe, expect, it } from "vitest"
import { buildCatalogProductsParams } from "./params"

const DEFAULT_QUERY_STATE = {
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
        queryState: DEFAULT_QUERY_STATE,
        onSale: true,
      })
    ).toEqual(
      expect.objectContaining({
        category_id: undefined,
        on_sale: true,
      })
    )
  })
})
