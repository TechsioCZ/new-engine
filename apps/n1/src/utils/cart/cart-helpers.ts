import type { Cart, CartLineItem } from "@/services/cart-service"

type OptimisticEntity = Cart | CartLineItem
type OptionalOptimisticEntity = OptimisticEntity | null

export const getOptimisticFlag = (
  entity?: OptionalOptimisticEntity,
): boolean => {
  if (!entity) {
    return false
  }
  return "_optimistic" in entity ? entity._optimistic === true : false
}
