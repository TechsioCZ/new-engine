import { describe, expect, it } from "vitest"

import { buildInventoryItemsInput } from "../../../../../src/workflows/seed/helpers/build-inventory-items-input"
import type { CreateProductsStepInput } from "../../../../../src/workflows/seed/steps"

function buildProduct(
  variants: NonNullable<CreateProductsStepInput[number]["variants"]>
): CreateProductsStepInput[number] {
  return {
    categories: [],
    description: "",
    handle: "seed-product",
    images: [],
    salesChannelNames: [],
    shippingProfileName: "Default Shipping Profile",
    title: "Seed product",
    variants,
  }
}

describe(buildInventoryItemsInput, () => {
  it("skips variants without a SKU", () => {
    expect(
      buildInventoryItemsInput([
        buildProduct([
          {
            quantities: {
              quantity: 10,
            },
            sku: "",
            title: "Missing SKU",
          },
        ]),
      ])
    ).toStrictEqual([])
  })

  it("uses per-location quantities when present", () => {
    expect(
      buildInventoryItemsInput([
        buildProduct([
          {
            quantities: {
              locations: [
                {
                  stockLocationName: "Main",
                  quantity: 3,
                },
              ],
              quantity: 10,
            },
            sku: "located-sku",
            title: "Located",
          },
        ]),
      ])
    ).toStrictEqual([
      {
        locations: [
          {
            stockLocationName: "Main",
            quantity: 3,
          },
        ],
        sku: "located-sku",
      },
    ])
  })

  it("uses product-level variant quantity when no locations are present", () => {
    expect(
      buildInventoryItemsInput([
        buildProduct([
          {
            quantities: {
              quantity: 7,
            },
            sku: "quantity-sku",
            title: "Quantity",
          },
        ]),
      ])
    ).toStrictEqual([
      {
        quantity: 7,
        sku: "quantity-sku",
      },
    ])
  })
})
