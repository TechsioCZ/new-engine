"use client"

import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
} from "@techsio/storefront-data/products/medusa-service"
import { useLocale } from "next-intl"
import { withRequestLocale } from "./localized-query"
import type { StorefrontProductListInput as BaseStorefrontProductListInput } from "./product-query-config"
import {
  buildProductListParams as buildStorefrontProductListParams,
  ACCOUNT_PRODUCT_LIST_FIELDS as STOREFRONT_ACCOUNT_PRODUCT_LIST_FIELDS,
  PRODUCT_CARD_FIELDS as STOREFRONT_PRODUCT_CARD_FIELDS,
  PRODUCT_DETAIL_FIELDS as STOREFRONT_PRODUCT_DETAIL_FIELDS,
  RELATED_PRODUCT_FIELDS as STOREFRONT_RELATED_PRODUCT_FIELDS,
  SEARCH_PRODUCT_CARD_FIELDS as STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS,
} from "./product-query-config"
import { storefront } from "./storefront"

export const buildProductListParams = buildStorefrontProductListParams
export const ACCOUNT_PRODUCT_LIST_FIELDS =
  STOREFRONT_ACCOUNT_PRODUCT_LIST_FIELDS
export const PRODUCT_CARD_FIELDS = STOREFRONT_PRODUCT_CARD_FIELDS
export const PRODUCT_DETAIL_FIELDS = STOREFRONT_PRODUCT_DETAIL_FIELDS
export const RELATED_PRODUCT_FIELDS = STOREFRONT_RELATED_PRODUCT_FIELDS
export const SEARCH_PRODUCT_CARD_FIELDS = STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS

type ProductHooks = typeof storefront.hooks.products
type UseProductsOptions = Parameters<ProductHooks["useProducts"]>[1]
type UseProductOptions = Parameters<ProductHooks["useProduct"]>[1]

export type ProductDetailInput = MedusaProductDetailInput & {
  enabled?: boolean
}

export type ProductListInput = BaseStorefrontProductListInput & {
  enabled?: boolean
}

const productHooks = storefront.hooks.products
const toProductListParams = (input: ProductListInput): MedusaProductListInput =>
  input as unknown as MedusaProductListInput

export const useProducts = (
  input: ProductListInput,
  options?: UseProductsOptions
) => {
  const locale = useLocale()

  return productHooks.useProducts(
    toProductListParams(withRequestLocale(input, locale)),
    options
  )
}

export const useProduct = (
  input: ProductDetailInput,
  options?: UseProductOptions
) => {
  const locale = useLocale()

  return productHooks.useProduct(withRequestLocale(input, locale), options)
}

export const usePrefetchProduct = (
  ...args: Parameters<ProductHooks["usePrefetchProduct"]>
) => {
  const locale = useLocale()
  const prefetch = productHooks.usePrefetchProduct(...args)

  return {
    ...prefetch,
    prefetchProduct: (
      input: MedusaProductDetailInput,
      ...prefetchArgs: Parameters<typeof prefetch.prefetchProduct> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.prefetchProduct(
        withRequestLocale(input, locale),
        ...prefetchArgs
      ),
    delayedPrefetch: (
      input: MedusaProductDetailInput,
      ...prefetchArgs: Parameters<typeof prefetch.delayedPrefetch> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) =>
      prefetch.delayedPrefetch(
        withRequestLocale(input, locale),
        ...prefetchArgs
      ),
  }
}

export const usePrefetchProducts = (
  ...args: Parameters<ProductHooks["usePrefetchProducts"]>
) => {
  const locale = useLocale()
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
    ) =>
      prefetch.prefetchProducts(
        toProductListParams(withRequestLocale(input, locale)),
        ...prefetchArgs
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
        toProductListParams(withRequestLocale(input, locale)),
        ...prefetchArgs
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
        toProductListParams(withRequestLocale(input, locale)),
        ...prefetchArgs
      ),
  }
}
