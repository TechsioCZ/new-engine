"use client"

import { useQuery } from "@tanstack/react-query"
import { toErrorMessage } from "@techsio/storefront-data/shared/error-utils"
import { storefrontSdk } from "@/lib/storefront/sdk"

export type ProductBusinessLocationCode = "store" | "makov_main_warehouse"

export type ProductLocationAvailability = {
  location_code: ProductBusinessLocationCode
  location_name: string
  available_quantity: number
}

export type ProductVariantLocationAvailability = {
  variant_id: string
  location_availability: ProductLocationAvailability[]
}

export type ProductLocationAvailabilityState = {
  items: ProductLocationAvailability[] | null
  isLoading: boolean
  error: string | null
}

export type ProductLocationAvailabilityResponse = {
  product_id: string
  variants: ProductVariantLocationAvailability[]
}

const productLocationAvailabilityQueryKey = (productId: string | null) =>
  ["herbatika", "product-location-availability", productId] as const

const fetchProductLocationAvailability = (
  productId: string,
  signal?: AbortSignal
) =>
  storefrontSdk.client.fetch<ProductLocationAvailabilityResponse>(
    `/store/products/${encodeURIComponent(productId)}/location-availability`,
    { signal }
  )

export function useProductLocationAvailability(productId: string | null) {
  const query = useQuery({
    queryKey: productLocationAvailabilityQueryKey(productId),
    queryFn: ({ signal }) => {
      if (!productId) {
        throw new Error("Product id is required for location availability.")
      }

      return fetchProductLocationAvailability(productId, signal)
    },
    enabled: Boolean(productId),
  })

  return {
    productLocationAvailability: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    error: toErrorMessage(query.error),
    query,
  }
}

export const resolveSelectedVariantLocationAvailability = (
  availability: ProductLocationAvailabilityResponse | null,
  variantId: string | null
) => {
  if (!availability || !variantId) {
    return null
  }

  return (
    availability.variants.find((variant) => variant.variant_id === variantId)
      ?.location_availability ?? null
  )
}

export const resolveProductLocationAvailabilityState = (
  availabilityQuery: Pick<
    ReturnType<typeof useProductLocationAvailability>,
    "error" | "isLoading" | "productLocationAvailability"
  >,
  variantId: string | null
): ProductLocationAvailabilityState => ({
  items: resolveSelectedVariantLocationAvailability(
    availabilityQuery.productLocationAvailability,
    variantId
  ),
  isLoading: availabilityQuery.isLoading,
  error: availabilityQuery.error,
})

export const formatLocationAvailability = (availableQuantity: number) => {
  const finiteQuantity = Number.isFinite(availableQuantity)
    ? availableQuantity
    : 0
  const normalizedQuantity = Math.max(0, Math.floor(finiteQuantity))

  if (normalizedQuantity > 10) {
    return "Skladem (>10 ks)"
  }

  return `${normalizedQuantity} ks`
}
