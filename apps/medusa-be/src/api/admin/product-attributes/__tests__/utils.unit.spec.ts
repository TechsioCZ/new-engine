import { describe, expect, it, vi } from "vitest"
import { listAllProductAttributeRecords } from "../utils"

describe("Product Attribute Admin detail pagination", () => {
  it("loads every page without imposing a fixed record cap", async () => {
    const records = Array.from({ length: 101 }, (_, index) => index)
    const listPage = vi.fn(
      async (skip: number, take: number) =>
        [records.slice(skip, skip + take), records.length] as [number[], number]
    )

    await expect(listAllProductAttributeRecords(listPage)).resolves.toEqual(
      records
    )
    expect(listPage).toHaveBeenNthCalledWith(1, 0, 100)
    expect(listPage).toHaveBeenNthCalledWith(2, 100, 100)
  })
})
