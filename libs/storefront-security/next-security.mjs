import {
  DEFAULT_DEVELOPMENT_BACKEND_URL,
  DEFAULT_PUBLIC_BACKEND_ENV_NAME,
  resolvePublicBackendOrigin,
} from "./backend-url.mjs"
import {
  buildStorefrontContentSecurityPolicy,
  mergeStorefrontCsp,
  uniquePolicySources,
} from "./csp.mjs"
import {
  buildStorefrontResponseHeaders,
  DEFAULT_PERMISSIONS_POLICY_DIRECTIVES,
} from "./headers.mjs"
import { resolveStorefrontSecurityPreset } from "./presets.mjs"

/**
 * @typedef {import("./csp.mjs").StorefrontCspDirectives} StorefrontCspDirectives
 */

/**
 * @param {{
 *   csp?: Partial<StorefrontCspDirectives>
 *   permissionsPolicy?: string[]
 *   headers?: Array<{ key: string, value: string }>
 * }} [extend]
 * @returns {{
 *   csp: Partial<StorefrontCspDirectives>
 *   permissionsPolicy?: string[]
 *   headers: Array<{ key: string, value: string }>
 * }}
 */
function normalizeExtend(extend = {}) {
  return {
    csp: extend.csp ?? {},
    permissionsPolicy: extend.permissionsPolicy,
    headers: extend.headers ?? [],
  }
}

/**
 * @param {{
 *   csp?: Partial<StorefrontCspDirectives>
 *   permissionsPolicy?: string[]
 *   headers?: Array<{ key: string, value: string | null }>
 * }} [replace]
 * @returns {{
 *   csp: Partial<StorefrontCspDirectives>
 *   permissionsPolicy?: string[]
 *   headers: Array<{ key: string, value: string | null }>
 * }}
 */
function normalizeReplace(replace = {}) {
  return {
    csp: replace.csp ?? {},
    permissionsPolicy: replace.permissionsPolicy,
    headers: replace.headers ?? [],
  }
}

/**
 * Supports the pre-refactor option names so existing consumers can migrate
 * incrementally to `preset + extend + replace`.
 *
 * @param {{
 *   additionalScriptSrc?: string[]
 *   additionalStyleSrc?: string[]
 *   additionalConnectSrc?: string[]
 *   additionalFrameSrc?: string[]
 *   additionalImgSrc?: string[]
 *   additionalFontSrc?: string[]
 *   permissionsPolicyDirectives?: string[]
 * }} options
 */
function normalizeLegacyOverrides(options) {
  const {
    additionalScriptSrc = [],
    additionalStyleSrc = [],
    additionalConnectSrc = [],
    additionalFrameSrc = [],
    additionalImgSrc = [],
    additionalFontSrc = [],
    permissionsPolicyDirectives,
  } = options

  return {
    csp: {
      scriptSrc: additionalScriptSrc,
      styleSrc: additionalStyleSrc,
      connectSrc: additionalConnectSrc,
      frameSrc: additionalFrameSrc,
      imgSrc: additionalImgSrc,
      fontSrc: additionalFontSrc,
    },
    permissionsPolicy: permissionsPolicyDirectives,
  }
}

/**
 * @param {{
 *   source?: string
 *   preset?: "medusaStorefront" | null
 *   isProduction?: boolean
 *   allowedDevOrigins?: string[]
 *   devPort?: number
 *   publicBackendUrl?: string | undefined
 *   envVarName?: string
 *   defaultDevelopmentBackendUrl?: string
 *   extend?: {
 *     csp?: Partial<StorefrontCspDirectives>
 *     permissionsPolicy?: string[]
 *     headers?: Array<{ key: string, value: string }>
 *   }
 *   replace?: {
 *     csp?: Partial<StorefrontCspDirectives>
 *     permissionsPolicy?: string[]
 *     headers?: Array<{ key: string, value: string | null }>
 *   }
 *   additionalScriptSrc?: string[]
 *   additionalStyleSrc?: string[]
 *   additionalConnectSrc?: string[]
 *   additionalFrameSrc?: string[]
 *   additionalImgSrc?: string[]
 *   additionalFontSrc?: string[]
 *   permissionsPolicyDirectives?: string[]
 * }} [options]
 * @returns {{
 *   allowedDevOrigins: string[]
 *   poweredByHeader: false
 *   headers: () => Array<{ source: string, headers: Array<{ key: string, value: string }> }>
 * }}
 */
export function createStorefrontSecurityConfig(options = {}) {
  const {
    source = "/:path*",
    preset = "medusaStorefront",
    isProduction = process.env.NODE_ENV === "production",
    allowedDevOrigins = [],
    devPort = 3000,
    publicBackendUrl,
    envVarName = DEFAULT_PUBLIC_BACKEND_ENV_NAME,
    defaultDevelopmentBackendUrl = DEFAULT_DEVELOPMENT_BACKEND_URL,
    extend,
    replace,
  } = options

  const publicBackendOrigin = resolvePublicBackendOrigin({
    isProduction,
    publicBackendUrl,
    envVarName,
    defaultDevelopmentBackendUrl,
  })

  const presetConfig = resolveStorefrontSecurityPreset({
    preset,
    isProduction,
    publicBackendOrigin,
    allowedDevOrigins,
    devPort,
  })

  const legacyExtend = normalizeLegacyOverrides(options)
  const normalizedExtend = normalizeExtend(extend)
  const normalizedReplace = normalizeReplace(replace)

  const csp = mergeStorefrontCsp({
    base: presetConfig.csp,
    extend: mergeStorefrontCsp({
      base: legacyExtend.csp,
      extend: normalizedExtend.csp,
    }),
    replace: normalizedReplace.csp,
  })

  const permissionsPolicyDirectives =
    normalizedReplace.permissionsPolicy ??
    uniquePolicySources([
      ...(presetConfig.permissionsPolicy ?? DEFAULT_PERMISSIONS_POLICY_DIRECTIVES),
      ...(legacyExtend.permissionsPolicy ?? []),
      ...(normalizedExtend.permissionsPolicy ?? []),
    ])

  const contentSecurityPolicy = buildStorefrontContentSecurityPolicy({ csp })

  return {
    allowedDevOrigins,
    poweredByHeader: false,
    headers() {
      return [
        {
          source,
          headers: buildStorefrontResponseHeaders({
            isProduction,
            contentSecurityPolicy,
            permissionsPolicyDirectives,
            replaceHeaders: normalizedReplace.headers,
            extendHeaders: normalizedExtend.headers,
          }),
        },
      ]
    },
  }
}

export * from "./backend-url.mjs"
export * from "./csp.mjs"
export * from "./headers.mjs"
export * from "./presets.mjs"
