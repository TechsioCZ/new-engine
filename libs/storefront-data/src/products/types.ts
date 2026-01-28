import type { QueryKey } from "../shared/query-keys"
import type { RegionInfo } from "../shared/region"
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

export type ProductService<TProduct, TListParams, TDetailParams> = {
  getProducts: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<ProductListResponse<TProduct>>
  getProductsGlobal?: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<ProductListResponse<TProduct>>
  getProductByHandle: (params: TDetailParams) => Promise<TProduct | null>
}

export type ProductQueryKeys<TListParams, TDetailParams> = {
  list: (params: TListParams) => QueryKey
  infinite?: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

export type UseProductsResult<TProduct> = {
  products: TProduct[]
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  error: string | null
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseSuspenseProductsResult<TProduct> = {
  products: TProduct[]
  isFetching: boolean
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseInfiniteProductsResult<TProduct> = {
  products: TProduct[]
  isLoading: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  error: string | null
  totalCount: number
  fetchNextPage: () => void
  refetch: () => void
}
