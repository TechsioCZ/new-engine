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
 * }} [extend] - Additive storefront security overrides.
 * @returns {{
 *   csp: Partial<StorefrontCspDirectives>
 *   permissionsPolicy?: string[]
 *   headers: Array<{ key: string, value: string }>
 * }} Normalized additive overrides.
 */
const normalizeExtend = (extend = {}) => ({
  csp: extend.csp ?? {},
  headers: extend.headers ?? [],
  permissionsPolicy: extend.permissionsPolicy,
})

/**
 * @param {{
 *   csp?: Partial<StorefrontCspDirectives>
 *   permissionsPolicy?: string[]
 *   headers?: Array<{ key: string, value: string | null }>
 * }} [replace] - Replacement storefront security overrides.
 * @returns {{
 *   csp: Partial<StorefrontCspDirectives>
 *   permissionsPolicy?: string[]
 *   headers: Array<{ key: string, value: string | null }>
 * }} Normalized replacement overrides.
 */
const normalizeReplace = (replace = {}) => ({
  csp: replace.csp ?? {},
  headers: replace.headers ?? [],
  permissionsPolicy: replace.permissionsPolicy,
})

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
 * }} options - Legacy storefront security options.
 * @returns {{
 *   csp: Partial<StorefrontCspDirectives>
 *   permissionsPolicy?: string[]
 * }} Normalized legacy additive overrides.
 */
const normalizeLegacyOverrides = (options) => {
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
      connectSrc: additionalConnectSrc,
      fontSrc: additionalFontSrc,
      frameSrc: additionalFrameSrc,
      imgSrc: additionalImgSrc,
      scriptSrc: additionalScriptSrc,
      styleSrc: additionalStyleSrc,
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
 * }} [options] - Storefront security configuration options.
 * @returns {{
 *   allowedDevOrigins: string[]
 *   poweredByHeader: false
 *   headers: () => Array<{ source: string, headers: Array<{ key: string, value: string }> }>
 * }} Next.js storefront security configuration.
 */
export const createStorefrontSecurityConfig = (options = {}) => {
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

  const legacyExtend = normalizeLegacyOverrides(options)
  const normalizedExtend = normalizeExtend(extend)
  const normalizedReplace = normalizeReplace(replace)

  const isCspSuppressed = normalizedReplace.headers.some(
    (header) =>
      header.key === "Content-Security-Policy" && header.value === null,
  )

  // Only the CSP consumes the backend origin, and resolving it throws when the
  // public backend env var is missing in production. A consumer that suppresses
  // the CSP header must not be forced to configure a URL nothing emits.
  const publicBackendOrigin = isCspSuppressed
    ? undefined
    : resolvePublicBackendOrigin({
        defaultDevelopmentBackendUrl,
        envVarName,
        isProduction,
        publicBackendUrl,
      })

  const presetConfig = resolveStorefrontSecurityPreset({
    allowedDevOrigins,
    devPort,
    isProduction,
    preset,
    publicBackendOrigin,
  })

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
      ...(presetConfig.permissionsPolicy ??
        DEFAULT_PERMISSIONS_POLICY_DIRECTIVES),
      ...(legacyExtend.permissionsPolicy ?? []),
      ...(normalizedExtend.permissionsPolicy ?? []),
    ])

  const contentSecurityPolicy = buildStorefrontContentSecurityPolicy({ csp })

  return {
    allowedDevOrigins,
    headers() {
      return [
        {
          headers: buildStorefrontResponseHeaders({
            contentSecurityPolicy,
            extendHeaders: normalizedExtend.headers,
            isProduction,
            permissionsPolicyDirectives,
            replaceHeaders: normalizedReplace.headers,
          }),
          source,
        },
      ]
    },
    poweredByHeader: false,
  }
}

export {
  DEFAULT_DEVELOPMENT_BACKEND_URL,
  DEFAULT_PUBLIC_BACKEND_ENV_NAME,
  resolvePublicBackendOrigin,
  resolvePublicBackendUrl,
} from "./backend-url.mjs"
export {
  buildDevHmrOrigins,
  buildStorefrontContentSecurityPolicy,
  createBaseStorefrontCsp,
  mergeStorefrontCsp,
  uniquePolicySources,
} from "./csp.mjs"
export {
  buildStorefrontResponseHeaders,
  DEFAULT_PERMISSIONS_POLICY_DIRECTIVES,
  DEFAULT_STRICT_TRANSPORT_SECURITY_VALUE,
} from "./headers.mjs"
export {
  resolveStorefrontSecurityPreset,
  storefrontSecurityPresets,
} from "./presets.mjs"
