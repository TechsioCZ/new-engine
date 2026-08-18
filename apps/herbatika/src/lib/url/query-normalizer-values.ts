import {
  createQueryNotFoundResult,
  type FormValue,
  type NormalizedQueryValues,
  type ParsedQueryEntry,
  type QueryKey,
  type QueryNotFoundResult,
  type SortValue,
  type StatusValue,
} from "./query-normalizer-contracts"

const MAX_FACET_VALUES = 10
const MAX_SEARCH_CODE_POINTS = 200
const PAGE_PATTERN = /^[1-9][0-9]*$/
const PRICE_PATTERN = /^[0-9]+(?:\.[0-9]{1,2})?$/
const FACET_TOKEN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LEADING_ZERO_PATTERN = /^0+(?=\d)/

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
    return createQueryNotFoundResult("empty-facet", key)
  }
  if (values.length > MAX_FACET_VALUES) {
    return createQueryNotFoundResult("too-many-facet-values", key)
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

  return values.every(isValid)
    ? values
    : createQueryNotFoundResult("invalid-facet", key)
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
    return createQueryNotFoundResult("invalid-page", "page")
  }

  const page = Number(entry.value)
  if (!Number.isSafeInteger(page)) {
    return createQueryNotFoundResult("invalid-page", "page")
  }
  if (page >= 2 && lastPage !== undefined && page > lastPage) {
    return createQueryNotFoundResult("page-out-of-range", "page")
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
    return createQueryNotFoundResult("invalid-sort", "sort")
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
      return createQueryNotFoundResult("invalid-price", key)
    }
    values[key] = entry.value
  }

  const hasInvalidRange =
    values.price_min !== undefined &&
    values.price_max !== undefined &&
    compareDecimal(values.price_min, values.price_max) > 0
  return hasInvalidRange
    ? createQueryNotFoundResult("invalid-price-range")
    : undefined
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
    return createQueryNotFoundResult("query-too-long", "q")
  }
  const query = rawQueryValue?.trim()
  if (query) {
    values.q = query
  }

  const variant = entries.get("variant")?.value
  if (variant === "") {
    return createQueryNotFoundResult("invalid-variant", "variant")
  }
  if (variant !== undefined) {
    values.variant = variant
  }
  return
}

export const applyKnownValues = (
  entries: ReadonlyMap<QueryKey, ParsedQueryEntry>,
  values: NormalizedQueryValues,
  lastPage: number | undefined
) =>
  applyPage(entries, values, lastPage) ??
  applySort(entries, values) ??
  applyFacets(entries, values) ??
  applyPrices(entries, values) ??
  applyOpaqueValues(entries, values)
