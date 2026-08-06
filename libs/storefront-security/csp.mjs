/// <reference types="node" />

/**
 * @typedef {{
 *   defaultSrc?: string[]
 *   baseUri?: string[]
 *   formAction?: string[]
 *   frameAncestors?: string[]
 *   objectSrc?: string[]
 *   scriptSrc?: string[]
 *   styleSrc?: string[]
 *   imgSrc?: string[]
 *   fontSrc?: string[]
 *   connectSrc?: string[]
 *   frameSrc?: string[]
 *   workerSrc?: string[]
 *   manifestSrc?: string[]
 *   upgradeInsecureRequests?: boolean
 * }} StorefrontCspDirectives
 */

/**
 * @typedef {"defaultSrc" | "baseUri" | "formAction" | "frameAncestors" |
 *   "objectSrc" | "scriptSrc" | "styleSrc" | "imgSrc" | "fontSrc" |
 *   "connectSrc" | "frameSrc" | "workerSrc" | "manifestSrc"}
 * StorefrontCspSourceDirectiveKey
 */

/** @type {ReadonlyArray<readonly [StorefrontCspSourceDirectiveKey, string]>} */
const CSP_DIRECTIVE_ORDER = [
  ["defaultSrc", "default-src"],
  ["baseUri", "base-uri"],
  ["formAction", "form-action"],
  ["frameAncestors", "frame-ancestors"],
  ["objectSrc", "object-src"],
  ["scriptSrc", "script-src"],
  ["styleSrc", "style-src"],
  ["imgSrc", "img-src"],
  ["fontSrc", "font-src"],
  ["connectSrc", "connect-src"],
  ["frameSrc", "frame-src"],
  ["workerSrc", "worker-src"],
  ["manifestSrc", "manifest-src"],
]

/**
 * @param {Array<string | null | undefined>} sources - Policy sources to deduplicate.
 * @returns {string[]} Non-empty policy sources in first-seen order.
 */
export const uniquePolicySources = (sources) => {
  /** @type {string[]} */
  const uniqueSources = []

  for (const source of sources) {
    if (typeof source === "string" && source.length > 0) {
      uniqueSources.push(source)
    }
  }

  return [...new Set(uniqueSources)]
}

/**
 * @param {string} origin - Development origin to normalize.
 * @returns {{ hostname: string, port: string | null }} Normalized hostname and optional port.
 */
const normalizeAllowedDevOrigin = (origin) => {
  const normalizedOrigin = origin.trim()

  if (normalizedOrigin.length === 0) {
    throw new Error("allowedDevOrigins entries must not be empty.")
  }

  const parsedOrigin = normalizedOrigin.includes("://")
    ? new URL(normalizedOrigin)
    : new URL(`http://${normalizedOrigin}`)

  return {
    hostname: parsedOrigin.hostname,
    port: parsedOrigin.port || null,
  }
}

/**
 * @param {{
 *   isProduction?: boolean
 *   allowedDevOrigins?: string[]
 *   devPort?: number
 * }} [options] - Development origin settings.
 * @returns {string[]} Allowed WebSocket origins for development HMR.
 */
export const buildDevHmrOrigins = (options = {}) => {
  const {
    isProduction = process.env.NODE_ENV === "production",
    allowedDevOrigins = [],
    devPort = 3000,
  } = options

  if (isProduction) {
    return []
  }

  return uniquePolicySources([
    `ws://localhost:${devPort}`,
    `ws://127.0.0.1:${devPort}`,
    ...allowedDevOrigins.flatMap((origin) => {
      const { hostname, port } = normalizeAllowedDevOrigin(origin)

      if (port !== null) {
        return [`ws://${hostname}:${port}`, `wss://${hostname}:${port}`]
      }

      return [
        `ws://${hostname}`,
        `wss://${hostname}`,
        `ws://${hostname}:${devPort}`,
        `wss://${hostname}:${devPort}`,
      ]
    }),
  ])
}

/**
 * @param {{
 *   isProduction?: boolean
 *   publicBackendOrigin?: string | undefined
 *   allowedDevOrigins?: string[]
 *   devPort?: number
 * }} options - Base storefront CSP settings.
 * @returns {StorefrontCspDirectives} Base storefront CSP directives.
 */
export const createBaseStorefrontCsp = (options) => {
  const {
    isProduction = process.env.NODE_ENV === "production",
    publicBackendOrigin,
    allowedDevOrigins = [],
    devPort = 3000,
  } = options

  return {
    baseUri: ["'self'"],
    connectSrc: uniquePolicySources([
      "'self'",
      publicBackendOrigin,
      ...buildDevHmrOrigins({ allowedDevOrigins, devPort, isProduction }),
    ]),
    defaultSrc: ["'self'"],
    fontSrc: ["'self'", "data:"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    frameSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    manifestSrc: ["'self'"],
    objectSrc: ["'none'"],
    scriptSrc: uniquePolicySources([
      "'self'",
      "'unsafe-inline'",
      ...(isProduction ? [] : ["'unsafe-eval'"]),
    ]),
    styleSrc: ["'self'", "'unsafe-inline'"],
    upgradeInsecureRequests: isProduction,
    workerSrc: ["'self'", "blob:"],
  }
}

/**
 * @param {{
 *   base?: StorefrontCspDirectives
 *   extend?: Partial<StorefrontCspDirectives>
 *   replace?: Partial<StorefrontCspDirectives>
 * }} [options] - CSP layers to merge.
 * @returns {StorefrontCspDirectives} Merged storefront CSP directives.
 */
export const mergeStorefrontCsp = (options = {}) => {
  const { base = {}, extend = {}, replace = {} } = options

  /** @type {StorefrontCspDirectives} */
  const merged = { ...base }

  for (const [directiveKey] of CSP_DIRECTIVE_ORDER) {
    const baseValues = Array.isArray(base[directiveKey])
      ? base[directiveKey]
      : []
    const extendValues = Array.isArray(extend[directiveKey])
      ? extend[directiveKey]
      : []
    const replaceValues = replace[directiveKey]

    if (Array.isArray(replaceValues)) {
      merged[directiveKey] = uniquePolicySources(replaceValues)
      continue
    }

    merged[directiveKey] = uniquePolicySources([...baseValues, ...extendValues])
  }

  if (typeof replace.upgradeInsecureRequests === "boolean") {
    merged.upgradeInsecureRequests = replace.upgradeInsecureRequests
  } else if (typeof extend.upgradeInsecureRequests === "boolean") {
    merged.upgradeInsecureRequests = extend.upgradeInsecureRequests
  } else {
    merged.upgradeInsecureRequests = Boolean(base.upgradeInsecureRequests)
  }

  return merged
}

/**
 * @param {{ csp: StorefrontCspDirectives }} options - CSP directives to serialize.
 * @returns {string} Serialized Content-Security-Policy header value.
 */
export const buildStorefrontContentSecurityPolicy = (options) => {
  const { csp } = options

  const directives = CSP_DIRECTIVE_ORDER.flatMap(
    ([directiveKey, headerName]) => {
      const values = csp[directiveKey]

      if (!Array.isArray(values) || values.length === 0) {
        return []
      }

      return `${headerName} ${values.join(" ")}`
    },
  )

  if (csp.upgradeInsecureRequests === true) {
    directives.push("upgrade-insecure-requests")
  }

  return directives.join("; ")
}
