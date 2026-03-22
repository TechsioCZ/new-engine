import type { StoreProductVariant } from "@medusajs/types"
import type { ProductVariant } from "@/types/product"

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock"

export type InventoryInfo = {
  status: StockStatus
  quantity: number
  message: string
}

export function isVariantPurchasable(
  variant: ProductVariant | StoreProductVariant | undefined | null
): boolean {
  return getVariantInventory(variant).status !== "out-of-stock"
}

export function findPreferredVariant<
  T extends ProductVariant | StoreProductVariant,
>(variants: T[] | undefined | null): T | null {
  if (!variants?.length) {
    return null
  }

  return (
    variants.find((variant) => isVariantPurchasable(variant)) ?? variants[0]
  )
}

/**
 * Get inventory info for a specific variant
 * This is the single source of truth for variant availability
 */
export function getVariantInventory(
  variant: ProductVariant | StoreProductVariant | undefined | null
): InventoryInfo {
  if (!variant) {
    return {
      status: "out-of-stock",
      quantity: 0,
      message: "Varianta není dostupná",
    }
  }

  // Check manage_inventory flag
  // If inventory is not managed, always return in stock
  if (!variant.manage_inventory) {
    return {
      status: "in-stock",
      quantity: 999, // Unlimited stock
      message: "Skladem",
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
        status: "out-of-stock",
        quantity: 0,
        message: "Vyprodáno",
      }
    }
    if (quantity <= 5) {
      return {
        status: "low-stock",
        quantity,
        message: `Zbývá pouze ${quantity} kusů`,
      }
    }
    return {
      status: "in-stock",
      quantity,
      message: "Skladem",
    }
  }

  // Fallback: If manage_inventory is true but we don't have inventory_quantity
  // Check allow_backorder flag
  if (variant.allow_backorder) {
    return {
      status: "in-stock",
      quantity: 999, // Can order even if out of stock
      message: "Skladem (na objednávku)",
    }
  }

  // Conservative approach: if manage_inventory is true and allow_backorder is false,
  // we assume it's in stock to avoid blocking purchases
  return {
    status: "in-stock",
    quantity: 10, // Reasonable default
    message: "Skladem",
  }
}

/**
 * Check if a specific quantity is available for a variant
 */
export function isQuantityAvailable(
  variant: ProductVariant | StoreProductVariant | undefined | null,
  requestedQuantity: number
): boolean {
  if (!variant || requestedQuantity <= 0) {
    return false
  }

  const inventory = getVariantInventory(variant)
  return inventory.quantity >= requestedQuantity
}
