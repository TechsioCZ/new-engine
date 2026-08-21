import type {
  ProductLocationAvailabilityLocation,
  ProductLocationAvailabilityResponse,
} from "@techsio/storefront-data/product-location-availability/types"

export type ProductLocationAvailabilityState = {
  items: ProductLocationAvailabilityLocation[] | null
  isLoading: boolean
  error: string | null
  isInventoryManaged: boolean
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
  if (!(availability && variantId)) {
    return null
  }

  return (
    availability.variants.find((variant) => variant.variant_id === variantId)
      ?.location_availability ?? null
  )
}

export const resolveProductLocationAvailabilityState = (
  availabilityQuery: ProductLocationAvailabilityQueryState,
  variantId: string | null,
  options: { isInventoryManaged?: boolean | null } = {}
): ProductLocationAvailabilityState => ({
  items: resolveSelectedVariantLocationAvailability(
    availabilityQuery.productLocationAvailability,
    variantId
  ),
  isLoading: availabilityQuery.isLoading,
  error: availabilityQuery.error,
  isInventoryManaged: options.isInventoryManaged !== false,
})

export const shouldShowPhysicalStoreOnlyNotice = (
  state: ProductLocationAvailabilityState,
  isOnlineInStock: boolean
) =>
  !(isOnlineInStock || state.isLoading || state.error) &&
  Boolean(state.items?.some((location) => location.available_quantity > 0))
