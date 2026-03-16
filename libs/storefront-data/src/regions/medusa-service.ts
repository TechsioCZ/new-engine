import type Medusa from "@medusajs/js-sdk"
import type { FindParams, HttpTypes, SelectParams } from "@medusajs/types"
import type { RegionService, RegionListResponse } from "./types"

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
export function createMedusaRegionService(
  sdk: Medusa
): RegionService<
  HttpTypes.StoreRegion,
  MedusaRegionListInput,
  MedusaRegionDetailInput
> {
  return {
    async getRegions(
      params: MedusaRegionListInput,
      signal?: AbortSignal
    ): Promise<RegionListResponse<HttpTypes.StoreRegion>> {
      const { enabled: _enabled, ...query } = params
      const response = await sdk.client.fetch<HttpTypes.StoreRegionListResponse>(
        "/store/regions",
        {
          query,
          signal,
        }
      )
      return {
        regions: response.regions ?? [],
        count: response.count ?? response.regions?.length ?? 0,
      }
    },

    async getRegion(
      params: MedusaRegionDetailInput,
      signal?: AbortSignal
    ): Promise<HttpTypes.StoreRegion | null> {
      if (!params.id) {
        return null
      }
      const { id, enabled: _enabled, ...query } = params
      const response = await sdk.client.fetch<HttpTypes.StoreRegionResponse>(
        `/store/regions/${id}`,
        {
          query,
          signal,
        }
      )
      return response.region ?? null
    },
  }
}
