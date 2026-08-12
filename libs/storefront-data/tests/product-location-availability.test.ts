import type Medusa from "@medusajs/js-sdk"
import { describe, expect, it, vi } from "vitest"
import { createMedusaStorefrontPreset } from "../src/medusa/preset"
import { createMedusaProductLocationAvailabilityService } from "../src/product-location-availability/medusa-service"
import { createProductLocationAvailabilityQueryKeys } from "../src/product-location-availability/query-keys"

const availabilityResponse = {
  product_id: "prod_1",
  variants: [],
}

describe("product location availability", () => {
  it("uses normalized product detail query keys", () => {
    const queryKeys = createProductLocationAvailabilityQueryKeys("shop")

    expect(
      queryKeys.detail({
        productId: "prod_1",
        enabled: false,
      })
    ).toEqual([
      "shop",
      "product-location-availability",
      "detail",
      { productId: "prod_1" },
    ])
  })

  it("fetches product location availability from the Store API route", async () => {
    const fetch = vi.fn().mockResolvedValue(availabilityResponse)
    const sdk = {
      client: {
        fetch,
      },
    } as unknown as Medusa
    const signal = new AbortController().signal
    const service = createMedusaProductLocationAvailabilityService(sdk)

    await expect(
      service.getProductLocationAvailability({ productId: "prod 1" }, signal)
    ).resolves.toEqual(availabilityResponse)
    expect(fetch).toHaveBeenCalledWith(
      "/store/products/prod%201/location-availability",
      { signal }
    )
  })

  it("exposes availability through the Medusa preset surface", () => {
    const fetch = vi.fn()
    const sdk = {
      client: {
        fetch,
      },
    } as unknown as Medusa
    const preset = createMedusaStorefrontPreset({
      sdk,
      queryKeyNamespace: "shop",
    })

    expect(
      preset.queryKeys.productLocationAvailability.detail({
        productId: "prod_1",
      })
    ).toEqual([
      "shop",
      "product-location-availability",
      "detail",
      { productId: "prod_1" },
    ])
    expect(
      preset.hooks.productLocationAvailability.useProductLocationAvailability
    ).toBeDefined()
  })
})
