import type { HttpTypes } from "@medusajs/types"
import {
  asStorefrontBoolean,
  asStorefrontNumber,
  asStorefrontRecord,
} from "./product-pricing"

export const DEFAULT_MAX_PURCHASE_QUANTITY = 50

export type VariantInventoryState = {
  allowBackorder: boolean
  availableQuantity: number | null
  hasPrice: boolean
  isInventoryKnown: boolean
  hasVariant: boolean
  inventoryQuantity: number | null
  isInStock: boolean
  isPurchasable: boolean
  manageInventory: boolean
  maxPurchaseQuantity: number
}

const resolveRequestedQuantity = (quantity: number) => {
  if (!Number.isFinite(quantity) || quantity < 1) {
    return 1
  }

  return Math.floor(quantity)
}

export const resolveVariantInventoryState = (
  variant?: HttpTypes.StoreProductVariant | null,
  quantity = 1
): VariantInventoryState => {
  const variantRecord = asStorefrontRecord(variant)
  const requestedQuantity = resolveRequestedQuantity(quantity)
  const hasVariant = Boolean(variant?.id)
  const hasPrice =
    asStorefrontNumber(variant?.calculated_price?.calculated_amount) !== null
  const allowBackorder =
    asStorefrontBoolean(variantRecord?.allow_backorder) === true
  const manageInventory =
    asStorefrontBoolean(variantRecord?.manage_inventory) !== false
  const inventoryQuantity = asStorefrontNumber(
    variantRecord?.inventory_quantity
  )
  const hasInventoryQuantity = inventoryQuantity !== null

  if (!(hasVariant && hasPrice)) {
    return {
      allowBackorder,
      availableQuantity: 0,
      hasPrice,
      isInventoryKnown: hasInventoryQuantity,
      hasVariant,
      inventoryQuantity,
      isInStock: false,
      isPurchasable: false,
      manageInventory,
      maxPurchaseQuantity: 1,
    }
  }

  if (allowBackorder || !manageInventory) {
    return {
      allowBackorder,
      availableQuantity: null,
      hasPrice,
      isInventoryKnown: true,
      hasVariant,
      inventoryQuantity,
      isInStock: true,
      isPurchasable: true,
      manageInventory,
      maxPurchaseQuantity: DEFAULT_MAX_PURCHASE_QUANTITY,
    }
  }

  if (!hasInventoryQuantity) {
    return {
      allowBackorder,
      availableQuantity: 0,
      hasPrice,
      isInventoryKnown: false,
      hasVariant,
      inventoryQuantity,
      isInStock: false,
      isPurchasable: false,
      manageInventory,
      maxPurchaseQuantity: 1,
    }
  }

  const availableQuantity = Math.max(0, Math.floor(inventoryQuantity ?? 0))
  const isInStock = availableQuantity > 0

  return {
    allowBackorder,
    availableQuantity,
    hasPrice,
    isInventoryKnown: true,
    hasVariant,
    inventoryQuantity,
    isInStock,
    isPurchasable: isInStock && requestedQuantity <= availableQuantity,
    manageInventory,
    maxPurchaseQuantity: Math.max(
      1,
      Math.min(DEFAULT_MAX_PURCHASE_QUANTITY, availableQuantity)
    ),
  }
}
