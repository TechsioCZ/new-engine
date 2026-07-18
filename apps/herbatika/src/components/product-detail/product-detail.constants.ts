import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"

export const PRODUCT_FALLBACK_IMAGE = FALLBACK_IMAGE_SRC

export const RELATED_PRODUCTS_PER_SECTION = 4

export const RELATED_PRODUCTS_LIMIT =
  RELATED_PRODUCTS_PER_SECTION * 2 + 1

export const PRODUCT_DETAIL_SECTION_ORDER = [
  "description",
  "usage",
  "composition",
  "warning",
  "other",
] as const
