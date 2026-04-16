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
 * @param {Array<string | null | undefined>} sources
 * @returns {string[]}
 */
export function uniquePolicySources(sources) {
  return [...new Set(sources.filter(Boolean))]
}

/**
 * @param {{
 *   isProduction?: boolean
 *   allowedDevOrigins?: string[]
 *   devPort?: number
 * }} [options]
 * @returns {string[]}
 */
export function buildDevHmrOrigins(options = {}) {
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
    ...allowedDevOrigins.flatMap((origin) => [
      `ws://${origin}`,
      `wss://${origin}`,
      `ws://${origin}:${devPort}`,
      `wss://${origin}:${devPort}`,
    ]),
  ])
}

/**
 * @param {{
 *   isProduction?: boolean
 *   publicBackendOrigin: string
 *   allowedDevOrigins?: string[]
 *   devPort?: number
 * }} options
 * @returns {StorefrontCspDirectives}
 */
export function createBaseStorefrontCsp(options) {
  const {
    isProduction = process.env.NODE_ENV === "production",
    publicBackendOrigin,
    allowedDevOrigins = [],
    devPort = 3000,
  } = options

  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    scriptSrc: uniquePolicySources([
      "'self'",
      "'unsafe-inline'",
      ...(isProduction ? [] : ["'unsafe-eval'"]),
    ]),
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    fontSrc: ["'self'", "data:"],
    connectSrc: uniquePolicySources([
      "'self'",
      publicBackendOrigin,
      ...buildDevHmrOrigins({ isProduction, allowedDevOrigins, devPort }),
    ]),
    frameSrc: ["'self'"],
    workerSrc: ["'self'", "blob:"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: isProduction,
  }
}

/**
 * @param {{
 *   base?: StorefrontCspDirectives
 *   extend?: Partial<StorefrontCspDirectives>
 *   replace?: Partial<StorefrontCspDirectives>
 * }} [options]
 * @returns {StorefrontCspDirectives}
 */
export function mergeStorefrontCsp(options = {}) {
  const { base = {}, extend = {}, replace = {} } = options

  /** @type {StorefrontCspDirectives} */
  const merged = { ...base }

  for (const [directiveKey] of CSP_DIRECTIVE_ORDER) {
    const baseValues = Array.isArray(base[directiveKey]) ? base[directiveKey] : []
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

  merged.upgradeInsecureRequests =
    typeof replace.upgradeInsecureRequests === "boolean"
      ? replace.upgradeInsecureRequests
      : typeof extend.upgradeInsecureRequests === "boolean"
        ? extend.upgradeInsecureRequests
        : Boolean(base.upgradeInsecureRequests)

  return merged
}

/**
 * @param {{ csp: StorefrontCspDirectives }} options
 * @returns {string}
 */
export function buildStorefrontContentSecurityPolicy(options) {
  const { csp } = options

  const directives = CSP_DIRECTIVE_ORDER.flatMap(([directiveKey, headerName]) => {
    const values = csp[directiveKey]

    if (!Array.isArray(values) || values.length === 0) {
      return []
    }

    return `${headerName} ${values.join(" ")}`
  })

  if (csp.upgradeInsecureRequests) {
    directives.push("upgrade-insecure-requests")
  }

  return directives.join("; ")
}
