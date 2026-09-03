import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import ApiStoreModuleService from "../service"

vi.mock("../../../utils/encryption", () => ({
  encryptFields: (value: unknown) => value,
}))

type TransactionManager = {
  execute: ReturnType<typeof vi.fn>
}

const persisted = (id: string, name = "reviews") => ({
  access_token_expires_at: null,
  api_key: "secret",
  api_url: null,
  created_at: new Date("2026-08-21T08:00:00.000Z"),
  credentials: null,
  enabled: true,
  id,
  is_internal: false,
  name,
  updated_at: new Date("2026-08-21T08:00:00.000Z"),
})

const serviceWithRepository = (
  transaction: (
    task: (manager: TransactionManager) => Promise<unknown>,
    options: Record<string, unknown>
  ) => Promise<unknown>
) => {
  const service = new ApiStoreModuleService({} as never) as any
  const manager = { id: "injected-manager" }
  const getFreshManager = vi.fn(() => manager)
  service.baseRepository_ = { getFreshManager, transaction }

  return { getFreshManager, manager, service }
}

describe("ApiStoreModuleService transaction context", () => {
  it("propagates one injected transaction manager through name check and create", async () => {
    const transactionManager: TransactionManager = {
      execute: vi.fn().mockResolvedValue([]),
    }
    const transaction = vi.fn(async (task, options) => {
      expect(options).toMatchObject({
        isolationLevel: "serializable",
        manager: { id: "injected-manager" },
      })
      return await task(transactionManager)
    })
    const { getFreshManager, service } = serviceWithRepository(transaction)
    service.listApiStores = vi.fn().mockResolvedValue([])
    service.createApiStores = vi.fn().mockResolvedValue(persisted("api_1"))
    const requestedContext = { isolationLevel: "serializable" }

    await expect(
      service.createApiStoreConfig(
        { api_key: "secret", name: " reviews " },
        requestedContext
      )
    ).resolves.toMatchObject({ id: "api_1", name: "reviews" })

    expect(getFreshManager).toHaveBeenCalledExactlyOnceWith(requestedContext)
    expect(transaction).toHaveBeenCalledOnce()
    expect(transactionManager.execute).toHaveBeenCalledExactlyOnceWith(
      "select pg_advisory_xact_lock(hashtextextended(?, 0))",
      ["api-store:reviews"]
    )

    const checkContext = service.listApiStores.mock.calls[0][2]
    const createContext = service.createApiStores.mock.calls[0][1]
    expect(checkContext).toBe(createContext)
    expect(createContext).toMatchObject({ transactionManager })
  })

  it("serializes concurrent creates at the duplicate-name race boundary", async () => {
    let locked = false
    const waiters: Array<() => void> = []
    const transactionManagers: TransactionManager[] = []
    const acquire = async () => {
      if (!locked) {
        locked = true
        return
      }
      await new Promise<void>((resolve) => waiters.push(resolve))
      locked = true
    }
    const release = () => {
      const next = waiters.shift()
      if (next) {
        next()
        return
      }
      locked = false
    }
    const transaction = vi.fn(async (task) => {
      let acquired = false
      const transactionManager: TransactionManager = {
        execute: vi.fn(async () => {
          await acquire()
          acquired = true
        }),
      }
      transactionManagers.push(transactionManager)

      try {
        return await task(transactionManager)
      } finally {
        if (acquired) {
          release()
        }
      }
    })
    const { service } = serviceWithRepository(transaction)
    const records: ReturnType<typeof persisted>[] = []
    service.listApiStores = vi.fn(async ({ name }: { name: string }) =>
      records.filter((record) => record.name === name)
    )
    service.createApiStores = vi.fn(async (data: { name: string }) => {
      await Promise.resolve()
      const record = persisted(`api_${records.length + 1}`, data.name)
      records.push(record)
      return record
    })

    const results = await Promise.allSettled([
      service.createApiStoreConfig({ api_key: "first", name: " reviews " }),
      service.createApiStoreConfig({ api_key: "second", name: "reviews" }),
    ])

    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1)
    const rejected = results.find((result) => result.status === "rejected")
    expect(rejected).toMatchObject({
      reason: expect.objectContaining({
        type: MedusaError.Types.DUPLICATE_ERROR,
      }),
      status: "rejected",
    })
    expect(service.createApiStores).toHaveBeenCalledOnce()
    expect(service.listApiStores).toHaveBeenCalledTimes(2)
    expect(transaction).toHaveBeenCalledTimes(2)
    expect(transactionManagers).toHaveLength(2)
    for (const transactionManager of transactionManagers) {
      expect(transactionManager.execute).toHaveBeenCalledExactlyOnceWith(
        "select pg_advisory_xact_lock(hashtextextended(?, 0))",
        ["api-store:reviews"]
      )
    }
  })
})
