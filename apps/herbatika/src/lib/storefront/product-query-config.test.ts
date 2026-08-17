import { describe, expect, it } from "vitest"
import {
  ACCOUNT_PRODUCT_LIST_FIELDS,
  PRODUCT_BRAND_GPSR_FIELDS,
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
  it("requests variant identity for saved product-list selections", () => {
    expect(ACCOUNT_PRODUCT_LIST_FIELDS.split(",")).toEqual(
      expect.arrayContaining(["variants.id", "variants.title"])
    )
  })

  it("requests the calculated price per unit decoration", () => {
    expect(PRODUCT_DETAIL_FIELDS.split(",")).toContain(
      "+variants.calculated_price.price_per_unit"
    )
  })

  it("requests variant metadata as an atomic JSON field", () => {
    expect(PRODUCT_DETAIL_FIELDS.split(",")).toContain("+variants.metadata")
  })

  it("requests the public GPSR fields from the linked product brand", () => {
    const selectors = PRODUCT_DETAIL_FIELDS.split(",")

    expect(selectors).toEqual(
      expect.arrayContaining([...PRODUCT_BRAND_GPSR_FIELDS])
    )
  })

  it.each(
    Object.entries(productFieldSets)
  )("%s requests metadata as an atomic JSON field", (_name, fields) => {
    const selectors = fields.split(",")

    expect(selectors).toContain("+metadata")
    expect(selectors.filter((field) => field.includes("metadata."))).toEqual([])
  })
})
