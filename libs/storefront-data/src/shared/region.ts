export type RegionInfo = {
  region_id?: string
  country_code?: string
}

export const applyRegion = <T extends RegionInfo>(
  input: T,
  region?: RegionInfo | null
): T => {
  if (!region) {
    return input
  }

  return {
    ...region,
    ...input,
  }
}
