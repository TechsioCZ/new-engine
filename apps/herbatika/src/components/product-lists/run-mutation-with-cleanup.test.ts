import { describe, expect, it, vi } from "vitest"

import { runMutationWithCleanup } from "./run-mutation-with-cleanup"

describe(runMutationWithCleanup, () => {
  it("runs the operation and cleans up after success", async () => {
    const events: string[] = []
    const operation = vi.fn<() => Promise<void>>(async () => {
      await Promise.resolve()
      events.push("operation")
    })
    const onError = vi.fn<(_error: unknown) => void>((_error) => {
      events.push("onError")
    })
    const cleanup = vi.fn<() => void>(() => {
      events.push("cleanup")
    })

    await expect(
      runMutationWithCleanup({ cleanup, onError, operation }),
    ).resolves.toBeUndefined()

    expect(events).toStrictEqual(["operation", "cleanup"])
    expect(operation).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it("passes an operation rejection to onError and still cleans up once", async () => {
    const operationError = new Error("operation failed")
    const events: string[] = []
    const operation = vi.fn<() => Promise<void>>(async () => {
      await Promise.resolve()
      events.push("operation")
      throw operationError
    })
    const onError = vi.fn<(_error: unknown) => void>(() => {
      events.push("onError")
    })
    const cleanup = vi.fn<() => void>(() => {
      events.push("cleanup")
    })

    await expect(
      runMutationWithCleanup({ cleanup, onError, operation }),
    ).resolves.toBeUndefined()

    expect(events).toStrictEqual(["operation", "onError", "cleanup"])
    expect(onError).toHaveBeenCalledExactlyOnceWith(operationError)
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it("cleans up when onError throws and preserves the onError failure", async () => {
    const operationError = new Error("operation failed")
    const onErrorError = new Error("error handler failed")
    const operation = vi.fn<() => Promise<void>>(async () => {
      await Promise.resolve()
      throw operationError
    })
    const onError = vi.fn<(_error: unknown) => void>((_error) => {
      throw onErrorError
    })
    const cleanup = vi.fn<() => void>(() => {})

    await expect(
      runMutationWithCleanup({ cleanup, onError, operation }),
    ).rejects.toBe(onErrorError)

    expect(operation).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledOnce()
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it("gives a cleanup failure precedence and invokes cleanup exactly once", async () => {
    const operationError = new Error("operation failed")
    const onErrorError = new Error("error handler failed")
    const cleanupError = new Error("cleanup failed")
    const events: string[] = []
    const operation = vi.fn<() => Promise<void>>(async () => {
      await Promise.resolve()
      events.push("operation")
      throw operationError
    })
    const onError = vi.fn<(_error: unknown) => void>((_error) => {
      events.push("onError")
      throw onErrorError
    })
    const cleanup = vi.fn<() => void>(() => {
      events.push("cleanup")
      throw cleanupError
    })

    await expect(
      runMutationWithCleanup({ cleanup, onError, operation }),
    ).rejects.toBe(cleanupError)

    expect(events).toStrictEqual(["operation", "onError", "cleanup"])
    expect(onError).toHaveBeenCalledOnce()
    expect(cleanup).toHaveBeenCalledOnce()
  })
})
