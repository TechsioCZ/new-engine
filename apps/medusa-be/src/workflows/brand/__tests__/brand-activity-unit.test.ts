import { asValue } from "@medusajs/framework/awilix"
import { createMedusaContainer } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import { BRAND_MODULE } from "../../../modules/brand"
import { getActiveBrandIds } from "../brand-activity"

describe(getActiveBrandIds, () => {
  it("does not resolve the Brand module for an empty input", async () => {
    const container = createMedusaContainer()
    const resolve = vi.spyOn(container, "resolve")

    await expect(getActiveBrandIds(container, [])).resolves.toStrictEqual(
      new Set(),
    )
    expect(resolve).not.toHaveBeenCalled()
  })

  it("deduplicates, chunks, and returns only active IDs", async () => {
    const ids = Array.from({ length: 501 }, (_, index) => `brand_${index}`)
    const listBrands = vi.fn<
      (filters: { id: { $in: string[] } }) => Promise<{ id: string }[]>
    >(
      async (filters) =>
        await Promise.resolve(
          filters.id.$in
            .filter((id) => id !== "brand_250")
            .map((id) => ({ id })),
        ),
    )
    const container = createMedusaContainer()
    container.register({ [BRAND_MODULE]: asValue({ listBrands }) })
    const resolve = vi.spyOn(container, "resolve")

    const [firstId] = ids
    if (firstId === undefined || firstId.length === 0) {
      throw new Error("expected at least one brand id")
    }

    const result = await getActiveBrandIds(container, [...ids, firstId])

    expect(resolve).toHaveBeenCalledExactlyOnceWith(BRAND_MODULE)
    expect(listBrands).toHaveBeenCalledTimes(2)
    expect(listBrands).toHaveBeenNthCalledWith(
      1,
      { id: { $in: ids.slice(0, 500) } },
      { select: ["id"], withDeleted: false },
    )
    expect(listBrands).toHaveBeenNthCalledWith(
      2,
      { id: { $in: ids.slice(500) } },
      { select: ["id"], withDeleted: false },
    )
    expect({
      hasDeletedBrand: result.has("brand_250"),
      size: result.size,
    }).toStrictEqual({
      hasDeletedBrand: false,
      size: 500,
    })
  })
})
