import type { ILockingModule } from "@medusajs/framework/types"
import { describe, expect, it, vi } from "vitest"
import type ProductAttributeModuleService from "../../../modules/product-attribute/service"
import {
  cleanupDeletedProductAttributes,
  restoreDeletedProductAttributes,
} from "../product-deletion-cleanup"

const createLockingModule = () => {
  const execute = vi.fn(
    async (_keys: string | string[], job: () => Promise<unknown>) => await job()
  )
  return {
    execute,
    lockingModule: { execute } as unknown as ILockingModule,
  }
}

describe("Product Attribute Product deletion cleanup", () => {
  it("serializes cleanup with Product Attribute writes and snapshots active ids", async () => {
    const { execute, lockingModule } = createLockingModule()
    const service = {
      listProductAttributes: vi.fn().mockResolvedValue([
        { deleted_at: null, id: "pat_active" },
        { deleted_at: new Date("2026-01-01"), id: "pat_deleted" },
      ]),
      softDeleteProductAttributes: vi.fn().mockResolvedValue(undefined),
    } as unknown as ProductAttributeModuleService

    await expect(
      cleanupDeletedProductAttributes({
        lockingModule,
        productIds: ["prod_b", "prod_a", "prod_a"],
        service,
      })
    ).resolves.toEqual({
      assignment_ids: ["pat_active"],
      product_ids: ["prod_b", "prod_a", "prod_a"],
    })

    expect(execute).toHaveBeenCalledWith(
      ["product-attribute-product:prod_a", "product-attribute-product:prod_b"],
      expect.any(Function),
      { timeout: 5 }
    )
    expect(service.softDeleteProductAttributes).toHaveBeenCalledWith([
      "pat_active",
    ])
  })

  it("uses the same Product locks when compensating cleanup", async () => {
    const { execute, lockingModule } = createLockingModule()
    const service = {
      restoreProductAttributes: vi.fn().mockResolvedValue(undefined),
    } as unknown as ProductAttributeModuleService

    await restoreDeletedProductAttributes({
      compensation: {
        assignment_ids: ["pat_1"],
        product_ids: ["prod_b", "prod_a"],
      },
      lockingModule,
      service,
    })

    expect(execute).toHaveBeenCalledWith(
      ["product-attribute-product:prod_a", "product-attribute-product:prod_b"],
      expect.any(Function),
      { timeout: 5 }
    )
    expect(service.restoreProductAttributes).toHaveBeenCalledWith(["pat_1"])
  })
})
