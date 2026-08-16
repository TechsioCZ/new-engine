import { describe, expect, it } from "vitest"
import {
  resolveCategoryCatalogScope,
  SALE_CATEGORY_HANDLE,
} from "./sale-catalog-policy"

describe("resolveCategoryCatalogScope", () => {
  it("uses the dynamic sale feed for the sale landing category", () => {
    expect(
      resolveCategoryCatalogScope(SALE_CATEGORY_HANDLE, ["pcat_sale"])
    ).toEqual({ onSale: true })
  })

  it("keeps category membership for ordinary categories", () => {
    expect(
      resolveCategoryCatalogScope("vitaminy", ["pcat_vitaminy", "pcat_c"])
    ).toEqual({ categoryIds: ["pcat_vitaminy", "pcat_c"] })
  })
})
