import type { HttpTypes } from "@medusajs/types"
import type { QueryClient } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import {
  type ActiveCartQueryKeyMatcher,
  createDefaultActiveCartQueryMatcher,
  invalidateCartCaches,
  syncCartCaches,
} from "../cart/cache-sync"
import type { MedusaCompleteCartResult } from "../cart/medusa-service"
import type {
  AddLineItemInputBase,
  CartInputBase,
  CartQueryKeys,
  RemoveLineItemInputBase,
  UpdateLineItemInputBase,
  UseCartResult,
  UseSuspenseCartResult,
} from "../cart/types"
import type { StorageValueStore } from "../shared/browser-storage"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"

type MedusaCartMutationHook<TInput> = (options?: {
  onSuccess?: (cart: HttpTypes.StoreCart) => void | Promise<void>
  onError?: (error: unknown) => void
}) => {
  mutate: (
    input: TInput,
    options?: {
      onSuccess?: (cart: HttpTypes.StoreCart) => void
      onError?: (error: MedusaCartMutationError) => void
    }
  ) => void
  mutateAsync: (input: TInput) => Promise<HttpTypes.StoreCart>
  isPending: boolean
}

type MedusaCompleteCartHook = (options?: {
  onMutate?: (variables: { cartId?: string }) => unknown
  onSuccess?: (
    result: MedusaCompleteCartResult,
    variables: { cartId?: string },
    context: unknown
  ) => void
  onError?: (error: unknown) => void
}) => {
  mutateAsync: (input: { cartId?: string }) => Promise<MedusaCompleteCartResult>
  isPending: boolean
}

