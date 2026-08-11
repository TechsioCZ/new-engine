import { describe, expect, it } from "vitest"
import {
  PRODUCT_CARD_FIELDS,
  PRODUCT_DETAIL_FIELDS,
  RELATED_PRODUCT_FIELDS,
  SEARCH_PRODUCT_CARD_FIELDS,
} from "./product-query-config"

const productFieldSets = {
  PRODUCT_CARD_FIELDS,
  PRODUCT_DETAIL_FIELDS,
  RELATED_PRODUCT_FIELDS,
  SEARCH_PRODUCT_CARD_FIELDS,
}

describe("product query fields", () => {
  it("requests the calculated price per unit decoration", () => {
    expect(PRODUCT_DETAIL_FIELDS.split(",")).toContain(
      "+variants.calculated_price.price_per_unit"
    )
  })

  it.each(
    Object.entries(productFieldSets)
  )("%s requests metadata as an atomic JSON field", (_name, fields) => {
    const selectors = fields.split(",")

    expect(selectors).toContain("+metadata")
    expect(selectors.filter((field) => field.startsWith("+metadata."))).toEqual(
      []
    )
  })
})
