"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useLocale, useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import type { Product } from "@/components/product-detail/product-detail.types"
import {
  resolveOptionTitlesById,
  resolveProductBreadcrumbItems,
  resolveProductSummaryText,
  resolveSelectedVariant,
  resolveShortDescriptionHtml,
  resolveVariantItems,
  translateOptionTitles,
  translateOptionValue,
} from "@/components/product-detail/product-detail-data.utils"
import {
  resolveFreeShippingThresholdLabel,
  resolveProductPricingLabels,
  resolveProductVolumeDiscountOptions,
  resolveSelectedVolumeDiscountOption,
} from "@/components/product-detail/product-detail-pricing-data.utils"
import {
  buildProductDetailQuery,
  resolveInitialProductVariantId,
  resolveProductDetailProduct,
} from "@/components/product-detail/product-detail-query"
import { useProductDetailDebugLog } from "@/components/product-detail/use-product-detail-debug-log"
import { useProductDetailRelatedProducts } from "@/components/product-detail/use-product-detail-related-products"
import { useProductInformationSections } from "@/components/product-detail/use-product-information-sections"
import {
  resolveGalleryItems,
  resolveProductHighlights,
} from "@/components/product-detail/utils/display-utils"
import { resolveProductMediaFacts } from "@/components/product-detail/utils/media-facts"
import {
  resolveOfferState,
  resolveProductImages,
} from "@/components/product-detail/utils/metadata-parsers"
import { resolvePriceState } from "@/components/product-detail/utils/pricing-utils"
import { useAuth } from "@/lib/storefront/auth"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import { resolveProductLocationAvailabilityState } from "@/lib/storefront/product-location-availability"
import { useProduct } from "@/lib/storefront/products"
import { useRecordRecentlyVisitedProduct } from "@/lib/storefront/recently-visited-products"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import { storefront } from "@/lib/storefront/storefront"
import { useVolumeDiscountTiers } from "@/lib/storefront/volume-discounts"

type UseProductDetailDataProps = {
  brandPublicSlugsById?: Readonly<Record<string, string>>
  categoryPublicSlugsById?: Readonly<Record<string, string>>
  handle: string
  initialProduct?: Product
  initialVariantId?: string
  productPublicSlugsById?: Readonly<Record<string, string>>
}

export function useProductDetailData({
  brandPublicSlugsById,
  categoryPublicSlugsById,
  handle,
  initialProduct,
  initialVariantId,
  productPublicSlugsById,
}: UseProductDetailDataProps) {
  const locale = useLocale()
  const tCatalog = useTranslations("catalog")
  const tNavigation = useTranslations("navigation")
  const authQuery = useAuth()
  const region = useRegionContext()
  const { code: market } = useMarketContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    () =>
      resolveInitialProductVariantId(initialProduct?.variants, initialVariantId)
  )
  const [selectedVolumeDiscountId, setSelectedVolumeDiscountId] = useState<
    string | null
  >(null)

  const productDetailQuery = buildProductDetailQuery({
    handle,
    initialProduct,
  })
  const handleProductQuery = useProduct(productDetailQuery.input)
  const product = resolveProductDetailProduct(
    initialProduct,
    handleProductQuery.product as Product | null
  )
  const productQuery = initialProduct
    ? {
        ...handleProductQuery,
        error: null,
        isFetching: false,
        isLoading: false,
        isSuccess: true,
        product,
      }
    : handleProductQuery
  const variants = product?.variants ?? []
  const productCategories = product?.categories ?? []

  const selectedVariant = resolveSelectedVariant(variants, selectedVariantId)
  const productLocationAvailabilityQuery =
    storefront.hooks.productLocationAvailability.useProductLocationAvailability(
      {
        productId: product?.id ?? null,
      }
    )
  const productAttributesQuery =
    storefront.hooks.productAttributes.useProductAttributes({
      productId: product?.id ?? null,
    })
  const locationAvailabilityState = resolveProductLocationAvailabilityState(
    productLocationAvailabilityQuery,
    selectedVariant?.id ?? null,
    {
      isInventoryManaged: selectedVariant?.manage_inventory,
    }
  )
  const optionTitlesById = translateOptionTitles(
    resolveOptionTitlesById(product),
    (key) => tCatalog(`product_detail.option_titles.${key}`)
  )
  const variantItems = resolveVariantItems(
    variants,
    optionTitlesById,
    (value) =>
      translateOptionValue(value, (key) =>
        tCatalog(`product_detail.option_values.${key}`)
      )
  )

  const offerState = resolveOfferState(product, selectedVariant, {
    allowSourceLabels: market === "sk",
    inStock: tCatalog("product_detail.stock.in_stock"),
    outOfStock: tCatalog("product_detail.stock.out_of_stock"),
  })
  const salesChannelId = (region as typeof region & { salesChannelId?: string })
    ?.salesChannelId
  const volumeDiscountTiersQuery = useVolumeDiscountTiers({
    customerId: authQuery.customer?.id ?? null,
    variantId: selectedVariant?.id ?? null,
    regionId: region?.region_id,
    salesChannelId,
  })
  const selectedVariantInventory = resolveVariantInventoryState(
    selectedVariant,
    quantity
  )
  const productPrice = product
    ? resolvePriceState(
        product,
        selectedVariantId,
        regionCurrencyCode,
        tCatalog("product_detail.price_on_request")
      )
    : null
  const shortDescriptionHtml = resolveShortDescriptionHtml(product)
  const productSummaryText = resolveProductSummaryText(
    product,
    shortDescriptionHtml
  )
  const productImages = resolveProductImages(product)
  const galleryItems = resolveGalleryItems(
    productImages,
    product?.title,
    product?.handle?.trim() || product?.id || handle
  )
  const productHighlights = resolveProductHighlights(productSummaryText)
  const productContentSections = useProductInformationSections({
    brandPublicSlugsById,
    categories: productCategories,
    locale,
    market,
    offerState,
    product,
    productAttributes: productAttributesQuery.productAttributes,
  })
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
    locale,
    productPrice,
    regionCurrencyCode,
    offerState,
    priceUnavailableLabel: tCatalog("product_detail.price_on_request"),
  })
  const canAddToCart =
    Boolean(selectedVariant?.id) &&
    typeof productPrice?.currentAmount === "number" &&
    selectedVariantInventory.isPurchasable
  const maxQuantity = selectedVariantInventory.maxPurchaseQuantity

  const availableQuantity = selectedVariantInventory.availableQuantity
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
    tiers: volumeDiscountTiersQuery.tiers,
  })
  const selectedVolumeDiscountOption = resolveSelectedVolumeDiscountOption(
    volumeDiscountOptions,
    selectedVolumeDiscountId
  )

  const relatedSections = useProductDetailRelatedProducts({
    product,
  })

  useEffect(() => {
    setQuantity(1)
    setSelectedVariantId(
      resolveInitialProductVariantId(product?.variants, initialVariantId)
    )
    setSelectedVolumeDiscountId(null)
  }, [initialVariantId, product?.variants])

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

  const breadcrumbItems = resolveProductBreadcrumbItems({
    categoryPublicSlugsById: categoryPublicSlugsById ?? {},
    handle,
    homeLabel: tNavigation("breadcrumbs.home"),
    market,
    productCategories,
    product,
  })
  const freeShippingThresholdLabel =
    resolveFreeShippingThresholdLabel(currentCurrencyCode)

  return {
    breadcrumbItems,
    brandPublicSlugsById,
    categoryPublicSlugsById,
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
    productPublicSlugsById,
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
