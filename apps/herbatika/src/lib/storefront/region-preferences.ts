import {
  getLocalStorageItem,
  setLocalStorageItem,
} from "@techsio/storefront-data/shared/local-storage"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"

import { runDetachedPromise } from "./detached-promise"

export const REGION_STORAGE_KEY = "herbatika_region_id"
export const REGION_COUNTRY_CODE_STORAGE_KEY = "herbatika_region_country_code"
const REGION_PREFERENCE_REQUEST_TIMEOUT_MS = 5000

export class RegionPreferencePersistenceError extends Error {
  readonly code = "REGION_PREFERENCE_PERSISTENCE_FAILED"
  readonly status: number

  constructor(status: number) {
    super(`Region preference persistence failed with status ${status}.`)
    this.name = "RegionPreferencePersistenceError"
    this.status = status
  }
}

const REGION_ID_PATTERN = /^reg_[a-z0-9]+$/iu
const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/iu

export const normalizeRegionId = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  if (!REGION_ID_PATTERN.test(normalized)) {
    return null
  }

  return normalized
}

export const normalizeCountryCode = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (!COUNTRY_CODE_PATTERN.test(normalized)) {
    return null
  }

  return normalized
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

export const persistRegionPreference = (region: RegionInfo) => {
  const regionId = normalizeRegionId(region.region_id)
  const countryCode = normalizeCountryCode(region.country_code)

  if (regionId === null || countryCode === null) {
    return
  }

  setLocalStorageItem(REGION_STORAGE_KEY, regionId)
  setLocalStorageItem(REGION_COUNTRY_CODE_STORAGE_KEY, countryCode)

  runDetachedPromise(
    persistRegionCookies({
      country_code: countryCode,
      region_id: regionId,
    }),
  )
}

export const getStoredRegionPreference = (): RegionInfo | null => {
  if (typeof window === "undefined") {
    return null
  }

  const regionId = normalizeRegionId(getLocalStorageItem(REGION_STORAGE_KEY))
  const countryCode = normalizeCountryCode(
    getLocalStorageItem(REGION_COUNTRY_CODE_STORAGE_KEY),
  )

  if (regionId === null || countryCode === null) {
    return null
  }

  return {
    country_code: countryCode,
    region_id: regionId,
  }
}

export const resolveRegionInfoFromCookieValues = (
  regionIdRaw: string | null | undefined,
  countryCodeRaw: string | null | undefined,
): RegionInfo | null => {
  const regionId = normalizeRegionId(regionIdRaw)
  const countryCode = normalizeCountryCode(countryCodeRaw)

  if (regionId === null || countryCode === null) {
    return null
  }

  return {
    country_code: countryCode,
    region_id: regionId,
  }
}
