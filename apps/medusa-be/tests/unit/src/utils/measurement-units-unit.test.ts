import { asValue } from "@medusajs/framework/awilix"
import { createMedusaContainer } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import { MEASUREMENT_UNIT_MODULE } from "../../../../src/modules/measurement-unit"
import { listProductMeasurementsByProductIds } from "../../../../src/utils/measurement-units"

describe("measurement unit utilities", () => {
  it("loads product measurements in bounded ID chunks", async () => {
    const listProductMeasurements = vi.fn<
      (filters: {
        product_id: { $in: string[] }
      }) => Promise<{ id: string; product_id: string }[]>
    >(
      async (filters) =>
        await Promise.resolve(
          filters.product_id.$in.map((productId) => ({
            id: `pm_${productId}`,
            product_id: productId,
          })),
        ),
    )
    const scope = createMedusaContainer()
    scope.register({
      [MEASUREMENT_UNIT_MODULE]: asValue({ listProductMeasurements }),
    })
    const productIds = Array.from(
      { length: 501 },
      (_, index) => `prod_${index}`,
    )
    const result = await listProductMeasurementsByProductIds(scope, [
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
      },
    )
    expect(listProductMeasurements).toHaveBeenNthCalledWith(
      2,
      {
        product_id: { $in: ["prod_500"] },
      },
      {
        relations: ["measurement_unit", "variant_measurements"],
        take: 1,
      },
    )
    expect(result).toHaveLength(501)
  })

  it("does not query for an empty product ID set", async () => {
    const scope = createMedusaContainer()
    const resolve = vi.spyOn(scope, "resolve")

    await expect(
      listProductMeasurementsByProductIds(scope, ["", ""]),
    ).resolves.toStrictEqual([])
    expect(resolve).not.toHaveBeenCalled()
  })
})
