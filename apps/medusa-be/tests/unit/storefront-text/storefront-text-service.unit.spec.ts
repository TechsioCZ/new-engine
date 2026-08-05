import { describe, expect, it, vi } from "vitest"

import StorefrontTextModuleService from "../../../src/modules/storefront-text/service"

describe("StorefrontTextModuleService transactions", () => {
  it("preserves the Medusa context when opening a transaction", async () => {
    const manager = { id: "manager" }
    const transactionManager = { id: "transaction-manager" }
    const getFreshManager = vi.fn(() => manager)
    const transaction = vi.fn(async (transactionTask) =>
      transactionTask(transactionManager),
    )
    const service = new StorefrontTextModuleService({
      baseRepository: { getFreshManager, transaction },
    })
    const task = vi.fn(async (context) => context)

    const result = await service.runInTransaction(task, {
      requestId: "request_01",
      transactionId: "workflow_01",
    })

    expect(result).toMatchObject({
      manager,
      requestId: "request_01",
      transactionId: "workflow_01",
      transactionManager,
    })
    expect(getFreshManager).toHaveBeenCalledOnce()
    expect(transaction).toHaveBeenCalledOnce()
  })

  it("reuses an existing transaction without opening a nested one", async () => {
    const manager = { id: "manager" }
    const getFreshManager = vi.fn(() => manager)
    const transaction = vi.fn()
    const transactionManager = { id: "existing-transaction" }
    const service = new StorefrontTextModuleService({
      baseRepository: { getFreshManager, transaction },
    })
    const task = vi.fn(async (context) => context.transactionManager)

    const result = await service.runInTransaction(task, {
      requestId: "request_02",
      transactionManager,
    })

    expect(result).toBe(transactionManager)
    expect(getFreshManager).toHaveBeenCalledOnce()
    expect(transaction).not.toHaveBeenCalled()
    expect(task).toHaveBeenCalledWith(
      expect.objectContaining({
        manager,
        requestId: "request_02",
        transactionManager,
      }),
    )
  })
})
