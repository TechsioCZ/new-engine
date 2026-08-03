import type { ILockingModule } from "@medusajs/framework/types"
import { describe, expect, it, vi } from "vitest"

import { executeWithLockTimeout } from "../../../../src/utils/locking"

type ExecuteImplementation = (
  key: string | string[],
  job: () => Promise<unknown>
) => Promise<unknown>

/**
 * `ILockingModule["execute"]` is a genuinely generic method (`<T>(...) =>
 * Promise<T>`). Vitest's `Mock<T>` type loses genericity when wrapping a
 * generic call signature (`Parameters`/`ReturnType` collapse it), so a mock
 * built from this simpler, non-generic implementation shape is cast once at
 * this single boundary rather than fighting the mock type through every call
 * site.
 */
const createLockingModule = (
  execute: ExecuteImplementation
): Pick<ILockingModule, "execute"> => ({
  execute: execute as ILockingModule["execute"],
})

describe("executeWithLockTimeout", () => {
  it("returns the job result after acquiring the lock", async () => {
    const lockingModule = createLockingModule(
      vi.fn(async (_key, job) => await job())
    )

    await expect(
      executeWithLockTimeout(lockingModule, "job-key", 1, async () => "done")
    ).resolves.toEqual({ status: "executed", value: "done" })
  })

  it("returns a typed timeout result before the callback starts", async () => {
    vi.useFakeTimers()
    const lockingModule = createLockingModule(
      vi.fn(async () => await new Promise<never>(() => undefined))
    )

    try {
      const result = executeWithLockTimeout(
        lockingModule,
        "job-key",
        1,
        async () => "done"
      )
      await vi.advanceTimersByTimeAsync(1000)

      await expect(result).resolves.toEqual({ status: "timed_out" })
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not run the job if the provider invokes it after timeout", async () => {
    vi.useFakeTimers()
    let runProviderCallback: (() => Promise<unknown>) | undefined
    const lockingModule = createLockingModule(
      vi.fn(async (_key, job) => {
        runProviderCallback = job
        return await new Promise<string>(() => undefined)
      })
    )
    const job = vi.fn(async () => "done")

    try {
      const result = executeWithLockTimeout(lockingModule, "job-key", 1, job)
      await vi.advanceTimersByTimeAsync(1000)
      await expect(result).resolves.toEqual({ status: "timed_out" })

      await expect(runProviderCallback?.()).rejects.toBeInstanceOf(Error)
      expect(job).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it("rethrows provider failures before timeout", async () => {
    const providerError = new Error("provider failed")
    const lockingModule = createLockingModule(
      vi.fn(async () => {
        throw providerError
      })
    )

    await expect(
      executeWithLockTimeout(lockingModule, "job-key", 1, async () => "done")
    ).rejects.toBe(providerError)
  })

  it("rethrows errors raised by the locked job", async () => {
    const jobError = new Error("job failed")
    const lockingModule = createLockingModule(
      vi.fn(async (_key, job) => await job())
    )

    await expect(
      executeWithLockTimeout(lockingModule, "job-key", 1, async () => {
        throw jobError
      })
    ).rejects.toBe(jobError)
  })
})
