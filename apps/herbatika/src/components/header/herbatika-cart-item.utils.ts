import type { HttpTypes } from "@medusajs/types"
import { isRecord } from "@techsio/std/object"

import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"
import { asFiniteNumber } from "@/lib/storefront/cart-calculations"
import { resolveDefaultStockInventoryQuantity } from "@/lib/storefront/default-stock-availability"

export const FALLBACK_MAX_QUANTITY = 99

const inventoryQuantityKey = "inventory_quantity"
const variantInventoryQuantityKey = "variant_inventory_quantity"

export const resolveLineItemProductHandle = (
  item: HttpTypes.StoreCartLineItem,
) => {
  const itemRecord = isRecord(item) ? item : null
  return typeof itemRecord?.product_handle === "string"
    ? itemRecord.product_handle
    : null
}

export const resolveLineItemHref = (item: HttpTypes.StoreCartLineItem) => {
  const productHandle = resolveLineItemProductHandle(item)

  if (
    productHandle !== null &&
    productHandle !== undefined &&
    productHandle !== ""
  ) {
    return `/p/${productHandle}`
  }

  return "/checkout/kosik"
}

export const resolveLineItemInventory = (item: HttpTypes.StoreCartLineItem) => {
  const itemRecord = isRecord(item) ? item : null
  const metadata = isRecord(itemRecord?.metadata) ? itemRecord.metadata : null
  const variant = isRecord(itemRecord?.variant) ? itemRecord.variant : null

  const defaultStockInventory = resolveDefaultStockInventoryQuantity(variant)
  if (defaultStockInventory !== null) {
    return defaultStockInventory
  }

  const metadataInventory = asFiniteNumber(metadata?.[inventoryQuantityKey])
  if (metadataInventory !== null) {
    return metadataInventory
  }

  const variantInventory = asFiniteNumber(variant?.[inventoryQuantityKey])
  if (variantInventory !== null) {
    return variantInventory
  }

  return asFiniteNumber(itemRecord?.[variantInventoryQuantityKey])
}

export const resolveLineItemThumbnail = (item: HttpTypes.StoreCartLineItem) => {
  if (typeof item.thumbnail === "string" && item.thumbnail.length > 0) {
    return item.thumbnail
  }

  return FALLBACK_IMAGE_SRC
}
