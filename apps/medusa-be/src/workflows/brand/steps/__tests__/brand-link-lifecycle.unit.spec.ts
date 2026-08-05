import { describe, expect, it } from "vitest"

import { buildDesiredProductBrandLinks } from "../../../seed/steps/create-products"
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
      nextIds,
    )

    expect(
      hasActiveBrandConflict(currentIds, new Set<string>(), nextIds),
    ).toBeFalsy()
    expect(diffIds(replaceableCurrentIds, nextIds)).toStrictEqual({
      add: ["brand_active"],
      remove: ["brand_deleted"],
    })
  })

  it("retains an inactive link when no replacement is selected", () => {
    const replaceableCurrentIds = getProductBrandIdsToReplace(
      ["brand_deleted"],
      new Set<string>(),
      [],
    )

    expect(diffIds(replaceableCurrentIds, [])).toStrictEqual({
      add: [],
      remove: [],
    })
  })

  it("dismisses an active link when it is explicitly cleared", () => {
    const replaceableCurrentIds = getProductBrandIdsToReplace(
      ["brand_active"],
      new Set(["brand_active"]),
      [],
    )

    expect(diffIds(replaceableCurrentIds, [])).toStrictEqual({
      add: [],
      remove: ["brand_active"],
    })
  })

  it("dismisses inactive links when an authoritative caller clears the assignment", () => {
    expect(
      getProductBrandIdsToReplace(
        ["brand_deleted"],
        new Set<string>(),
        [],
        true,
      ),
    ).toStrictEqual(["brand_deleted"])
  })

  it("still rejects reassignment from a different active brand", () => {
    expect(
      hasActiveBrandConflict(["brand_current"], new Set(["brand_current"]), [
        "brand_next",
      ]),
    ).toBeTruthy()
  })

  it("routes every desired seed assignment through reconciliation", () => {
    expect(
      buildDesiredProductBrandLinks({
        brandIdsByHandle: new Map([["brand", "brand_active"]]),
        desiredBrandHandleByProduct: new Map([["product", "brand"]]),
        products: [{ handle: "product", id: "prod_1" }] as never,
      }),
    ).toStrictEqual([{ brandIds: ["brand_active"], productId: "prod_1" }])
  })

  it("routes a missing source manufacturer through explicit removal", () => {
    expect(
      buildDesiredProductBrandLinks({
        brandIdsByHandle: new Map(),
        desiredBrandHandleByProduct: new Map(),
        products: [{ handle: "product", id: "prod_1" }] as never,
      }),
    ).toStrictEqual([{ brandIds: [], productId: "prod_1" }])
  })
})

describe("Brand product deltas", () => {
  it("deduplicates IDs and resolves already-applied changes as no-ops", () => {
    expect(
      resolveBrandProductDelta(["prod_current", "prod_remove"], {
        add: ["prod_current", "prod_new", "prod_new"],
        remove: ["prod_remove", "prod_missing", "prod_missing"],
      }),
    ).toStrictEqual({
      add: ["prod_new"],
      remove: ["prod_remove"],
    })
  })

  it("rejects overlapping add and remove IDs for direct workflow callers", () => {
    expect(() =>
      normalizeBrandProductDelta({
        add: ["prod_1"],
        remove: ["prod_1"],
      }),
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
        "brand_target",
      ),
    ).toStrictEqual({
      active: [{ brand_id: "brand_active", product_id: "prod_conflict" }],
      inactive: [{ brand_id: "brand_deleted", product_id: "prod_reassign" }],
    })
  })
})
