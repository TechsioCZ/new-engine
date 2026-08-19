import type {
  EntityRouteSnapshot,
  StaticRouteSnapshot,
  UrlRoute,
  UrlRouteSnapshot,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import {
  parseEntitySlugValue,
  parseRouteValue,
  parseStaticPathValue,
} from "./row-codec"
import type { SqlExecutor } from "./sql"
import {
  ROUTE_COLUMNS,
  SLUG_COLUMNS,
  STATIC_PATH_COLUMNS,
} from "./sql-fragments"

export const loadRoute = async (
  executor: SqlExecutor,
  routeId: string,
  lock = false
): Promise<UrlRoute | null> => {
  const result = await executor.query(
    `SELECT ${ROUTE_COLUMNS}
       FROM url_registry.url_route
      WHERE id = $1
      ${lock ? "FOR UPDATE" : ""}`,
    [routeId]
  )
  if (result.rows.length === 0) {
    return null
  }
  if (result.rows.length !== 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      `Route ${routeId} returned more than one row`
    )
  }
  return parseRouteValue(result.rows[0])
}

const loadEntitySnapshot = async (
  executor: SqlExecutor,
  route: Extract<UrlRoute, { targetType: "entity" }>
): Promise<EntityRouteSnapshot> => {
  const result = await executor.query(
    `SELECT ${SLUG_COLUMNS}
       FROM url_registry.url_entity_slug
      WHERE route_id = $1
      ORDER BY created_at, id`,
    [route.id]
  )
  const history = result.rows.map(parseEntitySlugValue)
  const current = history.filter((slug) => slug.disposition === "current")
  if (current.length !== 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      `Entity route ${route.id} must have exactly one current slug`
    )
  }
  return {
    projectionType: "entity",
    route,
    currentSlug: current[0],
    slugHistory: history,
  }
}

const loadStaticSnapshot = async (
  executor: SqlExecutor,
  route: Extract<UrlRoute, { targetType: "static" }>
): Promise<StaticRouteSnapshot> => {
  const result = await executor.query(
    `SELECT ${STATIC_PATH_COLUMNS}
       FROM url_registry.static_route_path
      WHERE market = $1 AND route_key = $2
      ORDER BY created_at, id`,
    [route.market, route.staticRouteKey]
  )
  const history = result.rows.map(parseStaticPathValue)
  const current = history.filter((path) => path.disposition === "current")
  if (current.length !== 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      `Static route ${route.id} must have exactly one current path`
    )
  }
  return {
    projectionType: "static",
    route,
    currentPath: current[0],
    pathHistory: history,
  }
}

export const loadSnapshot = (
  executor: SqlExecutor,
  route: UrlRoute
): Promise<UrlRouteSnapshot> =>
  route.targetType === "entity"
    ? loadEntitySnapshot(executor, route)
    : loadStaticSnapshot(executor, route)

export const loadSnapshotById = async (
  executor: SqlExecutor,
  routeId: string
): Promise<UrlRouteSnapshot | null> => {
  const route = await loadRoute(executor, routeId)
  return route ? loadSnapshot(executor, route) : null
}

export const requireSnapshotById = async (
  executor: SqlExecutor,
  routeId: string
): Promise<UrlRouteSnapshot> => {
  const snapshot = await loadSnapshotById(executor, routeId)
  if (!snapshot) {
    throw new UrlRegistryError("NOT_FOUND", `Route ${routeId} not found`)
  }
  return snapshot
}
