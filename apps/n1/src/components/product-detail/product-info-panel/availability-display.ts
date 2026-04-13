import type {
  ProductAvailabilityStatus,
  VariantAvailability,
} from "@/utils/product-availability"

export const availabilityStatusClass: Record<
  ProductAvailabilityStatus,
  string
> = {
  "in-stock": "text-success",
  "limited-stock": "text-warning",
  "out-of-stock": "text-danger",
}

export const formatAvailabilityLabel = (
  availability: VariantAvailability
): string => {
  if (
    availability.status === "in-stock" &&
    availability.availableQuantity != null
  ) {
    return `${availability.label} ${availability.availableQuantity} ks`
  }

  return availability.label
}
