"use client"

import type { MedusaProductListListHookInput } from "@techsio/storefront-data/product-lists/medusa-service"
import type {
  ProductListBase,
  ProductListItemBase,
} from "@techsio/storefront-data/product-lists/types"
import {
  findProductListItem as findSharedProductListItem,
  getProductListItemCount as getSharedProductListItemCount,
  getProductListItems as getSharedProductListItems,
  isFavoriteProductList as isSharedFavoriteProductList,
  isProductInProductList as isSharedProductInProductList,
} from "@techsio/storefront-data/product-lists/utils"

import { resolveErrorMessage } from "./error-utils"
import { storefront } from "./storefront"

const productListHooks = storefront.hooks.productLists

export type StoreProductListItem = ProductListItemBase
export type StoreProductList = ProductListBase<StoreProductListItem>
export type ProductListListInput = MedusaProductListListHookInput

export const getProductListItems = (
  list?: StoreProductList | null
): StoreProductListItem[] => getSharedProductListItems(list)

export const getProductListItemCount = (list?: StoreProductList | null) =>
  getSharedProductListItemCount(list)

export const isFavoriteProductList = (list?: StoreProductList | null) =>
  isSharedFavoriteProductList(list)

export const isProductInProductList = (
  list: StoreProductList | null | undefined,
  productId: string,
  variantId?: string | null
) => isSharedProductInProductList(list, productId, variantId)

export const findProductListItem = (
  list: StoreProductList | null | undefined,
  productId: string,
  variantId?: string | null
): StoreProductListItem | undefined =>
  findSharedProductListItem(list, productId, variantId)

export const getProductListTitle = (list?: StoreProductList | null) => {
  if (isFavoriteProductList(list)) {
    return "Obľúbené"
  }

  return list?.title?.trim() || "Zoznam"
}

type ProductListDetailOptions = {
  customerId?: string | null
  enabled?: boolean
}

export function useProductLists(
  input: ProductListListInput = {},
  options?: Parameters<typeof productListHooks.useProductLists>[1]
) {
  const result = productListHooks.useProductLists(input, options)

  return {
    ...result,
    error: result.query.error
      ? resolveErrorMessage(
          result.query.error,
          "Zoznamy sa nepodarilo načítať."
        )
      : null,
  }
}

export function useProductList(
  id?: string | null,
  options?: ProductListDetailOptions
) {
  const result = productListHooks.useProductList({
    ...(options?.customerId === undefined
      ? {}
      : { customerId: options?.customerId }),
    ...(options?.enabled === undefined ? {} : { enabled: options?.enabled }),
    ...(id === undefined ? {} : { id }),
  })

  return {
    ...result,
    error: result.query.error
      ? resolveErrorMessage(result.query.error, "Zoznam sa nepodarilo načítať.")
      : null,
  }
}

export function useProductListDetails(
  ids: string[],
  options?: ProductListDetailOptions
) {
  return productListHooks.useProductListDetails(
    ids.map((id) => ({
      ...(options?.customerId === undefined
        ? {}
        : { customerId: options.customerId }),
      id,
    })),
    options?.enabled === undefined ? {} : { enabled: options.enabled }
  )
}

export const useCreateCustomProductList =
  productListHooks.useCreateCustomProductList
export const useCreateProductListCart =
  productListHooks.useCreateProductListCart
export const useDeleteProductList = productListHooks.useDeleteProductList
export const useAddProductListItem = productListHooks.useAddProductListItem
export const useAddFavoriteProductListItem =
  productListHooks.useAddFavoriteProductListItem
export const useUpdateProductListItem =
  productListHooks.useUpdateProductListItem
export const useDeleteProductListItem =
  productListHooks.useDeleteProductListItem
