import { describe, expect, it } from "vitest"

import { resolveDefaultStockInventoryQuantity } from "./default-stock-availability"

const inventoryItem = (level: object) => ({
  inventory: {
    location_levels: [level],
  },
})

const defaultStockLevel = (quantities: object) => ({
  ...quantities,
  stock_locations: [{ name: "Default stock" }],
})

describe(resolveDefaultStockInventoryQuantity, () => {
  it("defaults absent reserved quantity to zero", () => {
    expect(
      resolveDefaultStockInventoryQuantity({
        inventory_items: [
          inventoryItem(defaultStockLevel({ stocked_quantity: 5 })),
        ],
      }),
    ).toBe(5)
  })

  it("treats an unparseable default-stock level contribution as zero", () => {
    expect(
      resolveDefaultStockInventoryQuantity({
        inventory_items: [
          inventoryItem(
            defaultStockLevel({ stocked_quantity: "not-a-number" }),
          ),
        ],
      }),
    ).toBe(0)
  })
})
