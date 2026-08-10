"use client"

import type { HttpTypes } from "@medusajs/types"
import type { QueryClient } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"

import { storefrontCacheConfig } from "./cache"
import { resetEmptyCartState } from "./cart-reset"
import { storefront } from "./storefront"

const cartHooks: typeof storefront.hooks.cart = storefront.hooks.cart
const cartFlow: typeof storefront.flows.cart = storefront.flows.cart
const useBaseUpdateLineItem: typeof cartFlow.useUpdateLineItem =
  cartFlow.useUpdateLineItem
const useBaseRemoveLineItem: typeof cartFlow.useRemoveLineItem =
  cartFlow.useRemoveLineItem

export const cartReadQueryOptions = {
  gcTime: storefrontCacheConfig.realtime.gcTime,
  refetchOnMount: false,
  refetchOnReconnect: true,
  refetchOnWindowFocus: false,
  staleTime: 60 * 1000,
} as const

export const useCart: typeof cartHooks.useCart = cartHooks.useCart
export const useUpdateCart: typeof cartHooks.useUpdateCart =
  cartHooks.useUpdateCart
export const useUpdateCartAddress: typeof cartHooks.useUpdateCartAddress =
  cartHooks.useUpdateCartAddress
export const useTransferCart: typeof cartHooks.useTransferCart =
  cartHooks.useTransferCart

export const useAddLineItem: typeof cartFlow.useAddToCart =
  cartFlow.useAddToCart

const createEmptyCartResetSuccessHandler =
  (queryClient: QueryClient, onSuccess?: (cart: HttpTypes.StoreCart) => void) =>
  (cart: HttpTypes.StoreCart) => {
    resetEmptyCartState(queryClient, cart)
    onSuccess?.(cart)
  }

export const useUpdateLineItem = (
  options?: Parameters<typeof useBaseUpdateLineItem>[0],
): ReturnType<typeof useBaseUpdateLineItem> => {
  const queryClient = useQueryClient()

  return useBaseUpdateLineItem({
    ...options,
    onSuccess: createEmptyCartResetSuccessHandler(
      queryClient,
      options?.onSuccess,
    ),
  })
}

export const useRemoveLineItem = (
  options?: Parameters<typeof useBaseRemoveLineItem>[0],
): ReturnType<typeof useBaseRemoveLineItem> => {
  const queryClient = useQueryClient()

  return useBaseRemoveLineItem({
    ...options,
    onSuccess: createEmptyCartResetSuccessHandler(
      queryClient,
      options?.onSuccess,
    ),
  })
}
