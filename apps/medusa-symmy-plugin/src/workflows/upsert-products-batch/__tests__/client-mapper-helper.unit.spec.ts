import { describe, expect, it } from "vitest"

import type { ExistingProduct, ResolvedCategoryMap } from "../client"
import { ProductBatchClientMapperHelper } from "../client-mapper-helper"
import type { ProductInput } from "../types"

const helper = new ProductBatchClientMapperHelper()

const existingProduct = {
  id: "prod_1",
  external_id: null,
  metadata: null,
  variants: [],
} satisfies ExistingProduct

const baseProduct = {
  identifier_type: "erp_id",
  erp_id: "erp_1",
  title: "Product",
} satisfies ProductInput

const resolvedCategories = {
  byHandle: new Map([["first-category", "pcat_1"]]),
  byName: new Map([["Second category", "pcat_2"]]),
} satisfies ResolvedCategoryMap

const buildUpdatePayload = (product: ProductInput) =>
  helper.buildUpdatePayload(
    existingProduct.id,
    product,
    existingProduct,
    resolvedCategories
  )

describe("ProductBatchClientMapperHelper category updates", () => {
  it("maps explicit empty categories to an empty category_ids array", () => {
    const payload = buildUpdatePayload({
      ...baseProduct,
      categories: [],
    })

    expect(payload.category_ids).toEqual([])
  })

  it("maps populated categories to their resolved IDs", () => {
    const payload = buildUpdatePayload({
      ...baseProduct,
      categories: [{ handle: "first-category" }, { name: "Second category" }],
    })

    expect(payload.category_ids).toEqual(["pcat_1", "pcat_2"])
  })

  it("leaves category_ids undefined when categories are omitted", () => {
    const payload = buildUpdatePayload(baseProduct)

    expect(payload.category_ids).toBeUndefined()
  })
})
