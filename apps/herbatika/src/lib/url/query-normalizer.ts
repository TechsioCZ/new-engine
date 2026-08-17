export const QUERY_KEY_ORDER = [
  "page",
  "sort",
  "status",
  "form",
  "brand",
  "ingredient",
  "price_min",
  "price_max",
  "q",
  "variant",
] as const

export type QueryKey = (typeof QUERY_KEY_ORDER)[number]

const LISTING_QUERY_KEYS = [
  "page",
  "sort",
  "status",
  "form",
  "brand",
  "ingredient",
  "price_min",
  "price_max",
] as const satisfies readonly QueryKey[]

const BRAND_LISTING_QUERY_KEYS = LISTING_QUERY_KEYS.filter(
  (key) => key !== "brand"
)

export const QUERY_ALLOWED_KEYS_BY_ROUTE_KIND = {
  "account-orders": ["page"],
  "advice-article": [],
  "advice-index": ["page"],
  "brand-detail": BRAND_LISTING_QUERY_KEYS,
  "brand-index": [],
  "campaign-detail": LISTING_QUERY_KEYS,
  "campaign-index": [],
  "category-detail": LISTING_QUERY_KEYS,
  "category-index": [],
  "collection-detail": LISTING_QUERY_KEYS,
  "collection-index": [],
  homepage: [],
  "information-detail": [],
  "product-detail": ["variant"],
  "product-index": LISTING_QUERY_KEYS,
  search: [...LISTING_QUERY_KEYS, "q"],
  "static-page": [],
} as const satisfies Record<string, readonly QueryKey[]>

export type QueryRouteKind = keyof typeof QUERY_ALLOWED_KEYS_BY_ROUTE_KIND

export type QueryNotFoundReason =
  | "duplicate-known-key"
  | "empty-facet"
  | "invalid-facet"
  | "invalid-page"
  | "invalid-price"
  | "invalid-price-range"
  | "invalid-sort"
  | "invalid-variant"
  | "known-key-not-allowed"
  | "page-out-of-range"
  | "query-too-long"
  | "too-many-facet-values"
  | "too-many-parameters"
  | "too-many-tracking-parameters"
  | "value-too-long"

export type SortValue =
  | "bestsellers"
  | "name-asc"
  | "name-desc"
  | "newest"
  | "price-asc"
  | "price-desc"

export type StatusValue = "in-stock" | "new" | "sale"

export type FormValue =
  | "capsules"
  | "cream"
  | "drops"
  | "oil"
  | "powder"
  | "syrup"
  | "tablets"
  | "tea"

export type NormalizedQueryValues = {
  brand?: readonly string[]
  form?: readonly FormValue[]
  ingredient?: readonly string[]
  page?: number
  price_max?: string
  price_min?: string
  q?: string
  sort?: SortValue
  status?: readonly StatusValue[]
  variant?: string
}

export type TrackingQueryEntry = Readonly<{
  key: string
  value: string
}>

type NormalizedQuerySuccess = {
  canonicalRawQuery: string
  tracking: readonly TrackingQueryEntry[]
  values: NormalizedQueryValues
}

export type QueryNotFoundResult = {
  key?: string
  kind: "not-found"
  reason: QueryNotFoundReason
}

export type QueryNormalizationResult =
  | ({ kind: "accept" } & NormalizedQuerySuccess)
  | ({ kind: "redirect"; redirectRawQuery: string } & NormalizedQuerySuccess)
  | QueryNotFoundResult

export type NormalizeQueryInput = {
  lastPage?: number
  rawQuery: string
  routeKind: QueryRouteKind
}

type ParsedQueryEntry = TrackingQueryEntry & {
  rawSegment: string
}

