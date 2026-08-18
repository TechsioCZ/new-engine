import type {
  ProductLocationAvailabilityLocation,
  ProductLocationAvailabilityResponse,
  ProductVariantLocationAvailability,
} from "@techsio/storefront-data/product-location-availability/types"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null

const parseLocation = (
  value: unknown
): ProductLocationAvailabilityLocation | null => {
  if (!isRecord(value)) {
    return null
  }

  const locationId = readNonEmptyString(value.location_id)
  const locationName = readNonEmptyString(value.location_name)
  const availableQuantity = value.available_quantity
  if (
    !(
      locationId &&
      locationName &&
      typeof availableQuantity === "number" &&
      Number.isFinite(availableQuantity) &&
      Number.isInteger(availableQuantity)
    )
  ) {
    return null
  }

  return {
    available_quantity: availableQuantity,
    location_id: locationId,
    location_name: locationName,
  }
}

const parseVariant = (
  value: unknown
): ProductVariantLocationAvailability | null => {
  if (!(isRecord(value) && Array.isArray(value.location_availability))) {
    return null
  }

  const variantId = readNonEmptyString(value.variant_id)
  if (!variantId) {
    return null
  }

  const locations: ProductLocationAvailabilityLocation[] = []
  for (const sourceLocation of value.location_availability) {
    const location = parseLocation(sourceLocation)
    if (!location) {
      return null
    }
    locations.push(location)
  }

  return {
    location_availability: locations,
    variant_id: variantId,
  }
}

export const parseProductLocationAvailabilityResponse = (
  value: unknown
): ProductLocationAvailabilityResponse => {
  if (!(isRecord(value) && Array.isArray(value.variants))) {
    throw new Error("Invalid product location availability response")
  }

  const productId = readNonEmptyString(value.product_id)
  if (!productId) {
    throw new Error("Invalid product location availability response")
  }

  const variants: ProductVariantLocationAvailability[] = []
  for (const sourceVariant of value.variants) {
    const variant = parseVariant(sourceVariant)
    if (!variant) {
      throw new Error("Invalid product location availability response")
    }
    variants.push(variant)
  }

  return { product_id: productId, variants }
}
