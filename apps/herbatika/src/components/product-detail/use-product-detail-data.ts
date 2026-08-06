"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useTranslations } from "next-intl"
import { useState } from "react"

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
import type { Product } from "@/components/product-detail/product-detail.types"
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
import {
  mergeWarrantyIntoProductContentSections,
  resolveProductWarranty,
} from "@/lib/storefront/product-attributes"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import { resolveProductLocationAvailabilityState } from "@/lib/storefront/product-location-availability"
import { PRODUCT_DETAIL_FIELDS, useProduct } from "@/lib/storefront/products"
import { useRecordRecentlyVisitedProduct } from "@/lib/storefront/recently-visited-products"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import { storefront } from "@/lib/storefront/storefront"

interface UseProductDetailDataProps {
  handle: string
}

interface ProductDetailSelectionState {
  productKey: string
  quantity: number
  selectedVariantId: string | null
  selectedVolumeDiscountId: string | null
}

const createDefaultSelection = (
  productKey: string,
): ProductDetailSelectionState => ({
  productKey,
  quantity: 1,
  selectedVariantId: null,
  selectedVolumeDiscountId: null,
})

const resolveCurrentSelection = (
  selection: ProductDetailSelectionState,
  productKey: string,
) =>
  selection.productKey === productKey
    ? selection
    : createDefaultSelection(productKey)

const updateCurrentSelection = (
  selection: ProductDetailSelectionState,
  productKey: string,
  update: Partial<
    Pick<
      ProductDetailSelectionState,
      "quantity" | "selectedVariantId" | "selectedVolumeDiscountId"
    >
  >,
): ProductDetailSelectionState => ({
  ...resolveCurrentSelection(selection, productKey),
  ...update,
})

const resolveAvailableQuantity = (
  requestedQuantity: number,
  availableQuantity: number | null,
) => {
  if (availableQuantity === null || availableQuantity < 1) {
    return requestedQuantity
  }
  return Math.min(requestedQuantity, availableQuantity)
}

const resolveProductPrice = (
  product: Product | null,
  selectedVariantId: string | null,
  regionCurrencyCode: string,
  priceUnavailableLabel: string,
) =>
  product === null
    ? null
    : resolvePriceState(
        product,
        selectedVariantId,
        regionCurrencyCode,
        priceUnavailableLabel,
      )

const resolveGalleryFallbackLabel = (
  product: Product | null,
  handle: string,
) => {
  const productHandle = product?.handle?.trim()
  if (productHandle !== undefined && productHandle !== "") {
    return productHandle
  }
  return product?.id ?? handle
}

const resolveCanAddToCart = (
  selectedVariantId: string | undefined,
  currentAmount: number | null | undefined,
  isPurchasable: boolean,
) =>
  selectedVariantId !== undefined &&
  selectedVariantId !== "" &&
  typeof currentAmount === "number" &&
  isPurchasable

const resolveProductQueryState = (
  queriedProduct: Product | null | undefined,
  handle: string,
) => {
  const product = queriedProduct ?? null
  return {
    product,
    productCategories: product?.categories ?? [],
    productKey: product?.id ?? `handle:${handle}`,
    variants: product?.variants ?? [],
  }
}

const resolveProductQueryIdentifiers = (
  product: Product | null,
  selectedVariantId: string | undefined,
  inventory: { managesInventory: boolean | null | undefined },
) => ({
  locationInventoryOptions: {
    isInventoryManaged: inventory.managesInventory,
  },
  productId: product?.id ?? null,
  selectedVariantId: selectedVariantId ?? null,
})

const resolveDefaultInformationSection = (sections: { key: string }[]) =>
  sections[0]?.key ?? "description"

const isRegionBootstrapping = (regionId: string | undefined) =>
  regionId === undefined || regionId === ""

