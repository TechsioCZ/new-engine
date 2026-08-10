import { describe, expect, it } from "vitest"

import type { ExistingProduct, ResolvedCategoryMap } from "../client"
import { ProductBatchClientMapperHelper } from "../client-mapper-helper"
import type { ProductInput } from "../types"

const helper = new ProductBatchClientMapperHelper()

const existingProduct = {
  external_id: null,
  id: "prod_1",
  metadata: null,
  variants: [],
} satisfies ExistingProduct

const baseProduct = {
  erp_id: "erp_1",
  identifier_type: "erp_id",
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
    resolvedCategories,
  )

describe("ProductBatchClientMapperHelper category updates", () => {
  it("maps explicit empty categories to an empty category_ids array", () => {
    const payload = buildUpdatePayload({
      ...baseProduct,
      categories: [],
    })

    expect(payload.category_ids).toStrictEqual([])
  })

  it("maps populated categories to their resolved IDs", () => {
    const payload = buildUpdatePayload({
      ...baseProduct,
      categories: [{ handle: "first-category" }, { name: "Second category" }],
    })

    expect(payload.category_ids).toStrictEqual(["pcat_1", "pcat_2"])
  })

  it("leaves category_ids undefined when categories are omitted", () => {
    const payload = buildUpdatePayload(baseProduct)

    expect(payload.category_ids).toBeUndefined()
  })
})

describe("ProductBatchClientMapperHelper query decoding", () => {
  it("decodes recursive JSON metadata and variant identifiers", () => {
    const product = helper.toExistingProduct({
      external_id: "erp_1",
      id: "prod_1",
      metadata: {
        attributes: { aliases: ["primary", null, 3] },
        enabled: true,
      },
      variants: [{ ean: "123", id: "variant_1", sku: "sku_1" }],
    })

    expect(product).toStrictEqual({
      external_id: "erp_1",
      id: "prod_1",
      metadata: {
        attributes: { aliases: ["primary", null, 3] },
        enabled: true,
      },
      variants: [{ ean: "123", id: "variant_1", sku: "sku_1" }],
    })
  })

  it("normalizes nullable query fields without retaining opaque objects", () => {
    const product = helper.toExistingProduct({
      external_id: 42,
      id: "prod_1",
      metadata: { invalid: 1n },
      variants: "not-an-array",
    })

    expect(product).toStrictEqual({
      external_id: null,
      id: "prod_1",
      metadata: null,
      variants: [],
    })
  })

  it("rejects malformed product and variant identifiers", () => {
    expect(() => helper.toExistingProduct({ id: 42 })).toThrow(
      "Expected existing product query result to match its schema",
    )
    expect(() =>
      helper.toExistingProduct({
        id: "prod_1",
        variants: [{ id: 42 }],
      }),
    ).toThrow("Expected existing product query result to match its schema")
  })

  it("indexes only schema-valid variant references", () => {
    const index = helper.buildProductIdByVariantField(
      [
        { product_id: "prod_1", sku: "sku_1" },
        { product_id: 42, sku: "sku_2" },
        { product_id: "prod_3", sku: null },
      ],
      "sku",
    )

    expect([...index]).toStrictEqual([["sku_1", "prod_1"]])
  })
})
