import type { Context } from "@medusajs/framework/types"
import { describe, expect, it, vi } from "vitest"

import StorefrontTextModuleService from "../../../src/modules/storefront-text/service"

type Transaction = <Result>(
  task: (transactionManager: unknown) => Promise<Result>,
  options?: {
    enableNestedTransactions?: boolean
    isolationLevel?: string
    transaction?: unknown
  },
) => Promise<Result>

const getManager = (manager: unknown) =>
  vi.fn<(context?: Context) => unknown>(() => manager)

describe("StorefrontTextModuleService transactions", () => {
  it("preserves the Medusa context when opening a transaction", async () => {
    const manager = { id: "manager" }
    const transactionManager = { id: "transaction-manager" }
    const getFreshManager = getManager(manager)
    const transaction = vi.fn<Transaction>(
      async (transactionTask) => await transactionTask(transactionManager),
    )
    const service = new StorefrontTextModuleService({
      baseRepository: { getFreshManager, transaction },
    })
    const task = vi.fn<(context: Context) => Promise<Context>>(
      async (context) => await Promise.resolve(context),
    )

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
    const getFreshManager = getManager(manager)
    const transaction = vi.fn<Transaction>()
    const transactionManager = { id: "existing-transaction" }
    const service = new StorefrontTextModuleService({
      baseRepository: { getFreshManager, transaction },
    })
    const task = vi.fn<(context: Context) => Promise<unknown>>(
      async (context) => await Promise.resolve(context.transactionManager),
    )

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
