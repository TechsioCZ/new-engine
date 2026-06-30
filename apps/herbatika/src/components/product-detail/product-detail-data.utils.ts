import type { HttpTypes } from "@medusajs/types"
import type { IconType } from "@techsio/ui-kit/atoms/icon"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import type { HerbatikaBreadcrumbItem } from "@/components/herbatika-breadcrumb"
import type { Product } from "@/components/product-detail/product-detail.types"
import { stripHtml } from "@/components/product-detail/utils/html-sanitizer"
import {
  normalizeCategoryName,
  resolveVariantLabel,
} from "@/components/product-detail/utils/metadata-parsers"
import { asRecord, asString } from "@/components/product-detail/utils/value-utils"

const PRODUCT_SUMMARY_FALLBACK = "Popis produktu bude čoskoro doplnený."

export const resolveSelectedVariant = (
  variants: HttpTypes.StoreProductVariant[],
  selectedVariantId: string | null
) =>
  variants.find((variant) => variant.id === selectedVariantId) ??
  variants[0] ??
  null

export const resolveOptionTitlesById = (product: Product | null) => {
  const optionTitlesById = new Map<string, string>()

  for (const option of product?.options ?? []) {
    if (!option.id) {
      continue
    }

    const title = asString(option.title)
    if (!title) {
      continue
    }

    optionTitlesById.set(option.id, title)
  }

  return optionTitlesById
}

export const resolveVariantItems = (
  variants: HttpTypes.StoreProductVariant[],
  optionTitlesById: Map<string, string>
): SelectItem[] =>
  variants
    .filter(
      (variant): variant is HttpTypes.StoreProductVariant & { id: string } =>
        Boolean(variant.id)
    )
    .map((variant) => ({
      value: variant.id,
      label: resolveVariantLabel(variant, optionTitlesById),
    }))

export const resolveShortDescriptionHtml = (product: Product | null) => {
  const metadata = asRecord(product?.metadata)
  return asString(metadata?.short_description) ?? ""
}

export const resolveProductSummaryText = (
  product: Product | null,
  shortDescriptionHtml: string
) => {
  const shortText = stripHtml(shortDescriptionHtml)
  if (shortText) {
    return shortText
  }

  const descriptionText = stripHtml(product?.description)
  return descriptionText || PRODUCT_SUMMARY_FALLBACK
}

export const resolveProductBreadcrumbItems = (
  productCategories: HttpTypes.StoreProductCategory[],
  product: Product | null,
  handle: string
): HerbatikaBreadcrumbItem[] => {
  const primaryCategory = productCategories[0]

  return [
    ...(primaryCategory?.handle
      ? [
          {
            label: normalizeCategoryName(primaryCategory.name),
            href: `/c/${primaryCategory.handle}`,
            icon: "token-icon-home" as IconType,
          },
        ]
      : []),
    { label: product?.title || handle },
  ]
}
