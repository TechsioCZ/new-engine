import type { Cart, CartLineItem } from "@/services/cart-service"

export function getOptimisticFlag(
  entity: Cart | CartLineItem | undefined | null,
): boolean {
  if (!entity) {
    return false
  }
  return "_optimistic" in entity ? entity._optimistic === true : false
}
