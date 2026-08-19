"use client"

import type {
  MedusaProductDetailInput,
  MedusaProductListInput,
} from "@techsio/storefront-data/products/medusa-service"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
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

const applyActiveProductScope = <
  TInput extends {
    country_code?: string
    region_id?: string
  },
>(
  input: TInput,
  region: RegionInfo | null
): TInput =>
  region
    ? {
        ...input,
        country_code: region.country_code,
        region_id: region.region_id,
      }
    : input

const hasCompleteProductScope = (region: RegionInfo | null) =>
  Boolean(region?.region_id && region.salesChannelId)

export const useProducts = (
  input: ProductListInput,
  options?: UseProductsOptions
) => {
  const locale = useLocale()
  const region = useRegionContext()
  const scopedInput = applyActiveProductScope(
    withRequestLocale(input, locale),
    region
  )

  return productHooks.useProducts(
    toProductListParams({
      ...scopedInput,
      enabled: input.enabled !== false && hasCompleteProductScope(region),
    }),
    options
  )
}

export const useProduct = (
  input: ProductDetailInput,
  options?: UseProductOptions
) => {
  const locale = useLocale()
  const region = useRegionContext()
  const scopedInput = applyActiveProductScope(
    withRequestLocale(input, locale),
    region
  )
  const enabledInput: ProductDetailInput = {
    ...scopedInput,
    enabled: input.enabled !== false && hasCompleteProductScope(region),
  }

  return productHooks.useProduct(enabledInput, options)
}

export const usePrefetchProduct = (
  ...args: Parameters<ProductHooks["usePrefetchProduct"]>
) => {
  const locale = useLocale()
  const region = useRegionContext()
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
    ) => {
      const scopedInput = applyActiveProductScope(
        withRequestLocale(input, locale),
        region
      )
      if (!hasCompleteProductScope(region)) {
        return Promise.resolve()
      }

      return prefetch.prefetchProduct(scopedInput, ...prefetchArgs)
    },
    delayedPrefetch: (
      input: MedusaProductDetailInput,
      ...prefetchArgs: Parameters<typeof prefetch.delayedPrefetch> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) => {
      const scopedInput = applyActiveProductScope(
        withRequestLocale(input, locale),
        region
      )
      if (!hasCompleteProductScope(region)) {
        return
      }

      return prefetch.delayedPrefetch(scopedInput, ...prefetchArgs)
    },
  }
}

export const usePrefetchProducts = (
  ...args: Parameters<ProductHooks["usePrefetchProducts"]>
) => {
  const locale = useLocale()
  const region = useRegionContext()
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
    ) => {
      const scopedInput = applyActiveProductScope(
        withRequestLocale(input, locale),
        region
      )
      if (!hasCompleteProductScope(region)) {
        return Promise.resolve()
      }

      return prefetch.prefetchProducts(
        toProductListParams(scopedInput),
        ...prefetchArgs
      )
    },
    prefetchFirstPage: (
      input: ProductListInput,
      ...prefetchArgs: Parameters<typeof prefetch.prefetchFirstPage> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) => {
      const scopedInput = applyActiveProductScope(
        withRequestLocale(input, locale),
        region
      )
      if (!hasCompleteProductScope(region)) {
        return Promise.resolve()
      }

      return prefetch.prefetchFirstPage(
        toProductListParams(scopedInput),
        ...prefetchArgs
      )
    },
    delayedPrefetch: (
      input: ProductListInput,
      ...prefetchArgs: Parameters<typeof prefetch.delayedPrefetch> extends [
        unknown,
        ...infer TRest,
      ]
        ? TRest
        : never
    ) => {
      const scopedInput = applyActiveProductScope(
        withRequestLocale(input, locale),
        region
      )
      if (!hasCompleteProductScope(region)) {
        return
      }

      return prefetch.delayedPrefetch(
        toProductListParams(scopedInput),
        ...prefetchArgs
      )
    },
  }
}
