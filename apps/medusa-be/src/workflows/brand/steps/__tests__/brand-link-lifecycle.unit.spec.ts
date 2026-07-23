import { describe, expect, it } from "vitest"

import {
  buildDesiredProductBrandLinks,
  filterSeedLinksToActiveBrands,
} from "../../../seed/steps/create-products"
import {
  diffIds,
  getProductBrandIdsToReplace,
  hasActiveBrandConflict,
  normalizeBrandProductDelta,
  partitionProductBrandConflicts,
  resolveBrandProductDelta,
} from "../helpers"

describe("deleted brand link lifecycle", () => {
  it("ignores an inactive current brand as a conflict and replaces it for a new active assignment", () => {
    const currentIds = ["brand_deleted"]
    const nextIds = ["brand_active"]
    const replaceableCurrentIds = getProductBrandIdsToReplace(
      currentIds,
      new Set<string>(),
      nextIds
    )

    expect(hasActiveBrandConflict(currentIds, new Set<string>(), nextIds)).toBe(
      false
    )
    expect(diffIds(replaceableCurrentIds, nextIds)).toEqual({
      add: ["brand_active"],
      remove: ["brand_deleted"],
    })
  })

  it("retains an inactive link when no replacement is selected", () => {
    const replaceableCurrentIds = getProductBrandIdsToReplace(
      ["brand_deleted"],
      new Set<string>(),
      []
    )

    expect(diffIds(replaceableCurrentIds, [])).toEqual({
      add: [],
      remove: [],
    })
  })

  it("dismisses an active link when it is explicitly cleared", () => {
    const replaceableCurrentIds = getProductBrandIdsToReplace(
      ["brand_active"],
      new Set(["brand_active"]),
      []
    )

    expect(diffIds(replaceableCurrentIds, [])).toEqual({
      add: [],
      remove: ["brand_active"],
    })
  })

  it("still rejects reassignment from a different active brand", () => {
    expect(
      hasActiveBrandConflict(["brand_current"], new Set(["brand_current"]), [
        "brand_next",
      ])
    ).toBe(true)
  })

  it("treats only non-deleted seed links as active conflicts", () => {
    const activeLinks = filterSeedLinksToActiveBrands({
      linkedBrandsById: new Map([
        [
          "brand_active",
          {
            handle: "active",
            id: "brand_active",
            title: "Active",
          },
        ],
        [
          "brand_deleted",
          {
            deleted_at: new Date(),
            handle: "deleted",
            id: "brand_deleted",
            title: "Deleted",
          },
        ],
      ]),
      productHandle: "product",
      productLinks: [
        { brand_id: "brand_active", product_id: "prod_1" },
        { brand_id: "brand_deleted", product_id: "prod_1" },
      ],
    })

    expect(activeLinks).toEqual([
      { brand_id: "brand_active", product_id: "prod_1" },
    ])
  })

  it("routes every desired seed assignment through reconciliation", () => {
    expect(
      buildDesiredProductBrandLinks({
        brandIdsByHandle: new Map([["brand", "brand_active"]]),
        desiredBrandHandleByProduct: new Map([["product", "brand"]]),
        products: [{ handle: "product", id: "prod_1" }] as never,
      })
    ).toEqual([{ brandId: "brand_active", productId: "prod_1" }])
  })
})

describe("Brand product deltas", () => {
  it("deduplicates IDs and resolves already-applied changes as no-ops", () => {
    expect(
      resolveBrandProductDelta(["prod_current", "prod_remove"], {
        add: ["prod_current", "prod_new", "prod_new"],
        remove: ["prod_remove", "prod_missing", "prod_missing"],
      })
    ).toEqual({
      add: ["prod_new"],
      remove: ["prod_remove"],
    })
  })

  it("rejects overlapping add and remove IDs for direct workflow callers", () => {
    expect(() =>
      normalizeBrandProductDelta({
        add: ["prod_1"],
        remove: ["prod_1"],
      })
    ).toThrow("Product ids cannot be added and removed in the same request")
  })

  it("rejects active conflicts while identifying inactive links to replace", () => {
    expect(
      partitionProductBrandConflicts(
        [
          { brand_id: "brand_target", product_id: "prod_target" },
          { brand_id: "brand_active", product_id: "prod_conflict" },
          { brand_id: "brand_deleted", product_id: "prod_reassign" },
        ],
        new Set(["brand_target", "brand_active"]),
        "brand_target"
      )
    ).toEqual({
      active: [{ brand_id: "brand_active", product_id: "prod_conflict" }],
      inactive: [{ brand_id: "brand_deleted", product_id: "prod_reassign" }],
    })
  })
})
