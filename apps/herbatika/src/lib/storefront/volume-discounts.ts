'use client'

import { useQuery } from '@tanstack/react-query'
import { createQueryKey } from '@techsio/storefront-data/shared/query-keys'
import { storefrontSdk } from './sdk'
import { storefrontDefinition } from './storefront-definition'

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
	variantId: string | null
	regionId?: string
	salesChannelId?: string
}

type VolumeDiscountQuery = {
	variant_id: string
	region_id: string
	sales_channel_id?: string
}

function fetchVolumeDiscountTiers(query: VolumeDiscountQuery, signal?: AbortSignal) {
	return storefrontSdk.client.fetch<VolumeDiscountTierResponse>('/store/volume-discounts', { query, signal })
}

export const useVolumeDiscountTiers = ({ variantId, regionId, salesChannelId }: UseVolumeDiscountTiersInput) => {
	const requestQuery = variantId && regionId ? { variant_id: variantId, region_id: regionId, ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}) } : null
	const query = useQuery({
		queryKey: createQueryKey(storefrontDefinition.namespace, 'volume-discounts', { variantId, regionId, salesChannelId }),
		queryFn: ({ signal }) => requestQuery ? fetchVolumeDiscountTiers(requestQuery, signal) : Promise.resolve({ volume_discount_tiers: [] }),
		enabled: requestQuery !== null,
		staleTime: storefrontDefinition.cacheConfig.semiStatic.staleTime
	})

	return { tiers: query.data?.volume_discount_tiers ?? [], query }
}
