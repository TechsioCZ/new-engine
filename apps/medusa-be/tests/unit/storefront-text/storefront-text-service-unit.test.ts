import type { Context } from "@medusajs/framework/types"
import type { Mock } from "vitest"
import { describe, expect, it, vi } from "vitest"

import StorefrontTextModuleService from "../../../src/modules/storefront-text/service"

interface TransactionOptions {
  enableNestedTransactions?: boolean
  isolationLevel?: string
  transaction?: unknown
}

type Transaction = <Result>(
  task: (transactionManager: unknown) => Promise<Result>,
  options?: TransactionOptions,
) => Promise<Result>

type TransactionCall = (
  task: (transactionManager: unknown) => Promise<unknown>,
  options?: TransactionOptions,
) => void

const createTransaction = (
  transactionManager: unknown,
): { transaction: Transaction; transactionMock: Mock<TransactionCall> } => {
  const transactionMock = vi.fn<TransactionCall>()
  const transaction: Transaction = async <Result>(
    task: (manager: unknown) => Promise<Result>,
    options?: TransactionOptions,
  ): Promise<Result> => {
    transactionMock(task, options)
    return await task(transactionManager)
  }
  return { transaction, transactionMock }
}

const getManager = (manager: unknown) =>
  vi.fn<(context?: Context) => unknown>(() => manager)

describe("StorefrontTextModuleService transactions", () => {
  it("preserves the Medusa context when opening a transaction", async () => {
    const manager = { id: "manager" }
    const transactionManager = { id: "transaction-manager" }
    const getFreshManager = getManager(manager)
    const { transaction, transactionMock } =
      createTransaction(transactionManager)
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
    expect(transactionMock).toHaveBeenCalledOnce()
  })

  it("reuses an existing transaction without opening a nested one", async () => {
    const manager = { id: "manager" }
    const getFreshManager = getManager(manager)
    const transactionManager = { id: "existing-transaction" }
    const { transaction, transactionMock } =
      createTransaction(transactionManager)
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
    expect(transactionMock).not.toHaveBeenCalled()
    expect(task).toHaveBeenCalledWith(
      expect.objectContaining({
        manager,
        requestId: "request_02",
        transactionManager,
      }),
    )
  })
})
