import {
  createBaseStorefrontCsp,
  mergeStorefrontCsp,
  uniquePolicySources,
} from "./csp.mjs"
import { DEFAULT_PERMISSIONS_POLICY_DIRECTIVES } from "./headers.mjs"

/**
 * @typedef {{
 *   csp: import("./csp.mjs").StorefrontCspDirectives
 *   permissionsPolicy: string[]
 * }} StorefrontSecurityPresetConfig
 */

/**
 * @param {{
 *   isProduction?: boolean
 *   publicBackendOrigin: string
 *   allowedDevOrigins?: string[]
 *   devPort?: number
 * }} context
 * @returns {StorefrontSecurityPresetConfig}
 */
function createMedusaStorefrontPreset(context) {
  return {
    csp: createBaseStorefrontCsp(context),
    permissionsPolicy: [...DEFAULT_PERMISSIONS_POLICY_DIRECTIVES],
  }
}

export const storefrontSecurityPresets = {
  medusaStorefront: createMedusaStorefrontPreset,
}

/**
 * @param {{
 *   preset?: keyof typeof storefrontSecurityPresets | null
 *   isProduction?: boolean
 *   publicBackendOrigin: string
 *   allowedDevOrigins?: string[]
 *   devPort?: number
 * }} options
 * @returns {StorefrontSecurityPresetConfig}
 */
export function resolveStorefrontSecurityPreset(options) {
  const {
    preset = "medusaStorefront",
    isProduction = process.env.NODE_ENV === "production",
    publicBackendOrigin,
    allowedDevOrigins = [],
    devPort = 3000,
  } = options

  if (preset === null) {
    return {
      csp: createBaseStorefrontCsp({
        isProduction,
        publicBackendOrigin,
        allowedDevOrigins,
        devPort,
      }),
      permissionsPolicy: [...DEFAULT_PERMISSIONS_POLICY_DIRECTIVES],
    }
  }

  const presetFactory = storefrontSecurityPresets[preset]

  if (!presetFactory) {
    throw new Error(`Unknown storefront security preset: "${preset}".`)
  }

  const resolvedPreset = presetFactory({
    isProduction,
    publicBackendOrigin,
    allowedDevOrigins,
    devPort,
  })

  return {
    csp: mergeStorefrontCsp({ base: resolvedPreset.csp }),
    permissionsPolicy: uniquePolicySources(resolvedPreset.permissionsPolicy),
  }
}
