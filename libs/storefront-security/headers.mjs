export const DEFAULT_STRICT_TRANSPORT_SECURITY_VALUE = [
  "max-age=31536000",
  "includeSubDomains",
].join("; ")

export const DEFAULT_PERMISSIONS_POLICY_DIRECTIVES = [
  "camera=()",
  "microphone=()",
  "geolocation=(self)",
  "payment=()",
  "usb=()",
  "serial=()",
  "browsing-topics=()",
]

/**
 * @typedef {{ key: string, value: string | null }} ResponseHeaderOverride
 */

/**
 * @param {{
 *   isProduction?: boolean
 *   contentSecurityPolicy: string
 *   permissionsPolicyDirectives?: string[]
 *   replaceHeaders?: ResponseHeaderOverride[]
 *   extendHeaders?: Array<{ key: string, value: string }>
 * }} options
 * @returns {Array<{ key: string, value: string }>}
 */
export function buildStorefrontResponseHeaders(options) {
  const {
    isProduction = process.env.NODE_ENV === "production",
    contentSecurityPolicy,
    permissionsPolicyDirectives = DEFAULT_PERMISSIONS_POLICY_DIRECTIVES,
    replaceHeaders = [],
    extendHeaders = [],
  } = options

  const headerMap = new Map(
    [
      ["X-Frame-Options", "DENY"],
      ["X-Content-Type-Options", "nosniff"],
      ["Referrer-Policy", "strict-origin-when-cross-origin"],
      ["Cross-Origin-Opener-Policy", "same-origin-allow-popups"],
      ["Origin-Agent-Cluster", "?1"],
      ["X-Permitted-Cross-Domain-Policies", "none"],
      ["Permissions-Policy", permissionsPolicyDirectives.join(", ")],
      ["Content-Security-Policy", contentSecurityPolicy],
      ...(isProduction
        ? [
            [
              "Strict-Transport-Security",
              DEFAULT_STRICT_TRANSPORT_SECURITY_VALUE,
            ],
          ]
        : []),
    ].map(([key, value]) => [key, value])
  )

  for (const header of replaceHeaders) {
    if (header.value === null) {
      headerMap.delete(header.key)
      continue
    }

    headerMap.set(header.key, header.value)
  }

  for (const header of extendHeaders) {
    headerMap.set(header.key, header.value)
  }

  return [...headerMap.entries()].map(([key, value]) => ({ key, value }))
}
