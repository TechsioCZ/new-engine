import type { Cart, CartLineItem } from "@/types/cart"

export function getOptimisticFlag(
  entity: Cart | CartLineItem | undefined | null
): boolean {
  if (!entity) {
    return false
  }
  return "_optimistic" in entity ? entity._optimistic === true : false
}
