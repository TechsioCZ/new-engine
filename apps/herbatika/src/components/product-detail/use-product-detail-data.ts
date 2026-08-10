"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useTranslations } from "next-intl"

import {
  resolveOptionTitlesById,
  resolveProductBreadcrumbItems,
  resolveVariantItems,
} from "@/components/product-detail/product-detail-data.utils"
import { resolveProductDetailPresentationData } from "@/components/product-detail/product-detail-presentation-data"
import {
  resolveFreeShippingThresholdLabel,
  resolveProductPricingData,
} from "@/components/product-detail/product-detail-pricing-data.utils"
import { useProductDetailCoreData } from "@/components/product-detail/use-product-detail-core-data"
import { useProductDetailDebugLog } from "@/components/product-detail/use-product-detail-debug-log"
import { useProductDetailRelatedProducts } from "@/components/product-detail/use-product-detail-related-products"
import { resolveProductLocationAvailabilityState } from "@/lib/storefront/product-location-availability"
import { useRecordRecentlyVisitedProduct } from "@/lib/storefront/recently-visited-products"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

interface UseProductDetailDataProps {
  handle: string
  initialVariantId?: string
}

const resolveDefaultInformationSection = (sections: { key: string }[]) =>
  sections[0]?.key ?? "description"

export const useProductDetailData = ({
  handle,
  initialVariantId,
}: UseProductDetailDataProps) => {
  const tCatalog = useTranslations("catalog")
  const tNavigation = useTranslations("navigation")
  const region = useRegionContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const core = useProductDetailCoreData({
    handle,
    ...(initialVariantId === undefined ? {} : { initialVariantId }),
  })
  const {
    currentSelection,
    product,
    productAttributesQuery,
    productCategories,
    productLocationAvailabilityQuery,
    productQuery,
    quantity,
    selectedVariant,
    selectedVariantInventory,
    setQuantity,
    setSelectedVariantId,
    setSelectedVolumeDiscountId,
    variants,
  } = core
  const locationAvailabilityState = resolveProductLocationAvailabilityState(
    productLocationAvailabilityQuery,
    selectedVariant?.id ?? null,
    { isInventoryManaged: selectedVariant?.manage_inventory },
  )
  const variantItems = resolveVariantItems(
    variants,
    resolveOptionTitlesById(product),
  )
  const presentation = resolveProductDetailPresentationData({
    handle,
    labels: {
      dailyCapsules: (count) =>
        tCatalog("product_detail.media.daily_capsules", { count }),
      doses: (count) => tCatalog("product_detail.media.doses", { count }),
      sections: {
        composition: tCatalog("product_detail.sections.composition"),
        content: tCatalog("product_detail.sections.content"),
        description: tCatalog("product_detail.sections.description"),
        other: tCatalog("product_detail.sections.other"),
        usage: tCatalog("product_detail.sections.usage"),
        warning: tCatalog("product_detail.sections.warning"),
      },
      stock: {
        inStock: tCatalog("product_detail.stock.in_stock"),
        outOfStock: tCatalog("product_detail.stock.out_of_stock"),
      },
    },
    product,
    productAttributes: productAttributesQuery.productAttributes,
    selectedVariant,
  })
  const pricing = resolveProductPricingData({
    inventory: selectedVariantInventory,
    labels: {
      perUnit: (price) =>
        tCatalog("product_detail.bulk_discount.per_unit", { price }),
      title: (optionQuantity) =>
        tCatalog("product_detail.bulk_discount.option_title", {
          quantity: optionQuantity,
        }),
    },
    offerState: presentation.offerState,
    priceUnavailableLabel: tCatalog("product_detail.price_on_request"),
    priceVariantId: currentSelection.selectedVariantId,
    product,
    regionCurrencyCode,
    selectedVariantId: selectedVariant?.id ?? null,
    selectedVolumeDiscountId: currentSelection.selectedVolumeDiscountId,
  })
  const relatedSections = useProductDetailRelatedProducts({ product })

  useProductDetailDebugLog(product)
  useRecordRecentlyVisitedProduct(product)

  return {
    breadcrumbItems: resolveProductBreadcrumbItems(
      productCategories,
      product,
      handle,
      tNavigation("breadcrumbs.home"),
    ),
    canAddToCart: pricing.canAddToCart,
    currentAmountLabel: pricing.currentAmountLabel,
    defaultInfoSectionValue: resolveDefaultInformationSection(
      presentation.productContentSections,
    ),
    discountPercent: pricing.discountPercent,
    displayOriginalLabel: pricing.displayOriginalLabel,
    freeShippingThresholdLabel: resolveFreeShippingThresholdLabel(
      pricing.currentCurrencyCode,
    ),
    galleryItems: presentation.galleryItems,
    isBootstrappingRegion:
      region?.region_id === undefined || region.region_id === "",
    locationAvailabilityState,
    maxQuantity: pricing.maxQuantity,
    mediaFacts: presentation.mediaFacts,
    offerState: presentation.offerState,
    product,
    productCategories,
    productContentSections: presentation.productContentSections,
    productHighlights: presentation.productHighlights,
    productQuery,
    quantity,
    region,
    relatedSections,
    selectedVariant,
    selectedVariantId: selectedVariant?.id ?? null,
    selectedVolumeDiscountId: pricing.selectedVolumeDiscountId,
    selectedVolumeDiscountOption: pricing.selectedVolumeDiscountOption,
    setQuantity,
    setSelectedVariantId,
    setSelectedVolumeDiscountId,
    unitPriceLabel: pricing.unitPriceLabel,
    variantItems,
    variants,
    vipCreditLabel: pricing.vipCreditLabel,
    volumeDiscountOptions: pricing.volumeDiscountOptions,
  }
}

export type ProductDetailDataState = ReturnType<typeof useProductDetailData>
