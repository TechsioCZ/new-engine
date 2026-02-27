import type { Cart } from "@/types/cart"

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
 * @param inventoryQuantity - Available inventory (undefined = unlimited)
 * @returns Validation result with stock details
 *
 * @example
 * const result = validateAddToCart({
 *   cart,
 *   variantId: 'variant_123',
 *   quantity: 2,
 *   inventoryQuantity: 5
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
  inventoryQuantity,
}: {
  cart: Cart | null | undefined
  variantId: string
  quantity: number
  inventoryQuantity?: number
}): CartValidationResult {
  // Find current quantity in cart for this variant
  const currentQuantity =
    cart?.items?.find((item) => item.variant_id === variantId)?.quantity || 0

  const requestedTotal = currentQuantity + quantity
  const availableQuantity = inventoryQuantity ?? Number.POSITIVE_INFINITY

  // Check if total quantity exceeds available stock
  if (requestedTotal > availableQuantity) {
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
