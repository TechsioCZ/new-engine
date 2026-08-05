import { describe, expect, it, vi } from "vitest"

import {
  cleanupDeletedProductAttributes,
  restoreDeletedProductAttributes,
} from "../product-deletion-cleanup"
import type {
  ProductAttributeDeletionLock,
  ProductAttributeDeletionRecord,
  ProductAttributeDeletionService,
} from "../product-deletion-cleanup"

const createLockingModule = () => {
  // `execute` is generic, and `vi.fn` collapses a generic implementation to its
  // instantiated signature. Keep the real generic function as the port and
  // record its arguments through a plain spy so both stay type-correct.
  const execute = vi.fn()
  const lockingModule: ProductAttributeDeletionLock = {
    execute: async (...callArgs) => {
      execute(...callArgs)

      const [, job] = callArgs

      return await job()
    },
  }

  return { execute, lockingModule }
}

const createListMock = () =>
  vi.fn<ProductAttributeDeletionService["listProductAttributes"]>()

const createWriteMock = () =>
  vi.fn<ProductAttributeDeletionService["restoreProductAttributes"]>(
    async () => {},
  )

const createService = (
  listProductAttributes: ProductAttributeDeletionService["listProductAttributes"],
) => {
  const restoreProductAttributes = createWriteMock()
  const softDeleteProductAttributes = createWriteMock()
  const service: ProductAttributeDeletionService = {
    listProductAttributes,
    restoreProductAttributes,
    softDeleteProductAttributes,
  }

  return { restoreProductAttributes, service, softDeleteProductAttributes }
}

const activeAssignment = (id: string): ProductAttributeDeletionRecord => ({
  deleted_at: null,
  id,
})

const deletedAssignment = (id: string): ProductAttributeDeletionRecord => ({
  deleted_at: new Date("2026-01-01"),
  id,
})

describe("Product Attribute Product deletion cleanup", () => {
  it("serializes cleanup with Product Attribute writes and snapshots active ids", async () => {
    const { execute, lockingModule } = createLockingModule()
    const listProductAttributes = createListMock()
      .mockResolvedValueOnce([
        activeAssignment("pat_active"),
        deletedAssignment("pat_deleted"),
      ])
      .mockResolvedValueOnce([])
    const { service, softDeleteProductAttributes } = createService(
      listProductAttributes,
    )

    await expect(
      cleanupDeletedProductAttributes({
        lockingModule,
        productIds: ["prod_b", "prod_a", "prod_a"],
        service,
      }),
    ).resolves.toStrictEqual({
      assignment_ids: ["pat_active"],
      product_ids: ["prod_b", "prod_a", "prod_a"],
    })

    expect(execute).toHaveBeenCalledWith(
      ["product-attribute-product:prod_a", "product-attribute-product:prod_b"],
      expect.any(Function),
      { timeout: 5 },
    )
    expect(softDeleteProductAttributes).toHaveBeenCalledWith(["pat_active"])
    expect(listProductAttributes).toHaveBeenNthCalledWith(
      1,
      { product_id: { $in: ["prod_b", "prod_a", "prod_a"] } },
      {
        order: { id: "ASC" },
        skip: 0,
        take: 100,
        withDeleted: true,
      },
    )
    expect(listProductAttributes).toHaveBeenNthCalledWith(
      2,
      { product_id: { $in: ["prod_b", "prod_a", "prod_a"] } },
      {
        order: { id: "ASC" },
        skip: 2,
        take: 100,
        withDeleted: true,
      },
    )
  })

  it("restores completed batches when cleanup fails before returning compensation", async () => {
    const { lockingModule } = createLockingModule()
    const listProductAttributes = createListMock()
      .mockResolvedValueOnce([activeAssignment("pat_active")])
      .mockRejectedValueOnce(new Error("read failed"))
    const { restoreProductAttributes, service } = createService(
      listProductAttributes,
    )

    await expect(
      cleanupDeletedProductAttributes({
        lockingModule,
        productIds: ["prod_1"],
        service,
      }),
    ).rejects.toThrow("read failed")

    expect(restoreProductAttributes).toHaveBeenCalledWith(["pat_active"])
  })

  it("uses the same Product locks when compensating cleanup", async () => {
    const { execute, lockingModule } = createLockingModule()
    const restoreProductAttributes = createWriteMock()

    await restoreDeletedProductAttributes({
      compensation: {
        assignment_ids: ["pat_1"],
        product_ids: ["prod_b", "prod_a"],
      },
      lockingModule,
      service: { restoreProductAttributes },
    })

    expect(execute).toHaveBeenCalledWith(
      ["product-attribute-product:prod_a", "product-attribute-product:prod_b"],
      expect.any(Function),
      { timeout: 5 },
    )
    expect(restoreProductAttributes).toHaveBeenCalledWith(["pat_1"])
  })
})
