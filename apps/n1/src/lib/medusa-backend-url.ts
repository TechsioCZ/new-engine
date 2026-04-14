const DEFAULT_MEDUSA_BACKEND_URL = "http://localhost:9000"
const PUBLIC_MEDUSA_BACKEND_URL_ENV = "NEXT_PUBLIC_MEDUSA_BACKEND_URL"
const isProduction = process.env.NODE_ENV === "production"

function isAbsoluteUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function resolvePublicMedusaBackendUrl(): string {
  const configuredUrl = process.env[PUBLIC_MEDUSA_BACKEND_URL_ENV]?.trim()

  if (!configuredUrl) {
    if (isProduction) {
      throw new Error(`Missing ${PUBLIC_MEDUSA_BACKEND_URL_ENV} in production.`)
    }

    return DEFAULT_MEDUSA_BACKEND_URL
  }

  if (!isAbsoluteUrl(configuredUrl)) {
    if (isProduction) {
      throw new Error(
        `Invalid ${PUBLIC_MEDUSA_BACKEND_URL_ENV}: expected an absolute URL, received "${configuredUrl}".`
      )
    }

    return DEFAULT_MEDUSA_BACKEND_URL
  }

  return configuredUrl
}

export const getPublicMedusaBackendUrl = (): string =>
  resolvePublicMedusaBackendUrl()

export const getPublicMedusaBackendOrigin = (): string =>
  new URL(resolvePublicMedusaBackendUrl()).origin

export const getMedusaBackendUrl = (): string => {
  // Server runtime can use internal Docker DNS URL if provided.
  if (typeof window === "undefined") {
    return (
      process.env.MEDUSA_BACKEND_URL_INTERNAL || resolvePublicMedusaBackendUrl()
    )
  }

  // Browser must always use public URL.
  return resolvePublicMedusaBackendUrl()
}