export const useProductDetailData = ({ handle }: UseProductDetailDataProps) => {
  const tCatalog = useTranslations("catalog")
  const tNavigation = useTranslations("navigation")
  const region = useRegionContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const [selectionState, setSelectionState] =
    useState<ProductDetailSelectionState>(() =>
      createDefaultSelection(`handle:${handle}`),
    )

  const productQuery = useProduct({
    fields: PRODUCT_DETAIL_FIELDS,
    handle,
  })

  const { product, productCategories, productKey, variants } =
    resolveProductQueryState(productQuery.product, handle)
  const currentSelection = resolveCurrentSelection(selectionState, productKey)
  const { selectedVariantId, selectedVolumeDiscountId } = currentSelection

  const selectedVariant = resolveSelectedVariant(variants, selectedVariantId)
  const queryIdentifiers = resolveProductQueryIdentifiers(
    product,
    selectedVariant?.id,
    { managesInventory: selectedVariant?.manage_inventory },
  )
  const productLocationAvailabilityQuery =
    storefront.hooks.productLocationAvailability.useProductLocationAvailability(
      { productId: queryIdentifiers.productId },
    )
  const productAttributesQuery =
    storefront.hooks.productAttributes.useProductAttributes({
      productId: queryIdentifiers.productId,
    })
  const locationAvailabilityState = resolveProductLocationAvailabilityState(
    productLocationAvailabilityQuery,
    queryIdentifiers.selectedVariantId,
    queryIdentifiers.locationInventoryOptions,
  )
  const optionTitlesById = resolveOptionTitlesById(product)
  const variantItems = resolveVariantItems(variants, optionTitlesById)

  const offerState = resolveOfferState(product, selectedVariant, {
    inStock: tCatalog("product_detail.stock.in_stock"),
    outOfStock: tCatalog("product_detail.stock.out_of_stock"),
  })
  const preliminaryVariantInventory = resolveVariantInventoryState(
    selectedVariant,
    currentSelection.quantity,
  )
  const quantity = resolveAvailableQuantity(
    currentSelection.quantity,
    preliminaryVariantInventory.availableQuantity,
  )
  const selectedVariantInventory = resolveVariantInventoryState(
    selectedVariant,
    quantity,
  )
  const productPrice = resolveProductPrice(
    product,
    selectedVariantId,
    regionCurrencyCode,
    tCatalog("product_detail.price_on_request"),
  )
  const shortDescriptionHtml = resolveShortDescriptionHtml(product)
  const productSummaryText = resolveProductSummaryText(
    product,
    shortDescriptionHtml,
  )
  const productImages = resolveProductImages(product)
  const galleryItems = resolveGalleryItems(
    productImages,
    product?.title,
    resolveGalleryFallbackLabel(product, handle),
  )
  const productHighlights = resolveProductHighlights(productSummaryText)
  const otherSectionTitle = tCatalog("product_detail.sections.other")
  const productContentSections = mergeWarrantyIntoProductContentSections(
    resolveProductContentSections(product, {
      composition: tCatalog("product_detail.sections.composition"),
      content: tCatalog("product_detail.sections.content"),
      description: tCatalog("product_detail.sections.description"),
      other: otherSectionTitle,
      usage: tCatalog("product_detail.sections.usage"),
      warning: tCatalog("product_detail.sections.warning"),
    }),
    resolveProductWarranty(productAttributesQuery.productAttributes),
    otherSectionTitle,
  )
  const mediaFacts = resolveProductMediaFacts(product, productContentSections, {
    dailyCapsules: (count) =>
      tCatalog("product_detail.media.daily_capsules", { count }),
    doses: (count) => tCatalog("product_detail.media.doses", { count }),
  })
  const {
    currentAmount,
    currentAmountLabel,
    currentCurrencyCode,
    discountPercent,
    displayOriginalLabel,
    unitPriceLabel,
    vipCreditLabel,
  } = resolveProductPricingLabels({
    offerState,
    priceUnavailableLabel: tCatalog("product_detail.price_on_request"),
    productPrice,
    regionCurrencyCode,
  })
  const canAddToCart = resolveCanAddToCart(
    selectedVariant?.id,
    productPrice?.currentAmount,
    selectedVariantInventory.isPurchasable,
  )
  const maxQuantity = selectedVariantInventory.maxPurchaseQuantity

  const { availableQuantity } = selectedVariantInventory
  const volumeDiscountOptions = resolveProductVolumeDiscountOptions({
    availableQuantity,
    currentAmount,
    currentCurrencyCode,
    labels: {
      perUnit: (price) =>
        tCatalog("product_detail.bulk_discount.per_unit", { price }),
      title: (optionQuantity) =>
        tCatalog("product_detail.bulk_discount.option_title", {
          quantity: optionQuantity,
        }),
    },
    offerState,
  })
  const selectedVolumeDiscountOption = resolveSelectedVolumeDiscountOption(
    volumeDiscountOptions,
    selectedVolumeDiscountId,
  )

  const relatedSections = useProductDetailRelatedProducts({
    product,
  })

  const setQuantity = (nextQuantity: number) => {
    setSelectionState((current) =>
      updateCurrentSelection(current, productKey, { quantity: nextQuantity }),
    )
  }
  const setSelectedVariantId = (nextVariantId: string | null) => {
    setSelectionState((current) =>
      updateCurrentSelection(current, productKey, {
        selectedVariantId: nextVariantId,
      }),
    )
  }
  const setSelectedVolumeDiscountId = (nextOptionId: string | null) => {
    setSelectionState((current) =>
      updateCurrentSelection(current, productKey, {
        selectedVolumeDiscountId: nextOptionId,
      }),
    )
  }

  useProductDetailDebugLog(product)
  useRecordRecentlyVisitedProduct(product)

  const breadcrumbItems = resolveProductBreadcrumbItems(
    productCategories,
    product,
    handle,
    tNavigation("breadcrumbs.home"),
  )
  const freeShippingThresholdLabel =
    resolveFreeShippingThresholdLabel(currentCurrencyCode)

  return {
    breadcrumbItems,
    canAddToCart,
    currentAmountLabel,
    defaultInfoSectionValue: resolveDefaultInformationSection(
      productContentSections,
    ),
    discountPercent,
    displayOriginalLabel,
    freeShippingThresholdLabel,
    galleryItems,
    isBootstrappingRegion: isRegionBootstrapping(region?.region_id),
    locationAvailabilityState,
    maxQuantity,
    mediaFacts,
    offerState,
    product,
    productCategories,
    productContentSections,
    productHighlights,
    productQuery,
    quantity,
    region,
    relatedSections,
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
  }
}

export type ProductDetailDataState = ReturnType<typeof useProductDetailData>
