import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { RegionService, RegionListResponse } from "./types"

export type MedusaRegionListInput = {
  enabled?: boolean
}

export type MedusaRegionDetailInput = {
  id?: string
  enabled?: boolean
}

/**
 * Creates a RegionService for Medusa SDK
 *
 * @example
 * ```typescript
 * import { createRegionHooks, createMedusaRegionService } from "@techsio/storefront-data"
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
      _params: MedusaRegionListInput,
      _signal?: AbortSignal
    ): Promise<RegionListResponse<HttpTypes.StoreRegion>> {
      const response = await sdk.store.region.list()
      return {
        regions: response.regions,
        count: response.regions.length,
      }
    },

    async getRegion(
      params: MedusaRegionDetailInput,
      _signal?: AbortSignal
    ): Promise<HttpTypes.StoreRegion | null> {
      if (!params.id) {
        return null
      }
      const response = await sdk.store.region.retrieve(params.id)
      return response.region ?? null
    },
  }
}
