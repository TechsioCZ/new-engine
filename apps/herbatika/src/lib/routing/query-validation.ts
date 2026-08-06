import { getSegment } from "@/lib/url/segments"
import type { Market, UrlKind } from "@/lib/url/types"

export type RouteSearchParams = Record<string, string | string[] | undefined>

export type QueryRoute =
  | { type: "home" | "system" }
  | { type: "entity"; kind: UrlKind; isDetail: boolean }
  | {
      type: "flow"
      kind: "search" | "cart" | "checkout" | "account" | "reviews"
      normalizedPath: string
    }

const EMPTY_ALLOWLIST = new Set<string>()
const CATALOG_QUERY_KEYS = new Set([
  "page",
  "sort",
  "status",
  "form",
  "brand",
  "ingredient",
  "price_min",
  "price_max",
])
const LOCALIZED_CATALOG_QUERY_KEYS = new Set([
  "strana",
  "razeni",
  "znacka",
  "kategorie",
])
const SEARCH_QUERY_KEYS = new Set([
  "q",
  ...CATALOG_QUERY_KEYS,
  ...LOCALIZED_CATALOG_QUERY_KEYS,
])
const PRODUCT_SORT_VALUES = new Set([
  "recommended",
  "best-selling",
  "newest",
  "oldest",
  "price-asc",
  "price-desc",
  "title-asc",
  "title-desc",
  // Existing localized SEO URLs use this legacy clean-canonical sort value.
  "cena",
])
const STATUS_VALUES = new Set(["in-stock", "action", "new", "tip", "vegan"])
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/
const PRICE_PATTERN = /^\d+(?:\.\d{1,2})?$/
const SLUG_VALUE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i
const TRACKING_KEY_PATTERN = /^utm_[a-z0-9_]+$/
const MAX_QUERY_PARAMETERS = 20
const MAX_FACET_VALUES = 10
const MAX_VALUE_BYTES = 256

const isTrackingKey = (key: string) =>
  TRACKING_KEY_PATTERN.test(key) || key === "gclid" || key === "fbclid"

const add = (...sets: ReadonlySet<string>[]) =>
  new Set(sets.flatMap((set) => Array.from(set)))

const entityAllowlist = (kind: UrlKind, isDetail: boolean) => {
  if (kind === "product") {
    return isDetail
      ? new Set(["varianta", "reviews_page"])
      : LOCALIZED_CATALOG_QUERY_KEYS
  }
  if (kind === "article") {
    return isDetail ? EMPTY_ALLOWLIST : new Set(["tema", "strana"])
  }
  if (kind === "page") {
    return EMPTY_ALLOWLIST
  }
  if (isDetail && (kind === "category" || kind === "brand")) {
    return add(CATALOG_QUERY_KEYS, LOCALIZED_CATALOG_QUERY_KEYS)
  }
  return LOCALIZED_CATALOG_QUERY_KEYS
}

const pathSegments = (pathname: string) => pathname.split("/").filter(Boolean)

const flowAllowlist = (
  market: Market,
  route: Extract<QueryRoute, { type: "flow" }>
): ReadonlySet<string> => {
  if (route.kind === "search") {
    return SEARCH_QUERY_KEYS
  }
  if (route.kind === "cart") {
    return EMPTY_ALLOWLIST
  }

  const segments = pathSegments(route.normalizedPath)
  if (route.kind === "checkout") {
    return segments[1] === getSegment(market, "checkout.paymentReturn")
      ? new Set([
          "cart_id",
          "provider_id",
          "payment_cancelled",
          "cancelled",
          "canceled",
          "retry",
        ])
      : EMPTY_ALLOWLIST
  }
  if (route.kind === "reviews") {
    return new Set(["product_id"])
  }

  const section = segments[1]
  if (section === getSegment(market, "account.orders")) {
    return segments.length === 2 ? new Set(["page"]) : EMPTY_ALLOWLIST
  }
  if (section === getSegment(market, "account.lists")) {
    return new Set(["list"])
  }
  if (
    section === getSegment(market, "account.login") ||
    section === getSegment(market, "account.register")
  ) {
    return new Set(["next"])
  }
  if (section === getSegment(market, "account.resetPassword")) {
    return new Set(["email", "flow", "token"])
  }
  return EMPTY_ALLOWLIST
}

const allowsTracking = (market: Market, route: QueryRoute) =>
  !(
    route.type === "flow" &&
    route.kind === "checkout" &&
    pathSegments(route.normalizedPath)[1] ===
      getSegment(market, "checkout.paymentReturn")
  )

const allowlistForRoute = (
  market: Market,
  route: QueryRoute
): ReadonlySet<string> => {
  if (route.type === "entity") {
    return entityAllowlist(route.kind, route.isDetail)
  }
  if (route.type === "flow") {
    return flowAllowlist(market, route)
  }
  return EMPTY_ALLOWLIST
}

const queryEntries = (
  query: URLSearchParams | RouteSearchParams
): [string, string[]][] => {
  if (query instanceof URLSearchParams) {
    const keys = Array.from(new Set(query.keys()))
    return keys.map((key) => [key, query.getAll(key)])
  }
  return Object.entries(query).flatMap(([key, value]) => {
    if (value === undefined) {
      return []
    }
    return [[key, Array.isArray(value) ? value : [value]]]
  })
}

