export type CollectionListInputBase = {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

export type CollectionDetailInputBase = {
  id?: string
  enabled?: boolean
}

export type CollectionListResponse<TCollection> = {
  collections: TCollection[]
  count?: number
}

export type CollectionService<
  TCollection,
  TListParams,
  TDetailParams,
> = {
  getCollections: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<CollectionListResponse<TCollection>>
  getCollection: (params: TDetailParams) => Promise<TCollection | null>
}

export type CollectionQueryKeys<TListParams, TDetailParams> = {
  all: () => QueryKey
  list: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

export type UseCollectionsResult<TCollection> = {
  collections: TCollection[]
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
import type { QueryKey } from "../shared/query-keys"
