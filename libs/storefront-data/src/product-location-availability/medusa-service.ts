import type Medusa from "@medusajs/js-sdk"
import type {
  ProductLocationAvailabilityResponse,
  ProductLocationAvailabilityService,
} from "./types"

export type MedusaProductLocationAvailabilityInput = {
  productId?: null | string
  enabled?: boolean
}

export type MedusaProductLocationAvailabilityServiceConfig = {
  productsPath?: string
}

export function createMedusaProductLocationAvailabilityService(
  sdk: Medusa,
  config?: MedusaProductLocationAvailabilityServiceConfig
): ProductLocationAvailabilityService<
  ProductLocationAvailabilityResponse,
  MedusaProductLocationAvailabilityInput
> {
  const productsPath = config?.productsPath ?? "/store/products"

  return {
    getProductLocationAvailability: (
      params,
      signal?: AbortSignal
    ) => {
      if (!params.productId) {
        throw new Error("Product id is required for location availability.")
      }

      return sdk.client.fetch<ProductLocationAvailabilityResponse>(
        `${productsPath}/${encodeURIComponent(params.productId)}/location-availability`,
        { signal }
      )
    },
  }
}
