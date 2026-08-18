import {
  type ClassifiedQueryEntries,
  createQueryNotFoundResult,
  type ParsedQueryEntry,
  QUERY_ALLOWED_KEYS_BY_ROUTE_KIND,
  QUERY_KEY_ORDER,
  type QueryKey,
  type QueryNotFoundResult,
  type QueryRouteKind,
  type TrackingQueryEntry,
} from "./query-normalizer-contracts"

const KNOWN_KEYS = new Set<string>(QUERY_KEY_ORDER)
const MAX_QUERY_PARAMETERS = 20
const MAX_QUERY_VALUE_BYTES = 256
const MAX_UTM_PARAMETERS = 10
const UTF8_ENCODER = new TextEncoder()

export const parseRawQuery = (rawQuery: string): ParsedQueryEntry[] => {
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

export const hasEmptyRawQuerySegment = (rawQuery: string): boolean => {
  const query = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery
  return query.length > 0 && query.split("&").some((segment) => segment === "")
}

const isTrackingKey = (key: string) =>
  key === "gclid" ||
  key === "fbclid" ||
  (key.startsWith("utm_") && key.length > 4)

export const findLimitFailure = (
  entries: readonly ParsedQueryEntry[]
): QueryNotFoundResult | undefined => {
  if (entries.length > MAX_QUERY_PARAMETERS) {
    return createQueryNotFoundResult("too-many-parameters")
  }

  const oversizedEntry = entries.find(
    ({ value }) => UTF8_ENCODER.encode(value).byteLength > MAX_QUERY_VALUE_BYTES
  )
  return oversizedEntry
    ? createQueryNotFoundResult("value-too-long", oversizedEntry.key)
    : undefined
}

export const classifyEntries = (
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
      return createQueryNotFoundResult("duplicate-known-key", key)
    }
    knownEntries.set(key, entry)
  }

  return utmCount > MAX_UTM_PARAMETERS
    ? createQueryNotFoundResult("too-many-tracking-parameters")
    : { knownEntries, tracking, unknownKeyFound }
}

export const findScopeFailure = (
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
    ? createQueryNotFoundResult("known-key-not-allowed", forbiddenKey)
    : undefined
}

export const isNotFoundResult = (
  value: ClassifiedQueryEntries | QueryNotFoundResult
): value is QueryNotFoundResult => "kind" in value
