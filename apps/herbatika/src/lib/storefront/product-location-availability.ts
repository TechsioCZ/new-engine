import type {
  ProductLocationAvailabilityLocation,
  ProductLocationAvailabilityResponse,
} from "@techsio/storefront-data/product-location-availability/types"

export type ProductLocationAvailabilityState = {
  items: ProductLocationAvailabilityLocation[] | null
  isLoading: boolean
  error: string | null
}

export type ProductLocationAvailabilityQueryState = {
  productLocationAvailability: ProductLocationAvailabilityResponse | null
  isLoading: boolean
  error: string | null
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
  availabilityQuery: ProductLocationAvailabilityQueryState,
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
