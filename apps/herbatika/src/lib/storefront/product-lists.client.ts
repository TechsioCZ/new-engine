"use client";

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
  ProductListCartResponse,
  ProductListDeleteResponse,
  ProductListItemResponse,
  ProductListListInput,
  ProductListListResponse,
  ProductListListResult,
  ProductListResponse,
  StoreProductList,
  StoreProductListItem,
  UpdateProductListInput,
  UpdateProductListItemInput,
} from "./product-lists.types";
import { storefrontSdk } from "./sdk";

const PRODUCT_LISTS_PATH = "/store/product-lists";

const compactRecord = (record: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
};

const normalizeQuantity = (quantity?: number | null) => {
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
    return undefined;
  }

  return Math.max(1, Math.floor(quantity));
};

const normalizeQuantityDelta = (quantity?: number | null) => {
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) {
    return 1;
  }

  const quantityDelta = Math.trunc(quantity);

  if (quantityDelta === 0) {
    throw new Error("Quantity change must be a non-zero integer.");
  }

  return quantityDelta;
};

const normalizeProductListsResponse = (
  response: ProductListListResponse,
  fallbackLimit: number,
  fallbackOffset: number,
): ProductListListResult => {
  const productLists =
    response.product_lists ?? response.productLists ?? response.lists ?? [];

  return {
    productLists,
    count: response.count ?? productLists.length,
    limit: response.limit ?? fallbackLimit,
    offset: response.offset ?? fallbackOffset,
  };
};

export const resolveProductListFromResponse = (response: ProductListResponse) =>
  response.product_list ?? response.productList ?? response.list ?? null;

export const resolveProductListItemFromResponse = (
  response: ProductListItemResponse,
) =>
  response.product_list_item ??
  response.productListItem ??
  response.item ??
  null;

export const resolveProductListCartFromResponse = (
  response: ProductListCartResponse,
) => response.cart ?? null;

export const getProductListItems = (list?: StoreProductList | null) =>
  list?.items ?? [];

export const getProductListItemCount = (list?: StoreProductList | null) => {
  if (!list) {
    return 0;
  }

  if (typeof list.items_count === "number") {
    return list.items_count;
  }

  if (typeof list.item_count === "number") {
    return list.item_count;
  }

  return getProductListItems(list).length;
};

export const isFavoriteProductList = (list?: StoreProductList | null) => {
  return list?.type === "favorite" || list?.handle === "favorites";
};

export const getProductListTitle = (list?: StoreProductList | null) => {
  if (isFavoriteProductList(list)) {
    return "Obľúbené";
  }

  return list?.title?.trim() || "Zoznam";
};

const getProductListItemProductId = (item: StoreProductListItem) => {
  return item.product_id ?? item.product?.id ?? null;
};

const getProductListItemVariantId = (item: StoreProductListItem) => {
  return item.variant_id ?? item.variant?.id ?? null;
};

const normalizeVariantId = (variantId?: string | null) => {
  if (typeof variantId !== "string") {
    return null;
  }

  const trimmedVariantId = variantId.trim();
  return trimmedVariantId ? trimmedVariantId : null;
};

const productListItemMatchesSelection = (
  item: StoreProductListItem,
  productId: string,
  variantId?: string | null,
) => {
  if (getProductListItemProductId(item) !== productId) {
    return false;
  }

  const requestedVariantId = normalizeVariantId(variantId);
  const itemVariantId = normalizeVariantId(getProductListItemVariantId(item));

  if (requestedVariantId) {
    return itemVariantId === requestedVariantId;
  }

  return !itemVariantId;
};

export const isProductInProductList = (
  list: StoreProductList | null | undefined,
  productId: string,
  variantId?: string | null,
) => {
  return getProductListItems(list).some((item) =>
    productListItemMatchesSelection(item, productId, variantId),
  );
};

export const findProductListItem = (
  list: StoreProductList | null | undefined,
  productId: string,
  variantId?: string | null,
) => {
  return getProductListItems(list).find((item) =>
    productListItemMatchesSelection(item, productId, variantId),
  );
};

export const listProductLists = async (
  input: ProductListListInput = {},
  signal?: AbortSignal,
) => {
  const { enabled: _enabled, limit = 20, offset = 0, ...query } = input;
  const response = await storefrontSdk.client.fetch<ProductListListResponse>(
    PRODUCT_LISTS_PATH,
    {
      query: compactRecord({ ...query, limit, offset }),
      signal,
    },
  );

  return normalizeProductListsResponse(response, limit, offset);
};

export const getProductList = async (id: string, signal?: AbortSignal) => {
  const response = await storefrontSdk.client.fetch<ProductListResponse>(
    `${PRODUCT_LISTS_PATH}/${id}`,
    { signal },
  );

  return resolveProductListFromResponse(response);
};

