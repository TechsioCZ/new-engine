import { describe, expect, it } from "vitest"

import { PRODUCT_DETAIL_FIELDS } from "./product-query-config"

describe(PRODUCT_DETAIL_FIELDS, () => {
  it("requests the calculated price per unit decoration", () => {
    expect(PRODUCT_DETAIL_FIELDS.split(",")).toContain(
      "+variants.calculated_price.price_per_unit"
    )
  })
})
