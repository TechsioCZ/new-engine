import type { HttpTypes } from "@medusajs/types"
import { useQueryClient } from "@tanstack/react-query"
import type { MedusaCompleteCartResult } from "@techsio/storefront-data/cart/medusa-service"
import { useSyncExternalStore } from "react"
import { invalidateCartCaches, syncCartCaches } from "./cart-cache-sync"
import { cartHooks, cartStorage, retrieveCartById } from "./cart-hooks-base"
import { useRegion, useSuspenseRegion } from "./use-region"
import { queryKeys } from "@/lib/query-keys"
import type { Cart } from "@/types/cart"

type CartMutationError = {
  message: string
  code?: string
}

type UseCartReturn = {
  cart: Cart | null | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

type UseSuspenseCartReturn = {
  cart: Cart | null | undefined
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

type UseAddToCartOptions = {
  onSuccess?: (cart: Cart) => void
  onError?: (error: CartMutationError) => void
}

type UseCartMutationOptions = {
  onSuccess?: (cart: Cart) => void
  onError?: (error: CartMutationError) => void
}

type UseCompleteCartOptions = {
  onSuccess?: (order: HttpTypes.StoreOrder) => void
  onError?: (
    error: { message: string; type: string; name?: string },
    cart: Cart
  ) => void
}

const toCartMutationError = (error: unknown): CartMutationError => {
  if (error && typeof error === "object") {
    const withMessage = error as { message?: unknown; code?: unknown }

    if (typeof withMessage.message === "string") {
      return {
        message: withMessage.message,
        code: typeof withMessage.code === "string" ? withMessage.code : undefined,
      }
    }
  }

  if (typeof error === "string") {
    return { message: error }
  }

  return { message: "An unknown error occurred" }
}

const useStoredCartId = () =>
  useSyncExternalStore(
    cartStorage.subscribe,
    cartStorage.getSnapshot,
    cartStorage.getServerSnapshot
  )

const isRenderableCartItem = (item: unknown): boolean => {
  if (!item || typeof item !== "object") {
    return false
  }

  const candidate = item as { id?: unknown; quantity?: unknown }
  return (
    typeof candidate.id === "string" && typeof candidate.quantity === "number"
  )
}

const isRenderableCart = (cart: Cart): boolean => {
  if (!Array.isArray(cart.items)) {
    return false
  }

  return cart.items.every(isRenderableCartItem)
}

const fetchCanonicalCart = async (cartId: string): Promise<Cart | null> => {
  try {
    return (await retrieveCartById(cartId)) as Cart | null
  } catch {
    return null
  }
}

const resolveRenderableCart = async (cart: Cart): Promise<Cart> => {
  if (isRenderableCart(cart)) {
    return cart
  }

  const canonicalCart = await fetchCanonicalCart(cart.id)
  if (canonicalCart && isRenderableCart(canonicalCart)) {
    return canonicalCart
  }

  return cart
}

const buildCartMutationHandlers = (
  queryClient: ReturnType<typeof useQueryClient>,
  options?: UseAddToCartOptions | UseCartMutationOptions
) => ({
  onSuccess: async (cart: Cart) => {
    const resolvedCart = await resolveRenderableCart(cart)

    if (isRenderableCart(resolvedCart)) {
      syncCartCaches(queryClient, resolvedCart)
    }

    invalidateCartCaches(queryClient, resolvedCart.id)
    options?.onSuccess?.(resolvedCart)
  },
  onError: (error: unknown) => {
    options?.onError?.(toCartMutationError(error))
  },
})

export function useCart(): UseCartReturn {
  const { regionId, countryCode } = useRegion()
  const cartId = useStoredCartId()

  const { cart, isLoading, error, itemCount, isEmpty, hasItems } =
    cartHooks.useCart({
      cartId: cartId ?? undefined,
      region_id: regionId,
      country_code: countryCode,
      autoCreate: false,
      autoUpdateRegion: false,
    })

  return {
    cart,
    isLoading,
    isError: Boolean(error),
    error: error ? new Error(error) : null,
    itemCount,
    isEmpty,
    hasItems,
  }
}

export function useSuspenseCart(): UseSuspenseCartReturn {
  const { regionId, countryCode } = useSuspenseRegion()
  const cartId = useStoredCartId()

  const { cart, itemCount, isEmpty, hasItems } = cartHooks.useSuspenseCart({
    cartId: cartId ?? undefined,
    region_id: regionId,
    country_code: countryCode,
    autoCreate: false,
    autoUpdateRegion: false,
  })

  return {
    cart,
    itemCount,
    isEmpty,
    hasItems,
  }
}

export function useAddToCart(options?: UseAddToCartOptions) {
  const queryClient = useQueryClient()

  return cartHooks.useAddLineItem(buildCartMutationHandlers(queryClient, options))
}

export function useUpdateLineItem(options?: UseCartMutationOptions) {
  const queryClient = useQueryClient()

  return cartHooks.useUpdateLineItem(
    buildCartMutationHandlers(queryClient, options)
  )
}

export function useRemoveLineItem(options?: UseCartMutationOptions) {
  const queryClient = useQueryClient()

  return cartHooks.useRemoveLineItem(
    buildCartMutationHandlers(queryClient, options)
  )
}

export function useCompleteCart(options?: UseCompleteCartOptions) {
  const queryClient = useQueryClient()

  return cartHooks.useCompleteCart({
    onSuccess: (result: MedusaCompleteCartResult) => {
      if (result.type === "order") {
        const completedCartId = cartStorage.getCartId()

        cartStorage.clearCartId()
        queryClient.removeQueries({ queryKey: [...queryKeys.cart.all(), "active"] })
        if (completedCartId) {
          queryClient.removeQueries({
            queryKey: queryKeys.cart.detail(completedCartId),
          })
          queryClient.removeQueries({
            queryKey: queryKeys.cart.shippingOptions(completedCartId),
          })
        }

        queryClient.invalidateQueries({ queryKey: queryKeys.cart.all() })
        queryClient.invalidateQueries({ queryKey: queryKeys.checkout.all() })
        if (result.order.region_id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.checkout.paymentProviders(result.order.region_id),
          })
        }

        queryClient.setQueryData(queryKeys.orders.detail(result.order.id), result.order)
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })

        options?.onSuccess?.(result.order)
        return
      }

      queryClient.setQueryData(
        queryKeys.cart.active({
          cartId: result.cart.id,
          regionId: result.cart.region_id ?? null,
        }),
        result.cart
      )

      options?.onError?.(result.error, result.cart)
    },
    onError: (error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[useCompleteCart] Failed to complete cart:", error)
      }
    },
  })
}
