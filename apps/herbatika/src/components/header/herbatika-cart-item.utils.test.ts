import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import { resolveLineItemHref } from "./herbatika-cart-item.utils"

const lineItem = (value: Record<string, unknown>) =>
  value as unknown as HttpTypes.StoreCartLineItem

describe("resolveLineItemHref", () => {
  it("builds a product URL only from an explicit public slug projection", () => {
    expect(
      resolveLineItemHref(lineItem({ publicSlug: "medvedi-cesnek" }), "cz")
    ).toBe("/produkty/medvedi-cesnek")
  })

  it("accepts an explicit projection carried in line-item metadata", () => {
    expect(
      resolveLineItemHref(
        lineItem({ metadata: { publicSlug: "maci-koren" } }),
        "sk"
      )
    ).toBe("/produkty/maci-koren")
  })

  it("fails closed instead of treating a Medusa handle as a public slug", () => {
    expect(
      resolveLineItemHref(
        lineItem({ product_handle: "internal-medusa-handle" }),
        "sk"
      )
    ).toBeNull()
  })
})
