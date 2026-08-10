import { describe, expect, it } from "vitest"

import { STORE_CATALOG_PRODUCTS_QUERY_CONFIG } from "../../../src/api/store/catalog/products/validators"

describe("catalog pricing context middleware", () => {
  it("requests calculated prices before the pricing context is resolved", () => {
    expect(STORE_CATALOG_PRODUCTS_QUERY_CONFIG.defaults).toStrictEqual(
      expect.arrayContaining([
        "variants.calculated_price.calculated_amount",
        "variants.calculated_price.currency_code",
      ]),
    )
  })
})
