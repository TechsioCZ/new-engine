import type { HttpTypes } from "@medusajs/types"
import type { QueryClient } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { isRecord, omitUndefined } from "@techsio/std/object"

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
import {
  createDefaultActiveCartQueryMatcher,
  invalidateCartCaches,
  syncCartCaches,
} from "../shared/cart-cache-sync"
import type { ActiveCartQueryKeyMatcher } from "../shared/cart-cache-sync"
import { toErrorWithCode } from "../shared/error-utils"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import type { StorageValueStore } from "../shared/storage-value-store"

type MedusaCartMutationHook<TInput> = (options?: {
  onSuccess?: (cart: HttpTypes.StoreCart) => void | Promise<void>
  onError?: (error: unknown) => void
}) => {
  mutate: (
    input: TInput,
    options?: {
      onSuccess?: (cart: HttpTypes.StoreCart) => void
      onError?: (error: MedusaCartMutationError) => void
    },
  ) => void
  mutateAsync: (input: TInput) => Promise<HttpTypes.StoreCart>
  isPending: boolean
}

type MedusaCompleteCartHook = (options?: {
  onMutate?: (variables: { cartId?: string }) => unknown
  onSuccess?: (
    result: MedusaCompleteCartResult,
    variables: { cartId?: string },
    context: unknown,
  ) => void
  onError?: (error: unknown) => void
}) => {
  mutateAsync: (input: { cartId?: string }) => Promise<MedusaCompleteCartResult>
  isPending: boolean
}

export interface MedusaCartFlowStorefront {
  hooks: {
    cart: {
      useCart: (
        input: CartInputBase,
        options?: {
          queryOptions?: ReadQueryOptions<HttpTypes.StoreCart | null>
        },
      ) => UseCartResult<HttpTypes.StoreCart>
      useSuspenseCart: (
        input: CartInputBase,
        options?: {
          queryOptions?: SuspenseQueryOptions<HttpTypes.StoreCart | null>
        },
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
        signal?: AbortSignal,
      ) => Promise<HttpTypes.StoreCart | null>
    }
  }
}

export interface MedusaCartMutationError {
  message: string
  code?: string
}

export interface MedusaCompleteCartFlowError {
  message: string
  type: string
  name?: string
}

