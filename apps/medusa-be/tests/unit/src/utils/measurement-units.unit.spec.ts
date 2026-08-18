import { describe, expect, it, vi } from "vitest"
import {
  decorateProductsWithMeasurements,
  getMeasurementDecorationOptions,
  listProductMeasurementsByProductIds,
} from "../../../../src/utils/measurement-units"

describe("measurement unit utilities", () => {
  it("loads product measurements in bounded ID chunks", async () => {
    const graph = vi.fn(
      async (query: { filters: { product_id: { $in: string[] } } }) => ({
        data: query.filters.product_id.$in.map((productId) => ({
          id: `pm_${productId}`,
          product_id: productId,
        })),
      })
    )
    const scope = {
      resolve: vi.fn(() => ({ graph })),
    }
    const productIds = Array.from(
      { length: 501 },
      (_, index) => `prod_${index}`
    )
    const result = await listProductMeasurementsByProductIds(
      scope as never,
      [...productIds, "", "prod_0"],
      "hu-HU"
    )

    expect(graph).toHaveBeenCalledTimes(2)
    expect(graph).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        entity: "product_measurement",
        filters: { product_id: { $in: productIds.slice(0, 500) } },
        pagination: { take: 500 },
      }),
      { locale: "hu-HU" }
    )
    expect(graph).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        entity: "product_measurement",
        filters: { product_id: { $in: ["prod_500"] } },
        pagination: { take: 1 },
      }),
      { locale: "hu-HU" }
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

  it("uses the localized unit when calculating price per unit", async () => {
    const graph = vi.fn(async () => ({
      data: [
        {
          id: "pm_1",
          measurement_unit: {
            base_quantity: 1,
            code: "pcs_1",
            id: "unit_pcs_1",
            name: "darab",
            symbol: "db",
          },
          product_id: "prod_1",
          variant_measurements: [
            {
              id: "pvm_1",
              product_unit_quantity: 100,
              product_variant_id: "variant_1",
            },
          ],
        },
      ],
    }))
    const products = [
      {
        id: "prod_1",
        variants: [
          {
            calculated_price: {
              calculated_amount: 1290,
              currency_code: "huf",
            },
            id: "variant_1",
          },
        ],
      },
    ]

    await decorateProductsWithMeasurements(
      { resolve: vi.fn(() => ({ graph })) } as never,
      products,
      {
        includePricePerUnit: true,
        includeProductMeasurement: false,
        includeVariantMeasurement: false,
      },
      "hu-HU"
    )

    expect(graph).toHaveBeenCalledWith(expect.any(Object), { locale: "hu-HU" })
    expect(products[0]?.variants[0]?.calculated_price.price_per_unit).toEqual(
      expect.objectContaining({
        calculated_amount: 12.9,
        unit_name: "darab",
        unit_symbol: "db",
      })
    )
  })

  it("recognizes both Medusa include-field prefixes", () => {
    expect(
      getMeasurementDecorationOptions([
        "*variants.calculated_price.price_per_unit",
      ])
    ).toEqual({
      includePricePerUnit: true,
      includeProductMeasurement: false,
      includeVariantMeasurement: false,
    })
  })
})
