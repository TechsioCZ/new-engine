import { describe, expect, it } from "vitest"
import { createCatalogQueryKeys } from "../src/catalog/query-keys"

describe("catalog sale query keys", () => {
  it("separates sale listings from ordinary catalog listings", () => {
    const queryKeys = createCatalogQueryKeys("sale-test")

    expect(queryKeys.list({ limit: 12, on_sale: true })).not.toEqual(
      queryKeys.list({ limit: 12 })
    )
  })
})
