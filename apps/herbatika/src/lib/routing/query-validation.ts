import type { UrlKind } from "@/lib/url/types"

export type RouteSearchParams = Record<string, string | string[] | undefined>

const QUERY_ALLOWLIST = {
  product: new Set(["varianta"]),
  category: new Set(["znacka", "kategorie", "razeni", "strana"]),
  brand: new Set(["znacka", "kategorie", "razeni", "strana"]),
  collection: new Set(["znacka", "kategorie", "razeni", "strana"]),
  campaign: new Set(["znacka", "kategorie", "razeni", "strana"]),
  article: new Set(["tema", "strana"]),
  page: new Set<string>(),
} as const satisfies Record<UrlKind, ReadonlySet<string>>

const isTrackingKey = (key: string) =>
  key.startsWith("utm_") || key === "gclid" || key === "fbclid"

const queryKeys = (query: URLSearchParams | RouteSearchParams): string[] =>
  query instanceof URLSearchParams
    ? Array.from(new Set(query.keys()))
    : Object.keys(query)

export type QueryValidationResult =
  | { valid: true }
  | { valid: false; unknown: string[] }

export const validateEntityQuery = (
  kind: UrlKind,
  query: URLSearchParams | RouteSearchParams
): QueryValidationResult => {
  const unknown = queryKeys(query)
    .filter((key) => !(QUERY_ALLOWLIST[kind].has(key) || isTrackingKey(key)))
    .sort()
  return unknown.length === 0 ? { valid: true } : { valid: false, unknown }
}
