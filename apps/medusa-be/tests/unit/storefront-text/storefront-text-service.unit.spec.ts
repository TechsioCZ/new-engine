import { describe, expect, it, vi } from "vitest"
import StorefrontTextModuleService from "../../../src/modules/storefront-text/service"

describe("StorefrontTextModuleService transactions", () => {
  it("preserves the Medusa context when opening a transaction", async () => {
    const transactionManager = { id: "transaction-manager" }
    const transaction = vi.fn(async (task) => task(transactionManager))
    const service = new StorefrontTextModuleService({
      baseRepository: { transaction },
    })
    const task = vi.fn(async (context) => context)

    const result = await service.runInTransaction(task, {
      requestId: "request_01",
      transactionId: "workflow_01",
    })

    expect(result).toMatchObject({
      requestId: "request_01",
      transactionId: "workflow_01",
      transactionManager,
    })
    expect(transaction).toHaveBeenCalledOnce()
  })

  it("reuses an existing transaction without opening a nested one", async () => {
    const transaction = vi.fn()
    const transactionManager = { id: "existing-transaction" }
    const service = new StorefrontTextModuleService({
      baseRepository: { transaction },
    })
    const task = vi.fn(async (context) => context.transactionManager)

    const result = await service.runInTransaction(task, {
      requestId: "request_02",
      transactionManager,
    })

    expect(result).toBe(transactionManager)
    expect(transaction).not.toHaveBeenCalled()
    expect(task).toHaveBeenCalledWith({
      requestId: "request_02",
      transactionManager,
    })
  })
})
