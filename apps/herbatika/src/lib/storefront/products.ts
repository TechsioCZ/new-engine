"use client";

import type { HttpTypes } from "@medusajs/types";
import type { StorefrontProductListInput } from "./product-query-config";
import {
  buildProductListParams,
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS,
} from "./product-query-config";
import { storefront } from "./storefront";

type ProductHooks = typeof storefront.hooks.products;
type UseProductsOptions = Parameters<ProductHooks["useProducts"]>[1];

export type ProductListInput = StorefrontProductListInput & {
  enabled?: boolean;
};

const productHooks = storefront.hooks.products;
const toProductListParams = (
  input: ProductListInput,
): HttpTypes.StoreProductListParams =>
  input as unknown as HttpTypes.StoreProductListParams;

export const useProducts = (
  input: ProductListInput,
  options?: UseProductsOptions,
) => {
  return productHooks.useProducts(toProductListParams(input), options);
};

export const useProduct = productHooks.useProduct;
export const usePrefetchProduct = productHooks.usePrefetchProduct;

export const usePrefetchProducts = (
  ...args: Parameters<ProductHooks["usePrefetchProducts"]>
) => {
  const prefetch = productHooks.usePrefetchProducts(...args);

  return {
    ...prefetch,
    prefetchProducts: (
      input: ProductListInput,
      ...prefetchArgs: Parameters<typeof prefetch.prefetchProducts> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.prefetchProducts(toProductListParams(input), ...prefetchArgs),
    prefetchFirstPage: (
      input: ProductListInput,
      ...prefetchArgs: Parameters<typeof prefetch.prefetchFirstPage> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.prefetchFirstPage(toProductListParams(input), ...prefetchArgs),
    delayedPrefetch: (
      input: ProductListInput,
      ...prefetchArgs: Parameters<typeof prefetch.delayedPrefetch> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.delayedPrefetch(toProductListParams(input), ...prefetchArgs),
  };
};

export {
  buildProductListParams,
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS,
};
