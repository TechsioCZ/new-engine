import type { HttpTypes } from "@medusajs/types"
import type { RegionListParams } from "./ssr/types"

export const REGION_LIST_FIELDS = "id,name,currency_code,countries.*,metadata"
export const REGION_LIST_PAGE_SIZE = 50

type RegionPageResponse = {
  regions: HttpTypes.StoreRegion[]
  count?: number
}

type RegionPageFetcher = (
  params: RegionListParams
) => Promise<RegionPageResponse>

export const buildCompleteRegionListQueryKey = (
  regionQueryKey: readonly unknown[]
) => [...regionQueryKey, "complete-list", REGION_LIST_FIELDS] as const

export const fetchCompleteRegionList = async (
  fetchPage: RegionPageFetcher
): Promise<RegionPageResponse> => {
  const regionsById = new Map<string, HttpTypes.StoreRegion>()
  let offset = 0

  while (true) {
    const page = await fetchPage({
      fields: REGION_LIST_FIELDS,
      limit: REGION_LIST_PAGE_SIZE,
      offset,
    })
    const previousRegionCount = regionsById.size

    for (const region of page.regions) {
      regionsById.set(region.id, region)
    }

    const nextOffset = offset + page.regions.length
    const reachedKnownEnd =
      typeof page.count === "number" && nextOffset >= page.count
    const reachedShortPage = page.regions.length < REGION_LIST_PAGE_SIZE

    if (page.regions.length === 0 || reachedKnownEnd || reachedShortPage) {
      return { regions: [...regionsById.values()], count: regionsById.size }
    }

    if (regionsById.size === previousRegionCount) {
      throw new Error("Region pagination returned no new records.")
    }

    offset = nextOffset
  }
}
