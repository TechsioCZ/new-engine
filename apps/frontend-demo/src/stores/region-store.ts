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

const persistCookie = async (name: string, value: string): Promise<void> => {
  if (typeof window === "undefined") {
    return
  }

  try {
    if (!("cookieStore" in window)) {
      localStorage.setItem(name, value)
      return
    }

    await window.cookieStore.set({
      expires: Date.now() + COOKIE_MAX_AGE * 1000,
      name,
      path: "/",
      sameSite: "lax",
      value,
    })
  } catch (error) {
    console.error("[RegionStore] Failed to persist the selected region", error)
    if ("cookieStore" in window) {
      try {
        localStorage.setItem(name, value)
      } catch (storageError) {
        console.error(
          "[RegionStore] Failed to use legacy region storage",
          storageError,
        )
      }
    }
  }
}

const setCookie = (name: string, value: string): void => {
  void persistCookie(name, value)
}

const getCookie = async (name: string): Promise<string | null> => {
  if (typeof window === "undefined") {
    return null
  }

  if (!("cookieStore" in window)) {
    return null
  }

  try {
    const cookie = await window.cookieStore.get(name)
    return cookie?.value ?? null
  } catch (error) {
    console.error("[RegionStore] Failed to read the selected region", error)
    return null
  }
}

// Helper functions
export const setSelectedRegionId = (regionId: string): void => {
  regionStore.setState((state) => ({
    ...state,
    selectedRegionId: regionId,
  }))

  setCookie(COOKIE_NAME, regionId)
}

if (typeof window !== "undefined") {
  const initializeRegion = async (): Promise<void> => {
    const cookieRegionId = await getCookie(COOKIE_NAME)

    // Migrate from localStorage to the cookie store.
    if (cookieRegionId !== null && cookieRegionId.length > 0) {
      regionStore.setState((state) => ({
        ...state,
        selectedRegionId: cookieRegionId,
      }))
      return
    }

    const legacyRegionId = localStorage.getItem(COOKIE_NAME)
    if (legacyRegionId !== null && legacyRegionId.length > 0) {
      setCookie(COOKIE_NAME, legacyRegionId)
      if ("cookieStore" in window) {
        localStorage.removeItem(COOKIE_NAME)
      }
      regionStore.setState((state) => ({
        ...state,
        selectedRegionId: legacyRegionId,
      }))
    }
  }

  void initializeRegion()
}
