import type { HttpTypes } from "@medusajs/types"

import type {
  InfiniteQueryResult,
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-result-types"
import type { QueryKey } from "../shared/query-keys"
import type { RegionInfo } from "../shared/region"

export type { RegionInfo } from "../shared/region"

export interface StorePricePerUnit {
  calculated_amount?: number
  calculated_amount_with_tax?: number
  calculated_amount_without_tax?: number
  currency_code: string | null
  original_amount?: number
  original_amount_with_tax?: number
  original_amount_without_tax?: number
  product_unit_quantity: number
  unit_base_quantity: number
  unit_code: string
  unit_id: string
  unit_name: string
  unit_symbol: string
}

export type StoreCalculatedPriceWithPricePerUnit = NonNullable<
  HttpTypes.StoreProductVariant["calculated_price"]
> & {
  price_per_unit?: StorePricePerUnit
}

export type StoreProductVariantWithPricePerUnit = Omit<
  HttpTypes.StoreProductVariant,
  "calculated_price"
> & {
  calculated_price?: StoreCalculatedPriceWithPricePerUnit | null
}

export type StoreProductWithPricePerUnit = Omit<
  HttpTypes.StoreProduct,
  "variants"
> & {
  variants: StoreProductVariantWithPricePerUnit[] | null
}

export type ProductListInputBase = RegionInfo & {
  page?: number
  limit?: number
  enabled?: boolean
}

export type ProductInfiniteInputBase = ProductListInputBase & {
  offset?: number
  /**
   * Optional first-page override for infinite queries.
   *
   * If both `limit` and `initialLimit` are provided:
   * - first page uses `initialLimit`
   * - subsequent pages use `limit`
   */
  initialLimit?: number
}

export type ProductDetailInputBase = RegionInfo & {
  handle: string
  fields?: string
  enabled?: boolean
}

export interface ProductListResponse<TProduct> {
  products: TProduct[]
  count: number
  limit: number
  offset: number
}

export interface ProductInfiniteData<TProduct> {
  pages: ProductListResponse<TProduct>[]
  pageParams: unknown[]
}

export interface ProductService<TProduct, TListParams, TDetailParams> {
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

export interface ProductQueryKeys<TListParams, TDetailParams> {
  list: (params: TListParams) => QueryKey
  infinite?: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

interface ProductsResultFields<TProduct> {
  products: TProduct[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseProductsResult<TProduct> = ReadResultBase<
  QueryResult<ProductListResponse<TProduct>>
> &
  ProductsResultFields<TProduct>

export type UseSuspenseProductsResult<TProduct> = SuspenseResultBase<
  SuspenseQueryResult<ProductListResponse<TProduct>>
> &
  ProductsResultFields<TProduct>

export type UseInfiniteProductsResult<TProduct> = ReadResultBase<
  InfiniteQueryResult<ProductInfiniteData<TProduct>>
> & {
  products: TProduct[]
  isFetchingNextPage: boolean
  hasNextPage: boolean
  totalCount: number
  fetchNextPage: () => Promise<unknown>
  refetch: () => Promise<unknown>
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
