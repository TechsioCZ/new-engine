"use client";

import { storefront } from "./storefront";
import { storefrontCacheConfig } from "./cache";

export const cartQueryKeys = storefront.queryKeys.cart;
export const cartService = storefront.services.cart;
export const cartHooks = storefront.hooks.cart;
export const cartFlow = storefront.flows.cart;

export const storefrontCartReadQueryOptions = {
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
export const useUpdateLineItem = cartFlow.useUpdateLineItem;
export const useRemoveLineItem = cartFlow.useRemoveLineItem;
export const useCompleteCart = cartFlow.useCompleteCart;
