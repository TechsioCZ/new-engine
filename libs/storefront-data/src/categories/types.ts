import type { QueryKey } from "../shared/query-keys"

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

export type UseCategoriesResult<TCategory> = {
  categories: TCategory[]
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
