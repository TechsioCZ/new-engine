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

export type ParsedQueryEntry = TrackingQueryEntry & {
  rawSegment: string
}

export type ClassifiedQueryEntries = {
  knownEntries: Map<QueryKey, ParsedQueryEntry>
  tracking: TrackingQueryEntry[]
  unknownKeyFound: boolean
}

export const createQueryNotFoundResult = (
  reason: QueryNotFoundReason,
  key?: string
): QueryNotFoundResult => ({
  ...(key === undefined ? {} : { key }),
  kind: "not-found",
  reason,
})
