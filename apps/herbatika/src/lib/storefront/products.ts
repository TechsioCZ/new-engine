"use client"

import type { HttpTypes } from "@medusajs/types"

import type { StorefrontProductListInput as BaseStorefrontProductListInput } from "./product-query-config"
export {
  PRODUCT_CARD_FIELDS as PRODUCT_CARD_FIELDS,
  PRODUCT_DETAIL_FIELDS as PRODUCT_DETAIL_FIELDS,
  RELATED_PRODUCT_FIELDS as RELATED_PRODUCT_FIELDS,
} from "./product-query-config"
import { storefront } from "./storefront"

type ProductHooks = typeof storefront.hooks.products
type UseProductsOptions = Parameters<ProductHooks["useProducts"]>[1]

export type ProductListInput = BaseStorefrontProductListInput & {
  enabled?: boolean
}

const productHooks = storefront.hooks.products
const toProductListParams = (
  input: ProductListInput,
): HttpTypes.StoreProductListParams => input

export const useProducts = (
  input: ProductListInput,
  options?: UseProductsOptions,
) => productHooks.useProducts(toProductListParams(input), options)

export const { useProduct } = productHooks
export const { usePrefetchProduct } = productHooks
