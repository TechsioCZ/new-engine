import type { HttpTypes } from "@medusajs/types"
import { useQueryClient } from "@tanstack/react-query"
import {
  createDefaultActiveCartQueryMatcher,
  invalidateCartCaches,
  syncCartCaches,
} from "../cart/cache-sync"
import type { MedusaCompleteCartResult } from "../cart/medusa-service"
import type { CartInputBase, CartStorage } from "../cart/types"
import type { MedusaStorefrontPreset } from "./preset"

type MedusaCartFlowStorefront = {
  hooks: {
    cart: {
      useCart: MedusaStorefrontPreset["hooks"]["cart"]["useCart"]
      useSuspenseCart: MedusaStorefrontPreset["hooks"]["cart"]["useSuspenseCart"]
      useAddLineItem: MedusaStorefrontPreset["hooks"]["cart"]["useAddLineItem"]
      useUpdateLineItem: MedusaStorefrontPreset["hooks"]["cart"]["useUpdateLineItem"]
      useRemoveLineItem: MedusaStorefrontPreset["hooks"]["cart"]["useRemoveLineItem"]
      useCompleteCart: MedusaStorefrontPreset["hooks"]["cart"]["useCompleteCart"]
    }
  }
  queryKeys: {
    cart: MedusaStorefrontPreset["queryKeys"]["cart"]
    checkout: MedusaStorefrontPreset["queryKeys"]["checkout"]
    orders: MedusaStorefrontPreset["queryKeys"]["orders"]
  }
  services: {
    cart: {
      retrieveCart: MedusaStorefrontPreset["services"]["cart"]["retrieveCart"]
    }
  }
}

export type MedusaCartMutationError = {
  message: string
  code?: string
}

export type MedusaCompleteCartFlowError = {
  message: string
  type: string
  name?: string
}

