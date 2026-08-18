import type { Market } from "@/lib/url/types"
import type {
  EntityUrlKind,
  StaticRoutePath,
  UrlEntitySlug,
  UrlRoute,
} from "../contracts"
import {
  asInteger,
  asIsoTimestamp,
  asNullableString,
  asRecord,
  asString,
  oneOf,
  type UnknownRecord,
} from "./runtime"

const markets: readonly Market[] = ["sk", "cz", "hu", "ro"]
const entityKinds: readonly EntityUrlKind[] = [
  "product",
  "category",
  "brand",
  "collection",
  "campaign",
  "article",
  "page",
]

const pickField = (
  row: UnknownRecord,
  camelCase: string,
  snakeCase: string
): unknown => (camelCase in row ? row[camelCase] : row[snakeCase])

export const parseRouteValue = (value: unknown): UrlRoute => {
  const row = asRecord(value, "URL route row")
  const targetType = oneOf(
    pickField(row, "targetType", "target_type"),
    ["entity", "static"] as const,
    "route.targetType"
  )
  const common = {
    id: asString(row.id, "route.id"),
    market: oneOf(row.market, markets, "route.market"),
    equivalenceKey: asNullableString(
      pickField(row, "equivalenceKey", "equivalence_key"),
      "route.equivalenceKey"
    ),
    indexPolicy: oneOf(
      pickField(row, "indexPolicy", "index_policy"),
      ["indexable", "noindex"] as const,
      "route.indexPolicy"
    ),
    status: oneOf(
      row.status,
      ["active", "retired", "superseded"] as const,
      "route.status"
    ),
    successorRouteId: asNullableString(
      pickField(row, "successorRouteId", "successor_route_id"),
      "route.successorRouteId"
    ),
    version: asInteger(row.version, "route.version"),
    createdAt: asIsoTimestamp(
      pickField(row, "createdAt", "created_at"),
      "route.createdAt"
    ),
    updatedAt: asIsoTimestamp(
      pickField(row, "updatedAt", "updated_at"),
      "route.updatedAt"
    ),
  }

  if (targetType === "entity") {
    return {
      ...common,
      kind: oneOf(row.kind, entityKinds, "route.kind"),
      targetType,
      sourceSystem: asString(
        pickField(row, "sourceSystem", "source_system"),
        "route.sourceSystem"
      ),
      sourceType: asString(
        pickField(row, "sourceType", "source_type"),
        "route.sourceType"
      ),
      sourceId: asString(
        pickField(row, "sourceId", "source_id"),
        "route.sourceId"
      ),
      staticRouteKey: null,
    }
  }

  return {
    ...common,
    kind: oneOf(row.kind, ["static"] as const, "route.kind"),
    targetType,
    sourceSystem: null,
    sourceType: null,
    sourceId: null,
    staticRouteKey: asString(
      pickField(row, "staticRouteKey", "static_route_key"),
      "route.staticRouteKey"
    ),
  }
}

export const parseEntitySlugValue = (value: unknown): UrlEntitySlug => {
  const row = asRecord(value, "URL entity slug row")
  return {
    id: asString(row.id, "slug.id"),
    market: oneOf(row.market, markets, "slug.market"),
    kind: oneOf(row.kind, entityKinds, "slug.kind"),
    normalizedSlug: asString(
      pickField(row, "normalizedSlug", "normalized_slug"),
      "slug.normalizedSlug"
    ),
    routeId: asNullableString(
      pickField(row, "routeId", "route_id"),
      "slug.routeId"
    ),
    disposition: oneOf(
      row.disposition,
      ["current", "alias", "gone"] as const,
      "slug.disposition"
    ),
    normalizationVersion: asInteger(
      pickField(row, "normalizationVersion", "normalization_version"),
      "slug.normalizationVersion"
    ),
    createdAt: asIsoTimestamp(
      pickField(row, "createdAt", "created_at"),
      "slug.createdAt"
    ),
  }
}

export const parseStaticPathValue = (value: unknown): StaticRoutePath => {
  const row = asRecord(value, "static route path row")
  return {
    id: asString(row.id, "staticPath.id"),
    market: oneOf(row.market, markets, "staticPath.market"),
    routeKey: asString(
      pickField(row, "routeKey", "route_key"),
      "staticPath.routeKey"
    ),
    parentRouteKey: asNullableString(
      pickField(row, "parentRouteKey", "parent_route_key"),
      "staticPath.parentRouteKey"
    ),
    segment: asString(row.segment, "staticPath.segment"),
    matchMode: oneOf(
      pickField(row, "matchMode", "match_mode"),
      ["exact", "prefix"] as const,
      "staticPath.matchMode"
    ),
    disposition: oneOf(
      row.disposition,
      ["current", "alias"] as const,
      "staticPath.disposition"
    ),
    introducedInVersion: asInteger(
      pickField(row, "introducedInVersion", "introduced_in_version"),
      "staticPath.introducedInVersion"
    ),
    createdAt: asIsoTimestamp(
      pickField(row, "createdAt", "created_at"),
      "staticPath.createdAt"
    ),
  }
}

export const parseNullableRouteValue = (value: unknown): UrlRoute | null =>
  value === null ? null : parseRouteValue(value)

export const parseNullableSlugValue = (value: unknown): UrlEntitySlug | null =>
  value === null ? null : parseEntitySlugValue(value)

export const parseNullableStaticPathValue = (
  value: unknown
): StaticRoutePath | null =>
  value === null ? null : parseStaticPathValue(value)
