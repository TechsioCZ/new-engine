import { describe, expect, it } from "vitest"
import { buildInventoryItemsInput } from "../../../../../src/workflows/seed/helpers/build-inventory-items-input"
import type { CreateProductsStepInput } from "../../../../../src/workflows/seed/steps"

function buildProduct(
  variants: NonNullable<CreateProductsStepInput[number]["variants"]>
): CreateProductsStepInput[number] {
  return {
    title: "Seed product",
    categories: [],
    description: "",
    handle: "seed-product",
    shippingProfileName: "Default Shipping Profile",
    images: [],
    variants,
    salesChannelNames: [],
  }
}

describe("buildInventoryItemsInput", () => {
  it("skips variants without a SKU", () => {
    expect(
      buildInventoryItemsInput([
        buildProduct([
          {
            title: "Missing SKU",
            sku: "",
            quantities: {
              quantity: 10,
            },
          },
        ]),
      ])
    ).toEqual([])
  })

  it("uses per-location quantities when present", () => {
    expect(
      buildInventoryItemsInput([
        buildProduct([
          {
            title: "Located",
            sku: "located-sku",
            quantities: {
              quantity: 10,
              locations: [
                {
                  stockLocationName: "Main",
                  quantity: 3,
                },
              ],
            },
          },
        ]),
      ])
    ).toEqual([
      {
        sku: "located-sku",
        locations: [
          {
            stockLocationName: "Main",
            quantity: 3,
          },
        ],
      },
    ])
  })

  it("uses product-level variant quantity when no locations are present", () => {
    expect(
      buildInventoryItemsInput([
        buildProduct([
          {
            title: "Quantity",
            sku: "quantity-sku",
            quantities: {
              quantity: 7,
            },
          },
        ]),
      ])
    ).toEqual([
      {
        sku: "quantity-sku",
        quantity: 7,
      },
    ])
  })
})
