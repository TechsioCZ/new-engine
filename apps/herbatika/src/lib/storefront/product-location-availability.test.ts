import { describe, expect, it } from "vitest"
import {
  normalizeLocationAvailabilityQuantity,
  resolveProductLocationAvailabilityState,
  resolveSelectedVariantLocationAvailability,
} from "./product-location-availability"

const availability = {
  product_id: "prod_1",
  variants: [
    {
      variant_id: "variant_1",
      location_availability: [
        {
          location_id: "sloc_store",
          location_name: "Prodejna",
          available_quantity: 4,
        },
      ],
    },
    {
      variant_id: "variant_empty",
      location_availability: [],
    },
  ],
}

describe("normalizeLocationAvailabilityQuantity", () => {
  it.each([
    [Number.NaN, 0],
    [-2, 0],
    [0, 0],
    [1, 1],
    [10, 10],
    [10.9, 10],
    [11, 11],
  ])("normalizes %s as %s", (quantity, expected) => {
    expect(normalizeLocationAvailabilityQuantity(quantity)).toBe(expected)
  })
})

describe("resolveSelectedVariantLocationAvailability", () => {
  it("returns the selected variant locations", () => {
    expect(
      resolveSelectedVariantLocationAvailability(availability, "variant_1")
    ).toEqual(availability.variants[0].location_availability)
  })

  it("returns an empty array when the selected variant has no locations", () => {
    expect(
      resolveSelectedVariantLocationAvailability(availability, "variant_empty")
    ).toEqual([])
  })

  it("returns null without availability or selected variant", () => {
    expect(resolveSelectedVariantLocationAvailability(null, "variant_1")).toBe(
      null
    )
    expect(resolveSelectedVariantLocationAvailability(availability, null)).toBe(
      null
    )
  })

  it("returns null when the selected variant is missing", () => {
    expect(
      resolveSelectedVariantLocationAvailability(availability, "variant_2")
    ).toBe(null)
  })
})

describe("resolveProductLocationAvailabilityState", () => {
  it("projects query state into selected variant availability state", () => {
    expect(
      resolveProductLocationAvailabilityState(
        {
          productLocationAvailability: availability,
          isLoading: false,
          error: null,
        },
        "variant_1"
      )
    ).toEqual({
      items: availability.variants[0].location_availability,
      isLoading: false,
      error: null,
      isInventoryManaged: true,
    })
  })

  it("keeps selected variant inventory management state", () => {
    expect(
      resolveProductLocationAvailabilityState(
        {
          productLocationAvailability: availability,
          isLoading: false,
          error: null,
        },
        "variant_1",
        { isInventoryManaged: false }
      )
    ).toMatchObject({
      isInventoryManaged: false,
    })
  })
})
