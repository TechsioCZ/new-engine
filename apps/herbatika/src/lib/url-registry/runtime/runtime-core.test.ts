import { describe, expect, it, vi } from "vitest"
import { initializeUrlRegistryRuntime } from "./runtime-core"

type FakePool = Readonly<{
  end: ReturnType<typeof vi.fn<() => Promise<void>>>
  label: string
}>

const setup = () => {
  const events: string[] = []
  const productLifecycleConsumer = Object.freeze({ label: "consumer" })
  const invalidationOutboxStore = Object.freeze({ label: "outbox" })
  const registry = Object.freeze({ label: "registry" })
  const pool: FakePool = {
    end: vi.fn(() => {
      events.push("close")
      return Promise.resolve()
    }),
    label: "pool",
  }
  const dependencies = {
    createPool: vi.fn((_databaseUrl: string) => {
      events.push("pool")
      return pool
    }),
    createInvalidationOutboxStore: vi.fn((_pool: FakePool) => {
      events.push("outbox")
      return invalidationOutboxStore
    }),
    createRegistry: vi.fn((_pool: FakePool) => {
      events.push("registry")
      return registry
    }),
    createProductLifecycleConsumer: vi.fn((_pool: FakePool) => {
      events.push("consumer")
      return productLifecycleConsumer
    }),
    verifyMigrations: vi.fn((_pool: FakePool) => {
      events.push("verify")
      return Promise.resolve()
    }),
  }
  return {
    dependencies,
    events,
    invalidationOutboxStore,
    pool,
    productLifecycleConsumer,
    registry,
  }
}

describe("initializeUrlRegistryRuntime", () => {
  it("does not allocate infrastructure while the feature is disabled", async () => {
    const test = setup()
    const runtime = await initializeUrlRegistryRuntime(
      { enabled: false },
      test.dependencies
    )

    expect(runtime).toMatchObject({
      enabled: false,
      invalidationOutboxStore: null,
      productLifecycleConsumer: null,
      registry: null,
    })
    await runtime.close()
    expect(test.events).toEqual([])
  })

  it("verifies migrations before exposing an enabled registry", async () => {
    const test = setup()
    const runtime = await initializeUrlRegistryRuntime(
      {
        databaseUrl: "postgresql://urlr:secret@db/urlr",
        enabled: true,
      },
      test.dependencies
    )

    expect(runtime).toMatchObject({
      enabled: true,
      invalidationOutboxStore: test.invalidationOutboxStore,
      productLifecycleConsumer: test.productLifecycleConsumer,
      registry: test.registry,
    })
    expect(test.dependencies.createRegistry).toHaveBeenCalledWith(test.pool)
    expect(
      test.dependencies.createProductLifecycleConsumer
    ).toHaveBeenCalledWith(test.pool)
    expect(
      test.dependencies.createInvalidationOutboxStore
    ).toHaveBeenCalledWith(test.pool)
    expect(test.events).toEqual([
      "pool",
      "verify",
      "registry",
      "consumer",
      "outbox",
    ])

    await Promise.all([runtime.close(), runtime.close()])
    expect(test.pool.end).toHaveBeenCalledOnce()
  })

  it("closes the owned pool and preserves migration verification errors", async () => {
    const test = setup()
    const primary = new Error("migration mismatch")
    test.dependencies.verifyMigrations.mockRejectedValueOnce(primary)
    test.pool.end.mockRejectedValueOnce(new Error("pool close failed"))

    await expect(
      initializeUrlRegistryRuntime(
        {
          databaseUrl: "postgresql://urlr:secret@db/urlr",
          enabled: true,
        },
        test.dependencies
      )
    ).rejects.toBe(primary)
    expect(test.pool.end).toHaveBeenCalledOnce()
    expect(test.dependencies.createRegistry).not.toHaveBeenCalled()
    expect(
      test.dependencies.createProductLifecycleConsumer
    ).not.toHaveBeenCalled()
  })

  it("closes the owned pool when registry construction fails", async () => {
    const test = setup()
    const primary = new Error("registry construction failed")
    test.dependencies.createRegistry.mockImplementationOnce(() => {
      throw primary
    })

    await expect(
      initializeUrlRegistryRuntime(
        {
          databaseUrl: "postgresql://urlr:secret@db/urlr",
          enabled: true,
        },
        test.dependencies
      )
    ).rejects.toBe(primary)
    expect(test.pool.end).toHaveBeenCalledOnce()
    expect(
      test.dependencies.createProductLifecycleConsumer
    ).not.toHaveBeenCalled()
  })

  it("closes the owned pool when consumer construction fails", async () => {
    const test = setup()
    const primary = new Error("consumer construction failed")
    test.dependencies.createProductLifecycleConsumer.mockImplementationOnce(
      () => {
        throw primary
      }
    )

    await expect(
      initializeUrlRegistryRuntime(
        {
          databaseUrl: "postgresql://urlr:secret@db/urlr",
          enabled: true,
        },
        test.dependencies
      )
    ).rejects.toBe(primary)
    expect(test.pool.end).toHaveBeenCalledOnce()
  })

  it("closes the owned pool when outbox construction fails", async () => {
    const test = setup()
    const primary = new Error("outbox construction failed")
    test.dependencies.createInvalidationOutboxStore.mockImplementationOnce(
      () => {
        throw primary
      }
    )

    await expect(
      initializeUrlRegistryRuntime(
        {
          databaseUrl: "postgresql://urlr:secret@db/urlr",
          enabled: true,
        },
        test.dependencies
      )
    ).rejects.toBe(primary)
    expect(test.pool.end).toHaveBeenCalledOnce()
  })
})
