import type { HttpTypes } from "@medusajs/types";

export type StoreProductListType = "favorite" | "custom";
export type StoreProductListAccessType = "private" | "public";

export type StoreProductListItem = {
  id: string;
  product_id?: string | null;
  variant_id?: string | null;
  quantity?: number | null;
  note?: string | null;
  sort_order?: number | null;
  metadata?: Record<string, unknown> | null;
  product?: HttpTypes.StoreProduct | null;
  variant?: {
    id?: string | null;
    title?: string | null;
  } | null;
};

export type StoreProductList = {
  id: string;
  title?: string | null;
  description?: string | null;
  handle?: string | null;
  type?: StoreProductListType | string | null;
  access_type?: StoreProductListAccessType | string | null;
  customer_id?: string | null;
  items?: StoreProductListItem[] | null;
  items_count?: number | null;
  item_count?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProductListListResponse = {
  product_lists?: StoreProductList[];
  productLists?: StoreProductList[];
  lists?: StoreProductList[];
  count?: number;
  limit?: number;
  offset?: number;
};

export type ProductListResponse = {
  product_list?: StoreProductList;
  productList?: StoreProductList;
  list?: StoreProductList;
};

export type ProductListItemResponse = ProductListResponse & {
  item?: StoreProductListItem;
  product_list_item?: StoreProductListItem;
  productListItem?: StoreProductListItem;
};

export type ProductListCartResponse = {
  cart?: HttpTypes.StoreCart | null;
};

export type ProductListDeleteResponse = {
  deleted: boolean;
  id: string;
};

export type ProductListListInput = {
  handle?: string;
  type?: StoreProductListType;
  limit?: number;
  offset?: number;
  customerId?: string | null;
  enabled?: boolean;
};

export type ProductListListResult = {
  productLists: StoreProductList[];
  count: number;
  limit: number;
  offset: number;
};

export type CreateFavoriteProductListInput = {
  title?: string;
  description?: string;
  handle?: string;
  metadata?: Record<string, unknown>;
};

export type CreateCustomProductListInput = {
  title: string;
  access_type?: StoreProductListAccessType;
  description?: string;
  handle?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateProductListInput = {
  listId: string;
  title?: string;
  access_type?: StoreProductListAccessType;
  description?: string;
  handle?: string;
  metadata?: Record<string, unknown>;
};

export type DeleteProductListInput = {
  listId: string;
};

export type AddProductListItemInput = {
  listId: string;
  productId: string;
  variantId?: string | null;
  quantity?: number | null;
  note?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
};

export type AddFavoriteProductListItemInput = Omit<
  AddProductListItemInput,
  "listId"
>;

export type CreateProductListCartInput = {
  listId: string;
  regionId?: string | null;
  countryCode?: string | null;
  email?: string | null;
  salesChannelId?: string | null;
};

export type ChangeProductListItemQuantityInput = {
  itemId: string;
  quantity?: number;
};

export type IncrementProductListItemInput = ChangeProductListItemQuantityInput;

export type UpdateProductListItemInput = {
  itemId: string;
  quantity?: number | null;
  note?: string | null;
  sortOrder?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type DeleteProductListItemInput = {
  listId: string;
  itemId: string;
};
