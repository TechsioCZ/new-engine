const DEFAULT_MEDUSA_BACKEND_URL = "http://localhost:9000"

const getPublicMedusaBackendUrl = (): string =>
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || DEFAULT_MEDUSA_BACKEND_URL

export const getMedusaBackendUrl = (): string => {
  // Server runtime can use internal Docker DNS URL if provided.
  if (typeof window === "undefined") {
    return (
      process.env.MEDUSA_BACKEND_URL_INTERNAL || getPublicMedusaBackendUrl()
    )
  }

  // Browser must always use public URL.
  return getPublicMedusaBackendUrl()
}
