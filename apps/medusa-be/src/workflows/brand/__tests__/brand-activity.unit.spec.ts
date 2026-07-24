import type { MedusaContainer } from "@medusajs/framework/types"
import { describe, expect, it, vi } from "vitest"
import { BRAND_MODULE } from "../../../modules/brand"
import { getActiveBrandIds } from "../brand-activity"

describe("getActiveBrandIds", () => {
  it("does not resolve the Brand module for an empty input", async () => {
    const resolve = vi.fn()
    const container = { resolve } as unknown as MedusaContainer

    await expect(getActiveBrandIds(container, [])).resolves.toEqual(new Set())
    expect(resolve).not.toHaveBeenCalled()
  })

  it("deduplicates, chunks, and returns only active IDs", async () => {
    const ids = Array.from({ length: 501 }, (_, index) => `brand_${index}`)
    const listBrands = vi.fn(async (filters: { id: { $in: string[] } }) =>
      filters.id.$in.filter((id) => id !== "brand_250").map((id) => ({ id }))
    )
    const resolve = vi.fn(() => ({ listBrands }))
    const container = { resolve } as unknown as MedusaContainer

    const result = await getActiveBrandIds(container, [...ids, ids[0]])

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
