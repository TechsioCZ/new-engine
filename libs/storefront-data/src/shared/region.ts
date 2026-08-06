export type RegionInfo = {
  region_id?: string
  country_code?: string
  sales_channel_id?: string | string[]
}

export const applyRegion = <T extends RegionInfo>(
  input: T,
  region?: RegionInfo | null
): T => {
  if (!region) {
    return input
  }

  const resolvedRegionId = input.region_id ?? region.region_id
  const resolvedCountryCode = input.country_code ?? region.country_code
  const resolvedSalesChannelId =
    input.sales_channel_id ?? region.sales_channel_id

  return {
    ...input,
    ...(resolvedRegionId !== undefined ? { region_id: resolvedRegionId } : {}),
    ...(resolvedCountryCode !== undefined
      ? { country_code: resolvedCountryCode }
      : {}),
    ...(resolvedSalesChannelId !== undefined
      ? { sales_channel_id: resolvedSalesChannelId }
      : {}),
  }
}
