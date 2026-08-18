import { describe, expect, it } from "vitest"
import { buildCatalogProductQueryFields } from "../../../../../../../src/api/store/catalog/products/route"

describe("catalog measurement fields", () => {
  it("keeps synthetic measurement fields out of the product graph query", () => {
    const fields = buildCatalogProductQueryFields({
      needsPricing: false,
      responseFields: [
        "id",
        "+measurement",
        "+variants.measurement",
        "+variants.calculated_price.price_per_unit",
      ],
    })

    expect(fields).not.toContain("+measurement")
    expect(fields).not.toContain("+variants.measurement")
    expect(fields).not.toContain("+variants.calculated_price.price_per_unit")
    expect(fields).toEqual(
      expect.arrayContaining([
        "variants.id",
        "variants.calculated_price.calculated_amount",
        "variants.calculated_price.original_amount",
        "variants.calculated_price.currency_code",
      ])
    )
  })
})
