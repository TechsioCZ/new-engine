import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { BRAND_MODULE } from "../../../../src/modules/brand"
import BrandModuleService from "../../../../src/modules/brand/service"
import {
  diffIds,
  getBrandProductsLockKeys,
  getProductBrandIdsToReplace,
  getProductBrandLockKeys,
} from "../../../../src/workflows/brand"

const createScope = ({
  links,
  brands = [],
}: {
  links: Array<{ brand_id: string; product_id: string }>
  brands?: Array<{ deleted_at?: Date | null; id: string; title: string }>
}) =>
  ({
    resolve: vi.fn((key: string) => {
      if (key === ContainerRegistrationKeys.QUERY) {
        return {
          graph: vi.fn().mockResolvedValue({ data: links }),
        }
      }

      if (key === BRAND_MODULE) {
        return {
          listBrands: vi
            .fn()
            .mockImplementation(
              (_filters: unknown, config: { withDeleted?: boolean } = {}) =>
                Promise.resolve(
                  config.withDeleted === false
                    ? brands.filter((brand) => !brand.deleted_at)
                    : brands
                )
            ),
        }
      }

      throw new Error(`Unexpected container key: ${key}`)
    }),
  }) as unknown as MedusaContainer

describe("brand workflows", () => {
  describe("diffIds", () => {
    it("returns only links that need to be added and removed", () => {
      expect(diffIds(["prod_1", "prod_2"], ["prod_2", "prod_3"])).toEqual({
        add: ["prod_3"],
        remove: ["prod_1"],
      })
    })

    it("deduplicates incoming selections before diffing", () => {
      expect(
        diffIds(["prod_1"], ["prod_1", "prod_1", "prod_2", "prod_2"])
      ).toEqual({
        add: ["prod_2"],
        remove: [],
      })
    })

    it("returns empty changes for no-op replacements", () => {
      expect(diffIds(["prod_1", "prod_2"], ["prod_2", "prod_1"])).toEqual({
        add: [],
        remove: [],
      })
    })
  })

  describe("product brand lock keys", () => {
    it("uses one stable product-level lock namespace for both relation workflows", () => {
      expect(
        getProductBrandLockKeys(["prod_2", "prod_1", "prod_2"])
      ).toEqual(["product-brand:prod_1", "product-brand:prod_2"])
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
        getProductBrandIdsToReplace(
          ["brand_deleted"],
          activeBrandIds,
          []
        )
      ).toEqual([])
    })
  })

  describe("ensureProductsAssignableToBrand", () => {
    it("allows products that are unassigned or already linked to the brand", async () => {
      const { ensureProductsAssignableToBrand } = await import(
        "../../../../src/api/admin/brands/utils"
      )
      const scope = createScope({
        links: [
          {
            brand_id: "brand_1",
            product_id: "prod_1",
          },
        ],
      })

      await expect(
        ensureProductsAssignableToBrand(scope, "brand_1", [
          "prod_1",
          "prod_2",
        ])
      ).resolves.toBeUndefined()
    })

    it("rejects products linked to a different brand with a clear error", async () => {
      const { ensureProductsAssignableToBrand } = await import(
        "../../../../src/api/admin/brands/utils"
      )
      const scope = createScope({
        links: [
          {
            brand_id: "brand_2",
            product_id: "prod_1",
          },
        ],
        brands: [
          {
            id: "brand_2",
            title: "Other brand",
          },
        ],
      })

      await expect(
        ensureProductsAssignableToBrand(scope, "brand_1", ["prod_1"])
      ).rejects.toMatchObject({
        message:
          "Products are already linked to another brand: prod_1 (Other brand)",
        type: MedusaError.Types.CONFLICT,
      })
    })

    it("allows products linked only to a soft-deleted brand", async () => {
      const { ensureProductsAssignableToBrand } = await import(
        "../../../../src/api/admin/brands/utils"
      )
      const scope = createScope({
        links: [
          {
            brand_id: "brand_deleted",
            product_id: "prod_1",
          },
        ],
        brands: [
          {
            deleted_at: new Date(),
            id: "brand_deleted",
            title: "Deleted brand",
          },
        ],
      })

      await expect(
        ensureProductsAssignableToBrand(scope, "brand_1", ["prod_1"])
      ).resolves.toBeUndefined()
    })
  })

  describe("setBrandAttributes", () => {
    it("restores only the deleted attribute type and attribute it reuses", async () => {
      const createBrandAttributeTypes = vi.fn()
      const createBrandAttributes = vi.fn()
      const deleteBrandAttributes = vi.fn()
      const restoreBrandAttributes = vi.fn()
      const restoreBrandAttributeTypes = vi.fn()
      const updateBrandAttributes = vi.fn()
      const service = Object.assign(
        Object.create(BrandModuleService.prototype),
        {
          createBrandAttributeTypes,
          createBrandAttributes,
          deleteBrandAttributes,
          listBrandAttributes: vi.fn().mockResolvedValue([
            {
              attributeType: {
                id: "pat_deleted_1",
                name: "Material",
              },
              deleted_at: new Date(),
              id: "pa_deleted_1",
              value: "Wool",
            },
            {
              attributeType: {
                id: "pat_deleted_2",
                name: "Material",
              },
              deleted_at: new Date(),
              id: "pa_deleted_2",
              value: "Linen",
            },
          ]),
          listBrandAttributeTypes: vi.fn().mockResolvedValue([
            {
              deleted_at: new Date(),
              id: "pat_deleted_1",
              name: "Material",
            },
            {
              deleted_at: new Date(),
              id: "pat_deleted_2",
              name: "Material",
            },
          ]),
          restoreBrandAttributes,
          restoreBrandAttributeTypes,
          updateBrandAttributes,
        }
      ) as BrandModuleService

      await service.setBrandAttributes(
        "brand_1",
        [{ name: "Material", value: "Cotton" }],
        {}
      )

      expect(restoreBrandAttributeTypes).toHaveBeenCalledWith(
        ["pat_deleted_1"],
        {},
        {}
      )
      expect(restoreBrandAttributes).toHaveBeenCalledWith(
        ["pa_deleted_1"],
        {},
        {}
      )
      expect(createBrandAttributeTypes).not.toHaveBeenCalled()
      expect(createBrandAttributes).not.toHaveBeenCalled()
      expect(deleteBrandAttributes).not.toHaveBeenCalled()
      expect(updateBrandAttributes).toHaveBeenCalledWith(
        [{ id: "pa_deleted_1", value: "Cotton" }],
        {}
      )
    })
  })
})
