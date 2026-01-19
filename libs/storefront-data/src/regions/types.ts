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
  getRegion: (params: TDetailParams) => Promise<TRegion | null>
}

export type RegionQueryKeys<TListParams, TDetailParams> = {
  all: () => readonly unknown[]
  list: (params: TListParams) => readonly unknown[]
  detail: (params: TDetailParams) => readonly unknown[]
}

export type UseRegionsResult<TRegion> = {
  regions: TRegion[]
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