export interface UseMedusaCartReturn {
  cart: HttpTypes.StoreCart | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

export interface UseMedusaSuspenseCartReturn {
  cart: HttpTypes.StoreCart | null
  itemCount: number
  isEmpty: boolean
  hasItems: boolean
}

export interface UseMedusaCartMutationOptions {
  onSuccess?: (cart: HttpTypes.StoreCart) => void
  onError?: (error: MedusaCartMutationError) => void
}

export interface UseMedusaCompleteCartOptions {
  onSuccess?: (order: HttpTypes.StoreOrder) => void
  onError?: (
    error: MedusaCompleteCartFlowError,
    cart: HttpTypes.StoreCart,
  ) => void
  onRequestError?: (error: unknown) => void
}

export interface CreateMedusaCartFlowConfig {
  storefront: MedusaCartFlowStorefront
  cartStorage?: StorageValueStore | undefined
  isActiveCartQueryKey?: ActiveCartQueryKeyMatcher | undefined
}

export type UseMedusaCartInput = Omit<CartInputBase, "cartId"> & {
  cartId?: string
}

class MedusaCartMutationFailureError
  extends Error
  implements MedusaCartMutationError
{
  readonly code?: string

  constructor(error: MedusaCartMutationError) {
    super(error.message)
    this.name = "MedusaCartMutationFailureError"
    if (error.code !== undefined) {
      this.code = error.code
    }
  }
}

const toCartMutationError = (error: unknown): MedusaCartMutationFailureError =>
  new MedusaCartMutationFailureError(
    toErrorWithCode(error, "An unknown error occurred"),
  )

const getCompletedCartIdFromContext = (
  context: unknown,
): string | null | undefined => {
  if (!isRecord(context) || !("completedCartId" in context)) {
    return undefined
  }
  const { completedCartId } = context
  return typeof completedCartId === "string" || completedCartId === null
    ? completedCartId
    : undefined
}

const isRenderableCartItem = (item: unknown): boolean => {
  if (item === null || typeof item !== "object") {
    return false
  }

  return (
    "id" in item &&
    "quantity" in item &&
    typeof item.id === "string" &&
    typeof item.quantity === "number"
  )
}

const isRenderableCart = (cart: HttpTypes.StoreCart): boolean => {
  if (!Array.isArray(cart.items)) {
    return false
  }

  return cart.items.every(isRenderableCartItem)
}

export const createMedusaCartFlow = ({
  storefront,
  cartStorage,
  isActiveCartQueryKey: customActiveCartQueryKeyMatcher,
}: CreateMedusaCartFlowConfig) => {
  const cartHooks = storefront.hooks.cart
  const cartQueryKeys = storefront.queryKeys.cart
  const checkoutQueryKeys = storefront.queryKeys.checkout
  const orderQueryKeys = storefront.queryKeys.orders
  const isActiveCartQueryKey =
    customActiveCartQueryKeyMatcher ??
    createDefaultActiveCartQueryMatcher(cartQueryKeys)

  const retrieveCartById = async (cartId: string, signal?: AbortSignal) =>
    await storefront.services.cart.retrieveCart(cartId, signal)

  const fetchCanonicalCart = async (
    cartId: string,
  ): Promise<HttpTypes.StoreCart | null> => {
    try {
      return await retrieveCartById(cartId)
    } catch {
      return null
    }
  }

  const resolveRenderableCart = async (
    cart: HttpTypes.StoreCart,
  ): Promise<HttpTypes.StoreCart> => {
    if (isRenderableCart(cart)) {
      return cart
    }

    const canonicalCart = await fetchCanonicalCart(cart.id)
    if (canonicalCart !== null && isRenderableCart(canonicalCart)) {
      return canonicalCart
    }

    return cart
  }

  const clearCompletedCart = (
    queryClient: QueryClient,
    cartId: string | null,
  ) => {
    if (cartId === null || cartId === "") {
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
    options?: UseMedusaCartMutationOptions,
  ) => ({
    onError: (error: unknown) => {
      options?.onError?.(toCartMutationError(error))
    },
    onSuccess: async (cart: HttpTypes.StoreCart) => {
      const resolvedCart = await resolveRenderableCart(cart)
      if (resolvedCart !== cart) {
        syncCartCaches(queryClient, cartQueryKeys, resolvedCart, {
          isActiveCartQueryKey,
        })
        await invalidateCartCaches(
          queryClient,
          cartQueryKeys,
          resolvedCart.id,
          {
            isActiveCartQueryKey,
          },
        )
      }
      options?.onSuccess?.(resolvedCart)
    },
  })

  const normalizeCartMutation = <TInput>(
    mutation: ReturnType<MedusaCartMutationHook<TInput>>,
  ) => {
    const notifyMutationSuccess = async (
      cart: HttpTypes.StoreCart,
      mutateOptions?: {
        onSuccess?: (cart: HttpTypes.StoreCart) => void
        onError?: (error: MedusaCartMutationError) => void
      },
    ): Promise<void> => {
      try {
        const resolvedCart = await resolveRenderableCart(cart)
        mutateOptions?.onSuccess?.(resolvedCart)
      } catch (error) {
        mutateOptions?.onError?.(toCartMutationError(error))
      }
    }

    const mutate = (
      input: TInput,
      mutateOptions?: {
        onSuccess?: (cart: HttpTypes.StoreCart) => void
        onError?: (error: MedusaCartMutationError) => void
      },
    ) => {
      mutation.mutate(input, {
        onError: (error: unknown) => {
          mutateOptions?.onError?.(toCartMutationError(error))
        },
        onSuccess: (cart: HttpTypes.StoreCart) => {
          void notifyMutationSuccess(cart, mutateOptions)
        },
      })
    }
    const mutateAsync = async (input: TInput) => {
      try {
        const cart = await mutation.mutateAsync(input)
        return await resolveRenderableCart(cart)
      } catch (error) {
        throw toCartMutationError(error)
      }
    }

    return {
      ...mutation,
      mutate,
      mutateAsync,
    }
  }

  const useCart = (input?: UseMedusaCartInput): UseMedusaCartReturn => {
    const { cart, isLoading, error, itemCount, isEmpty, hasItems } =
      cartHooks.useCart({
        autoCreate: false,
        autoUpdateRegion: false,
        ...input,
      })

    return {
      cart,
      error: error === null ? null : new Error(error),
      hasItems,
      isEmpty,
      isError: error !== null,
      isLoading,
      itemCount,
    }
  }

  const useSuspenseCart = (
    input?: UseMedusaCartInput,
  ): UseMedusaSuspenseCartReturn => {
    const { cart, itemCount, isEmpty, hasItems } = cartHooks.useSuspenseCart({
      autoCreate: false,
      autoUpdateRegion: false,
      ...input,
    })

    return {
      cart,
      hasItems,
      isEmpty,
      itemCount,
    }
  }

  const useAddToCart = (options?: UseMedusaCartMutationOptions) => {
    const queryClient = useQueryClient()
    const mutation = cartHooks.useAddLineItem(
      buildMutationHandlers(queryClient, options),
    )

    return normalizeCartMutation(mutation)
  }

  const useUpdateLineItem = (options?: UseMedusaCartMutationOptions) => {
    const queryClient = useQueryClient()
    const mutation = cartHooks.useUpdateLineItem(
      buildMutationHandlers(queryClient, options),
    )

    return normalizeCartMutation(mutation)
  }

  const useRemoveLineItem = (options?: UseMedusaCartMutationOptions) => {
    const queryClient = useQueryClient()
    const mutation = cartHooks.useRemoveLineItem(
      buildMutationHandlers(queryClient, options),
    )

    return normalizeCartMutation(mutation)
  }

  const handleOrderCompletionSuccess = async ({
    queryClient,
    order,
    variables,
    context,
    onSuccess,
  }: {
    queryClient: QueryClient
    order: HttpTypes.StoreOrder
    variables: { cartId?: string }
    context: unknown
    onSuccess?: (order: HttpTypes.StoreOrder) => void
  }) => {
    const completedCartId =
      getCompletedCartIdFromContext(context) ?? variables.cartId ?? null

    clearCompletedCart(queryClient, completedCartId)
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: cartQueryKeys.all() }),
      queryClient.invalidateQueries({ queryKey: checkoutQueryKeys.all() }),
      queryClient.invalidateQueries({ queryKey: orderQueryKeys.all() }),
    ]
    if (
      order.region_id !== undefined &&
      order.region_id !== null &&
      order.region_id !== ""
    ) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: checkoutQueryKeys.paymentProviders(order.region_id),
        }),
      )
    }

    queryClient.setQueryData(orderQueryKeys.detail({ id: order.id }), order)
    await Promise.all(invalidations)
    onSuccess?.(order)
  }

  const useCompleteCart = (options?: UseMedusaCompleteCartOptions) => {
    const queryClient = useQueryClient()

    return cartHooks.useCompleteCart({
      onError: (error: unknown) => {
        options?.onRequestError?.(error)
      },
      onMutate: (variables: { cartId?: string }) => ({
        completedCartId: variables.cartId ?? cartStorage?.get() ?? null,
      }),
      onSuccess: (
        result: MedusaCompleteCartResult,
        variables: { cartId?: string },
        context: unknown,
      ) => {
        if (result.type !== "order") {
          syncCartCaches(queryClient, cartQueryKeys, result.cart, {
            isActiveCartQueryKey,
          })
          options?.onError?.(result.error, result.cart)
          return
        }

        const completeOrder = async (): Promise<void> => {
          try {
            await handleOrderCompletionSuccess(
              omitUndefined({
                context: context ?? null,
                onSuccess: options?.onSuccess,
                order: result.order,
                queryClient,
                variables,
              }),
            )
          } catch (error) {
            options?.onRequestError?.(error)
          }
        }
        void completeOrder()
      },
    })
  }

  return {
    useAddToCart,
    useCart,
    useCompleteCart,
    useRemoveLineItem,
    useSuspenseCart,
    useUpdateLineItem,
  }
}
