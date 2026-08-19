import type { Market } from "@/lib/url/types"
import type {
  ActiveEquivalenceLookup,
  ActiveRouteTarget,
  EntityIdentityLookup,
  EntityRouteSnapshot,
  SourceReadResult,
  StaticRouteSnapshot,
  UrlRouteSnapshot,
} from "../contracts"
import {
  assertEntityKind,
  assertMarket,
  assertText,
  assertUuid,
} from "./input-validation"
import { executePrimaryRead } from "./primary-read"
import {
  parseEntitySlugValue,
  parseRouteValue,
  parseStaticPathValue,
} from "./row-codec"
import { asRecord } from "./runtime"
import { loadSnapshot, loadSnapshotById } from "./snapshot-store"
import type { SqlPool } from "./sql"

const targetFromRow = (value: unknown): ActiveRouteTarget => {
  const row = asRecord(value, "active route target row")
  const route = parseRouteValue(row.route)
  if (route.status !== "active") {
    throw new TypeError("An active lookup returned a non-active route")
  }
  if (route.targetType === "entity") {
    const currentSlug = parseEntitySlugValue(row.current_slug)
    if (
      currentSlug.disposition !== "current" ||
      currentSlug.routeId !== route.id
    ) {
      throw new TypeError("An active entity route has no current slug")
    }
    return { projectionType: "entity", route, currentSlug }
  }
  const currentPath = parseStaticPathValue(row.current_path)
  if (
    currentPath.disposition !== "current" ||
    currentPath.market !== route.market ||
    currentPath.routeKey !== route.staticRouteKey
  ) {
    throw new TypeError("An active static route has no current path")
  }
  return { projectionType: "static", route, currentPath }
}

export const findActiveEntity = async (
  pool: SqlPool,
  input: EntityIdentityLookup
): Promise<
  SourceReadResult<Extract<ActiveRouteTarget, { projectionType: "entity" }>>
> => {
  assertMarket(input.market)
  assertText(input.sourceSystem, "sourceSystem", 64)
  assertText(input.sourceType, "sourceType", 64)
  assertText(input.sourceId, "sourceId")
  const read = await executePrimaryRead(pool, async (executor) => {
    const result = await executor.query(
      `SELECT to_jsonb(route) AS route,
              to_jsonb(current_slug) AS current_slug,
              NULL::jsonb AS current_path
         FROM url_registry.url_route AS route
         JOIN url_registry.url_entity_slug AS current_slug
           ON current_slug.route_id = route.id
          AND current_slug.disposition = 'current'
        WHERE route.market = $1 AND route.target_type = 'entity'
          AND route.source_system = $2 AND route.source_type = $3
          AND route.source_id = $4 AND route.status = 'active'
        LIMIT 1`,
      [input.market, input.sourceSystem, input.sourceType, input.sourceId]
    )
    if (result.rows.length === 0) {
      return null
    }
    const target = targetFromRow(result.rows[0])
    if (target.projectionType !== "entity") {
      throw new TypeError("Entity identity lookup returned a static target")
    }
    return target
  })
  if (read.kind !== "found") {
    return read
  }
  return read.value === null
    ? { kind: "missing" }
    : { kind: "found", value: read.value }
}

export const findEntity = async (
  pool: SqlPool,
  input: EntityIdentityLookup
): Promise<SourceReadResult<EntityRouteSnapshot>> => {
  assertMarket(input.market)
  assertText(input.sourceSystem, "sourceSystem", 64)
  assertText(input.sourceType, "sourceType", 64)
  assertText(input.sourceId, "sourceId")
  const read = await executePrimaryRead(pool, async (executor) => {
    const result = await executor.query(
      `SELECT to_jsonb(route) AS route
         FROM url_registry.url_route AS route
        WHERE route.market = $1 AND route.target_type = 'entity'
          AND route.source_system = $2 AND route.source_type = $3
          AND route.source_id = $4
        LIMIT 1`,
      [input.market, input.sourceSystem, input.sourceType, input.sourceId]
    )
    if (result.rows.length === 0) {
      return null
    }
    const row = asRecord(result.rows[0], "entity snapshot row")
    const route = parseRouteValue(row.route)
    if (route.targetType !== "entity") {
      throw new TypeError("Entity identity lookup returned a static route")
    }
    const snapshot = await loadSnapshot(executor, route)
    if (snapshot.projectionType !== "entity") {
      throw new TypeError("Entity identity lookup returned a static snapshot")
    }
    return snapshot
  })
  if (read.kind !== "found") {
    return read
  }
  return read.value === null
    ? { kind: "missing" }
    : { kind: "found", value: read.value }
}

