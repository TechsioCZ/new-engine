"use client";

import type { HttpTypes } from "@medusajs/types";
import type { MedusaProductDetailInput } from "@techsio/storefront-data/products/medusa-service";
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
type UseProductOptions = Parameters<ProductHooks["useProduct"]>[1];

export type ProductListInput = StorefrontProductListInput & {
  enabled?: boolean;
};

export type ProductDetailInput = MedusaProductDetailInput & {
  enabled?: boolean;
};

const productHooks = storefront.hooks.products;

export const useProducts = (
  input: ProductListInput,
  options?: UseProductsOptions,
) => {
  return productHooks.useProducts(
    input as unknown as HttpTypes.StoreProductListParams,
    options,
  );
};

export const useSuspenseProducts = (
  input: ProductListInput,
  options?: Parameters<ProductHooks["useSuspenseProducts"]>[1],
) => {
  return productHooks.useSuspenseProducts(
    input as unknown as HttpTypes.StoreProductListParams,
    options,
  );
};

export const useInfiniteProducts = (
  input: ProductListInput,
  options?: Parameters<ProductHooks["useInfiniteProducts"]>[1],
) => {
  return productHooks.useInfiniteProducts(
    input as unknown as HttpTypes.StoreProductListParams,
    options,
  );
};

export const getProductListQueryOptions = (
  input: ProductListInput,
  options?: Parameters<ProductHooks["getListQueryOptions"]>[1],
) => {
  return productHooks.getListQueryOptions(
    input as unknown as HttpTypes.StoreProductListParams,
    options,
  );
};

export const useProduct = (
  input: ProductDetailInput,
  options?: UseProductOptions,
) => {
  return productHooks.useProduct(input, options);
};

export const useSuspenseProduct = (
  input: ProductDetailInput,
  options?: Parameters<ProductHooks["useSuspenseProduct"]>[1],
) => {
  return productHooks.useSuspenseProduct(input, options);
};

export const getProductDetailQueryOptions = (
  input: ProductDetailInput,
  options?: Parameters<ProductHooks["getDetailQueryOptions"]>[1],
) => {
  return productHooks.getDetailQueryOptions(input, options);
};

export const {
  usePrefetchProduct,
  usePrefetchPages,
} = productHooks;

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
      prefetch.prefetchProducts(
        input as unknown as HttpTypes.StoreProductListParams,
        ...prefetchArgs,
      ),
    prefetchFirstPage: (
      input: ProductListInput,
      ...prefetchArgs: Parameters<typeof prefetch.prefetchFirstPage> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.prefetchFirstPage(
        input as unknown as HttpTypes.StoreProductListParams,
        ...prefetchArgs,
      ),
    delayedPrefetch: (
      input: ProductListInput,
      ...prefetchArgs: Parameters<typeof prefetch.delayedPrefetch> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.delayedPrefetch(
        input as unknown as HttpTypes.StoreProductListParams,
        ...prefetchArgs,
      ),
  };
};

export {
  buildProductListParams,
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS,
};
