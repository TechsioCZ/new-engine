import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-result-types"
import type { QueryKey } from "../shared/query-keys"

export interface RegionListInputBase {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

export interface RegionDetailInputBase {
  id?: string
  enabled?: boolean
}

export interface RegionListResponse<TRegion> {
  regions: TRegion[]
  count?: number
}

export interface RegionService<TRegion, TListParams, TDetailParams> {
  getRegions: (
    params: TListParams,
    signal?: AbortSignal,
  ) => Promise<RegionListResponse<TRegion>>
  getRegion: (
    params: TDetailParams,
    signal?: AbortSignal,
  ) => Promise<TRegion | null>
}

export interface RegionQueryKeys<TListParams, TDetailParams> {
  all: () => QueryKey
  list: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

export type UseRegionsResult<TRegion> = ReadResultBase<
  QueryResult<RegionListResponse<TRegion>>
> & {
  regions: TRegion[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseSuspenseRegionsResult<TRegion> = SuspenseResultBase<
  SuspenseQueryResult<RegionListResponse<TRegion>>
> & {
  regions: TRegion[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type UseRegionResult<TRegion> = ReadResultBase<
  QueryResult<TRegion | null>
> & {
  region: TRegion | null
}

export type UseSuspenseRegionResult<TRegion> = SuspenseResultBase<
  SuspenseQueryResult<TRegion | null>
> & {
  region: TRegion | null
}
