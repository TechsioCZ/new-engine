"use client"

import { useQuery } from "@tanstack/react-query"
import { createQueryKey } from "@techsio/storefront-data/shared/query-keys"
import { storefrontSdk } from "./sdk"
import { storefrontDefinition } from "./storefront-definition"

export type VolumeDiscountTier = {
  promotion_id: string
  minimum_quantity: number
  percentage: number
  unit_amount: number
  total_amount: number
  currency_code: string
}

type VolumeDiscountTierResponse = {
  volume_discount_tiers: VolumeDiscountTier[]
}

type UseVolumeDiscountTiersInput = {
  customerId?: string | null
  variantId: string | null
  regionId?: string
  salesChannelId?: string
}

type VolumeDiscountQuery = {
  variant_id: string
  region_id: string
  sales_channel_id?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isVolumeDiscountTier = (value: unknown): value is VolumeDiscountTier =>
  isRecord(value) &&
  typeof value.promotion_id === "string" &&
  typeof value.minimum_quantity === "number" &&
  Number.isInteger(value.minimum_quantity) &&
  value.minimum_quantity >= 2 &&
  typeof value.percentage === "number" &&
  Number.isFinite(value.percentage) &&
  value.percentage > 0 &&
  value.percentage < 100 &&
  typeof value.unit_amount === "number" &&
  Number.isFinite(value.unit_amount) &&
  value.unit_amount >= 0 &&
  typeof value.total_amount === "number" &&
  Number.isFinite(value.total_amount) &&
  value.total_amount >= 0 &&
  typeof value.currency_code === "string" &&
  value.currency_code.length > 0

export const parseVolumeDiscountTierResponse = (
  value: unknown
): VolumeDiscountTierResponse => {
  if (
    !(
      isRecord(value) &&
      Array.isArray(value.volume_discount_tiers) &&
      value.volume_discount_tiers.every(isVolumeDiscountTier)
    )
  ) {
    throw new Error("Invalid volume discount response")
  }

  return { volume_discount_tiers: value.volume_discount_tiers }
}

async function fetchVolumeDiscountTiers(
  query: VolumeDiscountQuery,
  signal?: AbortSignal
) {
  const response = await storefrontSdk.client.fetch<unknown>(
    "/store/volume-discounts",
    { query, signal }
  )

  return parseVolumeDiscountTierResponse(response)
}

export const useVolumeDiscountTiers = ({
  customerId,
  variantId,
  regionId,
  salesChannelId,
}: UseVolumeDiscountTiersInput) => {
  const requestQuery =
    variantId && regionId
      ? {
          variant_id: variantId,
          region_id: regionId,
          ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
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
        ? fetchVolumeDiscountTiers(requestQuery, signal)
        : Promise.resolve({ volume_discount_tiers: [] }),
    enabled: requestQuery !== null,
    ...storefrontDefinition.cacheConfig.userData,
  })

  return { tiers: query.data?.volume_discount_tiers ?? [], query }
}
