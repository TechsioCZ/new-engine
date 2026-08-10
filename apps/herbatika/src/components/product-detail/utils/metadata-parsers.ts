import { PRODUCT_FALLBACK_IMAGE } from "@/components/product-detail/product-detail.constants"
import type { Product } from "@/components/product-detail/product-detail.types"
import {
  asRecord,
  asString,
  readRecordProperty,
} from "@/components/product-detail/utils/value-utils"

export { resolveProductContentSections } from "@/components/product-detail/utils/metadata-content-parser"
export { resolveOfferState } from "@/components/product-detail/utils/metadata-offer-parser"

const CATEGORY_NAME_PREFIX_PATTERN = /^>\s*/u

export const normalizeCategoryName = (
  value?: string | null,
  fallbackLabel = "Kategória",
) => {
  if (value === undefined || value === null || value === "") {
    return fallbackLabel
  }

  return value.replace(CATEGORY_NAME_PREFIX_PATTERN, "").trim()
}

export const resolveProductImages = (product: Product | null): string[] => {
  if (product === null) {
    return []
  }

  const imageUrls = new Set<string>()
  if (
    product.thumbnail !== null &&
    product.thumbnail !== undefined &&
    product.thumbnail !== ""
  ) {
    imageUrls.add(product.thumbnail)
  }

  for (const image of product.images ?? []) {
    if (typeof image?.url === "string" && image.url.length > 0) {
      imageUrls.add(image.url)
    }
  }

  return imageUrls.size > 0 ? [...imageUrls] : [PRODUCT_FALLBACK_IMAGE]
}

export const resolveVariantLabel = (
  variant: {
    id: string
    options?: unknown
    sku?: unknown
    title?: unknown
  },
  optionTitlesById: Map<string, string>,
) => {
  const options = Array.isArray(variant.options) ? variant.options : []
  const optionLabels = options
    .map((option) => {
      const optionRecord = asRecord(option)
      const optionValue = asString(readRecordProperty(optionRecord, "value"))
      if (optionValue === null) {
        return null
      }

      const optionId = asString(readRecordProperty(optionRecord, "option_id"))
      const optionTitle =
        optionId === null || optionId === ""
          ? undefined
          : optionTitlesById.get(optionId)

      return optionTitle === undefined || optionTitle === ""
        ? optionValue
        : `${optionTitle}: ${optionValue}`
    })
    .filter((value): value is string => value !== null)

  if (optionLabels.length > 0) {
    return optionLabels.join(" | ")
  }

  const title = asString(variant.title)
  if (title !== null && title !== "Default") {
    return title
  }

  return asString(variant.sku) ?? variant.id
}
