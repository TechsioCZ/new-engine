"use client";

import type { HttpTypes } from "@medusajs/types";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { cartStorage } from "./cart-storage";
import { resolveErrorMessage } from "./error-utils";
import {
  addFavoriteProductListItem,
  addProductListItem,
  changeProductListItemQuantity,
  createCustomProductList,
  createFavoriteProductList,
  createProductListCart,
  deleteProductList,
  deleteProductListItem,
  findProductListItem,
  getProductList,
  getProductListItemCount,
  getProductListItems,
  getProductListTitle,
  incrementProductListItem,
  isFavoriteProductList,
  isProductInProductList,
  listProductLists,
  resolveProductListCartFromResponse,
  resolveProductListFromResponse,
  resolveProductListItemFromResponse,
  updateProductList,
  updateProductListItem,
} from "./product-lists.client";
import type { ProductListListInput } from "./product-lists.types";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontDefinition } from "./storefront-definition";

export {
  addFavoriteProductListItem,
  addProductListItem,
  changeProductListItemQuantity,
  createCustomProductList,
  createFavoriteProductList,
  createProductListCart,
  deleteProductList,
  deleteProductListItem,
  findProductListItem,
  getProductList,
  getProductListItemCount,
  getProductListItems,
  getProductListTitle,
  incrementProductListItem,
  isFavoriteProductList,
  isProductInProductList,
  listProductLists,
  resolveProductListCartFromResponse,
  resolveProductListFromResponse,
  resolveProductListItemFromResponse,
  updateProductList,
  updateProductListItem,
};

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
  ProductListCartResponse,
  ProductListDeleteResponse,
  ProductListItemResponse,
  ProductListListInput,
  ProductListListResponse,
  ProductListListResult,
  ProductListResponse,
  StoreProductList,
  StoreProductListAccessType,
  StoreProductListItem,
  StoreProductListType,
  UpdateProductListInput,
  UpdateProductListItemInput,
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
        customerId: input?.customerId ?? null,
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
      ? resolveErrorMessage(query.error, "Zoznamy sa nepodarilo načítať.")
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
      ? resolveErrorMessage(query.error, "Zoznam sa nepodarilo načítať.")
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

const syncCreatedProductListCart = (
  queryClient: ReturnType<typeof useQueryClient>,
  cart: HttpTypes.StoreCart,
) => {
  const cartQueryKeys = storefrontDefinition.queryKeys.cart;
  const regionId = typeof cart.region_id === "string" ? cart.region_id : null;

  queryClient.setQueryData(cartQueryKeys.detail(cart.id), cart);
  queryClient.setQueryData(
    cartQueryKeys.active({ cartId: cart.id, regionId }),
    cart,
  );
  cartStorage.setCartId(cart.id);
  queryClient.invalidateQueries({ queryKey: cartQueryKeys.all() });
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

export function useCreateProductListCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductListCart,
    onSuccess: (cart) => syncCreatedProductListCart(queryClient, cart),
  });
}

export function useUpdateProductList() {
  const invalidateProductLists = useInvalidateProductLists();

  return useMutation({
    mutationFn: updateProductList,
    onSuccess: invalidateProductLists,
  });
}

export function useDeleteProductList() {
  const invalidateProductLists = useInvalidateProductLists();

  return useMutation({
    mutationFn: deleteProductList,
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

export function useChangeProductListItemQuantity() {
  const invalidateProductLists = useInvalidateProductLists();

  return useMutation({
    mutationFn: changeProductListItemQuantity,
    onSuccess: invalidateProductLists,
  });
}

export function useUpdateProductListItem() {
  const invalidateProductLists = useInvalidateProductLists();

  return useMutation({
    mutationFn: updateProductListItem,
    onSuccess: invalidateProductLists,
  });
}

export function useDeleteProductListItem() {
  const invalidateProductLists = useInvalidateProductLists();

  return useMutation({
    mutationFn: deleteProductListItem,
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
