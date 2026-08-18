"use client"

import type { MedusaProductLocationAvailabilityInput } from "@techsio/storefront-data/product-location-availability/medusa-service"
import type {
  ProductLocationAvailabilityResponse,
  ProductLocationAvailabilityService,
} from "@techsio/storefront-data/product-location-availability/types"
import { parseProductLocationAvailabilityResponse } from "./product-location-availability-contract"

const GATEWAY_PATH = "/api/storefront/product/location-availability"

class ProductLocationAvailabilityRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Product location availability request failed with status ${status}`)
    this.name = "ProductLocationAvailabilityRequestError"
    this.status = status
  }
}

export const storefrontProductLocationAvailabilityService = {
  async getProductLocationAvailability(params, signal?: AbortSignal) {
    if (!params.productId) {
      throw new Error("Product id is required for location availability.")
    }

    const query = new URLSearchParams({ product_id: params.productId })
    const response = await fetch(GATEWAY_PATH.concat("?", query.toString()), {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal,
    })

    if (!response.ok) {
      throw new ProductLocationAvailabilityRequestError(response.status)
    }

    const payload: unknown = await response.json()
    return parseProductLocationAvailabilityResponse(payload)
  },
} satisfies ProductLocationAvailabilityService<
  ProductLocationAvailabilityResponse,
  MedusaProductLocationAvailabilityInput
>
