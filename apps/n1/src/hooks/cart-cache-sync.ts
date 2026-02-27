import type { QueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import type { Cart } from "@/types/cart"

type CartUpdater = (cart: Cart) => Cart

const isCartObject = (value: unknown): value is Cart =>
  Boolean(value && typeof value === "object")

export const isActiveCartQueryKeyForCart = (
  queryKey: readonly unknown[],
  cartId: string
): boolean =>
  queryKey[0] === queryKeys.all[0] &&
  queryKey[1] === "cart" &&
  queryKey[2] === "active" &&
  queryKey[3] === cartId

export const syncCartCaches = (queryClient: QueryClient, cart: Cart) => {
  queryClient.setQueriesData(
    {
      predicate: (query) => isActiveCartQueryKeyForCart(query.queryKey, cart.id),
    },
    cart
  )

  queryClient.setQueryData(queryKeys.cart.detail(cart.id), cart)
}

export const invalidateCartCaches = (queryClient: QueryClient, cartId: string) => {
  queryClient.invalidateQueries({
    predicate: (query) => isActiveCartQueryKeyForCart(query.queryKey, cartId),
  })
  queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail(cartId) })
}

export const patchCartCaches = (
  queryClient: QueryClient,
  cartId: string,
  patch: CartUpdater
) => {
  queryClient.setQueriesData<Cart>(
    {
      predicate: (query) => isActiveCartQueryKeyForCart(query.queryKey, cartId),
    },
    (existing) => (isCartObject(existing) ? patch(existing) : existing)
  )

  queryClient.setQueryData<Cart | undefined>(
    queryKeys.cart.detail(cartId),
    (existing) => (isCartObject(existing) ? patch(existing) : existing)
  )
}

export const getCachedCartById = (
  queryClient: QueryClient,
  cartId: string
): Cart | null => {
  const detailCart = queryClient.getQueryData<Cart>(queryKeys.cart.detail(cartId))
  if (isCartObject(detailCart)) {
    return detailCart
  }

  const activeCarts = queryClient.getQueriesData<Cart>({
    predicate: (query) => isActiveCartQueryKeyForCart(query.queryKey, cartId),
  })

  for (const [, cachedCart] of activeCarts) {
    if (isCartObject(cachedCart)) {
      return cachedCart
    }
  }

  return null
}
