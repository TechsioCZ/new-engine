import type { ILockingModule } from "@medusajs/framework/types"
import { describe, expect, it, vi } from "vitest"

import { executeWithLockTimeout } from "../../../../src/utils/locking"

type ExecuteDelegate = <T>(
  key: string | string[],
  job: () => Promise<T>,
) => Promise<T>

class LockingModuleStub implements Pick<ILockingModule, "execute"> {
  readonly executeDelegate: ExecuteDelegate

  constructor(executeDelegate: ExecuteDelegate) {
    this.executeDelegate = executeDelegate
  }

  async execute<T>(key: string | string[], job: () => Promise<T>): Promise<T> {
    return await this.executeDelegate(key, job)
  }
}

describe(executeWithLockTimeout, () => {
  it("returns the job result after acquiring the lock", async () => {
    const lockingModule = new LockingModuleStub(
      async (_key, job) => await job(),
    )

    await expect(
      executeWithLockTimeout(
        lockingModule,
        "job-key",
        1,
        async () => await Promise.resolve("done"),
      ),
    ).resolves.toStrictEqual({ status: "executed", value: "done" })
  })

  it("returns a typed timeout result before the callback starts", async () => {
    vi.useFakeTimers()
    const lockingModule = new LockingModuleStub(
      async <T>() => await Promise.withResolvers<T>().promise,
    )

    try {
      const result = executeWithLockTimeout(
        lockingModule,
        "job-key",
        1,
        async () => await Promise.resolve("done"),
      )
      await vi.advanceTimersByTimeAsync(1000)

      await expect(result).resolves.toStrictEqual({ status: "timed_out" })
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not run the job if the provider invokes it after timeout", async () => {
    vi.useFakeTimers()
    let runProviderCallback: (() => Promise<unknown>) | undefined
    const lockingModule = new LockingModuleStub(
      async <T>(_key: string | string[], job: () => Promise<T>) => {
        runProviderCallback = job
        return await Promise.withResolvers<T>().promise
      },
    )
    const job = vi.fn<() => Promise<string>>(
      async () => await Promise.resolve("done"),
    )

    try {
      const result = executeWithLockTimeout(lockingModule, "job-key", 1, job)
      await vi.advanceTimersByTimeAsync(1000)
      await expect(result).resolves.toStrictEqual({ status: "timed_out" })

      await expect(runProviderCallback?.()).rejects.toBeInstanceOf(Error)
      expect(job).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it("rethrows provider failures before timeout", async () => {
    const providerError = new Error("provider failed")
    const lockingModule = new LockingModuleStub(
      async <T>() => await Promise.reject<T>(providerError),
    )

    await expect(
      executeWithLockTimeout(
        lockingModule,
        "job-key",
        1,
        async () => await Promise.resolve("done"),
      ),
    ).rejects.toBe(providerError)
  })

  it("rethrows errors raised by the locked job", async () => {
    const jobError = new Error("job failed")
    const lockingModule = new LockingModuleStub(
      async (_key, job) => await job(),
    )

    await expect(
      executeWithLockTimeout(
        lockingModule,
        "job-key",
        1,
        async () => await Promise.reject(jobError),
      ),
    ).rejects.toBe(jobError)
  })
})
