import {
  getLocalStorageItem,
  setLocalStorageItem,
} from "@techsio/storefront-data/shared/local-storage"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"

export const REGION_STORAGE_KEY = "herbatika_region_id"
export const REGION_COUNTRY_CODE_STORAGE_KEY = "herbatika_region_country_code"
export const REGION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const REGION_ID_PATTERN = /^reg_[a-z0-9]+$/i
const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/i

type BrowserCookieStore = {
  set: (options: {
    expires?: number
    name: string
    path?: string
    sameSite?: "lax" | "strict" | "none"
    value: string
  }) => Promise<void>
}

type WindowWithCookieStore = Window & {
  cookieStore?: BrowserCookieStore
}

const normalizeRegionId = (value: string | null | undefined): string | null => {
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
  value: string | null | undefined
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

const writeDocumentCookie = (name: string, value: string) => {
  // biome-ignore lint/suspicious/noDocumentCookie: Legacy fallback for browsers without Cookie Store API support.
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${REGION_COOKIE_MAX_AGE}; samesite=lax`
}

const writeCookie = (name: string, value: string) => {
  if (typeof window === "undefined") {
    return
  }

  const cookieStore = (window as WindowWithCookieStore).cookieStore
  if (cookieStore) {
    cookieStore
      .set({
        expires: Date.now() + REGION_COOKIE_MAX_AGE * 1000,
        name,
        path: "/",
        sameSite: "lax",
        value,
      })
      .catch(() => writeDocumentCookie(name, value))
    return
  }

  writeDocumentCookie(name, value)
}

export const persistRegionPreference = (region: RegionInfo) => {
  const regionId = normalizeRegionId(region.region_id)
  const countryCode = normalizeCountryCode(region.country_code)

  if (!(regionId && countryCode)) {
    return
  }

  setLocalStorageItem(REGION_STORAGE_KEY, regionId)
  setLocalStorageItem(REGION_COUNTRY_CODE_STORAGE_KEY, countryCode)

  writeCookie(REGION_STORAGE_KEY, regionId)
  writeCookie(REGION_COUNTRY_CODE_STORAGE_KEY, countryCode)
}

export const getStoredRegionPreference = (): RegionInfo | null => {
  if (typeof window === "undefined") {
    return null
  }

  const regionId = normalizeRegionId(getLocalStorageItem(REGION_STORAGE_KEY))
  const countryCode = normalizeCountryCode(
    getLocalStorageItem(REGION_COUNTRY_CODE_STORAGE_KEY)
  )

  if (!(regionId && countryCode)) {
    return null
  }

  return {
    region_id: regionId,
    country_code: countryCode,
  }
}

export const resolveRegionInfoFromCookieValues = (
  regionIdRaw: string | null | undefined,
  countryCodeRaw: string | null | undefined
): RegionInfo | null => {
  const regionId = normalizeRegionId(regionIdRaw)
  const countryCode = normalizeCountryCode(countryCodeRaw)

  if (!(regionId && countryCode)) {
    return null
  }

  return {
    region_id: regionId,
    country_code: countryCode,
  }
}
