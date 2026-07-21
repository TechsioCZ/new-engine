import type { HttpTypes } from "@medusajs/types"
import { resolveLineItemInventory } from "@/components/header/herbatika-cart-item.utils"
import {
  resolveLineItemQuantity,
  resolveLineItemUnitAmount,
} from "@/lib/storefront/cart-calculations"
import {
  asStorefrontNumber,
  asStorefrontRecord,
  asStorefrontString,
  resolveProductTopOffer,
  resolveTopOfferOriginalAmount,
} from "@/lib/storefront/product-pricing"

export const asString = asStorefrontString
export const asRecord = asStorefrontRecord

const resolveLineItemTopOffer = (
  item: HttpTypes.StoreCartLineItem,
  product?: HttpTypes.StoreProduct | null
) => {
  const itemRecord = item as unknown as Record<string, unknown>
  const metadata = asStorefrontRecord(itemRecord.metadata)
  const itemProduct = asStorefrontRecord(itemRecord.product)
  const itemProductMetadata = asStorefrontRecord(itemProduct?.metadata)

  return (
    resolveProductTopOffer(product) ??
    asStorefrontRecord(metadata?.top_offer) ??
    asStorefrontRecord(itemProductMetadata?.top_offer)
  )
}

export const resolveOriginalLineItemTotalAmount = (
  item: HttpTypes.StoreCartLineItem,
  product?: HttpTypes.StoreProduct | null
) => {
  const itemRecord = item as unknown as Record<string, unknown>
  const topOffer = resolveLineItemTopOffer(item, product)
  const compareAtUnit = asStorefrontNumber(itemRecord.compare_at_unit_price)

  const quantity = resolveLineItemQuantity(item)
  const originalUnitAmount = resolveTopOfferOriginalAmount({
    currentAmount: resolveLineItemUnitAmount(item),
    explicitOriginalAmount: compareAtUnit,
    topOffer,
  })

  return typeof originalUnitAmount === "number"
    ? originalUnitAmount * quantity
    : null
}

export const resolveAvailabilityText = (
  item: HttpTypes.StoreCartLineItem,
  product?: HttpTypes.StoreProduct | null
) => {
  const topOffer = resolveLineItemTopOffer(item, product)
  const stock = asStorefrontRecord(topOffer?.stock)
  const stockAmount =
    resolveLineItemInventory(item) ?? asStorefrontNumber(stock?.amount)
  const isInStock = stockAmount === null ? true : stockAmount > 0

  if (!isInStock) {
    return (
      asStorefrontString(topOffer?.availability_out_of_stock) ??
      "Momentálne nie je skladom"
    )
  }

  const availabilityLabel =
    asStorefrontString(topOffer?.availability_in_stock) ?? "Na sklade"
  const deliveryLabel = asStorefrontString(topOffer?.delivery_label)

  return deliveryLabel
    ? `${availabilityLabel}, ${deliveryLabel}`
    : availabilityLabel
}