export const findEquivalents = async (
  pool: SqlPool,
  input: ActiveEquivalenceLookup
): Promise<SourceReadResult<readonly ActiveRouteTarget[]>> => {
  if (input.kind !== "static") {
    assertEntityKind(input.kind)
  }
  assertText(input.equivalenceKey, "equivalenceKey")
  const read = await executePrimaryRead(pool, async (executor) => {
    const result = await executor.query(
      `SELECT to_jsonb(route) AS route,
              CASE WHEN current_slug.id IS NULL THEN NULL
                   ELSE to_jsonb(current_slug) END AS current_slug,
              CASE WHEN current_path.id IS NULL THEN NULL
                   ELSE to_jsonb(current_path) END AS current_path
         FROM url_registry.url_route AS route
         LEFT JOIN url_registry.url_entity_slug AS current_slug
           ON current_slug.route_id = route.id
          AND current_slug.disposition = 'current'
         LEFT JOIN url_registry.static_route_path AS current_path
           ON current_path.market = route.market
          AND current_path.route_key = route.static_route_key
          AND current_path.disposition = 'current'
        WHERE route.kind = $1 AND route.equivalence_key = $2
          AND route.status = 'active'
        ORDER BY route.market, route.id
        LIMIT 5`,
      [input.kind, input.equivalenceKey]
    )
    return result.rows.map(targetFromRow)
  })
  if (read.kind !== "found") {
    return read
  }
  if (read.value.length === 0) {
    return { kind: "missing" }
  }
  return read.value.length > 4
    ? {
        kind: "invalid-response",
        causeCode: "EQUIVALENCE_MARKET_LIMIT_EXCEEDED",
      }
    : read
}

export const listStaticSnapshots = async (
  pool: SqlPool,
  market: Market
): Promise<SourceReadResult<readonly StaticRouteSnapshot[]>> => {
  assertMarket(market)
  const read = await executePrimaryRead(pool, async (executor) => {
    const result = await executor.query(
      `SELECT to_jsonb(route) AS route,
              CASE WHEN path.id IS NULL THEN NULL ELSE to_jsonb(path) END AS path
         FROM url_registry.url_route AS route
         LEFT JOIN url_registry.static_route_path AS path
           ON path.market = route.market
          AND path.route_key = route.static_route_key
        WHERE route.market = $1 AND route.target_type = 'static'
        ORDER BY route.static_route_key, path.created_at, path.id`,
      [market]
    )
    const groups = new Map<
      string,
      {
        route: ReturnType<typeof parseRouteValue>
        paths: ReturnType<typeof parseStaticPathValue>[]
      }
    >()
    for (const value of result.rows) {
      const row = asRecord(value, "static snapshot row")
      const route = parseRouteValue(row.route)
      if (route.targetType !== "static") {
        throw new TypeError("Static snapshot query returned an entity route")
      }
      const group = groups.get(route.id) ?? { route, paths: [] }
      if (row.path !== null) {
        group.paths.push(parseStaticPathValue(row.path))
      }
      groups.set(route.id, group)
    }
    return [...groups.values()].map(({ route, paths }) => {
      if (route.targetType !== "static") {
        throw new TypeError("Static snapshot group changed projection type")
      }
      const current = paths.filter((path) => path.disposition === "current")
      if (current.length !== 1) {
        throw new TypeError(
          "Static route does not have exactly one current path"
        )
      }
      return {
        projectionType: "static" as const,
        route,
        currentPath: current[0],
        pathHistory: paths,
      }
    })
  })
  return read
}

export const getRouteSnapshot = async (
  pool: SqlPool,
  routeId: string
): Promise<SourceReadResult<UrlRouteSnapshot>> => {
  assertUuid(routeId, "routeId")
  const read = await executePrimaryRead(pool, (executor) =>
    loadSnapshotById(executor, routeId)
  )
  if (read.kind !== "found") {
    return read
  }
  return read.value === null
    ? { kind: "missing" }
    : { kind: "found", value: read.value }
}
