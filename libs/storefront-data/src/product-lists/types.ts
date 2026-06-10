import type { HttpTypes } from "@medusajs/types"
import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-result-types"
import type { MutationOptions } from "../shared/hook-types"
import type { QueryKey } from "../shared/query-keys"

export type ProductListType = "favorite" | "custom"
export type ProductListAccessType = "private" | "public"

export type ProductListItemBase = {
  id: string
  product_id?: string | null
  variant_id?: string | null
  quantity?: number | null
  note?: string | null
  sort_order?: number | null
  metadata?: Record<string, unknown> | null
  product?: HttpTypes.StoreProduct | null
  variant?: {
    id?: string | null
    title?: string | null
  } | null
}

export type ProductListBase<TItem = ProductListItemBase> = {
  id: string
  title?: string | null
  description?: string | null
  handle?: string | null
  type?: ProductListType | string | null
  access_type?: ProductListAccessType | string | null
  customer_id?: string | null
  items?: TItem[] | null
  items_count?: number | null
  item_count?: number | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

export type ProductListListResponse<TProductList> = {
  product_lists?: TProductList[]
  productLists?: TProductList[]
  lists?: TProductList[]
  count?: number
  limit?: number
  offset?: number
}

export type ProductListResponse<TProductList> = {
  product_list?: TProductList
  productList?: TProductList
  list?: TProductList
}

export type ProductListItemResponse<TProductList, TProductListItem> =
  ProductListResponse<TProductList> & {
    item?: TProductListItem
    product_list_item?: TProductListItem
    productListItem?: TProductListItem
  }

export type ProductListCartResponse<TCart> = {
  cart?: TCart | null
}

export type ProductListDeleteResponse = {
  deleted: boolean
  id: string
}

export type ProductListListResult<TProductList> = {
  productLists: TProductList[]
  count: number
  limit: number
  offset: number
}

export type ProductListListInputBase = {
  handle?: string
  type?: ProductListType | string
  limit?: number
  offset?: number
  page?: number
  customerId?: string | null
  enabled?: boolean
}

export type ProductListDetailInputBase = {
  id?: string | null
  customerId?: string | null
  enabled?: boolean
}

export type CreateFavoriteProductListInput = {
  title?: string
  description?: string
  handle?: string
  metadata?: Record<string, unknown>
}

export type CreateCustomProductListInput = {
  title: string
  access_type?: ProductListAccessType
  description?: string
  handle?: string
  metadata?: Record<string, unknown>
}

export type UpdateProductListInput = {
  listId: string
  title?: string
  access_type?: ProductListAccessType
  description?: string
  handle?: string
  metadata?: Record<string, unknown>
}

export type DeleteProductListInput = {
  listId: string
}

export type AddProductListItemInput = {
  listId: string
  productId: string
  variantId?: string | null
  quantity?: number | null
  note?: string
  sortOrder?: number
  metadata?: Record<string, unknown>
}

export type AddFavoriteProductListItemInput = Omit<
  AddProductListItemInput,
  "listId"
>

export type CreateProductListCartInput = {
  listId: string
  regionId?: string | null
  countryCode?: string | null
  email?: string | null
  salesChannelId?: string | null
}

export type ChangeProductListItemQuantityInput = {
  itemId: string
  quantity?: number
}

export type IncrementProductListItemInput = ChangeProductListItemQuantityInput

export type UpdateProductListItemInput = {
  itemId: string
  quantity?: number | null
  note?: string | null
  sortOrder?: number | null
  metadata?: Record<string, unknown> | null
}

export type DeleteProductListItemInput = {
  itemId: string
  listId?: string
}

export type ProductListCartLike = {
  id: string
  region_id?: string | null
}

export type ProductListService<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListParams,
  TDetailParams,
> = {
  listProductLists: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<ProductListListResult<TProductList>>
  getProductList: (
    params: TDetailParams,
    signal?: AbortSignal
  ) => Promise<TProductList | null>
  createFavoriteProductList: (
    input: CreateFavoriteProductListInput
  ) => Promise<TProductList | null>
  createCustomProductList: (
    input: CreateCustomProductListInput
  ) => Promise<TProductList | null>
  updateProductList: (
    input: UpdateProductListInput
  ) => Promise<TProductList | null>
  deleteProductList: (
    input: DeleteProductListInput
  ) => Promise<ProductListDeleteResponse>
  addProductListItem: (
    input: AddProductListItemInput
  ) => Promise<TProductListItem | null>
  addFavoriteProductListItem: (
    input: AddFavoriteProductListItemInput
  ) => Promise<TProductListItem | null>
  createProductListCart: (input: CreateProductListCartInput) => Promise<TCart>
  updateProductListItem: (
    input: UpdateProductListItemInput
  ) => Promise<TProductListItem | null>
  changeProductListItemQuantity: (
    input: ChangeProductListItemQuantityInput
  ) => Promise<TProductListItem | null>
  incrementProductListItem: (
    input: IncrementProductListItemInput
  ) => Promise<TProductListItem | null>
  deleteProductListItem: (
    input: DeleteProductListItemInput
  ) => Promise<ProductListDeleteResponse>
}

export type ProductListQueryKeys<TListKeyParams, TDetailKeyParams> = {
  all: () => QueryKey
  list: (params: TListKeyParams) => QueryKey
  detail: (params: TDetailKeyParams) => QueryKey
}

export type ProductListMutationOptions<
  TData,
  TVariables,
  TContext = unknown,
> = MutationOptions<TData, TVariables, TContext>

export type UseProductListsResult<TProductList> = ReadResultBase<
  QueryResult<ProductListListResult<TProductList>>
> & {
  productLists: TProductList[]
  count: number
  limit: number
  offset: number
}

export type UseSuspenseProductListsResult<TProductList> = SuspenseResultBase<
  SuspenseQueryResult<ProductListListResult<TProductList>>
> & {
  productLists: TProductList[]
  count: number
  limit: number
  offset: number
}

export type UseProductListResult<TProductList> = ReadResultBase<
  QueryResult<TProductList | null>
> & {
  productList: TProductList | null
}

export type UseSuspenseProductListResult<TProductList> = SuspenseResultBase<
  SuspenseQueryResult<TProductList | null>
> & {
  productList: TProductList | null
}