const valueByteLength = (value: string) =>
  new TextEncoder().encode(value).length

const isBoundedValue = (value: string) =>
  value.length > 0 && valueByteLength(value) <= MAX_VALUE_BYTES

const isCsvValue = (value: string, allowedValues?: ReadonlySet<string>) => {
  const values = value.split(",")
  return (
    values.length <= MAX_FACET_VALUES &&
    values.every(
      (item) =>
        item === item.trim() &&
        isBoundedValue(item) &&
        (allowedValues?.has(item) ?? true)
    )
  )
}

const positiveIntegerValue = (value: string) =>
  POSITIVE_INTEGER_PATTERN.test(value)
const sortValue = (value: string) => PRODUCT_SORT_VALUES.has(value)
const statusValue = (value: string) => isCsvValue(value, STATUS_VALUES)
const facetValue = (value: string) => isCsvValue(value)
const priceValue = (value: string) => PRICE_PATTERN.test(value)
const searchValue = (value: string) =>
  value.trim() === value && value.length <= 200 && isBoundedValue(value)
const slugValue = (value: string) => SLUG_VALUE_PATTERN.test(value)
const flowValue = (value: string) =>
  value === "account-setup" || value === "reset-password"
const booleanValue = (value: string) =>
  ["true", "false", "1", "0", "yes", "no"].includes(value)
const nextValue = (value: string) =>
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.includes("\\") &&
  isBoundedValue(value)

const VALUE_VALIDATORS: Readonly<Record<string, (value: string) => boolean>> = {
  page: positiveIntegerValue,
  strana: positiveIntegerValue,
  reviews_page: positiveIntegerValue,
  sort: sortValue,
  razeni: sortValue,
  status: statusValue,
  form: facetValue,
  brand: facetValue,
  ingredient: facetValue,
  price_min: priceValue,
  price_max: priceValue,
  q: searchValue,
  znacka: slugValue,
  kategorie: slugValue,
  tema: slugValue,
  flow: flowValue,
  payment_cancelled: booleanValue,
  cancelled: booleanValue,
  canceled: booleanValue,
  next: nextValue,
}

const validValue = (key: string, value: string): boolean =>
  (VALUE_VALIDATORS[key] ?? isBoundedValue)(value)

const conflictingAliases = (keys: ReadonlySet<string>): string[] =>
  [
    ["page", "strana"],
    ["sort", "razeni"],
    ["brand", "znacka"],
  ].flatMap((group) => (group.every((key) => keys.has(key)) ? group : []))

export type QueryValidationResult =
  | { valid: true }
  | {
      valid: false
      unknown: string[]
      duplicates: string[]
      invalid: string[]
    }

export const validateRouteQuery = (
  market: Market,
  route: QueryRoute,
  query: URLSearchParams | RouteSearchParams
): QueryValidationResult => {
  const allowlist = allowlistForRoute(market, route)
  const trackingAllowed = allowsTracking(market, route)
  const entries = queryEntries(query)
  const keys = new Set(entries.map(([key]) => key))
  const unknown = entries
    .map(([key]) => key)
    .filter(
      (key) => !(allowlist.has(key) || (trackingAllowed && isTrackingKey(key)))
    )
  const duplicates = entries
    .filter(([, values]) => values.length !== 1)
    .map(([key]) => key)
  const invalid = entries
    .filter(
      ([key, values]) =>
        values.length === 1 &&
        (trackingAllowed && isTrackingKey(key)
          ? !isBoundedValue(values[0] ?? "")
          : allowlist.has(key) && !validValue(key, values[0] ?? ""))
    )
    .map(([key]) => key)

  invalid.push(...conflictingAliases(keys))

  const utmCount = entries.filter(([key]) =>
    TRACKING_KEY_PATTERN.test(key)
  ).length
  if (utmCount > 10) {
    invalid.push(
      ...entries
        .filter(([key]) => TRACKING_KEY_PATTERN.test(key))
        .map(([key]) => key)
    )
  }
  if (
    entries.reduce((count, [, values]) => count + values.length, 0) >
    MAX_QUERY_PARAMETERS
  ) {
    invalid.push("<query>")
  }

  const min = entries.find(([key]) => key === "price_min")?.[1][0]
  const max = entries.find(([key]) => key === "price_max")?.[1][0]
  if (
    min !== undefined &&
    max !== undefined &&
    PRICE_PATTERN.test(min) &&
    PRICE_PATTERN.test(max) &&
    Number(min) > Number(max)
  ) {
    invalid.push("price_min", "price_max")
  }

  const result = {
    unknown: Array.from(new Set(unknown)).sort(),
    duplicates: Array.from(new Set(duplicates)).sort(),
    invalid: Array.from(new Set(invalid)).sort(),
  }
  return result.unknown.length ||
    result.duplicates.length ||
    result.invalid.length
    ? { valid: false, ...result }
    : { valid: true }
}

/** Backward-compatible entity helper for server route consumers. */
export const validateEntityQuery = (
  kind: UrlKind,
  query: URLSearchParams | RouteSearchParams,
  isDetail = true
): QueryValidationResult =>
  validateRouteQuery("cz", { type: "entity", kind, isDetail }, query)
