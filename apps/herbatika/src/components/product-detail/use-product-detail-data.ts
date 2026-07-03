"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useEffect, useState } from "react"
import type { Product } from "@/components/product-detail/product-detail.types"
import {
  resolveOptionTitlesById,
  resolveProductBreadcrumbItems,
  resolveProductSummaryText,
  resolveSelectedVariant,
  resolveShortDescriptionHtml,
  resolveVariantItems,
} from "@/components/product-detail/product-detail-data.utils"
import {
  resolveFreeShippingThresholdLabel,
  resolveProductPricingLabels,
  resolveProductVolumeDiscountOptions,
  resolveSelectedVolumeDiscountOption,
} from "@/components/product-detail/product-detail-pricing-data.utils"
import { useProductDetailDebugLog } from "@/components/product-detail/use-product-detail-debug-log"
import { useProductDetailRelatedProducts } from "@/components/product-detail/use-product-detail-related-products"
import {
  resolveGalleryItems,
  resolveProductHighlights,
} from "@/components/product-detail/utils/display-utils"
import { resolveProductMediaFacts } from "@/components/product-detail/utils/media-facts"
import {
  resolveOfferState,
  resolveProductContentSections,
  resolveProductImages,
} from "@/components/product-detail/utils/metadata-parsers"
import { resolvePriceState } from "@/components/product-detail/utils/pricing-utils"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import {
  resolveProductLocationAvailabilityState,
  useProductLocationAvailability,
} from "@/lib/storefront/product-location-availability"
import { PRODUCT_DETAIL_FIELDS, useProduct } from "@/lib/storefront/products"
import { useRecordRecentlyVisitedProduct } from "@/lib/storefront/recently-visited-products"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

type UseProductDetailDataProps = { handle: string }

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
  const productLocationAvailabilityQuery = useProductLocationAvailability(
    product?.id ?? null
  )
  const locationAvailabilityState = resolveProductLocationAvailabilityState(
    productLocationAvailabilityQuery,
    selectedVariant?.id ?? null
  )
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
  const productContentSections = resolveProductContentSections(product)
  const mediaFacts = resolveProductMediaFacts(product, productContentSections)
  const {
    currentAmount,
    currentAmountLabel,
    currentCurrencyCode,
    discountPercent,
    displayOriginalLabel,
    unitPriceLabel,
    vipCreditLabel,
  } = resolveProductPricingLabels({
    productPrice,
    regionCurrencyCode,
    offerState,
    mediaFacts,
  })
  const canAddToCart =
    Boolean(selectedVariant?.id) &&
    typeof productPrice?.currentAmount === "number" &&
    selectedVariantInventory.isPurchasable
  const maxQuantity = selectedVariantInventory.maxPurchaseQuantity

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
    setSelectedVolumeDiscountId((currentOptionId) => {
      if (
        currentOptionId &&
        volumeDiscountOptions.some((option) => option.id === currentOptionId)
      ) {
        return currentOptionId
      }

      return volumeDiscountOptions[0]?.id ?? null
    })
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
    locationAvailabilityState,
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
