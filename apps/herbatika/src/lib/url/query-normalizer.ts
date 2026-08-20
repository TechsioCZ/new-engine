import {
  type FormValue as FormValueContract,
  type NormalizedQueryValues as NormalizedQueryValuesContract,
  type NormalizeQueryInput as NormalizeQueryInputContract,
  type ParsedQueryEntry,
  QUERY_ALLOWED_KEYS_BY_ROUTE_KIND as QUERY_ALLOWED_KEYS_BY_ROUTE_KIND_VALUE,
  QUERY_KEY_ORDER as QUERY_KEY_ORDER_VALUE,
  type QueryKey as QueryKeyContract,
  type QueryNormalizationResult as QueryNormalizationResultContract,
  type QueryNotFoundReason as QueryNotFoundReasonContract,
  type QueryNotFoundResult as QueryNotFoundResultContract,
  type QueryRouteKind as QueryRouteKindContract,
  type SortValue as SortValueContract,
  type StatusValue as StatusValueContract,
  type TrackingQueryEntry as TrackingQueryEntryContract,
} from "./query-normalizer-contracts"
import {
  classifyEntries,
  findLimitFailure,
  findScopeFailure,
  hasEmptyRawQuerySegment,
  isNotFoundResult,
  parseRawQuery,
} from "./query-normalizer-parser"
import { applyKnownValues } from "./query-normalizer-values"

export const QUERY_ALLOWED_KEYS_BY_ROUTE_KIND =
  QUERY_ALLOWED_KEYS_BY_ROUTE_KIND_VALUE
export const QUERY_KEY_ORDER = QUERY_KEY_ORDER_VALUE
export type FormValue = FormValueContract
export type NormalizedQueryValues = NormalizedQueryValuesContract
export type NormalizeQueryInput = NormalizeQueryInputContract
export type QueryKey = QueryKeyContract
export type QueryNormalizationResult = QueryNormalizationResultContract
export type QueryNotFoundReason = QueryNotFoundReasonContract
export type QueryNotFoundResult = QueryNotFoundResultContract
export type QueryRouteKind = QueryRouteKindContract
export type SortValue = SortValueContract
export type StatusValue = StatusValueContract
export type TrackingQueryEntry = TrackingQueryEntryContract

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
  const successfulResult = { canonicalRawQuery, tracking, values }
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
