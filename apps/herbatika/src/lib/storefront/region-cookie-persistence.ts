import type { RegionInfo } from "@techsio/storefront-data/shared/region"

const REGION_PREFERENCE_REQUEST_TIMEOUT_MS = 5000

class RegionPreferencePersistenceError extends Error {
  readonly code = "REGION_PREFERENCE_PERSISTENCE_FAILED"
  readonly status: number

  constructor(status: number) {
    super(`Region preference persistence failed with status ${status}.`)
    this.name = "RegionPreferencePersistenceError"
    this.status = status
  }
}

export const persistRegionCookies = async (region: RegionInfo) => {
  const response = await fetch("/api/storefront-region", {
    body: JSON.stringify({
      countryCode: region.country_code,
      regionId: region.region_id,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
    signal: AbortSignal.timeout(REGION_PREFERENCE_REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new RegionPreferencePersistenceError(response.status)
  }
}