const KNOWN_KEYS = new Set<string>(QUERY_KEY_ORDER)
const MAX_FACET_VALUES = 10
const MAX_QUERY_PARAMETERS = 20
const MAX_QUERY_VALUE_BYTES = 256
const MAX_SEARCH_CODE_POINTS = 200
const MAX_UTM_PARAMETERS = 10
const PAGE_PATTERN = /^[1-9][0-9]*$/
const PRICE_PATTERN = /^[0-9]+(?:\.[0-9]{1,2})?$/
const FACET_TOKEN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LEADING_ZERO_PATTERN = /^0+(?=\d)/
const UTF8_ENCODER = new TextEncoder()

const SORT_VALUES = new Set([
  "recommended",
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
  "bestsellers",
])
const STATUS_VALUES = new Set<StatusValue>(["in-stock", "sale", "new"])
const FORM_VALUES = new Set<FormValue>([
  "capsules",
  "tablets",
  "powder",
  "tea",
  "oil",
  "drops",
  "syrup",
  "cream",
])

const notFound = (
  reason: QueryNotFoundReason,
  key?: string
): QueryNotFoundResult => ({
  ...(key === undefined ? {} : { key }),
  kind: "not-found",
  reason,
})

const parseRawQuery = (rawQuery: string): ParsedQueryEntry[] => {
  const query = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery
  const rawSegments = query.split("&").filter(Boolean)
  const entries = [...new URLSearchParams(query).entries()]

  return entries.map(([key, value], index) => ({
    key,
    rawSegment:
      rawSegments[index] ?? new URLSearchParams([[key, value]]).toString(),
    value,
  }))
}

const hasEmptyRawQuerySegment = (rawQuery: string): boolean => {
  const query = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery
  return query.length > 0 && query.split("&").some((segment) => segment === "")
}

const isTrackingKey = (key: string) =>
  key === "gclid" ||
  key === "fbclid" ||
  (key.startsWith("utm_") && key.length > 4)

const compareAscii = (left: string, right: string) => {
  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}

const compareDecimal = (left: string, right: string) => {
  const normalize = (value: string) => {
    const [integer, fraction = ""] = value.split(".")
    return {
      fraction: fraction.padEnd(2, "0"),
      integer: integer.replace(LEADING_ZERO_PATTERN, ""),
    }
  }
  const normalizedLeft = normalize(left)
  const normalizedRight = normalize(right)

  if (normalizedLeft.integer.length !== normalizedRight.integer.length) {
    return normalizedLeft.integer.length - normalizedRight.integer.length
  }
  const integerOrder = compareAscii(
    normalizedLeft.integer,
    normalizedRight.integer
  )
  return (
    integerOrder ||
    compareAscii(normalizedLeft.fraction, normalizedRight.fraction)
  )
}

const normalizeFacet = (
  key: "brand" | "form" | "ingredient" | "status",
  rawValue: string
): readonly string[] | QueryNotFoundResult => {
  const values = [...new Set(rawValue.split(",").map((value) => value.trim()))]
    .filter(Boolean)
    .sort()

  if (values.length === 0) {
    return notFound("empty-facet", key)
  }
  if (values.length > MAX_FACET_VALUES) {
    return notFound("too-many-facet-values", key)
  }

  const isValid = (value: string) => {
    if (key === "status") {
      return STATUS_VALUES.has(value as StatusValue)
    }
    if (key === "form") {
      return FORM_VALUES.has(value as FormValue)
    }
    return FACET_TOKEN_PATTERN.test(value)
  }

  return values.every(isValid) ? values : notFound("invalid-facet", key)
}

const serializeValues = (values: NormalizedQueryValues) => {
  const parameters = new URLSearchParams()

  for (const key of QUERY_KEY_ORDER) {
    const value = values[key]
    if (value === undefined) {
      continue
    }
    parameters.append(
      key,
      Array.isArray(value) ? value.join(",") : String(value)
    )
  }

  return parameters.toString()
}

type ClassifiedQueryEntries = {
  knownEntries: Map<QueryKey, ParsedQueryEntry>
  tracking: TrackingQueryEntry[]
  unknownKeyFound: boolean
}

