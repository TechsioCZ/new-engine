import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"

export const PRODUCT_FALLBACK_IMAGE = FALLBACK_IMAGE_SRC

export const PRODUCT_DETAIL_SECTION_ORDER = [
  "description",
  "usage",
  "composition",
  "warning",
  "other",
] as const

// Display order of the product information sections. It is derived from
// product-level data only, so every market renders the same section set.
export const PRODUCT_DETAIL_INFORMATION_ORDER = [
  "description",
  "usage",
  "composition",
  "parameters",
  "warning",
  "brand",
  "other",
] as const
