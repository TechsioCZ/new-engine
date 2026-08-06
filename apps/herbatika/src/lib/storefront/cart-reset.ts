import type { HttpTypes } from "@medusajs/types"
import type { QueryClient } from "@tanstack/react-query"
import { isRecord } from "@techsio/std/object"

import { cartStorage } from "./cart-storage"
import { storefrontQueryKeys } from "./storefront-config"

const queryKeyContainsCartId = (value: unknown, cartId: string): boolean => {
  if (value === cartId) {
    return true
  }

  if (Array.isArray(value)) {
    return value.some((item) => queryKeyContainsCartId(item, cartId))
  }

  if (isRecord(value)) {
    return Object.values(value).some((item) =>
      queryKeyContainsCartId(item, cartId),
    )
  }

  return false
}

export const resetEmptyCartState = (
  queryClient: QueryClient,
  cart: HttpTypes.StoreCart | null | undefined,
): boolean => {
  if (cart === null || cart === undefined) {
    return false
  }
  if (cart.id === null || cart.id === undefined || cart.id.length === 0) {
    return false
  }
  if (!Array.isArray(cart.items) || cart.items.length > 0) {
    return false
  }

  if (cartStorage.getCartId() === cart.id) {
    cartStorage.clearCartId()
  }

  queryClient.removeQueries({
    queryKey: storefrontQueryKeys.cart.all(),
  })
  queryClient.removeQueries({
    predicate: (query) => queryKeyContainsCartId(query.queryKey, cart.id),
  })

  return true
}
