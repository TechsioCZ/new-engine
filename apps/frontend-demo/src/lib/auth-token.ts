import { STORAGE_KEYS } from "./constants"

const getStoredAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  } catch (error) {
    console.warn("Failed to read auth token from storage", error)
    return null
  }
}

export const hasStoredAuthToken = (): boolean =>
  Boolean(getStoredAuthToken())

export const clearStoredAuthToken = () => {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
  } catch (error) {
    console.warn("Failed to clear auth token from storage", error)
  }
}
