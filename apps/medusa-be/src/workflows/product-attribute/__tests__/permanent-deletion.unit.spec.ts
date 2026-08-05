import { describe, expect, it, vi } from "vitest"

import {
  permanentlyDeleteProductAttributeDefinitions,
  permanentlyDeleteProductAttributeOptions,
} from "../steps/permanent-deletion"

const ACTIVE_RECORD_ERROR = /must be soft-deleted before permanent removal/

const createScope = (service: Record<string, unknown>) =>
  ({
    resolve: vi.fn().mockReturnValue(service),
  }) as never

const createTransactionalService = () => {
  const transactionContext = { manager: {} }
  return {
    context: transactionContext,
    deleteProductAttributeDefinitions: vi.fn(),
    deleteProductAttributeOptions: vi.fn(),
    deleteProductAttributes: vi.fn(),
    listProductAttributeDefinitions: vi.fn(),
    listProductAttributeOptions: vi.fn(),
    listProductAttributes: vi.fn(),
    runInTransaction: vi.fn(
      async (task: (context: typeof transactionContext) => Promise<unknown>) =>
        await task(transactionContext)
    ),
  }
}

describe("Product Attribute permanent definition removal", () => {
  it("removes assignments and options before the deleted definition", async () => {
    const service = createTransactionalService()
    service.listProductAttributeDefinitions.mockResolvedValue([
      {
        deleted_at: new Date("2026-07-29T00:00:00.000Z"),
        id: "patdef_deleted",
      },
    ])
    service.listProductAttributes.mockResolvedValue([{ id: "pat_1" }])
    service.listProductAttributeOptions.mockResolvedValue([{ id: "patopt_1" }])

    await expect(
      permanentlyDeleteProductAttributeDefinitions(
        { ids: ["patdef_deleted"] },
        createScope(service)
      )
    ).resolves.toStrictEqual({
      assignment_count: 1,
      ids: ["patdef_deleted"],
      option_count: 1,
    })

    expect(service.deleteProductAttributes).toHaveBeenCalledWith(
      ["pat_1"],
      service.context
    )
    expect(service.deleteProductAttributeOptions).toHaveBeenCalledWith(
      ["patopt_1"],
      service.context
    )
    expect(service.deleteProductAttributeDefinitions).toHaveBeenCalledWith(
      ["patdef_deleted"],
      service.context
    )
    expect(
      service.deleteProductAttributes.mock.invocationCallOrder[0]
    ).toBeLessThan(
      service.deleteProductAttributeOptions.mock.invocationCallOrder[0] ?? 0
    )
    expect(
      service.deleteProductAttributeOptions.mock.invocationCallOrder[0]
    ).toBeLessThan(
      service.deleteProductAttributeDefinitions.mock.invocationCallOrder[0] ?? 0
    )
  })

  it("rejects permanent removal of an active definition", async () => {
    const service = createTransactionalService()
    service.listProductAttributeDefinitions.mockResolvedValue([
      { deleted_at: null, id: "patdef_active" },
    ])

    await expect(
      permanentlyDeleteProductAttributeDefinitions(
        { ids: ["patdef_active"] },
        createScope(service)
      )
    ).rejects.toThrow(ACTIVE_RECORD_ERROR)
    expect(service.deleteProductAttributeDefinitions).not.toHaveBeenCalled()
  })
})

describe("Product Attribute permanent option removal", () => {
  it("removes assignments before the deleted option", async () => {
    const service = createTransactionalService()
    service.listProductAttributeOptions.mockResolvedValue([
      {
        deleted_at: new Date("2026-07-29T00:00:00.000Z"),
        id: "patopt_deleted",
      },
    ])
    service.listProductAttributes.mockResolvedValue([{ id: "pat_1" }])

    await expect(
      permanentlyDeleteProductAttributeOptions(
        { ids: ["patopt_deleted"] },
        createScope(service)
      )
    ).resolves.toStrictEqual({
      assignment_count: 1,
      ids: ["patopt_deleted"],
    })

    expect(
      service.deleteProductAttributes.mock.invocationCallOrder[0]
    ).toBeLessThan(
      service.deleteProductAttributeOptions.mock.invocationCallOrder[0] ?? 0
    )
    expect(service.deleteProductAttributeOptions).toHaveBeenCalledWith(
      ["patopt_deleted"],
      service.context
    )
  })
})
