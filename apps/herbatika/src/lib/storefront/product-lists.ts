"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addFavoriteProductListItem,
  addProductListItem,
  createCustomProductList,
  createFavoriteProductList,
  findProductListItem,
  getProductList,
  getProductListItemCount,
  getProductListItems,
  getProductListTitle,
  incrementProductListItem,
  isFavoriteProductList,
  isProductInProductList,
  listProductLists,
  resolveProductListFromResponse,
  resolveProductListItemFromResponse,
} from "./product-lists.client";
import { resolveErrorMessage } from "./error-utils";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import type { ProductListListInput } from "./product-lists.types";

export {
  addFavoriteProductListItem,
  addProductListItem,
  createCustomProductList,
  createFavoriteProductList,
  findProductListItem,
  getProductList,
  getProductListItemCount,
  getProductListItems,
  getProductListTitle,
  incrementProductListItem,
  isFavoriteProductList,
  isProductInProductList,
  listProductLists,
  resolveProductListFromResponse,
  resolveProductListItemFromResponse,
};

export type {
  AddFavoriteProductListItemInput,
  AddProductListItemInput,
  CreateCustomProductListInput,
  CreateFavoriteProductListInput,
  IncrementProductListItemInput,
  ProductListItemResponse,
  ProductListListInput,
  ProductListListResponse,
  ProductListListResult,
  ProductListResponse,
  StoreProductList,
  StoreProductListAccessType,
  StoreProductListItem,
  StoreProductListType,
} from "./product-lists.types";

export const productListQueryKeys = {
  all: () => [STOREFRONT_QUERY_KEY_NAMESPACE, "product-lists"] as const,
  lists: (input?: ProductListListInput) =>
    [
      ...productListQueryKeys.all(),
      "list",
      {
        handle: input?.handle,
        type: input?.type,
        limit: input?.limit,
        offset: input?.offset,
      },
    ] as const,
  detail: (id?: string | null) =>
    [...productListQueryKeys.all(), "detail", id ?? ""] as const,
};

export function useProductLists(input: ProductListListInput = {}) {
  const enabled = input.enabled ?? true;
  const query = useQuery({
    queryKey: productListQueryKeys.lists(input),
    queryFn: ({ signal }) => listProductLists(input, signal),
    enabled,
  });

  return {
    productLists: query.data?.productLists ?? [],
    count: query.data?.count ?? 0,
    limit: query.data?.limit ?? input.limit ?? 20,
    offset: query.data?.offset ?? input.offset ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error
      ? resolveErrorMessage(query.error, "Seznamy se nepodařilo načíst.")
      : null,
    query,
  };
}

export function useProductList(
  id?: string | null,
  options?: { enabled?: boolean },
) {
  const enabled = Boolean(id) && (options?.enabled ?? true);
  const query = useQuery({
    queryKey: productListQueryKeys.detail(id),
    queryFn: ({ signal }) => getProductList(id as string, signal),
    enabled,
  });

  return {
    productList: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error
      ? resolveErrorMessage(query.error, "Seznam se nepodařilo načíst.")
      : null,
    query,
  };
}

export function useProductListDetails(
  ids: string[],
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;

  return useQueries({
    queries: ids.map((id) => ({
      queryKey: productListQueryKeys.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getProductList(id, signal),
      enabled: enabled && Boolean(id),
    })),
  });
}

const useInvalidateProductLists = () => {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({
      queryKey: productListQueryKeys.all(),
    });
};

export function useCreateFavoriteProductList() {
  const invalidateProductLists = useInvalidateProductLists();

  return useMutation({
    mutationFn: createFavoriteProductList,
    onSuccess: invalidateProductLists,
  });
}

export function useCreateCustomProductList() {
  const invalidateProductLists = useInvalidateProductLists();

  return useMutation({
    mutationFn: createCustomProductList,
    onSuccess: invalidateProductLists,
  });
}

export function useAddProductListItem() {
  const invalidateProductLists = useInvalidateProductLists();

  return useMutation({
    mutationFn: addProductListItem,
    onSuccess: invalidateProductLists,
  });
}

export function useAddFavoriteProductListItem() {
  const invalidateProductLists = useInvalidateProductLists();

  return useMutation({
    mutationFn: addFavoriteProductListItem,
    onSuccess: invalidateProductLists,
  });
}

export function useIncrementProductListItem() {
  const invalidateProductLists = useInvalidateProductLists();

  return useMutation({
    mutationFn: incrementProductListItem,
    onSuccess: invalidateProductLists,
  });
}
