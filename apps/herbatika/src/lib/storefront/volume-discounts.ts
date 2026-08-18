"use client"

import { useQuery } from "@tanstack/react-query"
import { createQueryKey } from "@techsio/storefront-data/shared/query-keys"
import { storefrontDefinition } from "./storefront-definition"
import {
  parseVolumeDiscountTierResponse,
  type VolumeDiscountTierResponse,
} from "./volume-discounts-contract"

type UseVolumeDiscountTiersInput = {
  customerId?: string | null
  variantId: string | null
  regionId?: string
  salesChannelId?: string
}

type VolumeDiscountQuery = {
  variant_id: string
}

const VOLUME_DISCOUNT_GATEWAY_PATH = "/api/storefront/product/volume-discounts"

class VolumeDiscountRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Volume discount request failed with status ${status}`)
    this.name = "VolumeDiscountRequestError"
    this.status = status
  }
}

export async function fetchVolumeDiscountTiers(
  variantId: string,
  signal?: AbortSignal
): Promise<VolumeDiscountTierResponse> {
  const query = new URLSearchParams({ variant_id: variantId })
  const response = await fetch(
    VOLUME_DISCOUNT_GATEWAY_PATH.concat("?", query.toString()),
    {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal,
    }
  )

  if (!response.ok) {
    throw new VolumeDiscountRequestError(response.status)
  }

  const payload: unknown = await response.json()

  return parseVolumeDiscountTierResponse(payload)
}

export const useVolumeDiscountTiers = ({
  customerId,
  variantId,
  regionId,
  salesChannelId,
}: UseVolumeDiscountTiersInput) => {
  const requestQuery: VolumeDiscountQuery | null =
    variantId && regionId
      ? {
          variant_id: variantId,
        }
      : null
  const query = useQuery({
    queryKey: createQueryKey(
      storefrontDefinition.namespace,
      "volume-discounts",
      { customerId: customerId ?? null, variantId, regionId, salesChannelId }
    ),
    queryFn: ({ signal }) =>
      requestQuery
        ? fetchVolumeDiscountTiers(requestQuery.variant_id, signal)
        : Promise.resolve({ volume_discount_tiers: [] }),
    enabled: requestQuery !== null,
    ...storefrontDefinition.cacheConfig.userData,
  })

  return { tiers: query.data?.volume_discount_tiers ?? [], query }
}
