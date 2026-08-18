import type {
  EntityUrlRoute,
  SourceReadResult,
  UrlEntitySlug,
  UrlRegistryBatchResolution,
  UrlRegistryResolution,
  UrlRegistryResolveInput,
  UrlRegistryResolveManyInput,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import {
  assertEntityKind,
  assertMarket,
  assertSegment,
} from "./input-validation"
import { executePrimaryRead } from "./primary-read"
import {
  parseEntitySlugValue,
  parseNullableRouteValue,
  parseNullableSlugValue,
} from "./row-codec"
import { asInteger, asRecord, asString } from "./runtime"
import type { SqlPool } from "./sql"

const resolutionJoins = `
  FROM url_registry.url_entity_slug AS matched
  LEFT JOIN url_registry.url_route AS route
    ON route.id = matched.route_id
  LEFT JOIN url_registry.url_entity_slug AS current_slug
    ON current_slug.route_id = route.id
   AND current_slug.disposition = 'current'
  LEFT JOIN url_registry.url_route AS successor
    ON successor.id = route.successor_route_id
  LEFT JOIN url_registry.url_entity_slug AS successor_current
    ON successor_current.route_id = successor.id
   AND successor_current.disposition = 'current'`

const resolutionColumns = `to_jsonb(matched) AS matched_slug,
  CASE WHEN route.id IS NULL THEN NULL ELSE to_jsonb(route) END AS route,
  CASE WHEN current_slug.id IS NULL THEN NULL ELSE to_jsonb(current_slug) END
    AS current_slug,
  CASE WHEN successor.id IS NULL THEN NULL ELSE to_jsonb(successor) END
    AS successor_route,
  CASE WHEN successor_current.id IS NULL THEN NULL
       ELSE to_jsonb(successor_current) END AS successor_current_slug`

const parseSuperseded = (
  row: ReturnType<typeof asRecord>,
  route: EntityUrlRoute,
  matchedSlug: UrlEntitySlug
): UrlRegistryResolution => {
  const successor = parseNullableRouteValue(row.successor_route)
  const currentSlug = parseNullableSlugValue(row.successor_current_slug)
  if (
    successor?.targetType !== "entity" ||
    successor.status !== "active" ||
    successor.id !== route.successorRouteId ||
    currentSlug === null ||
    currentSlug.routeId !== successor.id
  ) {
    throw new TypeError("A superseded route has no direct active projection")
  }
  return {
    disposition: "superseded",
    route,
    matchedSlug,
    successorRoute: successor,
    currentSlug,
  }
}

const parseActive = (
  row: ReturnType<typeof asRecord>,
  route: EntityUrlRoute,
  matchedSlug: UrlEntitySlug
): UrlRegistryResolution => {
  if (matchedSlug.disposition === "gone") {
    return { disposition: "gone", route, matchedSlug }
  }
  const currentSlug = parseNullableSlugValue(row.current_slug)
  if (currentSlug === null || currentSlug.routeId !== route.id) {
    throw new TypeError("An active route has no current slug")
  }
  if (
    matchedSlug.disposition === "current" &&
    matchedSlug.id !== currentSlug.id
  ) {
    throw new TypeError("The matched current slug differs from the projection")
  }
  if (
    matchedSlug.disposition !== "current" &&
    matchedSlug.disposition !== "alias"
  ) {
    throw new TypeError("An active route has an unsupported disposition")
  }
  return matchedSlug.disposition === "current"
    ? { disposition: "current", route, matchedSlug, currentSlug }
    : { disposition: "alias", route, matchedSlug, currentSlug }
}

const parseResolutionRow = (value: unknown): UrlRegistryResolution => {
  const row = asRecord(value, "URL registry resolution row")
  const matchedSlug = parseEntitySlugValue(row.matched_slug)
  const route = parseNullableRouteValue(row.route)
  if (route === null) {
    if (matchedSlug.disposition !== "gone" || matchedSlug.routeId !== null) {
      throw new TypeError("Only a standalone gone slug may omit its route")
    }
    return { disposition: "gone", route: null, matchedSlug }
  }
  if (route.targetType !== "entity") {
    throw new TypeError("An entity slug resolved to a static route")
  }
  if (route.status === "retired") {
    return { disposition: "gone", route, matchedSlug }
  }
  if (route.status === "superseded") {
    return parseSuperseded(row, route, matchedSlug)
  }
  return parseActive(row, route, matchedSlug)
}

export const resolveOne = async (
  pool: SqlPool,
  input: UrlRegistryResolveInput
): Promise<SourceReadResult<UrlRegistryResolution>> => {
  assertMarket(input.market)
  assertEntityKind(input.kind)
  assertSegment(input.normalizedSlug, "normalizedSlug")
  const read = await executePrimaryRead(pool, async (executor) => {
    const result = await executor.query(
      `SELECT ${resolutionColumns}
         ${resolutionJoins}
        WHERE matched.market = $1 AND matched.kind = $2
          AND matched.normalized_slug = $3
        LIMIT 1`,
      [input.market, input.kind, input.normalizedSlug]
    )
    return result.rows.length === 0 ? null : parseResolutionRow(result.rows[0])
  })
  if (read.kind !== "found") {
    return read
  }
  return read.value === null
    ? { kind: "missing" }
    : { kind: "found", value: read.value }
}

export const resolveBatch = async (
  pool: SqlPool,
  input: UrlRegistryResolveManyInput
): Promise<SourceReadResult<readonly UrlRegistryBatchResolution[]>> => {
  if (input.normalizedSlugs.length > 10) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "resolveMany accepts at most 10 normalized slugs"
    )
  }
  assertMarket(input.market)
  assertEntityKind(input.kind)
  for (const slug of input.normalizedSlugs) {
    assertSegment(slug, "normalizedSlug")
  }
  const read = await executePrimaryRead(pool, async (executor) => {
    const result = await executor.query(
      `WITH requested AS (
         SELECT normalized_slug, ordinality
           FROM unnest($3::text[]) WITH ORDINALITY
                AS requested_slug(normalized_slug, ordinality)
       )
       SELECT requested.ordinality::integer AS ordinality,
              requested.normalized_slug AS input_slug,
              resolved.*
         FROM requested
         LEFT JOIN LATERAL (
           SELECT ${resolutionColumns}
             ${resolutionJoins}
            WHERE matched.market = $1 AND matched.kind = $2
              AND matched.normalized_slug = requested.normalized_slug
            LIMIT 1
         ) AS resolved ON TRUE
        ORDER BY requested.ordinality`,
      [input.market, input.kind, [...input.normalizedSlugs]]
    )
    if (result.rows.length !== input.normalizedSlugs.length) {
      throw new TypeError("Batch resolution did not preserve input cardinality")
    }
    return result.rows.map((value, index): UrlRegistryBatchResolution => {
      const row = asRecord(value, "URL registry batch row")
      const ordinal = asInteger(row.ordinality, "resolution.ordinality")
      const normalizedSlug = asString(row.input_slug, "resolution.input_slug")
      if (
        ordinal !== index + 1 ||
        normalizedSlug !== input.normalizedSlugs[index]
      ) {
        throw new TypeError("Batch resolution did not preserve input order")
      }
      return {
        normalizedSlug,
        result:
          row.matched_slug === null
            ? { kind: "missing" }
            : { kind: "found", value: parseResolutionRow(row) },
      }
    })
  })
  return read
}
