import { describe, expect, it } from "vitest"
import {
  createScope,
  ensureProductsAssignableToBrand,
  getBrandProductsLockKeys,
  getProductBrandIdsToReplace,
  getProductBrandLockKeys,
} from "../helpers/mocks"

describe("brand workflow helpers", () => {
  describe("product brand lock keys", () => {
    it("uses one stable product-level lock namespace for both relation workflows", () => {
      expect(getProductBrandLockKeys(["prod_2", "prod_1", "prod_2"])).toEqual([
        "product-brand:prod_1",
        "product-brand:prod_2",
      ])
      expect(getBrandProductsLockKeys("brand_1", ["prod_2"])).toEqual([
        "brand-products:brand_1",
        "product-brand:prod_2",
      ])
    })
  })

  describe("getProductBrandIdsToReplace", () => {
    it("dismisses inactive retained links only when creating a new active assignment", () => {
      const activeBrandIds = new Set(["brand_active"])

      expect(
        getProductBrandIdsToReplace(
          ["brand_deleted", "brand_active"],
          activeBrandIds,
          ["brand_next"]
        )
      ).toEqual(["brand_deleted", "brand_active"])

      expect(
        getProductBrandIdsToReplace(["brand_deleted"], activeBrandIds, [])
      ).toEqual([])
    })
  })

  describe("ensureProductsAssignableToBrand", () => {
    it("allows products that are unassigned or already linked to the brand", async () => {
      const scope = createScope({
        links: [
          {
            brand_id: "brand_1",
            product_id: "prod_1",
          },
        ],
      })

      await expect(
        ensureProductsAssignableToBrand(scope, "brand_1", ["prod_1", "prod_2"])
      ).resolves.toBeUndefined()
    })

    it("rejects products linked to a different brand with a clear error", async () => {
      const scope = createScope({
        links: [
          {
            brand_id: "brand_2",
            product_id: "prod_1",
          },
        ],
      })

      await expect(
        ensureProductsAssignableToBrand(scope, "brand_1", ["prod_1"])
      ).rejects.toThrow("prod_1")
    })
  })
})
