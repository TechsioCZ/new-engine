import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { GatewayPathAuthority } from "./_routes"

const PATH_SEPARATOR_PATTERN = /[\\/]/
const ENCODED_SEPARATOR_PATTERN = /%(?:2e|2f|5c)/i
const UNSIGNED_INTEGER_PATTERN = /^\d+$/
const FIELD_SEGMENT_SEPARATOR_PATTERN = /[.[\]]+/
const DEFAULT_MAX_LIST_LIMIT = 100
const CATEGORY_MAX_LIST_LIMIT = 500
const MAX_LIST_OFFSET = 10_000
const CHECKOUT_RESOURCE_PATH_PATTERN =
  /^\/store\/(?:payment-collections(?:\/[^/]+\/payment-sessions)?|shipping-options\/[^/]+\/calculate)$/
const CHECKOUT_RESOURCE_QUERY_FIELDS = [
  "cart_id",
  "customer_id",
  "payment_collection_id",
  "provider_id",
  "shipping_option_id",
] as const

const decodePathSegment = (segment: string): string | null => {
  let decoded = segment

  for (let pass = 0; pass < 3; pass += 1) {
    let next: string
    try {
      next = decodeURIComponent(decoded)
    } catch {
      return null
    }

    if (next === decoded) {
      break
    }
    decoded = next
  }

  const hasControlCharacter = Array.from(decoded).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127
  })

  if (
    !decoded ||
    decoded === "." ||
    decoded === ".." ||
    decoded.length > 160 ||
    PATH_SEPARATOR_PATTERN.test(decoded) ||
    hasControlCharacter ||
    ENCODED_SEPARATOR_PATTERN.test(decoded)
  ) {
    return null
  }

  return decoded
}

export const resolveGatewayPath = (
  request: Request,
  pathSegments: readonly string[]
): string | null => {
  const requestUrl = new URL(request.url)
  const rawPrefix = "/api/storefront-medusa/"
  if (!requestUrl.pathname.startsWith(rawPrefix)) {
    return null
  }

  const rawSuffix = requestUrl.pathname.slice(rawPrefix.length)
  if (!rawSuffix || rawSuffix.length > 2048) {
    return null
  }

  const rawSegments = rawSuffix.split("/")
  if (
    rawSegments.length !== pathSegments.length ||
    rawSegments.some((segment) => decodePathSegment(segment) === null)
  ) {
    return null
  }

  const decodedSegments = pathSegments.map(decodePathSegment)
  if (decodedSegments.some((segment) => segment === null)) {
    return null
  }

  return `/${decodedSegments.join("/")}`
}

const isTopLevelField = (key: string, field: string) => {
  const normalized = key.toLowerCase()
  return normalized === field || normalized.startsWith(`${field}[`)
}

const containsFieldSegment = (key: string, field: string) =>
  key
    .toLowerCase()
    .split(FIELD_SEGMENT_SEPARATOR_PATTERN)
    .some((segment) => segment === field)

const hasSalesChannelOverride = (value: unknown): boolean => {
  if (!value || typeof value !== "object") {
    return false
  }
  if (Array.isArray(value)) {
    return value.some(hasSalesChannelOverride)
  }

  return Object.entries(value as Record<string, unknown>).some(
    ([key, nestedValue]) =>
      containsFieldSegment(key, "sales_channel_id") ||
      hasSalesChannelOverride(nestedValue)
  )
}

const valuesAreBoundedIntegers = (
  values: readonly string[],
  minimum: number,
  maximum: number
) =>
  values.every((value) => {
    if (!UNSIGNED_INTEGER_PATTERN.test(value)) {
      return false
    }
    const parsed = Number(value)
    return parsed >= minimum && parsed <= maximum
  })

const valuesMatch = (
  values: readonly string[],
  expectedValue: string
): boolean => values.every((value) => value === expectedValue)

export const queryHasValidMarketScope = (
  searchParams: URLSearchParams,
  binding: MarketRuntimeBinding,
  gatewayPath: string
): boolean => {
  const entries = Array.from(searchParams.entries())
  if (entries.some(([key]) => containsFieldSegment(key, "sales_channel_id"))) {
    return false
  }
  if (
    CHECKOUT_RESOURCE_PATH_PATTERN.test(gatewayPath) &&
    entries.some(([key]) =>
      CHECKOUT_RESOURCE_QUERY_FIELDS.some((field) =>
        containsFieldSegment(key, field)
      )
    )
  ) {
    return false
  }

  const limits = entries
    .filter(([key]) => isTopLevelField(key, "limit"))
    .map(([, value]) => value)
  const offsets = entries
    .filter(([key]) => isTopLevelField(key, "offset"))
    .map(([, value]) => value)
  const maximumLimit =
    gatewayPath === "/store/product-categories"
      ? CATEGORY_MAX_LIST_LIMIT
      : DEFAULT_MAX_LIST_LIMIT
  if (
    !(
      valuesAreBoundedIntegers(limits, 1, maximumLimit) &&
      valuesAreBoundedIntegers(offsets, 0, MAX_LIST_OFFSET)
    )
  ) {
    return false
  }

  const regionIds = entries
    .filter(([key]) => isTopLevelField(key, "region_id"))
    .map(([, value]) => value)
  if (!valuesMatch(regionIds, binding.regionId)) {
    return false
  }

  const locales = entries
    .filter(([key]) => isTopLevelField(key, "locale"))
    .map(([, value]) => value)
  if (!valuesMatch(locales, binding.locale)) {
    return false
  }

  const countryCodes = entries
    .filter(([key]) => isTopLevelField(key, "country_code"))
    .map(([, value]) => value.toLowerCase())
  return valuesMatch(countryCodes, binding.countryCode.toLowerCase())
}

export const bodyHasValidMarketScope = (
  body: unknown,
  binding: MarketRuntimeBinding
): boolean => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return false
  }

  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  if (hasSalesChannelOverride(record)) {
    return false
  }

  const regionEntry = keys.find((key) => key.toLowerCase() === "region_id")
  if (regionEntry && record[regionEntry] !== binding.regionId) {
    return false
  }

  const localeEntry = keys.find((key) => key.toLowerCase() === "locale")
  if (localeEntry && record[localeEntry] !== binding.locale) {
    return false
  }

  const countryEntry = keys.find((key) => key.toLowerCase() === "country_code")
  return (
    !countryEntry ||
    (typeof record[countryEntry] === "string" &&
      record[countryEntry].toLowerCase() === binding.countryCode.toLowerCase())
  )
}

export const pathHasValidMarketScope = (
  authority: GatewayPathAuthority | null,
  binding: MarketRuntimeBinding
): boolean => authority?.kind !== "region" || authority.id === binding.regionId

const parseWebOriginHost = (value: string | null): string | null => {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null
    }
    return url.host
  } catch {
    return null
  }
}

export const hasSameOriginCsrfEvidence = (
  request: Request,
  _binding: MarketRuntimeBinding
): boolean => {
  // Compare the Origin/Referer host against the request Host header instead
  // of a canonical-protocol origin: TLS terminates at the edge proxy, so the
  // scheme the app sees never reliably matches what the browser sent.
  const host = request.headers.get("host")
  if (!host) {
    return false
  }

  const originHost = parseWebOriginHost(request.headers.get("origin"))
  if (originHost) {
    return originHost === host
  }

  return parseWebOriginHost(request.headers.get("referer")) === host
}