export type UseMedusaCartReturn = {
  cart: HttpTypes.StoreCart | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

export type UseMedusaSuspenseCartReturn = {
  cart: HttpTypes.StoreCart | null
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

export type UseMedusaCartMutationOptions = {
  onSuccess?: (cart: HttpTypes.StoreCart) => void
  onError?: (error: MedusaCartMutationError) => void
}

export type UseMedusaCompleteCartOptions = {
  onSuccess?: (order: HttpTypes.StoreOrder) => void
  onError?: (
    error: MedusaCompleteCartFlowError,
    cart: HttpTypes.StoreCart
  ) => void
  onRequestError?: (error: unknown) => void
}

export type CreateMedusaCartFlowConfig = {
  storefront: MedusaCartFlowStorefront
  cartStorage?: CartStorage
}

export type UseMedusaCartInput = Omit<CartInputBase, "cartId"> & {
  cartId?: string
}

const toCartMutationError = (error: unknown): MedusaCartMutationError => {
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

const isRenderableCartItem = (item: unknown): boolean => {
  if (!item || typeof item !== "object") {
    return false
  }

  const candidate = item as { id?: unknown; quantity?: unknown }
  return (
    typeof candidate.id === "string" && typeof candidate.quantity === "number"
  )
}

const isRenderableCart = (cart: HttpTypes.StoreCart): boolean => {
  if (!Array.isArray(cart.items)) {
    return false
  }

  return cart.items.every(isRenderableCartItem)
}

export function createMedusaCartFlow({
  storefront,
  cartStorage,
}: CreateMedusaCartFlowConfig) {
  const cartHooks = storefront.hooks.cart
  const cartQueryKeys = storefront.queryKeys.cart
  const checkoutQueryKeys = storefront.queryKeys.checkout
  const orderQueryKeys = storefront.queryKeys.orders
  const isActiveCartQueryKey = createDefaultActiveCartQueryMatcher(cartQueryKeys)

  const retrieveCartById = (cartId: string, signal?: AbortSignal) =>
    storefront.services.cart.retrieveCart(cartId, signal)

  const fetchCanonicalCart = async (
    cartId: string
  ): Promise<HttpTypes.StoreCart | null> => {
    try {
      return await retrieveCartById(cartId)
    } catch {
      return null
    }
  }

  const resolveRenderableCart = async (
    cart: HttpTypes.StoreCart
  ): Promise<HttpTypes.StoreCart> => {
    if (isRenderableCart(cart)) {
      return cart
    }

    const canonicalCart = await fetchCanonicalCart(cart.id)
    if (canonicalCart && isRenderableCart(canonicalCart)) {
      return canonicalCart
    }

    return cart
  }

  const clearCompletedCart = (
    queryClient: ReturnType<typeof useQueryClient>,
    cartId: string | null
  ) => {
    cartStorage?.clearCartId()

    if (!cartId) {
      return
    }

    queryClient.removeQueries({
      predicate: (query) => isActiveCartQueryKey(query.queryKey, cartId),
    })
    queryClient.removeQueries({
      queryKey: cartQueryKeys.detail(cartId),
    })
    queryClient.removeQueries({
      queryKey: checkoutQueryKeys.shippingOptions(cartId),
    })
  }

  const buildMutationHandlers = (
    queryClient: ReturnType<typeof useQueryClient>,
    options?: UseMedusaCartMutationOptions
  ) => ({
    onSuccess: async (cart: HttpTypes.StoreCart) => {
      const resolvedCart = await resolveRenderableCart(cart)
      if (resolvedCart !== cart) {
        syncCartCaches(queryClient, cartQueryKeys, resolvedCart)
        invalidateCartCaches(queryClient, cartQueryKeys, resolvedCart.id)
      }
      options?.onSuccess?.(resolvedCart)
    },
    onError: (error: unknown) => {
      options?.onError?.(toCartMutationError(error))
    },
  })

  function useCart(input?: UseMedusaCartInput): UseMedusaCartReturn {
    const { cart, isLoading, error, itemCount, isEmpty, hasItems } =
      cartHooks.useCart({
        autoCreate: false,
        autoUpdateRegion: false,
        ...(input ?? {}),
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

  function useSuspenseCart(
    input?: UseMedusaCartInput
  ): UseMedusaSuspenseCartReturn {
    const { cart, itemCount, isEmpty, hasItems } = cartHooks.useSuspenseCart({
      autoCreate: false,
      autoUpdateRegion: false,
      ...(input ?? {}),
    })

    return {
      cart,
      itemCount,
      isEmpty,
      hasItems,
    }
  }

  function useAddToCart(options?: UseMedusaCartMutationOptions) {
    const queryClient = useQueryClient()
    return cartHooks.useAddLineItem(buildMutationHandlers(queryClient, options))
  }

  function useUpdateLineItem(options?: UseMedusaCartMutationOptions) {
    const queryClient = useQueryClient()
    return cartHooks.useUpdateLineItem(buildMutationHandlers(queryClient, options))
  }

  function useRemoveLineItem(options?: UseMedusaCartMutationOptions) {
    const queryClient = useQueryClient()
    return cartHooks.useRemoveLineItem(buildMutationHandlers(queryClient, options))
  }

  function useCompleteCart(options?: UseMedusaCompleteCartOptions) {
    const queryClient = useQueryClient()

    return cartHooks.useCompleteCart({
      onSuccess: (
        result: MedusaCompleteCartResult,
        variables: { cartId?: string }
      ) => {
        if (result.type === "order") {
          const completedCartId = variables.cartId ?? cartStorage?.getCartId() ?? null

          clearCompletedCart(queryClient, completedCartId)
          queryClient.invalidateQueries({ queryKey: cartQueryKeys.all() })
          queryClient.invalidateQueries({ queryKey: checkoutQueryKeys.all() })

          if (result.order.region_id) {
            queryClient.invalidateQueries({
              queryKey: checkoutQueryKeys.paymentProviders(result.order.region_id),
            })
          }

          queryClient.setQueryData(
            orderQueryKeys.detail({ id: result.order.id }),
            result.order
          )
          queryClient.invalidateQueries({ queryKey: orderQueryKeys.all() })

          options?.onSuccess?.(result.order)
          return
        }

        syncCartCaches(queryClient, cartQueryKeys, result.cart)
        options?.onError?.(result.error, result.cart)
      },
      onError: (error) => {
        options?.onRequestError?.(error)
      },
    })
  }

  return {
    useCart,
    useSuspenseCart,
    useAddToCart,
    useUpdateLineItem,
    useRemoveLineItem,
    useCompleteCart,
  }
}