const findLimitFailure = (
  entries: readonly ParsedQueryEntry[]
): QueryNotFoundResult | undefined => {
  if (entries.length > MAX_QUERY_PARAMETERS) {
    return notFound("too-many-parameters")
  }

  const oversizedEntry = entries.find(
    ({ value }) => UTF8_ENCODER.encode(value).byteLength > MAX_QUERY_VALUE_BYTES
  )
  return oversizedEntry
    ? notFound("value-too-long", oversizedEntry.key)
    : undefined
}

const classifyEntries = (
  entries: readonly ParsedQueryEntry[]
): ClassifiedQueryEntries | QueryNotFoundResult => {
  const knownEntries = new Map<QueryKey, ParsedQueryEntry>()
  const tracking: TrackingQueryEntry[] = []
  let unknownKeyFound = false
  let utmCount = 0

  for (const entry of entries) {
    if (isTrackingKey(entry.key)) {
      tracking.push({ key: entry.key, value: entry.value })
      utmCount += entry.key.startsWith("utm_") ? 1 : 0
      continue
    }
    if (!KNOWN_KEYS.has(entry.key)) {
      unknownKeyFound = true
      continue
    }

    const key = entry.key as QueryKey
    if (knownEntries.has(key)) {
      return notFound("duplicate-known-key", key)
    }
    knownEntries.set(key, entry)
  }

  return utmCount > MAX_UTM_PARAMETERS
    ? notFound("too-many-tracking-parameters")
    : { knownEntries, tracking, unknownKeyFound }
}

const findScopeFailure = (
  knownEntries: ReadonlyMap<QueryKey, ParsedQueryEntry>,
  routeKind: QueryRouteKind
): QueryNotFoundResult | undefined => {
  const allowedKeys = new Set<QueryKey>(
    QUERY_ALLOWED_KEYS_BY_ROUTE_KIND[routeKind]
  )
  const forbiddenKey = [...knownEntries.keys()].find(
    (key) => !allowedKeys.has(key)
  )

  return forbiddenKey
    ? notFound("known-key-not-allowed", forbiddenKey)
    : undefined
}

const applyPage = (
  entries: ReadonlyMap<QueryKey, ParsedQueryEntry>,
  values: NormalizedQueryValues,
  lastPage: number | undefined
): QueryNotFoundResult | undefined => {
  const entry = entries.get("page")
  if (!entry) {
    return
  }
  if (!PAGE_PATTERN.test(entry.value)) {
    return notFound("invalid-page", "page")
  }

  const page = Number(entry.value)
  if (!Number.isSafeInteger(page)) {
    return notFound("invalid-page", "page")
  }
  if (page >= 2 && lastPage !== undefined && page > lastPage) {
    return notFound("page-out-of-range", "page")
  }
  if (page !== 1) {
    values.page = page
  }
  return
}

const applySort = (
  entries: ReadonlyMap<QueryKey, ParsedQueryEntry>,
  values: NormalizedQueryValues
): QueryNotFoundResult | undefined => {
  const entry = entries.get("sort")
  if (!entry) {
    return
  }
  if (!SORT_VALUES.has(entry.value)) {
    return notFound("invalid-sort", "sort")
  }
  if (entry.value !== "recommended") {
    values.sort = entry.value as SortValue
  }
  return
}

const applyFacets = (
  entries: ReadonlyMap<QueryKey, ParsedQueryEntry>,
  values: NormalizedQueryValues
): QueryNotFoundResult | undefined => {
  for (const key of ["status", "form", "brand", "ingredient"] as const) {
    const entry = entries.get(key)
    if (!entry) {
      continue
    }
    const facet = normalizeFacet(key, entry.value)
    if ("kind" in facet) {
      return facet
    }
    if (key === "status") {
      values.status = facet as readonly StatusValue[]
    } else if (key === "form") {
      values.form = facet as readonly FormValue[]
    } else {
      values[key] = facet
    }
  }
  return
}

