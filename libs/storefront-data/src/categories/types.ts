import type { QueryKey } from "../shared/query-keys"
import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-types"

export type CategoryListInputBase = {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

export type CategoryDetailInputBase = {
  id?: string
  enabled?: boolean
}

export type CategoryListResponse<TCategory> = {
  categories: TCategory[]
  count?: number
}

export type CategoryService<
  TCategory,
  TListParams,
  TDetailParams,
> = {
  getCategories: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<CategoryListResponse<TCategory>>
  getCategory: (params: TDetailParams) => Promise<TCategory | null>
}

export type CategoryQueryKeys<TListParams, TDetailParams> = {
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
