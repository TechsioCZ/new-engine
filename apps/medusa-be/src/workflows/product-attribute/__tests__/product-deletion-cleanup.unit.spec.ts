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
      listProductAttributes: vi
        .fn()
        .mockResolvedValueOnce([
          { deleted_at: null, id: "pat_active" },
          { deleted_at: new Date("2026-01-01"), id: "pat_deleted" },
        ])
        .mockResolvedValueOnce([]),
      restoreProductAttributes: vi.fn().mockResolvedValue(undefined),
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
    expect(service.listProductAttributes).toHaveBeenNthCalledWith(
      1,
      { product_id: { $in: ["prod_b", "prod_a", "prod_a"] } },
      {
        order: { id: "ASC" },
        skip: 0,
        take: 100,
        withDeleted: true,
      }
    )
    expect(service.listProductAttributes).toHaveBeenNthCalledWith(
      2,
      { product_id: { $in: ["prod_b", "prod_a", "prod_a"] } },
      {
        order: { id: "ASC" },
        skip: 2,
        take: 100,
        withDeleted: true,
      }
    )
  })

  it("restores completed batches when cleanup fails before returning compensation", async () => {
    const { lockingModule } = createLockingModule()
    const service = {
      listProductAttributes: vi
        .fn()
        .mockResolvedValueOnce([{ deleted_at: null, id: "pat_active" }])
        .mockRejectedValueOnce(new Error("read failed")),
      restoreProductAttributes: vi.fn().mockResolvedValue(undefined),
      softDeleteProductAttributes: vi.fn().mockResolvedValue(undefined),
    } as unknown as ProductAttributeModuleService

    await expect(
      cleanupDeletedProductAttributes({
        lockingModule,
        productIds: ["prod_1"],
        service,
      })
    ).rejects.toThrow("read failed")

    expect(service.restoreProductAttributes).toHaveBeenCalledWith([
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
