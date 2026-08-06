import type Medusa from "@medusajs/js-sdk"

import type {
  ProductLocationAvailabilityResponse,
  ProductLocationAvailabilityService,
} from "./types"

export interface MedusaProductLocationAvailabilityInput {
  productId?: null | string
  enabled?: boolean
}

export interface MedusaProductLocationAvailabilityServiceConfig {
  productsPath?: string
}

export const createMedusaProductLocationAvailabilityService = (
  sdk: Medusa,
  config?: MedusaProductLocationAvailabilityServiceConfig,
): ProductLocationAvailabilityService<
  ProductLocationAvailabilityResponse,
  MedusaProductLocationAvailabilityInput
> => {
  const productsPath = config?.productsPath ?? "/store/products"

  return {
    getProductLocationAvailability: async (params, signal?: AbortSignal) => {
      if (
        params.productId === undefined ||
        params.productId === null ||
        params.productId.length === 0
      ) {
        throw new Error("Product id is required for location availability.")
      }

      return await sdk.client.fetch<ProductLocationAvailabilityResponse>(
        `${productsPath}/${encodeURIComponent(params.productId)}/location-availability`,
        signal === undefined ? {} : { signal },
      )
    },
  }
}
