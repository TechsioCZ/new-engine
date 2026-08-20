import type { HttpTypes } from "@medusajs/types"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import type { HerbatikaBreadcrumbItem } from "@/components/herbatika-breadcrumb"
import type { Product } from "@/components/product-detail/product-detail.types"
import { stripHtml } from "@/components/product-detail/utils/html-sanitizer"
import {
  normalizeCategoryName,
  resolveVariantLabel,
} from "@/components/product-detail/utils/metadata-parsers"
import {
  asRecord,
  asString,
} from "@/components/product-detail/utils/value-utils"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import { buildPath } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"

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
  return descriptionText
}

export const resolveProductBreadcrumbItems = ({
  categoryPublicSlugsById,
  handle,
  homeLabel,
  market,
  product,
  productCategories,
}: {
  categoryPublicSlugsById: Readonly<Record<string, string>>
  handle: string
  homeLabel: string
  market: Market
  product: Product | null
  productCategories: HttpTypes.StoreProductCategory[]
}): HerbatikaBreadcrumbItem[] => {
  const primaryCategory = productCategories[0]
  const primaryCategoryName = normalizeCategoryName(primaryCategory?.name, "")

  return [
    {
      label: homeLabel,
      href: buildPath({ kind: "home" }, market),
      icon: "token-icon-home",
    },
    ...(primaryCategoryName
      ? [
          {
            label: primaryCategoryName,
            href:
              buildProjectedEntityPath(
                "category",
                {
                  publicSlug: primaryCategory?.id
                    ? categoryPublicSlugsById[primaryCategory.id]
                    : undefined,
                },
                market
              ) ?? undefined,
          },
        ]
      : []),
    { label: product?.title || handle },
  ]
}
