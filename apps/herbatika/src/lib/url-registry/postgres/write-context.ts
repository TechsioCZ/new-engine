import type { Market } from "@/lib/url/types"
import type {
  StaticUrlRoute,
  UrlRegistryCommandSource,
  UrlRoute,
  UrlRouteIdentity,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import {
  assertExpectedVersion,
  assertRouteIdentity,
  assertSourceMatchesIdentity,
} from "./input-validation"
import { parseRouteValue } from "./row-codec"
import { asRecord, asString } from "./runtime"
import { loadRoute } from "./snapshot-store"
import type { SqlExecutor } from "./sql"
import { ROUTE_COLUMNS } from "./sql-fragments"

export const acquireStaticMarketLock = async (
  executor: SqlExecutor,
  market: Market
) => {
  await executor.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('urlr:static:' || $1, 0))",
    [market]
  )
}

export const discoverStaticMarket = async (
  executor: SqlExecutor,
  routeId: string
): Promise<Market> => {
  const route = await loadRoute(executor, routeId)
  if (!route) {
    throw new UrlRegistryError("NOT_FOUND", `Route ${routeId} not found`)
  }
  if (route.targetType !== "static") {
    throw new UrlRegistryError(
      "SOURCE_IDENTITY_MISMATCH",
      `Route ${routeId} is not a static route`
    )
  }
  return route.market
}

export const lockTargetRoute = async (
  executor: SqlExecutor,
  target: Readonly<{ routeId: string; identity: UrlRouteIdentity }>,
  source: UrlRegistryCommandSource,
  expectedVersion: number
): Promise<UrlRoute> => {
  const route = await loadRoute(executor, target.routeId, true)
  if (!route) {
    throw new UrlRegistryError("NOT_FOUND", `Route ${target.routeId} not found`)
  }
  assertRouteIdentity(route, target.identity)
  assertSourceMatchesIdentity(source, target.identity)
  assertExpectedVersion(route, expectedVersion)
  return route
}

export const requireActiveStaticParent = async (
  executor: SqlExecutor,
  market: Market,
  routeKey: string,
  parentRouteKey: string | null
) => {
  if (parentRouteKey === null) {
    return
  }
  if (parentRouteKey === routeKey) {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      "A static route cannot be its own parent"
    )
  }
  const parent = await executor.query(
    `SELECT id
       FROM url_registry.url_route
      WHERE market = $1 AND static_route_key = $2
        AND target_type = 'static' AND status = 'active'
      LIMIT 1`,
    [market, parentRouteKey]
  )
  if (parent.rows.length !== 1) {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      `Static parent ${parentRouteKey} must exist and be active`
    )
  }
  const ancestry = await executor.query(
    `WITH RECURSIVE ancestors (route_key, parent_route_key) AS (
       SELECT path.route_key, path.parent_route_key
         FROM url_registry.static_route_path AS path
        WHERE path.market = $1 AND path.route_key = $2
          AND path.disposition = 'current'
       UNION
       SELECT parent_path.route_key, parent_path.parent_route_key
         FROM url_registry.static_route_path AS parent_path
         JOIN ancestors AS child
           ON parent_path.market = $1
          AND parent_path.route_key = child.parent_route_key
          AND parent_path.disposition = 'current'
     )
     SELECT ancestors.route_key, route.status
       FROM ancestors
       JOIN url_registry.url_route AS route
         ON route.market = $1
        AND route.static_route_key = ancestors.route_key`,
    [market, parentRouteKey]
  )
  if (ancestry.rows.length === 0) {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      `Static parent ${parentRouteKey} has no current path projection`
    )
  }
  for (const value of ancestry.rows) {
    const row = asRecord(value, "static ancestor row")
    const ancestorKey = asString(row.route_key, "static ancestor route_key")
    const status = asString(row.status, "static ancestor status")
    if (ancestorKey === routeKey) {
      throw new UrlRegistryError(
        "INVALID_TRANSITION",
        `Static parent ${parentRouteKey} would create an ancestor cycle`
      )
    }
    if (status !== "active") {
      throw new UrlRegistryError(
        "INVALID_TRANSITION",
        `Static ancestor ${ancestorKey} must be active`
      )
    }
  }
}

export const assertNoActiveStaticChildren = async (
  executor: SqlExecutor,
  route: StaticUrlRoute
) => {
  const child = await executor.query(
    `SELECT child.id
       FROM url_registry.static_route_path AS path
       JOIN url_registry.url_route AS child
         ON child.market = path.market
        AND child.static_route_key = path.route_key
      WHERE path.market = $1
        AND path.parent_route_key = $2
        AND path.disposition = 'current'
        AND child.status = 'active'
      ORDER BY child.id
      LIMIT 1`,
    [route.market, route.staticRouteKey]
  )
  if (child.rows.length > 0) {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      `Static route ${route.staticRouteKey} has active children`
    )
  }
}

export const lockLifecycleRoutes = async (
  executor: SqlExecutor,
  routeIds: readonly string[],
  inboundSuccessorRouteId: string
): Promise<UrlRoute[]> => {
  const locked = await executor.query(
    `SELECT ${ROUTE_COLUMNS}
       FROM url_registry.url_route
      WHERE id = ANY($1::uuid[])
         OR successor_route_id = $2
      ORDER BY id
      FOR UPDATE`,
    [[...new Set(routeIds)].sort(), inboundSuccessorRouteId]
  )
  return locked.rows.map(parseRouteValue)
}
