import { describe, expect, it, vi } from "vitest"

import { createMedusaStorefrontPreset } from "../src/medusa/preset"
import { createMedusaProductLocationAvailabilityService } from "../src/product-location-availability/medusa-service"
import { createProductLocationAvailabilityQueryKeys } from "../src/product-location-availability/query-keys"
import { createTestMedusaSdk } from "./medusa-fixtures"

const createSdkMock = () => {
  const sdk = createTestMedusaSdk()
  const fetch = vi.fn<(path: string, options?: unknown) => Promise<unknown>>()
  Object.defineProperty(sdk.client, "fetch", { value: fetch })
  return { fetch, sdk }
}

const availabilityResponse = {
  product_id: "prod_1",
  variants: [],
}

describe("product location availability", () => {
  it("uses normalized product detail query keys", () => {
    const queryKeys = createProductLocationAvailabilityQueryKeys("shop")

    expect(
      queryKeys.detail({
        enabled: false,
        productId: "prod_1",
      }),
    ).toStrictEqual([
      "shop",
      "product-location-availability",
      "detail",
      { productId: "prod_1" },
    ])
  })

  it("fetches product location availability from the Store API route", async () => {
    const { fetch, sdk } = createSdkMock()
    fetch.mockResolvedValue(availabilityResponse)
    const { signal } = new AbortController()
    const service = createMedusaProductLocationAvailabilityService(sdk)

    await expect(
      service.getProductLocationAvailability({ productId: "prod 1" }, signal),
    ).resolves.toStrictEqual(availabilityResponse)
    expect(fetch).toHaveBeenCalledWith(
      "/store/products/prod%201/location-availability",
      { signal },
    )
  })

  it("exposes availability through the Medusa preset surface", () => {
    const { sdk } = createSdkMock()
    const preset = createMedusaStorefrontPreset({
      queryKeyNamespace: "shop",
      sdk,
    })

    expect(
      preset.queryKeys.productLocationAvailability.detail({
        productId: "prod_1",
      }),
    ).toStrictEqual([
      "shop",
      "product-location-availability",
      "detail",
      { productId: "prod_1" },
    ])
    expect(
      preset.hooks.productLocationAvailability.useProductLocationAvailability,
    ).toBeDefined()
  })
})
