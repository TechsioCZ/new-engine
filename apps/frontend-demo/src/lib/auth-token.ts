import { STORAGE_KEYS } from "./constants"

const getStoredAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null
  }

  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
}

export const hasStoredAuthToken = (): boolean =>
  Boolean(getStoredAuthToken())

export const clearStoredAuthToken = () => {
  if (typeof window === "undefined") {
    return
  }

  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
}
