"use client"

import type { HttpTypes } from "@medusajs/types"
import type { StorefrontProductListInput as BaseStorefrontProductListInput } from "./product-query-config"
import {
  buildProductListParams as buildStorefrontProductListParams,
  PRODUCT_CARD_FIELDS as STOREFRONT_PRODUCT_CARD_FIELDS,
  PRODUCT_DETAIL_FIELDS as STOREFRONT_PRODUCT_DETAIL_FIELDS,
  RELATED_PRODUCT_FIELDS as STOREFRONT_RELATED_PRODUCT_FIELDS,
  SEARCH_PRODUCT_CARD_FIELDS as STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS,
} from "./product-query-config"
import { storefront } from "./storefront"

export const buildProductListParams = buildStorefrontProductListParams
export const PRODUCT_CARD_FIELDS = STOREFRONT_PRODUCT_CARD_FIELDS
export const PRODUCT_DETAIL_FIELDS = STOREFRONT_PRODUCT_DETAIL_FIELDS
export const RELATED_PRODUCT_FIELDS = STOREFRONT_RELATED_PRODUCT_FIELDS
export const SEARCH_PRODUCT_CARD_FIELDS = STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS

type ProductHooks = typeof storefront.hooks.products
type UseProductsOptions = Parameters<ProductHooks["useProducts"]>[1]

export type ProductListInput = BaseStorefrontProductListInput & {
  enabled?: boolean
}

const productHooks = storefront.hooks.products
const toProductListParams = (
  input: ProductListInput
): HttpTypes.StoreProductListParams =>
  input as unknown as HttpTypes.StoreProductListParams

export const useProducts = (
  input: ProductListInput,
  options?: UseProductsOptions
) => productHooks.useProducts(toProductListParams(input), options)

export const useProduct = productHooks.useProduct
export const usePrefetchProduct = productHooks.usePrefetchProduct

export const usePrefetchProducts = (
  ...args: Parameters<ProductHooks["usePrefetchProducts"]>
) => {
  const prefetch = productHooks.usePrefetchProducts(...args)

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
    ) => prefetch.prefetchProducts(toProductListParams(input), ...prefetchArgs),
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
    ) => prefetch.delayedPrefetch(toProductListParams(input), ...prefetchArgs),
  }
}