const applyPrices = (
  entries: ReadonlyMap<QueryKey, ParsedQueryEntry>,
  values: NormalizedQueryValues
): QueryNotFoundResult | undefined => {
  for (const key of ["price_min", "price_max"] as const) {
    const entry = entries.get(key)
    if (!entry) {
      continue
    }
    if (!PRICE_PATTERN.test(entry.value)) {
      return notFound("invalid-price", key)
    }
    values[key] = entry.value
  }

  const hasInvalidRange =
    values.price_min !== undefined &&
    values.price_max !== undefined &&
    compareDecimal(values.price_min, values.price_max) > 0
  return hasInvalidRange ? notFound("invalid-price-range") : undefined
}

const applyOpaqueValues = (
  entries: ReadonlyMap<QueryKey, ParsedQueryEntry>,
  values: NormalizedQueryValues
): QueryNotFoundResult | undefined => {
  const rawQueryValue = entries.get("q")?.value
  if (
    rawQueryValue !== undefined &&
    [...rawQueryValue].length > MAX_SEARCH_CODE_POINTS
  ) {
    return notFound("query-too-long", "q")
  }
  const query = rawQueryValue?.trim()
  if (query) {
    values.q = query
  }

  const variant = entries.get("variant")?.value
  if (variant === "") {
    return notFound("invalid-variant", "variant")
  }
  if (variant !== undefined) {
    values.variant = variant
  }
  return
}

const applyKnownValues = (
  entries: ReadonlyMap<QueryKey, ParsedQueryEntry>,
  values: NormalizedQueryValues,
  lastPage: number | undefined
) =>
  applyPage(entries, values, lastPage) ??
  applySort(entries, values) ??
  applyFacets(entries, values) ??
  applyPrices(entries, values) ??
  applyOpaqueValues(entries, values)

const getComparableBusinessRawQuery = (
  entries: ReadonlyMap<QueryKey, ParsedQueryEntry>
) =>
  [...entries]
    .filter(([key, entry]) => !(key === "q" && entry.value.trim() === ""))
    .map(([, entry]) => entry.rawSegment)
    .join("&")

const buildRedirectRawQuery = (
  canonicalRawQuery: string,
  tracking: readonly TrackingQueryEntry[]
) => {
  const parameters = new URLSearchParams(canonicalRawQuery)
  for (const entry of tracking) {
    parameters.append(entry.key, entry.value)
  }
  return parameters.toString()
}

const isNotFoundResult = (
  value: ClassifiedQueryEntries | QueryNotFoundResult
): value is QueryNotFoundResult => "kind" in value

export const normalizeQuery = ({
  lastPage,
  rawQuery,
  routeKind,
}: NormalizeQueryInput): QueryNormalizationResult => {
  const emptyRawSegmentFound = hasEmptyRawQuerySegment(rawQuery)
  const entries = parseRawQuery(rawQuery)
  const limitFailure = findLimitFailure(entries)
  if (limitFailure) {
    return limitFailure
  }

  const classified = classifyEntries(entries)
  if (isNotFoundResult(classified)) {
    return classified
  }
  const { knownEntries, tracking, unknownKeyFound } = classified
  const scopeFailure = findScopeFailure(knownEntries, routeKind)
  if (scopeFailure) {
    return scopeFailure
  }

  const values: NormalizedQueryValues = {}
  const valueFailure = applyKnownValues(knownEntries, values, lastPage)
  if (valueFailure) {
    return valueFailure
  }

  const canonicalRawQuery = serializeValues(values)
  const comparableBusinessRawQuery = getComparableBusinessRawQuery(knownEntries)
  const successfulResult = {
    canonicalRawQuery,
    tracking,
    values,
  }
  const isTrackingOnly =
    knownEntries.size === 0 && !unknownKeyFound && tracking.length > 0

  if (
    !unknownKeyFound &&
    comparableBusinessRawQuery === canonicalRawQuery &&
    (!emptyRawSegmentFound || isTrackingOnly)
  ) {
    return { kind: "accept", ...successfulResult }
  }

  return {
    kind: "redirect",
    redirectRawQuery: buildRedirectRawQuery(canonicalRawQuery, tracking),
    ...successfulResult,
  }
}
