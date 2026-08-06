import type Medusa from "@medusajs/js-sdk"
import type { FindParams, HttpTypes, SelectParams } from "@medusajs/types"
import { omitKeys } from "@techsio/std/object"

import type { RegionListResponse, RegionService } from "./types"

export type MedusaRegionListInput = FindParams &
  HttpTypes.StoreRegionFilters & {
    enabled?: boolean
  }

export type MedusaRegionDetailInput = SelectParams & {
  id?: string
  enabled?: boolean
}

/**
 * Creates a RegionService for Medusa SDK
 *
 * @example
 * ```typescript
 * import { createRegionHooks } from "@techsio/storefront-data/regions/hooks"
 * import { createMedusaRegionService } from "@techsio/storefront-data/regions/medusa-service"
 * import { sdk } from "@/lib/medusa-client"
 *
 * const regionHooks = createRegionHooks({
 *   service: createMedusaRegionService(sdk),
 *   queryKeys: regionQueryKeys,
 * })
 * ```
 */
export const createMedusaRegionService = (
  sdk: Medusa,
): RegionService<
  HttpTypes.StoreRegion,
  MedusaRegionListInput,
  MedusaRegionDetailInput
> => ({
  async getRegion(
    params: MedusaRegionDetailInput,
    signal?: AbortSignal,
  ): Promise<HttpTypes.StoreRegion | null> {
    if (params.id === undefined || params.id.length === 0) {
      return null
    }
    const { id } = params
    const query = omitKeys(params, ["id", "enabled"])
    const response = await sdk.client.fetch<HttpTypes.StoreRegionResponse>(
      `/store/regions/${id}`,
      {
        query,
        signal: signal ?? null,
      },
    )
    return response.region ?? null
  },

  async getRegions(
    params: MedusaRegionListInput,
    signal?: AbortSignal,
  ): Promise<RegionListResponse<HttpTypes.StoreRegion>> {
    const query = omitKeys(params, ["enabled"])
    const response = await sdk.client.fetch<HttpTypes.StoreRegionListResponse>(
      "/store/regions",
      {
        query,
        signal: signal ?? null,
      },
    )
    return {
      count: response.count ?? response.regions?.length ?? 0,
      regions: response.regions ?? [],
    }
  },
})
