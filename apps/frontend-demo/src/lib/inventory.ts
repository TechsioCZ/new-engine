import type { StoreProductVariant } from "@medusajs/types"

import type { ProductVariant } from "@/types/product"

type StockStatus = "in-stock" | "low-stock" | "out-of-stock"
type InventoryVariant = ProductVariant | StoreProductVariant
type MaybeInventoryVariant = InventoryVariant | null

export interface InventoryInfo {
  status: StockStatus
  quantity: number
  message: string
}

/**
 * Get inventory info for a specific variant
 * This is the single source of truth for variant availability
 */
export const getVariantInventory = (
  variant?: MaybeInventoryVariant,
): InventoryInfo => {
  if (variant === undefined || variant === null) {
    return {
      message: "Varianta není dostupná",
      quantity: 0,
      status: "out-of-stock",
    }
  }

  // Check manage_inventory flag
  // If inventory is not managed, always return in stock
  if (variant.manage_inventory !== true) {
    // Unmanaged inventory has no finite stock limit.
    return {
      message: "Skladem",
      quantity: 999,
      status: "in-stock",
    }
  }

  // Check if we have actual inventory_quantity from API
  if (
    "inventory_quantity" in variant &&
    typeof variant.inventory_quantity === "number"
  ) {
    const quantity = variant.inventory_quantity

    if (quantity <= 0) {
      return {
        message: "Vyprodáno",
        quantity: 0,
        status: "out-of-stock",
      }
    }
    if (quantity <= 5) {
      return {
        message: `Zbývá pouze ${quantity} kusů`,
        quantity,
        status: "low-stock",
      }
    }
    return {
      message: "Skladem",
      quantity,
      status: "in-stock",
    }
  }

  // Fallback: If manage_inventory is true but we don't have inventory_quantity
  // Check allow_backorder flag
  if (variant.allow_backorder === true) {
    // Backorders can be placed even with no current stock.
    return {
      message: "Skladem (na objednávku)",
      quantity: 999,
      status: "in-stock",
    }
  }

  // Conservative approach: if manage_inventory is true and allow_backorder is false,
  // we assume it's in stock to avoid blocking purchases
  // Use a bounded fallback when the API omits managed inventory quantity.
  return {
    message: "Skladem",
    quantity: 10,
    status: "in-stock",
  }
}

/**
 * Check if a specific quantity is available for a variant
 */
export const isQuantityAvailable = (
  variant: MaybeInventoryVariant | undefined,
  requestedQuantity: number,
): boolean => {
  if (variant === undefined || variant === null || requestedQuantity <= 0) {
    return false
  }

  const inventory = getVariantInventory(variant)
  return inventory.quantity >= requestedQuantity
}
