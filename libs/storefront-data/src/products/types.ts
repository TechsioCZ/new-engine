import type { QueryKey } from "../shared/query-keys"
import type { RegionInfo } from "../shared/region"
import type {
  InfiniteQueryResult,
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-types"
export type { RegionInfo } from "../shared/region"

export type ProductListInputBase = RegionInfo & {
  page?: number
  limit?: number
  enabled?: boolean
}

export type ProductInfiniteInputBase = ProductListInputBase & {
  offset?: number
}

export type ProductDetailInputBase = RegionInfo & {
  handle: string
  fields?: string
  enabled?: boolean
}

export type ProductListResponse<TProduct> = {
  products: TProduct[]
  count: number
  limit: number
  offset: number
}

export type ProductInfiniteData<TProduct> = {
  pages: ProductListResponse<TProduct>[]
  pageParams: unknown[]
}

export type ProductService<TProduct, TListParams, TDetailParams> = {
  getProducts: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<ProductListResponse<TProduct>>
  getProductsGlobal?: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<ProductListResponse<TProduct>>
  getProductByHandle: (
    params: TDetailParams,
    signal?: AbortSignal
  ) => Promise<TProduct | null>
}

export type ProductQueryKeys<TListParams, TDetailParams> = {
  list: (params: TListParams) => QueryKey
  infinite?: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

export type UseProductsResult<TProduct> = ReadResultBase<
  QueryResult<ProductListResponse<TProduct>>
> & {
  products: TProduct[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseSuspenseProductsResult<TProduct> = SuspenseResultBase<
  SuspenseQueryResult<ProductListResponse<TProduct>>
> & {
  products: TProduct[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseInfiniteProductsResult<TProduct> = ReadResultBase<
  InfiniteQueryResult<ProductInfiniteData<TProduct>>
> & {
  products: TProduct[]
  isFetchingNextPage: boolean
  hasNextPage: boolean
  totalCount: number
  fetchNextPage: () => void
  refetch: () => void
}

export type UseProductResult<TProduct> = ReadResultBase<
  QueryResult<TProduct | null>
> & {
  product: TProduct | null
}

export type UseSuspenseProductResult<TProduct> = SuspenseResultBase<
  SuspenseQueryResult<TProduct | null>
> & {
  product: TProduct | null
}
