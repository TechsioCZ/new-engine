import { describe, expect, it, vi } from "vitest"
import { listProductMeasurementsByProductIds } from "../../../../src/utils/measurement-units"

describe("measurement unit utilities", () => {
  it("loads product measurements in bounded ID chunks", async () => {
    const listProductMeasurements = vi.fn(
      async (filters: { product_id: { $in: string[] } }) =>
        filters.product_id.$in.map((productId) => ({
          id: `pm_${productId}`,
          product_id: productId,
        }))
    )
    const scope = {
      resolve: vi.fn(() => ({ listProductMeasurements })),
    }
    const productIds = Array.from(
      { length: 501 },
      (_, index) => `prod_${index}`
    )
    const result = await listProductMeasurementsByProductIds(scope as never, [
      ...productIds,
      "",
      "prod_0",
    ])

    expect(listProductMeasurements).toHaveBeenCalledTimes(2)
    expect(listProductMeasurements).toHaveBeenNthCalledWith(
      1,
      {
        product_id: { $in: productIds.slice(0, 500) },
      },
      {
        relations: ["measurement_unit", "variant_measurements"],
        take: 500,
      }
    )
    expect(listProductMeasurements).toHaveBeenNthCalledWith(
      2,
      {
        product_id: { $in: ["prod_500"] },
      },
      {
        relations: ["measurement_unit", "variant_measurements"],
        take: 1,
      }
    )
    expect(result).toHaveLength(501)
  })

  it("does not query for an empty product ID set", async () => {
    const resolve = vi.fn()

    await expect(
      listProductMeasurementsByProductIds({ resolve } as never, ["", ""])
    ).resolves.toEqual([])
    expect(resolve).not.toHaveBeenCalled()
  })
})
