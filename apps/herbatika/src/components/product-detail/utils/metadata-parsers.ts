import type { HttpTypes } from "@medusajs/types"

import {
  PRODUCT_DETAIL_SECTION_ORDER,
  PRODUCT_FALLBACK_IMAGE,
} from "@/components/product-detail/product-detail.constants"
import type {
  Product,
  ProductDetailContentSection,
  ProductOfferState,
} from "@/components/product-detail/product-detail.types"
import { hasRenderableHtmlContent } from "@/components/product-detail/utils/html-sanitizer"
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  readRecordProperty,
} from "@/components/product-detail/utils/value-utils"
import { addBusinessDays } from "@/lib/date"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"

const SECTION_KEY_WHITESPACE_PATTERN = /\s+/gu
const SECTION_KEY_UNSUPPORTED_CHARS_PATTERN = /[^a-z0-9_-]/gu
const CATEGORY_NAME_PREFIX_PATTERN = /^>\s*/u

const normalizeSectionKey = (value: unknown): string | null => {
  const parsed = asString(value)
  if (parsed === null) {
    return null
  }

  const normalized = parsed
    .toLowerCase()
    .replace(SECTION_KEY_WHITESPACE_PATTERN, "_")
    .replace(SECTION_KEY_UNSUPPORTED_CHARS_PATTERN, "")

  return normalized.length > 0 ? normalized : null
}

const hasRenderableSectionHtml = (html: string): boolean =>
  hasRenderableHtmlContent(html)

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
  variant: HttpTypes.StoreProductVariant,
  optionTitlesById: Map<string, string>,
) => {
  const optionLabels = (variant.options ?? [])
    .map((option) => {
      const optionValue = asString(option?.value)
      if (optionValue === null) {
        return null
      }

      const optionTitle =
        option.option_id === null ||
        option.option_id === undefined ||
        option.option_id === ""
          ? undefined
          : optionTitlesById.get(option.option_id)

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

const resolveOfferMetadataSource = (
  product: Product | null,
  selectedVariant: HttpTypes.StoreProductVariant | null,
) => {
  const productMetadata = asRecord(product?.metadata)
  const topOffer = asRecord(readRecordProperty(productMetadata, "top_offer"))
  const variantMetadata = asRecord(selectedVariant?.metadata)
  return topOffer ?? variantMetadata
}

const resolveActiveDiscount = (
  source: Record<string, unknown> | null,
  currentAmount: number | null,
  actionAmount: number | null,
) => {
  const activeDiscountFlag = asBoolean(
    readRecordProperty(source, "has_active_discount"),
  )
  if (activeDiscountFlag !== null) {
    return activeDiscountFlag
  }
  return (
    actionAmount !== null &&
    currentAmount !== null &&
    actionAmount < currentAmount
  )
}

const resolveOfferValues = (
  source: Record<string, unknown> | null,
  selectedVariant: HttpTypes.StoreProductVariant | null,
  availableQuantity: number | null,
  fallbackLabels: { inStock: string; outOfStock: string },
) => {
  const stock = asRecord(readRecordProperty(source, "stock"))
  const currentAmount =
    asNumber(readRecordProperty(source, "current_price")) ??
    asNumber(readRecordProperty(source, "price_vat"))
  const actionAmount = asNumber(readRecordProperty(source, "action_price"))

  return {
    actionAmount,
    code:
      asString(readRecordProperty(source, "code")) ??
      asString(selectedVariant?.sku),
    currentAmount,
    ean:
      asString(readRecordProperty(source, "ean")) ??
      asString(selectedVariant?.ean),
    hasActiveDiscount: resolveActiveDiscount(
      source,
      currentAmount,
      actionAmount,
    ),
    inStockLabel:
      asString(readRecordProperty(source, "availability_in_stock")) ??
      fallbackLabels.inStock,
    outOfStockLabel:
      asString(readRecordProperty(source, "availability_out_of_stock")) ??
      fallbackLabels.outOfStock,
    stockAmount:
      availableQuantity ?? asNumber(readRecordProperty(stock, "amount")),
  }
}

export const resolveOfferState = (
  product: Product | null,
  selectedVariant: HttpTypes.StoreProductVariant | null,
  fallbackLabels: {
    inStock: string
    outOfStock: string
  },
): ProductOfferState => {
  const source = resolveOfferMetadataSource(product, selectedVariant)
  const variantInventory = resolveVariantInventoryState(selectedVariant)
  const { isInStock } = variantInventory
  const values = resolveOfferValues(
    source,
    selectedVariant,
    variantInventory.availableQuantity,
    fallbackLabels,
  )

  return {
    actionAmount: values.actionAmount,
    applyLoyaltyDiscount:
      asBoolean(readRecordProperty(source, "apply_loyalty_discount")) === true,
    applyQuantityDiscount:
      asBoolean(readRecordProperty(source, "apply_quantity_discount")) === true,
    applyVolumeDiscount:
      asBoolean(readRecordProperty(source, "apply_volume_discount")) === true,
    availabilityLabel: isInStock ? values.inStockLabel : values.outOfStockLabel,
    code: values.code,
    currentAmount: values.currentAmount,
    ean: values.ean,
    expectedDeliveryDate: isInStock ? addBusinessDays(new Date(), 3) : null,
    hasActiveDiscount: values.hasActiveDiscount,
    isInStock,
    standardAmount: asNumber(readRecordProperty(source, "standard_price")),
    stockAmount: values.stockAmount,
  }
}

export const resolveProductContentSections = (
  product: Product | null,
  sectionTitles: Record<
    (typeof PRODUCT_DETAIL_SECTION_ORDER)[number] | "content",
    string
  >,
): ProductDetailContentSection[] => {
  const metadata = asRecord(product?.metadata)
  const sectionMap = asRecord(
    readRecordProperty(metadata, "content_sections_map"),
  )
  const sectionsValue = readRecordProperty(metadata, "content_sections")
  const sectionsFromList = Array.isArray(sectionsValue) ? sectionsValue : []
  const productDescriptionHtml = asString(product?.description) ?? ""

  const sectionHtmlByKey = new Map<string, string>()
  for (const section of sectionsFromList) {
    const sectionRecord = asRecord(section)
    if (sectionRecord !== null) {
      const key = normalizeSectionKey(readRecordProperty(sectionRecord, "key"))
      const html = asString(readRecordProperty(sectionRecord, "html"))
      if (key !== null && html !== null && !sectionHtmlByKey.has(key)) {
        sectionHtmlByKey.set(key, html)
      }
    }
  }

  return PRODUCT_DETAIL_SECTION_ORDER.flatMap((sectionKey) => {
    const metadataSectionHtml =
      sectionHtmlByKey.get(sectionKey) ??
      asString(sectionMap?.[sectionKey]) ??
      ""
    const html =
      sectionKey === "description" && productDescriptionHtml !== ""
        ? productDescriptionHtml
        : metadataSectionHtml

    if (!hasRenderableSectionHtml(html)) {
      return []
    }

    return [
      {
        html,
        key: sectionKey,
        title: sectionTitles[sectionKey] ?? sectionTitles.content,
      },
    ]
  })
}
