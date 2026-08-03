import { Store } from "@tanstack/react-store"

// Cookie helpers
const COOKIE_NAME = "medusa_region_id"
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60

export interface RegionState {
  selectedRegionId: string | null
}

export const regionStore = new Store<RegionState>({
  selectedRegionId: null,
})

function setCookie(name: string, value: string) {
  if (typeof window !== "undefined") {
    document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
  }
}

function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null
  }
  return null
}

// Helper functions
export function setSelectedRegionId(regionId: string) {
  regionStore.setState((state) => ({
    ...state,
    selectedRegionId: regionId,
  }))

  setCookie(COOKIE_NAME, regionId)
}

if (typeof window !== "undefined") {
  const cookieRegionId = getCookie(COOKIE_NAME)

  // migration from localStorage to cookie
  if (cookieRegionId) {
    regionStore.setState((state) => ({
      ...state,
      selectedRegionId: cookieRegionId,
    }))
  } else {
    const legacyRegionId = localStorage.getItem(COOKIE_NAME)
    if (legacyRegionId) {
      setCookie(COOKIE_NAME, legacyRegionId)
      localStorage.removeItem(COOKIE_NAME)
      regionStore.setState((state) => ({
        ...state,
        selectedRegionId: legacyRegionId,
      }))
    }
  }
}
