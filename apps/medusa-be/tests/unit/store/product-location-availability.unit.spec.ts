import { describe, expect, it } from "vitest"
import {
  buildProductLocationAvailability,
  type InventoryLevel,
  type StockLocationRecord,
  type VariantInventoryItemLink,
} from "../../../src/api/store/products/[id]/location-availability/availability"

const STORE_LOCATION = {
  id: "sloc_store",
  name: "Prodejna",
} satisfies StockLocationRecord

const WAREHOUSE_LOCATION = {
  id: "sloc_warehouse",
  name: "Hlavní sklad Makov",
} satisfies StockLocationRecord

const STOCK_LOCATIONS = [
  STORE_LOCATION,
  WAREHOUSE_LOCATION,
] satisfies StockLocationRecord[]

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
  stockLocationId: string,
  availableQuantity: number
): InventoryLevel => ({
  available_quantity: availableQuantity,
  inventory_item_id: inventoryItemId,
  location_id: stockLocationId,
  stock_locations: { id: stockLocationId },
})

describe("buildProductLocationAvailability", () => {
  it("returns configured stock locations for every variant and defaults missing levels to zero", () => {
    expect(
      buildProductLocationAvailability({
        inventoryItemLinks: [link("variant_1", "item_1")],
        inventoryLevels: [],
        productId: "prod_1",
        stockLocations: STOCK_LOCATIONS,
        variantIds: ["variant_1", "variant_2"],
      })
    ).toEqual({
      product_id: "prod_1",
      variants: [
        {
          location_availability: [
            {
              available_quantity: 0,
              location_id: STORE_LOCATION.id,
              location_name: "Prodejna",
            },
            {
              available_quantity: 0,
              location_id: WAREHOUSE_LOCATION.id,
              location_name: "Hlavní sklad Makov",
            },
          ],
          variant_id: "variant_1",
        },
        {
          location_availability: [
            {
              available_quantity: 0,
              location_id: STORE_LOCATION.id,
              location_name: "Prodejna",
            },
            {
              available_quantity: 0,
              location_id: WAREHOUSE_LOCATION.id,
              location_name: "Hlavní sklad Makov",
            },
          ],
          variant_id: "variant_2",
        },
      ],
    })
  })

  it("uses Medusa stock location names without storefront remapping", () => {
    const stockLocations = [
      { id: "sloc_default", name: "Default stock" },
      { id: "sloc_european", name: "European Warehouse" },
    ] satisfies StockLocationRecord[]
    const response = buildProductLocationAvailability({
      inventoryItemLinks: [link("variant_1", "item_1")],
      inventoryLevels: [
        level("item_1", "sloc_default", 4),
        level("item_1", "sloc_european", 25),
      ],
      productId: "prod_1",
      stockLocations,
      variantIds: ["variant_1"],
    })

    expect(response.variants[0].location_availability).toEqual([
      {
        available_quantity: 4,
        location_id: "sloc_default",
        location_name: "Default stock",
      },
      {
        available_quantity: 25,
        location_id: "sloc_european",
        location_name: "European Warehouse",
      },
    ])
  })

  it("falls back to stocked minus reserved quantity when available_quantity is not returned", () => {
    const response = buildProductLocationAvailability({
      inventoryItemLinks: [link("variant_1", "item_1")],
      inventoryLevels: [
        {
          inventory_item_id: "item_1",
          location_id: WAREHOUSE_LOCATION.id,
          reserved_quantity: 5,
          stocked_quantity: 12,
        },
      ],
      productId: "prod_1",
      stockLocations: STOCK_LOCATIONS,
      variantIds: ["variant_1"],
    })

    expect(
      response.variants[0].location_availability[1].available_quantity
    ).toBe(7)
  })

  it("aggregates multiple inventory levels for the same stock location", () => {
    const response = buildProductLocationAvailability({
      inventoryItemLinks: [link("variant_1", "item_1")],
      inventoryLevels: [
        level("item_1", WAREHOUSE_LOCATION.id, 8),
        level("item_1", WAREHOUSE_LOCATION.id, 5),
      ],
      productId: "prod_1",
      stockLocations: STOCK_LOCATIONS,
      variantIds: ["variant_1"],
    })

    expect(
      response.variants[0].location_availability[1].available_quantity
    ).toBe(13)
  })

  it("divides by required_quantity and limits bundled variants by the scarcest inventory item", () => {
    const response = buildProductLocationAvailability({
      inventoryItemLinks: [
        link("variant_1", "item_1", 2),
        link("variant_1", "item_2"),
      ],
      inventoryLevels: [
        level("item_1", WAREHOUSE_LOCATION.id, 9),
        level("item_2", WAREHOUSE_LOCATION.id, 3),
      ],
      productId: "prod_1",
      stockLocations: STOCK_LOCATIONS,
      variantIds: ["variant_1"],
    })

    expect(
      response.variants[0].location_availability[1].available_quantity
    ).toBe(3)
  })

  it("ignores inventory levels outside the configured stock locations", () => {
    const response = buildProductLocationAvailability({
      inventoryItemLinks: [link("variant_1", "item_1")],
      inventoryLevels: [
        level("item_1", STORE_LOCATION.id, 3),
        level("item_1", "sloc_other", 99),
      ],
      productId: "prod_1",
      stockLocations: STOCK_LOCATIONS,
      variantIds: ["variant_1"],
    })

    expect(response.variants[0].location_availability).toEqual([
      {
        available_quantity: 3,
        location_id: STORE_LOCATION.id,
        location_name: STORE_LOCATION.name,
      },
      {
        available_quantity: 0,
        location_id: WAREHOUSE_LOCATION.id,
        location_name: WAREHOUSE_LOCATION.name,
      },
    ])
  })
})
