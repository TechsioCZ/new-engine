import type { Cart } from "@/types/cart"
import {
  resolveVariantAvailability,
  type VariantAvailabilityInput,
} from "@/utils/product-availability"

export type CartValidationResult =
  | {
      valid: true
      currentQuantity: number
      availableQuantity: number
    }
  | {
      valid: false
      error: "insufficient_stock"
      currentQuantity: number
      availableQuantity: number
      requestedTotal: number
    }

/**
 * Validates if a variant can be added to cart based on inventory.
 * Checks both current cart quantity and new quantity against available stock.
 *
 * @param cart - Current cart state
 * @param variantId - Variant ID to add
 * @param quantity - Quantity to add
 * @param variant - Variant availability data (inventory, backorder, tracking)
 * @returns Validation result with stock details
 *
 * @example
 * const result = validateAddToCart({
 *   cart,
 *   variantId: 'variant_123',
 *   quantity: 2,
 *   variant: { inventory_quantity: 5, manage_inventory: true, allow_backorder: false }
 * })
 *
 * if (!result.valid) {
 *   toast.stockError(result.availableQuantity, result.requestedTotal)
 *   return
 * }
 */
export function validateAddToCart({
  cart,
  variantId,
  quantity,
  variant,
}: {
  cart: Cart | null | undefined
  variantId: string
  quantity: number
  variant?: VariantAvailabilityInput | null
}): CartValidationResult {
  // Find current quantity in cart for this variant
  const currentQuantity =
    cart?.items?.find((item) => item.variant_id === variantId)?.quantity || 0

  const requestedTotal = currentQuantity + quantity
  const availability = resolveVariantAvailability(variant)
  const availableQuantity =
    availability.availableQuantity ?? Number.POSITIVE_INFINITY

  // Check if total quantity exceeds available stock
  if (!availability.isPurchasable || requestedTotal > availableQuantity) {
    return {
      valid: false,
      error: "insufficient_stock",
      currentQuantity,
      availableQuantity,
      requestedTotal,
    }
  }

  return {
    valid: true,
    currentQuantity,
    availableQuantity,
  }
}
