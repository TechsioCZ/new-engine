"use client";

import {
  createCartHooks,
  createCartQueryKeys,
} from "@techsio/storefront-data";
import { cartStorage } from "./cart-storage";
import { storefrontCacheConfig } from "./cache";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import {
  buildAddLineItemParams,
  buildCreateCartParams,
  buildUpdateCartParams,
} from "./cart/params";
import { cartService } from "./cart/service";

export const cartQueryKeys = createCartQueryKeys(
  STOREFRONT_QUERY_KEY_NAMESPACE,
);

export { cartService };

export const cartHooks = createCartHooks({
  service: cartService,
  queryKeys: cartQueryKeys,
  cacheConfig: storefrontCacheConfig,
  cartStorage,
  requireRegion: true,
  buildCreateParams: buildCreateCartParams,
  buildUpdateParams: buildUpdateCartParams,
  buildAddParams: buildAddLineItemParams,
});

export const {
  useCart,
  useSuspenseCart,
  useCreateCart,
  useUpdateCart,
  useUpdateCartAddress,
  useAddLineItem,
  useUpdateLineItem,
  useRemoveLineItem,
  useTransferCart,
  useCompleteCart,
  usePrefetchCart,
} = cartHooks;
