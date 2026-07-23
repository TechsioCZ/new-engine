import type { MedusaContainer } from "@medusajs/framework/types"
import { describe, expect, it, vi } from "vitest"

import { BRAND_MODULE } from "../../../modules/brand"
import { getActiveBrandIds } from "../brand-activity"

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock this way avoids requiring every
 * property of the huge container interface while still validating the shape
 * the code under test actually reads from at runtime.
 */
function assertMockShape<T>(
  candidate: unknown,
  requiredKeys: readonly string[]
): asserts candidate is T {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${key}`)
    }
  }
}

const createContainer = (
  resolve: ReturnType<typeof vi.fn>
): MedusaContainer => {
  const candidate: unknown = { resolve }
  assertMockShape<MedusaContainer>(candidate, ["resolve"])
  return candidate
}

describe("getActiveBrandIds", () => {
  it("does not resolve the Brand module for an empty input", async () => {
    const resolve = vi.fn()
    const container = createContainer(resolve)

    await expect(getActiveBrandIds(container, [])).resolves.toEqual(new Set())
    expect(resolve).not.toHaveBeenCalled()
  })

  it("deduplicates, chunks, and returns only active IDs", async () => {
    const ids = Array.from({ length: 501 }, (_, index) => `brand_${index}`)
    const listBrands = vi.fn(async (filters: { id: { $in: string[] } }) =>
      filters.id.$in.filter((id) => id !== "brand_250").map((id) => ({ id }))
    )
    const resolve = vi.fn(() => ({ listBrands }))
    const container = createContainer(resolve)

    const firstId = ids[0]
    if (!firstId) {
      throw new Error("expected at least one brand id")
    }

    const result = await getActiveBrandIds(container, [...ids, firstId])

    expect(resolve).toHaveBeenCalledOnce()
    expect(resolve).toHaveBeenCalledWith(BRAND_MODULE)
    expect(listBrands).toHaveBeenCalledTimes(2)
    expect(listBrands).toHaveBeenNthCalledWith(
      1,
      { id: { $in: ids.slice(0, 500) } },
      { select: ["id"], withDeleted: false }
    )
    expect(listBrands).toHaveBeenNthCalledWith(
      2,
      { id: { $in: ids.slice(500) } },
      { select: ["id"], withDeleted: false }
    )
    expect(result.has("brand_250")).toBe(false)
    expect(result.size).toBe(500)
  })
})
