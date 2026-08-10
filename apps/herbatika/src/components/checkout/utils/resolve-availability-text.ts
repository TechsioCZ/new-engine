import type { HttpTypes } from "@medusajs/types"
import { getRecordValue } from "@techsio/std/object"

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

const resolveLineItemTopOffer = (
  item: HttpTypes.StoreCartLineItem,
  product?: HttpTypes.StoreProduct | null,
) => {
  const itemRecord = asStorefrontRecord(item)
  const metadata = asStorefrontRecord(
    itemRecord === null ? undefined : getRecordValue(itemRecord, "metadata"),
  )
  const itemProduct = asStorefrontRecord(
    itemRecord === null ? undefined : getRecordValue(itemRecord, "product"),
  )
  const itemProductMetadata = asStorefrontRecord(
    itemProduct === null ? undefined : getRecordValue(itemProduct, "metadata"),
  )

  return (
    resolveProductTopOffer(product) ??
    asStorefrontRecord(
      metadata === null ? undefined : getRecordValue(metadata, "top_offer"),
    ) ??
    asStorefrontRecord(
      itemProductMetadata === null
        ? undefined
        : getRecordValue(itemProductMetadata, "top_offer"),
    )
  )
}

export const resolveOriginalLineItemTotalAmount = (
  item: HttpTypes.StoreCartLineItem,
  product?: HttpTypes.StoreProduct | null,
) => {
  const itemRecord = asStorefrontRecord(item)
  const topOffer = resolveLineItemTopOffer(item, product)
  const compareAtUnit = asStorefrontNumber(
    itemRecord === null
      ? undefined
      : getRecordValue(itemRecord, "compare_at_unit_price"),
  )

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
  product?: HttpTypes.StoreProduct | null,
) => {
  const topOffer = resolveLineItemTopOffer(item, product)
  const stock = asStorefrontRecord(
    topOffer === null ? undefined : getRecordValue(topOffer, "stock"),
  )
  const stockAmount =
    resolveLineItemInventory(item) ??
    asStorefrontNumber(
      stock === null ? undefined : getRecordValue(stock, "amount"),
    )
  const isInStock = stockAmount === null ? true : stockAmount > 0

  if (!isInStock) {
    return (
      asStorefrontString(
        topOffer === null
          ? undefined
          : getRecordValue(topOffer, "availability_out_of_stock"),
      ) ?? "Momentálne nie je skladom"
    )
  }

  const availabilityLabel =
    asStorefrontString(
      topOffer === null
        ? undefined
        : getRecordValue(topOffer, "availability_in_stock"),
    ) ?? "Na sklade"
  const deliveryLabel = asStorefrontString(
    topOffer === null ? undefined : getRecordValue(topOffer, "delivery_label"),
  )

  return deliveryLabel !== null && deliveryLabel.length > 0
    ? `${availabilityLabel}, ${deliveryLabel}`
    : availabilityLabel
}
