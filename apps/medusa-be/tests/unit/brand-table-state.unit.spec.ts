import { describe, expect, it } from "vitest"

import {
  buildProductSelectionDelta,
  fromRowSelection,
  isBrandSelectable,
  isProductOptionSelectable,
  shouldSubmitProductBrandSelection,
  toRowSelection,
} from "../../src/admin/components/brands/brand-table-state"
import type { Brand, BrandProductOption } from "../../src/admin/lib/brands"

const brand = (id: string, deletedAt?: string): Brand => ({
  active_product_count: 0,
  attributes: [],
  ...(deletedAt === undefined ? {} : { deleted_at: deletedAt }),
  handle: id,
  id,
  title: id,
})

const option = (
  productId: string,
  assignedBrand?: Brand,
): BrandProductOption => ({
  ...(assignedBrand === undefined ? {} : { assigned_brand: assignedBrand }),
  product: {
    id: productId,
  },
})

describe("Brand DataTable state", () => {
  it("preserves selected IDs that are not on the current page", () => {
    const selection = toRowSelection(["product_1", "product_99"])

    expect(selection).toStrictEqual({
      product_1: true,
      product_99: true,
    })
    expect(fromRowSelection(selection)).toStrictEqual(
      new Set(["product_1", "product_99"]),
    )
  })

  it("disables products owned by another active Brand", () => {
    expect(
      isProductOptionSelectable(
        option("product_1", brand("brand_1")),
        "brand_1",
      ),
    ).toBeTruthy()
    expect(
      isProductOptionSelectable(
        option("product_2", brand("brand_2")),
        "brand_1",
      ),
    ).toBeFalsy()
    expect(
      isProductOptionSelectable(option("product_3"), "brand_1"),
    ).toBeTruthy()
  })

  it("prevents selecting deleted, pending, and already-selected Brands", () => {
    expect(isBrandSelectable(brand("brand_1"), undefined, false)).toBeTruthy()
    expect(isBrandSelectable(brand("brand_1"), "brand_1", false)).toBeFalsy()
    expect(
      isBrandSelectable(brand("brand_1", "2026-07-20"), undefined, false),
    ).toBeFalsy()
    expect(isBrandSelectable(brand("brand_1"), undefined, true)).toBeFalsy()
  })

  it("does not submit an unchanged inactive Brand as an unlink", () => {
    const inactiveBrand = brand("brand_1", "2026-07-20")

    expect(shouldSubmitProductBrandSelection(inactiveBrand)).toBeFalsy()
    expect(
      shouldSubmitProductBrandSelection(inactiveBrand, "brand_2"),
    ).toBeTruthy()
    expect(shouldSubmitProductBrandSelection(brand("brand_1"))).toBeTruthy()
  })

  it("submits only changed product selections", () => {
    expect(
      buildProductSelectionDelta(
        ["prod_keep", "prod_remove"],
        ["prod_keep", "prod_add", "prod_add"],
      ),
    ).toStrictEqual({
      add: ["prod_add"],
      remove: ["prod_remove"],
    })
  })
})
