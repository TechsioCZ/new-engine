import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import { prioritizeDiscountedVariant } from "./sale-product-variant"

const createProduct = (
  variants: Array<{
    id: string
    calculatedAmount: number
    originalAmount: number
  }>
) =>
  ({
    id: "prod_sale",
    variants: variants.map((variant) => ({
      id: variant.id,
      calculated_price: {
        calculated_amount: variant.calculatedAmount,
        original_amount: variant.originalAmount,
        currency_code: "eur",
      },
    })),
  }) as HttpTypes.StoreProduct

describe("prioritizeDiscountedVariant", () => {
  it("moves the first discounted variant to the product-card position", () => {
    const result = prioritizeDiscountedVariant(
      createProduct([
        { id: "variant_regular", calculatedAmount: 100, originalAmount: 100 },
        { id: "variant_sale", calculatedAmount: 80, originalAmount: 100 },
      ])
    ) as HttpTypes.StoreProduct & {
      search_result?: { variant_id?: string }
    }

    expect(result.variants?.map((variant) => variant.id)).toEqual([
      "variant_sale",
      "variant_regular",
    ])
    expect(result.search_result?.variant_id).toBe("variant_sale")
  })

  it("leaves a product without a discounted variant unchanged", () => {
    const product = createProduct([
      { id: "variant_regular", calculatedAmount: 100, originalAmount: 100 },
    ])

    expect(prioritizeDiscountedVariant(product)).toBe(product)
  })
})
