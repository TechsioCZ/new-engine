import { describe, expect, it, vi } from "vitest"

import {
  permanentlyDeleteProductAttributeDefinitions,
  permanentlyDeleteProductAttributeOptions,
} from "../steps/permanent-deletion"

const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }
  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

const ACTIVE_RECORD_ERROR = /must be soft-deleted before permanent removal/u

type DeletionScope = Parameters<
  typeof permanentlyDeleteProductAttributeDefinitions
>[1]

const createScope = (service: Record<string, unknown>): DeletionScope => {
  const candidate: unknown = {
    resolve: vi.fn<(key: string) => unknown>().mockReturnValue(service),
  }
  assertMockShape<DeletionScope>(candidate, ["resolve"])
  return candidate
}

const createTransactionalService = () => {
  const transactionContext = { manager: {} }
  return {
    context: transactionContext,
    deleteProductAttributeDefinitions: vi.fn<(...args: unknown[]) => unknown>(),
    deleteProductAttributeOptions: vi.fn<(...args: unknown[]) => unknown>(),
    deleteProductAttributes: vi.fn<(...args: unknown[]) => unknown>(),
    listProductAttributeDefinitions: vi.fn<(...args: unknown[]) => unknown>(),
    listProductAttributeOptions: vi.fn<(...args: unknown[]) => unknown>(),
    listProductAttributes: vi.fn<(...args: unknown[]) => unknown>(),
    runInTransaction: vi.fn<
      (
        task: (context: typeof transactionContext) => Promise<unknown>,
      ) => Promise<unknown>
    >(async (task) => await task(transactionContext)),
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
        createScope(service),
      ),
    ).resolves.toStrictEqual({
      assignment_count: 1,
      ids: ["patdef_deleted"],
      option_count: 1,
    })

    expect(service.deleteProductAttributes).toHaveBeenCalledWith(
      ["pat_1"],
      service.context,
    )
    expect(service.deleteProductAttributeOptions).toHaveBeenCalledWith(
      ["patopt_1"],
      service.context,
    )
    expect(service.deleteProductAttributeDefinitions).toHaveBeenCalledWith(
      ["patdef_deleted"],
      service.context,
    )
    expect({
      assignmentsBeforeOptions:
        (service.deleteProductAttributes.mock.invocationCallOrder[0] ?? 0) <
        (service.deleteProductAttributeOptions.mock.invocationCallOrder[0] ??
          0),
      optionsBeforeDefinition:
        (service.deleteProductAttributeOptions.mock.invocationCallOrder[0] ??
          0) <
        (service.deleteProductAttributeDefinitions.mock
          .invocationCallOrder[0] ?? 0),
    }).toStrictEqual({
      assignmentsBeforeOptions: true,
      optionsBeforeDefinition: true,
    })
  })

  it("rejects permanent removal of an active definition", async () => {
    const service = createTransactionalService()
    service.listProductAttributeDefinitions.mockResolvedValue([
      { deleted_at: null, id: "patdef_active" },
    ])

    await expect(
      permanentlyDeleteProductAttributeDefinitions(
        { ids: ["patdef_active"] },
        createScope(service),
      ),
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
        createScope(service),
      ),
    ).resolves.toStrictEqual({
      assignment_count: 1,
      ids: ["patopt_deleted"],
    })

    expect(
      service.deleteProductAttributes.mock.invocationCallOrder[0],
    ).toBeLessThan(
      service.deleteProductAttributeOptions.mock.invocationCallOrder[0] ?? 0,
    )
    expect(service.deleteProductAttributeOptions).toHaveBeenCalledWith(
      ["patopt_deleted"],
      service.context,
    )
  })
})