export const createFavoriteProductList = async (
  input: CreateFavoriteProductListInput = {},
) => {
  const response = await storefrontSdk.client.fetch<ProductListResponse>(
    `${PRODUCT_LISTS_PATH}/favorites`,
    { method: "POST", body: compactRecord(input) },
  );

  return resolveProductListFromResponse(response);
};

export const createCustomProductList = async (
  input: CreateCustomProductListInput,
) => {
  const response = await storefrontSdk.client.fetch<ProductListResponse>(
    `${PRODUCT_LISTS_PATH}/custom`,
    {
      method: "POST",
      body: compactRecord({
        ...input,
        access_type: input.access_type ?? "private",
      }),
    },
  );

  return resolveProductListFromResponse(response);
};

export const updateProductList = async (input: UpdateProductListInput) => {
  const response = await storefrontSdk.client.fetch<ProductListResponse>(
    `${PRODUCT_LISTS_PATH}/${input.listId}`,
    {
      method: "POST",
      body: compactRecord({
        title: input.title,
        access_type: input.access_type,
        description: input.description,
        handle: input.handle,
        metadata: input.metadata,
      }),
    },
  );

  return resolveProductListFromResponse(response);
};

export const deleteProductList = async (input: DeleteProductListInput) => {
  return storefrontSdk.client.fetch<ProductListDeleteResponse>(
    `${PRODUCT_LISTS_PATH}/${input.listId}`,
    { method: "DELETE" },
  );
};

export const addProductListItem = async (input: AddProductListItemInput) => {
  return storefrontSdk.client.fetch<ProductListItemResponse>(
    `${PRODUCT_LISTS_PATH}/${input.listId}/items`,
    {
      method: "POST",
      body: compactRecord({
        product_id: input.productId,
        variant_id: input.variantId ?? undefined,
        quantity: normalizeQuantity(input.quantity),
        note: input.note,
        sort_order: input.sortOrder,
        metadata: input.metadata,
      }),
    },
  );
};

export const addFavoriteProductListItem = async (
  input: AddFavoriteProductListItemInput,
) => {
  return storefrontSdk.client.fetch<ProductListItemResponse>(
    `${PRODUCT_LISTS_PATH}/favorites/items`,
    {
      method: "POST",
      body: compactRecord({
        product_id: input.productId,
        variant_id: input.variantId ?? undefined,
        quantity: normalizeQuantity(input.quantity),
        note: input.note,
        sort_order: input.sortOrder,
        metadata: input.metadata,
      }),
    },
  );
};

export const createProductListCart = async (
  input: CreateProductListCartInput,
) => {
  const response = await storefrontSdk.client.fetch<ProductListCartResponse>(
    `${PRODUCT_LISTS_PATH}/${input.listId}/cart`,
    {
      method: "POST",
      body: compactRecord({
        region_id: input.regionId ?? undefined,
        country_code: input.countryCode ?? undefined,
        email: input.email ?? undefined,
        sales_channel_id: input.salesChannelId ?? undefined,
      }),
    },
  );
  const cart = resolveProductListCartFromResponse(response);

  if (!cart) {
    throw new Error("Backend nevrátil košík.");
  }

  return cart;
};

export const updateProductListItem = async (
  input: UpdateProductListItemInput,
) => {
  return storefrontSdk.client.fetch<ProductListItemResponse>(
    `${PRODUCT_LISTS_PATH}/items/${input.itemId}`,
    {
      method: "POST",
      body: compactRecord({
        quantity: normalizeQuantity(input.quantity),
        note: input.note,
        sort_order: input.sortOrder,
        metadata: input.metadata,
      }),
    },
  );
};

export const changeProductListItemQuantity = async (
  input: ChangeProductListItemQuantityInput,
) => {
  return storefrontSdk.client.fetch<ProductListItemResponse>(
    `${PRODUCT_LISTS_PATH}/items/${input.itemId}/change-quantity`,
    {
      method: "POST",
      body: { quantity: normalizeQuantityDelta(input.quantity) },
    },
  );
};

export const incrementProductListItem = async (
  input: IncrementProductListItemInput,
) =>
  changeProductListItemQuantity({
    itemId: input.itemId,
    quantity: normalizeQuantity(input.quantity) ?? 1,
  });

export const deleteProductListItem = async (
  input: DeleteProductListItemInput,
) => {
  return storefrontSdk.client.fetch<ProductListDeleteResponse>(
    `${PRODUCT_LISTS_PATH}/${input.listId}/items/${input.itemId}`,
    { method: "DELETE" },
  );
};
