import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-result-types"
import type { QueryKey } from "../shared/query-keys"

export interface CategoryListInputBase {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

export interface CategoryDetailInputBase {
  id?: string
  enabled?: boolean
}

export interface CategoryListResponse<TCategory> {
  categories: TCategory[]
  count?: number
}

export interface CategoryService<TCategory, TListParams, TDetailParams> {
  getCategories: (
    params: TListParams,
    signal?: AbortSignal,
  ) => Promise<CategoryListResponse<TCategory>>
  getCategory: (
    params: TDetailParams,
    signal?: AbortSignal,
  ) => Promise<TCategory | null>
}

export interface CategoryQueryKeys<TListParams, TDetailParams> {
  all: () => QueryKey
  list: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

export type UseCategoriesResult<TCategory> = ReadResultBase<
  QueryResult<CategoryListResponse<TCategory>>
> & {
  categories: TCategory[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseSuspenseCategoriesResult<TCategory> = SuspenseResultBase<
  SuspenseQueryResult<CategoryListResponse<TCategory>>
> & {
  categories: TCategory[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseCategoryResult<TCategory> = ReadResultBase<
  QueryResult<TCategory | null>
> & {
  category: TCategory | null
}

export type UseSuspenseCategoryResult<TCategory> = SuspenseResultBase<
  SuspenseQueryResult<TCategory | null>
> & {
  category: TCategory | null
}
