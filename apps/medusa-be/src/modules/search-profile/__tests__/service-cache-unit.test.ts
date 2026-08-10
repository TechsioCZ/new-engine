import { describe, expect, it, vi } from "vitest"

import { runSearchProfileCacheOperation } from "../service"

const logger = () => ({ warn: vi.fn<(message: string) => void>() })

describe("search profile cache failure isolation", () => {
  it.each(["read", "write", "invalidation"])(
    "fails open when cache %s fails",
    async (operation) => {
      const log = logger()
      const failure = new Error(`${operation} unavailable`)

      await expect(
        runSearchProfileCacheOperation({
          action: async () => await Promise.reject(failure),
          logger: log,
          operation,
        }),
      ).resolves.toStrictEqual({ succeeded: false })
      expect(log.warn).toHaveBeenCalledExactlyOnceWith(
        expect.stringContaining("continuing with database truth"),
      )
    },
  )

  it("preserves a successful database mutation when invalidation fails", async () => {
    const created = { id: "sp_1" }

    const mutation = async (): Promise<typeof created> => {
      const databaseResult = await Promise.resolve(created)
      await runSearchProfileCacheOperation({
        action: async () => await Promise.reject(new Error("cache down")),
        logger: logger(),
        operation: "invalidation",
      })
      return databaseResult
    }

    await expect(mutation()).resolves.toBe(created)
  })
})
