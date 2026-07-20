import { describe, expect, it } from "vitest"
import {
  buildProductSelectionDelta,
  fromRowSelection,
  isBrandSelectable,
  isProductOptionSelectable,
  toRowSelection,
} from "../../src/admin/components/brands/brand-table-state"
import type { Brand, BrandProductOption } from "../../src/admin/lib/brands"

const brand = (id: string, deletedAt?: string): Brand => ({
  active_product_count: 0,
  attributes: [],
  deleted_at: deletedAt,
  handle: id,
  id,
  title: id,
})

const option = (
  productId: string,
  assignedBrand?: Brand
): BrandProductOption => ({
  assigned_brand: assignedBrand,
  product: {
    id: productId,
  },
})

describe("Brand DataTable state", () => {
  it("preserves selected IDs that are not on the current page", () => {
    const selection = toRowSelection(["product_1", "product_99"])

    expect(selection).toEqual({
      product_1: true,
      product_99: true,
    })
    expect(fromRowSelection(selection)).toEqual(
      new Set(["product_1", "product_99"])
    )
  })

  it("disables products owned by another active Brand", () => {
    expect(
      isProductOptionSelectable(
        option("product_1", brand("brand_1")),
        "brand_1"
      )
    ).toBe(true)
    expect(
      isProductOptionSelectable(
        option("product_2", brand("brand_2")),
        "brand_1"
      )
    ).toBe(false)
    expect(isProductOptionSelectable(option("product_3"), "brand_1")).toBe(true)
  })

  it("prevents selecting deleted, pending, and already-selected Brands", () => {
    expect(isBrandSelectable(brand("brand_1"), undefined, false)).toBe(true)
    expect(isBrandSelectable(brand("brand_1"), "brand_1", false)).toBe(false)
    expect(
      isBrandSelectable(brand("brand_1", "2026-07-20"), undefined, false)
    ).toBe(false)
    expect(isBrandSelectable(brand("brand_1"), undefined, true)).toBe(false)
  })

  it("submits only changed product selections", () => {
    expect(
      buildProductSelectionDelta(
        ["prod_keep", "prod_remove"],
        ["prod_keep", "prod_add", "prod_add"]
      )
    ).toEqual({
      add: ["prod_add"],
      remove: ["prod_remove"],
    })
  })
})
