const TRAILING_SLASH_PATTERN = /\/$/

export const DEFAULT_PUBLIC_BACKEND_ENV_NAME =
  "NEXT_PUBLIC_MEDUSA_BACKEND_URL"
export const DEFAULT_DEVELOPMENT_BACKEND_URL = "http://localhost:9000"

/**
 * @param {{
 *   isProduction?: boolean
 *   publicBackendUrl?: string | undefined
 *   envVarName?: string
 *   defaultDevelopmentBackendUrl?: string
 * }} [options]
 * @returns {string}
 */
export function resolvePublicBackendUrl(options = {}) {
  const {
    isProduction = process.env.NODE_ENV === "production",
    envVarName = DEFAULT_PUBLIC_BACKEND_ENV_NAME,
    defaultDevelopmentBackendUrl = DEFAULT_DEVELOPMENT_BACKEND_URL,
  } = options
  const publicBackendUrl =
    options.publicBackendUrl ?? process.env[envVarName]

  const configuredUrl = publicBackendUrl?.trim()

  if (!configuredUrl) {
    if (isProduction) {
      throw new Error(`Missing ${envVarName} in production.`)
    }

    return defaultDevelopmentBackendUrl
  }

  try {
    return new URL(configuredUrl).toString().replace(TRAILING_SLASH_PATTERN, "")
  } catch {
    if (isProduction) {
      throw new Error(
        `Invalid ${envVarName}: expected an absolute URL, received "${configuredUrl}".`
      )
    }

    return defaultDevelopmentBackendUrl
  }
}

/**
 * @param {Parameters<typeof resolvePublicBackendUrl>[0]} [options]
 * @returns {string}
 */
export function resolvePublicBackendOrigin(options = {}) {
  return new URL(resolvePublicBackendUrl(options)).origin
}
