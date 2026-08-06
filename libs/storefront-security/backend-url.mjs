const TRAILING_SLASH_PATTERN = /\/$/u

export const DEFAULT_PUBLIC_BACKEND_ENV_NAME = "NEXT_PUBLIC_MEDUSA_BACKEND_URL"
export const DEFAULT_DEVELOPMENT_BACKEND_URL = "http://localhost:9000"

/**
 * @param {{
 *   isProduction?: boolean
 *   publicBackendUrl?: string | undefined
 *   envVarName?: string
 *   defaultDevelopmentBackendUrl?: string
 * }} [options] - Backend URL resolution settings.
 * @returns {string} Normalized public backend URL.
 */
const resolvePublicBackendUrl = (options = {}) => {
  const {
    isProduction = process.env.NODE_ENV === "production",
    envVarName = DEFAULT_PUBLIC_BACKEND_ENV_NAME,
    defaultDevelopmentBackendUrl = DEFAULT_DEVELOPMENT_BACKEND_URL,
  } = options
  const publicBackendUrl = options.publicBackendUrl ?? process.env[envVarName]

  const configuredUrl = publicBackendUrl?.trim()

  if (configuredUrl === undefined || configuredUrl.length === 0) {
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
        `Invalid ${envVarName}: expected an absolute URL, received "${configuredUrl}".`,
      )
    }

    return defaultDevelopmentBackendUrl
  }
}

/**
 * @param {Parameters<typeof resolvePublicBackendUrl>[0]} [options] - Backend URL resolution settings.
 * @returns {string} Public backend origin.
 */
export const resolvePublicBackendOrigin = (options = {}) =>
  new URL(resolvePublicBackendUrl(options)).origin
