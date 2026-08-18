import { afterEach, describe, expect, it, vi } from "vitest"
import { parseProductLocationAvailabilityResponse } from "./product-location-availability-contract"
import { storefrontProductLocationAvailabilityService } from "./product-location-availability-service"

const RESPONSE = {
  product_id: "prod_1",
  variants: [
    {
      variant_id: "variant_1",
      location_availability: [
        {
          location_id: "sloc_1",
          location_name: "Praha",
          available_quantity: 4,
        },
      ],
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("parseProductLocationAvailabilityResponse", () => {
  it("projects only the public location availability contract", () => {
    expect(
      parseProductLocationAvailabilityResponse({
        ...RESPONSE,
        internal_secret: "must-not-cross-the-boundary",
        variants: [
          {
            ...RESPONSE.variants[0],
            internal_variant_note: "private",
            location_availability: [
              {
                ...RESPONSE.variants[0].location_availability[0],
                internal_location_note: "private",
              },
            ],
          },
        ],
      })
    ).toEqual(RESPONSE)
  })

  it("rejects malformed availability payloads", () => {
    expect(() =>
      parseProductLocationAvailabilityResponse({
        ...RESPONSE,
        variants: [
          {
            ...RESPONSE.variants[0],
            location_availability: [
              {
                ...RESPONSE.variants[0].location_availability[0],
                available_quantity: "4",
              },
            ],
          },
        ],
      })
    ).toThrow("Invalid product location availability response")
  })
})

describe("storefrontProductLocationAvailabilityService", () => {
  it("uses the same-origin gateway and sends only the product identity", async () => {
    const signal = new AbortController().signal
    const fetchMock = vi.fn().mockResolvedValue(Response.json(RESPONSE))
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      storefrontProductLocationAvailabilityService.getProductLocationAvailability(
        { productId: "prod 1" },
        signal
      )
    ).resolves.toEqual(RESPONSE)
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/storefront/product/location-availability?product_id=prod+1",
      {
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
        signal,
      }
    )
  })

  it("returns a status-bearing error without exposing the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: "sensitive upstream detail" },
            { status: 503 }
          )
        )
    )

    const error = await storefrontProductLocationAvailabilityService
      .getProductLocationAvailability({ productId: "prod_1" })
      .catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      message: "Product location availability request failed with status 503",
      status: 503,
    })
  })
})
