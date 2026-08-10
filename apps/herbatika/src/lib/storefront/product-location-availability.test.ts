import { describe, expect, it } from "vitest"

import {
  formatLocationAvailability,
  resolveProductLocationAvailabilityState,
} from "./product-location-availability"

const variantOneLocations = [
  {
    available_quantity: 4,
    location_id: "sloc_store",
    location_name: "Prodejna",
  },
]

const availability = {
  product_id: "prod_1",
  variants: [
    {
      location_availability: variantOneLocations,
      variant_id: "variant_1",
    },
    {
      location_availability: [],
      variant_id: "variant_empty",
    },
  ],
}

const resolveItems = (
  productLocationAvailability: typeof availability | null,
  variantId: string | null,
) =>
  resolveProductLocationAvailabilityState(
    {
      error: null,
      isLoading: false,
      productLocationAvailability,
    },
    variantId,
  ).items

describe(formatLocationAvailability, () => {
  it.each([
    [Number.NaN, "0 ks"],
    [-2, "0 ks"],
    [0, "0 ks"],
    [1, "1 ks"],
    [10, "10 ks"],
    [10.9, "10 ks"],
    [11, "Skladom (>10 ks)"],
  ])("formats %s as %s", (quantity, expected) => {
    expect(formatLocationAvailability(quantity)).toBe(expected)
  })

  it("formats unmanaged inventory as generally in stock", () => {
    expect(formatLocationAvailability(0, { isInventoryManaged: false })).toBe(
      "Skladom",
    )
  })
})

describe(resolveProductLocationAvailabilityState, () => {
  it("returns the selected variant locations", () => {
    expect(resolveItems(availability, "variant_1")).toStrictEqual(
      variantOneLocations,
    )
  })

  it("returns an empty array when the selected variant has no locations", () => {
    expect(resolveItems(availability, "variant_empty")).toStrictEqual([])
  })

  it("returns null without availability or selected variant", () => {
    expect(resolveItems(null, "variant_1")).toBeNull()
    expect(resolveItems(availability, null)).toBeNull()
  })

  it("returns null when the selected variant is missing", () => {
    expect(resolveItems(availability, "variant_2")).toBeNull()
  })

  it("projects query state into selected variant availability state", () => {
    expect(
      resolveProductLocationAvailabilityState(
        {
          error: null,
          isLoading: false,
          productLocationAvailability: availability,
        },
        "variant_1",
      ),
    ).toStrictEqual({
      error: null,
      isInventoryManaged: true,
      isLoading: false,
      items: variantOneLocations,
    })
  })

  it("keeps selected variant inventory management state", () => {
    expect(
      resolveProductLocationAvailabilityState(
        {
          error: null,
          isLoading: false,
          productLocationAvailability: availability,
        },
        "variant_1",
        { isInventoryManaged: false },
      ),
    ).toMatchObject({
      isInventoryManaged: false,
    })
  })
})
