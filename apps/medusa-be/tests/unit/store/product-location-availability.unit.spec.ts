import { describe, expect, it } from "vitest"
import {
  buildProductLocationAvailability,
  type InventoryLevel,
  type VariantInventoryItemLink,
} from "../../../src/api/store/products/[id]/location-availability/availability"

const link = (
  variantId: string,
  inventoryItemId: string,
  requiredQuantity: number | null = null
): VariantInventoryItemLink => ({
  inventory_item_id: inventoryItemId,
  required_quantity: requiredQuantity,
  variant_id: variantId,
})

const level = (
  inventoryItemId: string,
  stockLocationName: string,
  availableQuantity: number
): InventoryLevel => ({
  available_quantity: availableQuantity,
  inventory_item_id: inventoryItemId,
  stock_locations: { name: stockLocationName },
})

describe("buildProductLocationAvailability", () => {
  it("returns both business locations for every variant and defaults missing levels to zero", () => {
    expect(
      buildProductLocationAvailability({
        inventoryItemLinks: [link("variant_1", "item_1")],
        inventoryLevels: [],
        productId: "prod_1",
        variantIds: ["variant_1", "variant_2"],
      })
    ).toEqual({
      product_id: "prod_1",
      variants: [
        {
          location_availability: [
            {
              available_quantity: 0,
              location_code: "store",
              location_name: "Prodejna",
            },
            {
              available_quantity: 0,
              location_code: "makov_main_warehouse",
              location_name: "Hlavní sklad Makov",
            },
          ],
          variant_id: "variant_1",
        },
        {
          location_availability: [
            {
              available_quantity: 0,
              location_code: "store",
              location_name: "Prodejna",
            },
            {
              available_quantity: 0,
              location_code: "makov_main_warehouse",
              location_name: "Hlavní sklad Makov",
            },
          ],
          variant_id: "variant_2",
        },
      ],
    })
  })

  it("maps Čadca to Prodejna and Default stock to Hlavní sklad Makov", () => {
    const response = buildProductLocationAvailability({
      inventoryItemLinks: [link("variant_1", "item_1")],
      inventoryLevels: [
        level("item_1", "Pobočka Čadca", 4),
        level("item_1", "Default stock", 25),
      ],
      productId: "prod_1",
      variantIds: ["variant_1"],
    })

    expect(response.variants[0].location_availability).toEqual([
      {
        available_quantity: 4,
        location_code: "store",
        location_name: "Prodejna",
      },
      {
        available_quantity: 25,
        location_code: "makov_main_warehouse",
        location_name: "Hlavní sklad Makov",
      },
    ])
  })

  it("falls back to stocked minus reserved quantity when available_quantity is not returned", () => {
    const response = buildProductLocationAvailability({
      inventoryItemLinks: [link("variant_1", "item_1")],
      inventoryLevels: [
        {
          inventory_item_id: "item_1",
          reserved_quantity: 5,
          stock_locations: { name: "Default stock" },
          stocked_quantity: 12,
        },
      ],
      productId: "prod_1",
      variantIds: ["variant_1"],
    })

    expect(
      response.variants[0].location_availability[1].available_quantity
    ).toBe(7)
  })

  it("aggregates multiple internal stock locations mapped to the same business location", () => {
    const response = buildProductLocationAvailability({
      inventoryItemLinks: [link("variant_1", "item_1")],
      inventoryLevels: [
        level("item_1", "Default stock", 8),
        level("item_1", " default stock ", 5),
        level("item_1", "European Warehouse", 2),
      ],
      productId: "prod_1",
      variantIds: ["variant_1"],
    })

    expect(
      response.variants[0].location_availability[1].available_quantity
    ).toBe(15)
  })

  it("divides by required_quantity and limits bundled variants by the scarcest inventory item", () => {
    const response = buildProductLocationAvailability({
      inventoryItemLinks: [
        link("variant_1", "item_1", 2),
        link("variant_1", "item_2"),
      ],
      inventoryLevels: [
        level("item_1", "Default stock", 9),
        level("item_2", "Default stock", 3),
      ],
      productId: "prod_1",
      variantIds: ["variant_1"],
    })

    expect(
      response.variants[0].location_availability[1].available_quantity
    ).toBe(3)
  })
})
