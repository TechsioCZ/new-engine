"use client";

import type { HttpTypes } from "@medusajs/types";
import type {
  MedusaProductListListHookInput,
} from "@techsio/storefront-data/product-lists/medusa-service";
import type {
  AddFavoriteProductListItemInput,
  AddProductListItemInput,
  ChangeProductListItemQuantityInput,
  CreateCustomProductListInput,
  CreateFavoriteProductListInput,
  CreateProductListCartInput,
  DeleteProductListInput,
  DeleteProductListItemInput,
  IncrementProductListItemInput,
  ProductListAccessType,
  ProductListBase,
  ProductListCartResponse as SharedProductListCartResponse,
  ProductListDeleteResponse,
  ProductListItemBase,
  ProductListItemResponse as SharedProductListItemResponse,
  ProductListListResponse as SharedProductListListResponse,
  ProductListListResult as SharedProductListListResult,
  ProductListResponse as SharedProductListResponse,
  ProductListType,
  UpdateProductListInput,
  UpdateProductListItemInput,
} from "@techsio/storefront-data/product-lists/types";
import {
  findProductListItem as findSharedProductListItem,
  getProductListItemCount as getSharedProductListItemCount,
  getProductListItems as getSharedProductListItems,
  isFavoriteProductList as isSharedFavoriteProductList,
  isProductInProductList as isSharedProductInProductList,
  resolveProductListItemQuantity as resolveSharedProductListItemQuantity,
} from "@techsio/storefront-data/product-lists/utils";
import { resolveErrorMessage } from "./error-utils";
import { storefront } from "./storefront";

const productListHooks = storefront.hooks.productLists;

export type StoreProductListType = ProductListType;
export type StoreProductListAccessType = ProductListAccessType;
export type StoreProductListItem = ProductListItemBase;
export type StoreProductList = ProductListBase<StoreProductListItem>;
export type ProductListListInput = MedusaProductListListHookInput;
export type ProductListListResult =
  SharedProductListListResult<StoreProductList>;
export type ProductListListResponse =
  SharedProductListListResponse<StoreProductList>;
export type ProductListResponse = SharedProductListResponse<StoreProductList>;
export type ProductListItemResponse = SharedProductListItemResponse<
  StoreProductList,
  StoreProductListItem
>;
export type ProductListCartResponse =
  SharedProductListCartResponse<HttpTypes.StoreCart>;

export type {
  AddFavoriteProductListItemInput,
  AddProductListItemInput,
  ChangeProductListItemQuantityInput,
  CreateCustomProductListInput,
  CreateFavoriteProductListInput,
  CreateProductListCartInput,
  DeleteProductListInput,
  DeleteProductListItemInput,
  IncrementProductListItemInput,
  ProductListDeleteResponse,
  UpdateProductListInput,
  UpdateProductListItemInput,
};

export const productListQueryKeys = storefront.queryKeys.productLists;

export const getProductListItems = (
  list?: StoreProductList | null,
): StoreProductListItem[] => getSharedProductListItems(list);

export const getProductListItemCount = (list?: StoreProductList | null) =>
  getSharedProductListItemCount(list);

export const isFavoriteProductList = (list?: StoreProductList | null) =>
  isSharedFavoriteProductList(list);

export const isProductInProductList = (
  list: StoreProductList | null | undefined,
  productId: string,
  variantId?: string | null,
) => isSharedProductInProductList(list, productId, variantId);

export const findProductListItem = (
  list: StoreProductList | null | undefined,
  productId: string,
  variantId?: string | null,
): StoreProductListItem | undefined =>
  findSharedProductListItem(list, productId, variantId);

export const resolveProductListItemQuantity = (item: StoreProductListItem) =>
  resolveSharedProductListItemQuantity(item);

export const getProductListTitle = (list?: StoreProductList | null) => {
  if (isFavoriteProductList(list)) {
    return "Obľúbené";
  }

  return list?.title?.trim() || "Zoznam";
};

type ProductListDetailOptions = {
  customerId?: string | null;
  enabled?: boolean;
};

export function useProductLists(
  input: ProductListListInput = {},
  options?: Parameters<typeof productListHooks.useProductLists>[1],
) {
  const result = productListHooks.useProductLists(input, options);

  return {
    ...result,
    error: result.query.error
      ? resolveErrorMessage(
          result.query.error,
          "Zoznamy sa nepodarilo načítať.",
        )
      : null,
  };
}

export function useProductList(
  id?: string | null,
  options?: ProductListDetailOptions,
) {
  const result = productListHooks.useProductList({
    customerId: options?.customerId,
    enabled: options?.enabled,
    id,
  });

  return {
    ...result,
    error: result.query.error
      ? resolveErrorMessage(result.query.error, "Zoznam sa nepodarilo načítať.")
      : null,
  };
}

export function useProductListDetails(
  ids: string[],
  options?: ProductListDetailOptions,
) {
  return productListHooks.useProductListDetails(
    ids.map((id) => ({
      customerId: options?.customerId,
      id,
    })),
    {
      enabled: options?.enabled,
    },
  );
}

export const useCreateFavoriteProductList =
  productListHooks.useCreateFavoriteProductList;
export const useCreateCustomProductList =
  productListHooks.useCreateCustomProductList;
export const useCreateProductListCart =
  productListHooks.useCreateProductListCart;
export const useUpdateProductList = productListHooks.useUpdateProductList;
export const useDeleteProductList = productListHooks.useDeleteProductList;
export const useAddProductListItem = productListHooks.useAddProductListItem;
export const useAddFavoriteProductListItem =
  productListHooks.useAddFavoriteProductListItem;
export const useChangeProductListItemQuantity =
  productListHooks.useChangeProductListItemQuantity;
export const useUpdateProductListItem =
  productListHooks.useUpdateProductListItem;
export const useDeleteProductListItem =
  productListHooks.useDeleteProductListItem;
export const useIncrementProductListItem =
  productListHooks.useIncrementProductListItem;
