"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import type { IconType } from "@techsio/ui-kit/atoms/icon"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { useEffect, useState } from "react"
import type { HerbatikaBreadcrumbItem } from "@/components/herbatika-breadcrumb"
import type { Product } from "@/components/product-detail/product-detail.types"
import { useProductDetailDebugLog } from "@/components/product-detail/use-product-detail-debug-log"
import { useProductDetailRelatedProducts } from "@/components/product-detail/use-product-detail-related-products"
import {
  resolveGalleryItems,
  resolveProductHighlights,
} from "@/components/product-detail/utils/display-utils"
import { stripHtml } from "@/components/product-detail/utils/html-sanitizer"
import { resolveProductMediaFacts } from "@/components/product-detail/utils/media-facts"
import {
  normalizeCategoryName,
  resolveOfferState,
  resolveProductContentSections,
  resolveProductImages,
  resolveVariantLabel,
} from "@/components/product-detail/utils/metadata-parsers"
import {
  resolveDiscountPercent,
  resolveDisplayOriginalAmount,
  resolvePriceState,
  resolveUnitPriceLabel,
  resolveVipCreditLabel,
  resolveVolumeDiscountOptions,
} from "@/components/product-detail/utils/pricing-utils"
import {
  asNumber,
  asRecord,
  asString,
} from "@/components/product-detail/utils/value-utils"
import { resolveFreeShippingThresholdAmount } from "@/lib/storefront/free-shipping"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import { PRODUCT_DETAIL_FIELDS, useProduct } from "@/lib/storefront/products"
import { useRecordRecentlyVisitedProduct } from "@/lib/storefront/recently-visited-products"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

type UseProductDetailDataProps = {
  handle: string
}

const PRODUCT_SUMMARY_FALLBACK = "Popis produktu bude čoskoro doplnený."

const resolveSelectedVariant = (
  variants: HttpTypes.StoreProductVariant[],
  selectedVariantId: string | null
) =>
  variants.find((variant) => variant.id === selectedVariantId) ??
  variants[0] ??
  null

