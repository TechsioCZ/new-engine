import type { HttpTypes } from "@medusajs/types"

import type { Product } from "@/components/product-detail/product-detail.types"
import { normalizeCategoryName } from "@/components/product-detail/utils/metadata-parsers"
import {
  asRecord,
  asString,
  readRecordProperty,
} from "@/components/product-detail/utils/value-utils"
import { createBrandSlug } from "@/lib/storefront/brands"

const BRAND_TITLE_KEY = "title"
const BRAND_HANDLE_KEY = "handle"

export interface ProductInfoLink {
  href: string | null
  label: string
}

export const resolveProductInfoLink = (
  product: Product,
  primaryCategory: HttpTypes.StoreProductCategory | undefined,
): ProductInfoLink | null => {
  const productRecord = asRecord(product)
  const brand = asRecord(readRecordProperty(productRecord, "brand"))
  const brandTitle = asString(readRecordProperty(brand, BRAND_TITLE_KEY))

  if (brandTitle !== null && brandTitle !== "") {
    const brandHandle = asString(readRecordProperty(brand, BRAND_HANDLE_KEY))
    const brandSlug = createBrandSlug(brandHandle ?? brandTitle)
    return {
      href:
        brandSlug === null || brandSlug === "" ? null : `/znacka/${brandSlug}`,
      label: brandTitle,
    }
  }

  const primaryCategoryName = normalizeCategoryName(primaryCategory?.name, "")
  if (
    primaryCategory?.handle === undefined ||
    primaryCategory.handle === "" ||
    primaryCategoryName === ""
  ) {
    return null
  }

  return {
    href: `/c/${primaryCategory.handle}`,
    label: primaryCategoryName,
  }
}

export const resolveAccessibleProductName = (product: Product) => {
  const trimmedTitle = product.title?.trim()
  if (trimmedTitle !== undefined && trimmedTitle !== "") {
    return trimmedTitle
  }
  const trimmedHandle = product.handle?.trim()
  if (trimmedHandle !== undefined && trimmedHandle !== "") {
    return trimmedHandle
  }
  return product.id
}

export const resolveDisplayHighlights = (highlights: string[]) =>
  highlights
    .flatMap((highlight) => {
      const normalizedHighlight = highlight.replaceAll(/\s+/gu, " ").trim()
      return normalizedHighlight === "" ? [] : [normalizedHighlight]
    })
    .slice(0, 3)
