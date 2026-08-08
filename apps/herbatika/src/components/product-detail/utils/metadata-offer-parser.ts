import type { HttpTypes } from "@medusajs/types"

import type {
  Product,
  ProductOfferState,
} from "@/components/product-detail/product-detail.types"
import {
  asBoolean,
  asNumber,
  asRecord,
  asString,
  readRecordProperty,
} from "@/components/product-detail/utils/value-utils"
import { addBusinessDays } from "@/lib/date"
import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"

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
  fallbackLabels: { inStock: string; outOfStock: string },
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
