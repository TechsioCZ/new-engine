"use client";

import type { HttpTypes } from "@medusajs/types";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { storefront } from "./storefront";
import { storefrontCacheConfig } from "./cache";
import { resetEmptyCartState } from "./cart-reset";

const cartHooks = storefront.hooks.cart;
const cartFlow = storefront.flows.cart;
const useBaseUpdateLineItem = cartFlow.useUpdateLineItem;
const useBaseRemoveLineItem = cartFlow.useRemoveLineItem;

export const cartReadQueryOptions = {
  staleTime: 60 * 1000,
  gcTime: storefrontCacheConfig.realtime.gcTime,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export const {
  useCart,
  useSuspenseCart,
  useCreateCart,
  useUpdateCart,
  useUpdateCartAddress,
  useTransferCart,
  usePrefetchCart,
} = cartHooks;

export const useAddLineItem = cartFlow.useAddToCart;
export const useCompleteCart = cartFlow.useCompleteCart;

const createEmptyCartResetSuccessHandler = (
  queryClient: QueryClient,
  onSuccess?: (cart: HttpTypes.StoreCart) => void,
) => {
  return (cart: HttpTypes.StoreCart) => {
    resetEmptyCartState(queryClient, cart);
    onSuccess?.(cart);
  };
};

export function useUpdateLineItem(
  options?: Parameters<typeof useBaseUpdateLineItem>[0],
) {
  const queryClient = useQueryClient();

  return useBaseUpdateLineItem({
    ...options,
    onSuccess: createEmptyCartResetSuccessHandler(
      queryClient,
      options?.onSuccess,
    ),
  });
}

export function useRemoveLineItem(
  options?: Parameters<typeof useBaseRemoveLineItem>[0],
) {
  const queryClient = useQueryClient();

  return useBaseRemoveLineItem({
    ...options,
    onSuccess: createEmptyCartResetSuccessHandler(
      queryClient,
      options?.onSuccess,
    ),
  });
}
