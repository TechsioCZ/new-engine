import { describe, expect, it } from "vitest"
import {
  formatLocationAvailability,
  resolveProductLocationAvailabilityState,
  resolveSelectedVariantLocationAvailability,
  shouldShowPhysicalStoreOnlyNotice,
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

describe("formatLocationAvailability", () => {
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
      "Skladom"
    )
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

describe("shouldShowPhysicalStoreOnlyNotice", () => {
  it("shows the notice when online stock is unavailable but a location has stock", () => {
    expect(
      shouldShowPhysicalStoreOnlyNotice(
        {
          items: availability.variants[0].location_availability,
          isLoading: false,
          error: null,
          isInventoryManaged: true,
        },
        false
      )
    ).toBe(true)
  })

  it("hides the notice when the product is available online", () => {
    expect(
      shouldShowPhysicalStoreOnlyNotice(
        {
          items: availability.variants[0].location_availability,
          isLoading: false,
          error: null,
          isInventoryManaged: true,
        },
        true
      )
    ).toBe(false)
  })

  it("hides the notice when every location is out of stock", () => {
    expect(
      shouldShowPhysicalStoreOnlyNotice(
        {
          items: [
            {
              location_id: "sloc_store",
              location_name: "Prodejna",
              available_quantity: 0,
            },
          ],
          isLoading: false,
          error: null,
          isInventoryManaged: true,
        },
        false
      )
    ).toBe(false)
  })

  it("hides the notice until location availability loads successfully", () => {
    expect(
      shouldShowPhysicalStoreOnlyNotice(
        {
          items: availability.variants[0].location_availability,
          isLoading: true,
          error: null,
          isInventoryManaged: true,
        },
        false
      )
    ).toBe(false)

    expect(
      shouldShowPhysicalStoreOnlyNotice(
        {
          items: availability.variants[0].location_availability,
          isLoading: false,
          error: "Request failed",
          isInventoryManaged: true,
        },
        false
      )
    ).toBe(false)
  })
})
