import type {
  QueryResult,
  ReadResultBase,
  SuspenseQueryResult,
  SuspenseResultBase,
} from "../shared/hook-types"

export type RegionListInputBase = {
  page?: number
  limit?: number
  offset?: number
  enabled?: boolean
}

export type RegionDetailInputBase = {
  id?: string
  enabled?: boolean
}

export type RegionListResponse<TRegion> = {
  regions: TRegion[]
  count?: number
}

export type RegionService<
  TRegion,
  TListParams,
  TDetailParams,
> = {
  getRegions: (
    params: TListParams,
    signal?: AbortSignal
  ) => Promise<RegionListResponse<TRegion>>
  getRegion: (params: TDetailParams, signal?: AbortSignal) => Promise<TRegion | null>
}

export type RegionQueryKeys<TListParams, TDetailParams> = {
  all: () => readonly unknown[]
  list: (params: TListParams) => readonly unknown[]
  detail: (params: TDetailParams) => readonly unknown[]
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
