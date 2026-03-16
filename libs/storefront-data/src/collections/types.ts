import type { QueryKey } from "../shared/query-keys"
import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-types"

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
  getCollection: (
    params: TDetailParams,
    signal?: AbortSignal
  ) => Promise<TCollection | null>
}

export type CollectionQueryKeys<TListParams, TDetailParams> = {
  all: () => QueryKey
  list: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

export type UseCollectionsResult<TCollection> = ReadResultBase<
  QueryResult<CollectionListResponse<TCollection>>
> & {
  collections: TCollection[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseSuspenseCollectionsResult<TCollection> = SuspenseResultBase<
  SuspenseQueryResult<CollectionListResponse<TCollection>>
> & {
  collections: TCollection[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseCollectionResult<TCollection> = ReadResultBase<
  QueryResult<TCollection | null>
> & {
  collection: TCollection | null
}

export type UseSuspenseCollectionResult<TCollection> = SuspenseResultBase<
  SuspenseQueryResult<TCollection | null>
> & {
  collection: TCollection | null
}
