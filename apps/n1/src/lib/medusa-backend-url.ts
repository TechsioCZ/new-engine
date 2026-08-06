import { getRecordValue } from "@techsio/std/object"

const DEFAULT_MEDUSA_BACKEND_URL = "http://localhost:9000"

const readEnvironmentString = (key: string): string | undefined => {
  const value = getRecordValue(process.env, key)
  return typeof value === "string" ? value : undefined
}

const getPublicMedusaBackendUrl = (): string =>
  readEnvironmentString("NEXT_PUBLIC_MEDUSA_BACKEND_URL") ??
  DEFAULT_MEDUSA_BACKEND_URL

export const getMedusaPublishableKey = (): string =>
  readEnvironmentString("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY") ?? ""

export const getMedusaBackendUrl = (): string => {
  // Server runtime can use internal Docker DNS URL if provided.
  if (typeof window === "undefined") {
    return (
      readEnvironmentString("MEDUSA_BACKEND_URL_INTERNAL") ??
      getPublicMedusaBackendUrl()
    )
  }

  // Browser must always use public URL.
  return getPublicMedusaBackendUrl()
}
