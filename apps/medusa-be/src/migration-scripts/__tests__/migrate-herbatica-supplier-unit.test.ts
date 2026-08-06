import { describe, expect, it, vi } from "vitest"

import {
  collectSupplierLabelsByKey,
  planLegacySupplierAssignments,
  resolveLegacySupplierValuesByBrand,
  selectRemovableLegacySupplierBrandIds,
} from "../20260729-migrate-herbatica-supplier"

vi.mock(import("../../links/product-brand"), () => ({
  ProductBrandLink: { entryPoint: "product_product_brand_brand" },
}))

describe("tracked Herbatica Supplier migration", () => {
  it("uses the active legacy Supplier and ignores its deleted history", () => {
    const result = resolveLegacySupplierValuesByBrand([
      {
        brand_id: "brand_1",
        deleted_at: new Date(),
        id: "attr_old",
        value: "Old supplier",
      },
      {
        brand_id: "brand_1",
        id: "attr_current",
        value: "Current supplier",
      },
    ])

    expect(result.ambiguousBrandIds).toStrictEqual(new Set())
    expect(result.supplierByBrandId).toStrictEqual(
      new Map([["brand_1", "Current supplier"]]),
    )
  })

  it("does not resurrect a deleted legacy Supplier", () => {
    const result = resolveLegacySupplierValuesByBrand([
      {
        brand_id: "brand_1",
        deleted_at: new Date(),
        id: "attr_old",
        value: "Old supplier",
      },
    ])

    expect(result.ambiguousBrandIds).toStrictEqual(new Set())
    expect(result.supplierByBrandId).toStrictEqual(new Map())
  })

  it("marks conflicting active legacy Suppliers as ambiguous", () => {
    const result = resolveLegacySupplierValuesByBrand([
      {
        brand_id: "brand_1",
        id: "attr_1",
        value: "Supplier A",
      },
      {
        brand_id: "brand_1",
        id: "attr_2",
        value: "Supplier B",
      },
    ])

    expect(result.ambiguousBrandIds).toStrictEqual(new Set(["brand_1"]))
    expect(result.supplierByBrandId).toStrictEqual(new Map())
  })

  it("assigns only a Supplier whose Brand is exclusive to the Product", () => {
    const result = planLegacySupplierAssignments({
      activeAssignmentProductIds: new Set(),
      ambiguousBrandIds: new Set(),
      brandIdsByProductId: new Map([
        ["product_safe", ["brand_safe"]],
        ["product_shared", ["brand_shared"]],
      ]),
      productIds: ["product_safe", "product_shared"],
      productIdsByBrandId: new Map([
        ["brand_safe", ["product_safe"]],
        ["brand_shared", ["product_shared", "product_n1"]],
      ]),
      supplierByBrandId: new Map([
        ["brand_safe", "Supplier A"],
        ["brand_shared", "Supplier B"],
      ]),
    })

    expect(result.assignments).toStrictEqual([
      { product_id: "product_safe", supplier: "Supplier A" },
    ])
    expect(result.unresolved).toHaveLength(1)
    const [unresolved] = result.unresolved
    expect(unresolved?.product_id).toBe("product_shared")
    expect(unresolved?.reason).toContain("linked to multiple Products")
    expect(unresolved?.values).toStrictEqual(["Supplier B"])
  })

  it("preserves an existing valid structured assignment", () => {
    const result = planLegacySupplierAssignments({
      activeAssignmentProductIds: new Set(["product_1"]),
      ambiguousBrandIds: new Set(),
      brandIdsByProductId: new Map([["product_1", ["brand_1"]]]),
      productIds: ["product_1"],
      productIdsByBrandId: new Map([["brand_1", ["product_1", "product_2"]]]),
      supplierByBrandId: new Map([["brand_1", "Legacy supplier"]]),
    })

    expect(result).toStrictEqual({ assignments: [], unresolved: [] })
  })

  it("does not assign from a Brand with ambiguous Supplier records", () => {
    const result = planLegacySupplierAssignments({
      activeAssignmentProductIds: new Set(),
      ambiguousBrandIds: new Set(["brand_1"]),
      brandIdsByProductId: new Map([["product_1", ["brand_1"]]]),
      productIds: ["product_1"],
      productIdsByBrandId: new Map([["brand_1", ["product_1"]]]),
      supplierByBrandId: new Map(),
    })

    expect(result.assignments).toStrictEqual([])
    expect(result.unresolved).toStrictEqual([
      {
        product_id: "product_1",
        reason: "the linked Brand has conflicting legacy Supplier records",
        values: [],
      },
    ])
  })

  it("does not assign when a Product resolves to multiple Suppliers", () => {
    const result = planLegacySupplierAssignments({
      activeAssignmentProductIds: new Set(),
      ambiguousBrandIds: new Set(),
      brandIdsByProductId: new Map([["product_1", ["brand_1", "brand_2"]]]),
      productIds: ["product_1"],
      productIdsByBrandId: new Map([
        ["brand_1", ["product_1"]],
        ["brand_2", ["product_1"]],
      ]),
      supplierByBrandId: new Map([
        ["brand_1", "Supplier A"],
        ["brand_2", "Supplier B"],
      ]),
    })

    expect(result.assignments).toStrictEqual([])
    expect(result.unresolved).toStrictEqual([
      {
        product_id: "product_1",
        reason: "the Product resolves to multiple legacy Supplier values",
        values: ["Supplier A", "Supplier B"],
      },
    ])
  })

  it("fails when distinct Supplier labels normalize to the same option key", () => {
    expect(() =>
      collectSupplierLabelsByKey(["Bio Herba", "Bio-Herba"]),
    ).toThrow(
      'Supplier option key collision from legacy labels "Bio Herba" and "Bio-Herba"',
    )
  })

  it("never removes a legacy Supplier from a Brand shared with n1", () => {
    const removable = selectRemovableLegacySupplierBrandIds({
      coveredProductIds: new Set(["product_herbatica"]),
      herbaticaProductIds: new Set(["product_herbatica"]),
      productIdsByBrandId: new Map([
        ["brand_herbatica", ["product_herbatica"]],
        ["brand_shared", ["product_herbatica", "product_n1"]],
      ]),
    })

    expect(removable).toStrictEqual(new Set(["brand_herbatica"]))
  })
})
