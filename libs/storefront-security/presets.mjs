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
 *   publicBackendOrigin?: string | undefined
 *   allowedDevOrigins?: string[]
 *   devPort?: number
 * }} context - Medusa storefront preset context.
 * @returns {StorefrontSecurityPresetConfig} Medusa storefront security preset.
 */
const createMedusaStorefrontPreset = (context) => ({
  csp: createBaseStorefrontCsp(context),
  permissionsPolicy: [...DEFAULT_PERMISSIONS_POLICY_DIRECTIVES],
})

export const storefrontSecurityPresets = {
  medusaStorefront: createMedusaStorefrontPreset,
}

/**
 * @param {{
 *   preset?: string | null
 *   isProduction?: boolean
 *   publicBackendOrigin?: string | undefined
 *   allowedDevOrigins?: string[]
 *   devPort?: number
 * }} options - Preset resolution settings.
 * @returns {StorefrontSecurityPresetConfig} Resolved storefront security preset.
 */
export const resolveStorefrontSecurityPreset = (options) => {
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
        allowedDevOrigins,
        devPort,
        isProduction,
        publicBackendOrigin,
      }),
      permissionsPolicy: [...DEFAULT_PERMISSIONS_POLICY_DIRECTIVES],
    }
  }

  if (preset !== "medusaStorefront") {
    throw new Error(`Unknown storefront security preset: "${preset}".`)
  }

  const resolvedPreset = storefrontSecurityPresets.medusaStorefront({
    allowedDevOrigins,
    devPort,
    isProduction,
    publicBackendOrigin,
  })

  return {
    csp: mergeStorefrontCsp({ base: resolvedPreset.csp }),
    permissionsPolicy: uniquePolicySources(resolvedPreset.permissionsPolicy),
  }
}