export type MedusaCartFlowStorefront = {
  hooks: {
    cart: {
      useCart: (
        input: CartInputBase,
        options?: {
          queryOptions?: ReadQueryOptions<HttpTypes.StoreCart | null>
        }
      ) => UseCartResult<HttpTypes.StoreCart>
      useSuspenseCart: (
        input: CartInputBase,
        options?: {
          queryOptions?: SuspenseQueryOptions<HttpTypes.StoreCart | null>
        }
      ) => UseSuspenseCartResult<HttpTypes.StoreCart>
      useAddLineItem: MedusaCartMutationHook<AddLineItemInputBase>
      useUpdateLineItem: MedusaCartMutationHook<UpdateLineItemInputBase>
      useRemoveLineItem: MedusaCartMutationHook<RemoveLineItemInputBase>
      useCompleteCart: MedusaCompleteCartHook
    }
  }
  queryKeys: {
    cart: CartQueryKeys
    checkout: {
      all: () => readonly unknown[]
      shippingOptions: (cartId: string) => readonly unknown[]
      paymentProviders: (regionId: string) => readonly unknown[]
    }
    orders: {
      all: () => readonly unknown[]
      detail: (params: { id: string }) => readonly unknown[]
    }
  }
  services: {
    cart: {
      retrieveCart: (
        cartId: string,
        signal?: AbortSignal
      ) => Promise<HttpTypes.StoreCart | null>
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
  cartStorage?: StorageValueStore
  isActiveCartQueryKey?: ActiveCartQueryKeyMatcher
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
        code:
          typeof withMessage.code === "string" ? withMessage.code : undefined,
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
  isActiveCartQueryKey: customActiveCartQueryKeyMatcher,
}: CreateMedusaCartFlowConfig) {
  const cartHooks = storefront.hooks.cart
  const cartQueryKeys = storefront.queryKeys.cart
  const checkoutQueryKeys = storefront.queryKeys.checkout
  const orderQueryKeys = storefront.queryKeys.orders
  const isActiveCartQueryKey =
    customActiveCartQueryKeyMatcher ??
    createDefaultActiveCartQueryMatcher(cartQueryKeys)

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
    queryClient: QueryClient,
    cartId: string | null
  ) => {
    if (!cartId) {
      return
    }

    if (cartStorage?.get() === cartId) {
      cartStorage.clear()
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
    queryClient: QueryClient,
    options?: UseMedusaCartMutationOptions
  ) => ({
    onSuccess: async (cart: HttpTypes.StoreCart) => {
      const resolvedCart = await resolveRenderableCart(cart)
      if (resolvedCart !== cart) {
        syncCartCaches(queryClient, cartQueryKeys, resolvedCart, {
          isActiveCartQueryKey,
        })
        invalidateCartCaches(queryClient, cartQueryKeys, resolvedCart.id, {
          isActiveCartQueryKey,
        })
      }
      options?.onSuccess?.(resolvedCart)
    },
    onError: (error: unknown) => {
      options?.onError?.(toCartMutationError(error))
    },
  })

  function useNormalizedCartMutation<TInput>(
    hook: MedusaCartMutationHook<TInput>,
    options?: UseMedusaCartMutationOptions
  ) {
    const queryClient = useQueryClient()
    const mutation = hook(buildMutationHandlers(queryClient, options))
    const mutate = useCallback(
      (
        input: TInput,
        mutateOptions?: {
          onSuccess?: (cart: HttpTypes.StoreCart) => void
          onError?: (error: MedusaCartMutationError) => void
        }
      ) => {
        mutation.mutate(input, {
          onSuccess: async (cart: HttpTypes.StoreCart) => {
            const resolvedCart = await resolveRenderableCart(cart)
            mutateOptions?.onSuccess?.(resolvedCart)
          },
          onError: (error: unknown) => {
            mutateOptions?.onError?.(toCartMutationError(error))
          },
        })
      },
      [mutation, resolveRenderableCart]
    )
    const mutateAsync = useCallback(
      async (input: TInput) => {
        try {
          const cart = await mutation.mutateAsync(input)
          return await resolveRenderableCart(cart)
        } catch (error) {
          throw toCartMutationError(error)
        }
      },
      [mutation, resolveRenderableCart]
    )

    return {
      ...mutation,
      mutate,
      mutateAsync,
    }
  }

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
    return useNormalizedCartMutation(cartHooks.useAddLineItem, options)
  }

  function useUpdateLineItem(options?: UseMedusaCartMutationOptions) {
    return useNormalizedCartMutation(cartHooks.useUpdateLineItem, options)
  }

  function useRemoveLineItem(options?: UseMedusaCartMutationOptions) {
    return useNormalizedCartMutation(cartHooks.useRemoveLineItem, options)
  }

  function useCompleteCart(options?: UseMedusaCompleteCartOptions) {
    const queryClient = useQueryClient()

    return cartHooks.useCompleteCart({
      onMutate: (variables: { cartId?: string }) => ({
        completedCartId: variables.cartId ?? cartStorage?.get() ?? null,
      }),
      onSuccess: (
        result: MedusaCompleteCartResult,
        variables: { cartId?: string },
        context: unknown
      ) => {
        if (result.type === "order") {
          const contextCompletedCartId =
            context &&
            typeof context === "object" &&
            "completedCartId" in context
              ? (context as { completedCartId?: unknown }).completedCartId
              : undefined
          const completedCartIdFromContext =
            typeof contextCompletedCartId === "string" ||
            contextCompletedCartId === null
              ? contextCompletedCartId
              : undefined
          const completedCartId =
            completedCartIdFromContext ?? variables.cartId ?? null

          clearCompletedCart(queryClient, completedCartId)
          queryClient.invalidateQueries({ queryKey: cartQueryKeys.all() })
          queryClient.invalidateQueries({ queryKey: checkoutQueryKeys.all() })

          if (result.order.region_id) {
            queryClient.invalidateQueries({
              queryKey: checkoutQueryKeys.paymentProviders(
                result.order.region_id
              ),
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

        syncCartCaches(queryClient, cartQueryKeys, result.cart, {
          isActiveCartQueryKey,
        })
        options?.onError?.(result.error, result.cart)
      },
      onError: (error: unknown) => {
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