const resolveOptionTitlesById = (product: Product | null) => {
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

const resolveVariantItems = (
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

const resolveShortDescriptionHtml = (product: Product | null) => {
  const metadata = asRecord(product?.metadata)
  return asString(metadata?.short_description) ?? ""
}

const resolveProductSummaryText = (
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

const resolveDisplayOriginalLabel = (
  productPrice: ReturnType<typeof resolvePriceState> | null,
  displayOriginalAmount: number | null,
  currentCurrencyCode: string
) =>
  productPrice && typeof displayOriginalAmount === "number"
    ? formatCurrencyAmount(displayOriginalAmount, currentCurrencyCode)
    : null

const resolveProductVolumeDiscountOptions = (
  currentAmount: number | null,
  currentCurrencyCode: string,
  offerState: ReturnType<typeof resolveOfferState>,
  availableQuantity: number | null
) => {
  const discountOptions = resolveVolumeDiscountOptions(
    currentAmount,
    currentCurrencyCode,
    offerState.applyQuantityDiscount || offerState.applyVolumeDiscount
  )

  if (availableQuantity === null) {
    return discountOptions
  }

  return discountOptions.filter(
    (option) => option.quantity <= availableQuantity
  )
}

const resolveSelectedVolumeDiscountOption = (
  volumeDiscountOptions: ReturnType<typeof resolveVolumeDiscountOptions>,
  selectedVolumeDiscountId: string | null
) =>
  volumeDiscountOptions.find(
    (option) => option.id === selectedVolumeDiscountId
  ) ??
  volumeDiscountOptions[0] ??
  null

const resolveProductBreadcrumbItems = (
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

const resolveFreeShippingThresholdLabel = (currentCurrencyCode: string) => {
  const freeShippingThresholdAmount =
    resolveFreeShippingThresholdAmount(currentCurrencyCode)

  return freeShippingThresholdAmount === null
    ? null
    : formatCurrencyAmount(freeShippingThresholdAmount, currentCurrencyCode, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
}

export function useProductDetailData({ handle }: UseProductDetailDataProps) {
  const region = useRegionContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  )
  const [selectedVolumeDiscountId, setSelectedVolumeDiscountId] = useState<
    string | null
  >(null)

  const productQuery = useProduct({
    handle,
    fields: PRODUCT_DETAIL_FIELDS,
  })

  const product = (productQuery.product ?? null) as Product | null
  const variants = product?.variants ?? []
  const productCategories = product?.categories ?? []

  const selectedVariant = resolveSelectedVariant(variants, selectedVariantId)
  const optionTitlesById = resolveOptionTitlesById(product)
  const variantItems = resolveVariantItems(variants, optionTitlesById)

  const offerState = resolveOfferState(product, selectedVariant)
  const selectedVariantInventory = resolveVariantInventoryState(
    selectedVariant,
    quantity
  )
  const productPrice = product
    ? resolvePriceState(product, selectedVariantId, regionCurrencyCode)
    : null
  const shortDescriptionHtml = resolveShortDescriptionHtml(product)
  const productSummaryText = resolveProductSummaryText(
    product,
    shortDescriptionHtml
  )
  const productImages = resolveProductImages(product)
  const galleryItems = resolveGalleryItems(productImages, product?.title)
  const productHighlights = resolveProductHighlights(
    productSummaryText,
    productCategories
  )
  const productContentSections = resolveProductContentSections(
    product,
    shortDescriptionHtml
  )
  const mediaFacts = resolveProductMediaFacts(product, productContentSections)

  const currentAmount = productPrice?.currentAmount ?? null
  const currentAmountWithoutTax = productPrice?.currentAmountWithoutTax ?? null
  const currentAmountLabel = productPrice?.currentLabel ?? "Cena na vyžiadanie"
  const currentCurrencyCode = productPrice?.currencyCode ?? regionCurrencyCode
  const canAddToCart =
    Boolean(selectedVariant?.id) &&
    typeof productPrice?.currentAmount === "number" &&
    selectedVariantInventory.isPurchasable
  const maxQuantity = selectedVariantInventory.maxPurchaseQuantity

  const displayOriginalAmount = resolveDisplayOriginalAmount(productPrice)

  const displayOriginalLabel = resolveDisplayOriginalLabel(
    productPrice,
    displayOriginalAmount,
    currentCurrencyCode
  )

  const discountPercent = resolveDiscountPercent(
    currentAmount,
    displayOriginalAmount
  )
  const vipCreditLabel = resolveVipCreditLabel(
    currentAmount,
    currentCurrencyCode,
    offerState.applyLoyaltyDiscount
  )

  const vatRate = asNumber(offerState.offerSource?.vat)
  const unitPriceLabel = resolveUnitPriceLabel({
    currentAmount,
    currentAmountWithoutTax,
    currencyCode: currentCurrencyCode,
    mediaFacts,
    unitLabel: offerState.unitLabel,
    vatRate,
  })

  const availableQuantity = selectedVariantInventory.availableQuantity
  const volumeDiscountOptions = resolveProductVolumeDiscountOptions(
    currentAmount,
    currentCurrencyCode,
    offerState,
    availableQuantity
  )
  const selectedVolumeDiscountOption = resolveSelectedVolumeDiscountOption(
    volumeDiscountOptions,
    selectedVolumeDiscountId
  )

  const relatedSections = useProductDetailRelatedProducts({
    product,
  })

  useEffect(() => {
    setQuantity(1)
    setSelectedVariantId(product?.variants?.[0]?.id ?? null)
    setSelectedVolumeDiscountId(null)
  }, [product?.variants])

  useEffect(() => {
    if (availableQuantity === null || availableQuantity < 1) {
      return
    }

    if (quantity > availableQuantity) {
      setQuantity(availableQuantity)
    }
  }, [availableQuantity, quantity])

  useEffect(() => {
    setSelectedVolumeDiscountId(volumeDiscountOptions[0]?.id ?? null)
  }, [volumeDiscountOptions])

  useProductDetailDebugLog(product)
  useRecordRecentlyVisitedProduct(product)

  const breadcrumbItems = resolveProductBreadcrumbItems(
    productCategories,
    product,
    handle
  )
  const freeShippingThresholdLabel =
    resolveFreeShippingThresholdLabel(currentCurrencyCode)

  return {
    breadcrumbItems,
    canAddToCart,
    currentAmountLabel,
    defaultInfoSectionValue: productContentSections[0]?.key ?? "description",
    displayOriginalLabel,
    discountPercent,
    freeShippingThresholdLabel,
    galleryItems,
    isBootstrappingRegion: !region?.region_id,
    maxQuantity,
    mediaFacts,
    product,
    productCategories,
    productContentSections,
    productHighlights,
    productQuery,
    quantity,
    relatedSections,
    region,
    selectedVariant,
    selectedVariantId: selectedVariant?.id ?? null,
    selectedVolumeDiscountId: selectedVolumeDiscountOption?.id ?? null,
    selectedVolumeDiscountOption,
    setQuantity,
    setSelectedVariantId,
    setSelectedVolumeDiscountId,
    unitPriceLabel,
    variantItems,
    variants,
    vipCreditLabel,
    volumeDiscountOptions,
    offerState,
  }
}

export type ProductDetailDataState = ReturnType<typeof useProductDetailData>
