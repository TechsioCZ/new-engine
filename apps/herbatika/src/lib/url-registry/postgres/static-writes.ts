import type {
  ChangeStaticPathRequest,
  CreateStaticRouteRequest,
  StaticRouteSnapshot,
  UrlRegistryCommand,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import { type RouteCommandDraft, tagsForSnapshots } from "./command-finalizer"
import {
  assertMarket,
  assertMetadata,
  assertMutableRoute,
  assertSegment,
  assertSourceMatchesIdentity,
  assertText,
  assertUuid,
} from "./input-validation"
import { loadRoute, loadSnapshot } from "./snapshot-store"
import type { SqlExecutor } from "./sql"
import { lockTargetRoute, requireActiveStaticParent } from "./write-context"

const asStaticSnapshot = (
  snapshot: Awaited<ReturnType<typeof loadSnapshot>>
): StaticRouteSnapshot => {
  if (snapshot.projectionType !== "static") {
    throw new UrlRegistryError(
      "SOURCE_IDENTITY_MISMATCH",
      `Route ${snapshot.route.id} is not a static route`
    )
  }
  return snapshot
}

const assertPath = (path: {
  parentRouteKey: string | null
  segment: string
  matchMode: string
}) => {
  if (path.parentRouteKey !== null) {
    assertText(path.parentRouteKey, "parentRouteKey", 128)
  }
  assertSegment(path.segment, "segment")
  if (path.matchMode !== "exact" && path.matchMode !== "prefix") {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Invalid static path match mode"
    )
  }
}

export const createStaticRoute = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand<CreateStaticRouteRequest>,
  createId: () => string
): Promise<RouteCommandDraft> => {
  const { request } = command
  assertMarket(request.route.market)
  assertText(request.route.identity.staticRouteKey, "staticRouteKey", 128)
  assertSourceMatchesIdentity(request.source, request.route.identity)
  assertMetadata(request.route)
  assertPath(request.path)
  if (request.expectedVersion !== 0) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Create expectedVersion must be 0"
    )
  }
  await requireActiveStaticParent(
    executor,
    request.route.market,
    request.route.identity.staticRouteKey,
    request.path.parentRouteKey
  )
  const routeId = createId()
  const pathId = createId()
  assertUuid(routeId, "generated routeId")
  assertUuid(pathId, "generated staticPathId")

  await executor.query(
    `INSERT INTO url_registry.url_route (
       id, market, kind, target_type, source_system, source_type, source_id,
       static_route_key, equivalence_key, index_policy, status,
       successor_route_id, version
     ) VALUES ($1, $2, 'static', 'static', NULL, NULL, NULL, $3, $4, $5,
               'active', NULL, 1)`,
    [
      routeId,
      request.route.market,
      request.route.identity.staticRouteKey,
      request.route.equivalenceKey,
      request.route.indexPolicy,
    ]
  )
  await executor.query(
    `INSERT INTO url_registry.static_route_path (
       id, market, route_key, parent_route_key, segment, match_mode,
       disposition, introduced_in_version
     ) VALUES ($1, $2, $3, $4, $5, $6, 'current', 1)`,
    [
      pathId,
      request.route.market,
      request.route.identity.staticRouteKey,
      request.path.parentRouteKey,
      request.path.segment,
      request.path.matchMode,
    ]
  )
  const insertedRoute = await loadRoute(executor, routeId)
  if (!insertedRoute || insertedRoute.targetType !== "static") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Inserted static route could not be read back"
    )
  }
  const snapshot = asStaticSnapshot(await loadSnapshot(executor, insertedRoute))
  return {
    kind: "route",
    snapshot,
    outcome: "applied",
    routeId,
    affectedRouteIds: [routeId],
    previousVersion: null,
    resultVersion: 1,
    details: {
      parentRouteKey: snapshot.currentPath.parentRouteKey,
      segment: snapshot.currentPath.segment,
      matchMode: snapshot.currentPath.matchMode,
    },
    beforeState: null,
    tags: tagsForSnapshots([snapshot]),
  }
}

export const changeStaticPath = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand<ChangeStaticPathRequest>,
  createId: () => string
): Promise<RouteCommandDraft> => {
  const { request } = command
  assertUuid(request.target.routeId, "target.routeId")
  assertPath(request.path)
  const route = await lockTargetRoute(
    executor,
    request.target,
    request.source,
    request.expectedVersion
  )
  assertMutableRoute(route, request.expectedVersion)
  if (route.targetType !== "static") {
    throw new UrlRegistryError(
      "SOURCE_IDENTITY_MISMATCH",
      `Route ${route.id} is not a static route`
    )
  }
  await requireActiveStaticParent(
    executor,
    route.market,
    route.staticRouteKey,
    request.path.parentRouteKey
  )
  const before = asStaticSnapshot(await loadSnapshot(executor, route))
  const samePath =
    before.currentPath.parentRouteKey === request.path.parentRouteKey &&
    before.currentPath.segment === request.path.segment
  if (samePath) {
    if (before.currentPath.matchMode !== request.path.matchMode) {
      throw new UrlRegistryError(
        "INVALID_TRANSITION",
        "A current static path cannot change match mode in place"
      )
    }
    return {
      kind: "route",
      snapshot: before,
      outcome: "noop",
      routeId: route.id,
      affectedRouteIds: [route.id],
      previousVersion: route.version,
      resultVersion: route.version,
      details: { reason: "same-current-path" },
      beforeState: before,
      tags: null,
    }
  }

  const pathId = createId()
  assertUuid(pathId, "generated staticPathId")
  const nextVersion = route.version + 1
  await executor.query(
    `UPDATE url_registry.static_route_path
        SET disposition = 'alias'
      WHERE id = $1 AND disposition = 'current'`,
    [before.currentPath.id]
  )
  await executor.query(
    `INSERT INTO url_registry.static_route_path (
       id, market, route_key, parent_route_key, segment, match_mode,
       disposition, introduced_in_version
     ) VALUES ($1, $2, $3, $4, $5, $6, 'current', $7)`,
    [
      pathId,
      route.market,
      route.staticRouteKey,
      request.path.parentRouteKey,
      request.path.segment,
      request.path.matchMode,
      nextVersion,
    ]
  )
  await executor.query(
    "UPDATE url_registry.url_route SET version = version + 1 WHERE id = $1",
    [route.id]
  )
  const updated = await loadRoute(executor, route.id)
  if (!updated || updated.targetType !== "static") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Updated route disappeared"
    )
  }
  const snapshot = asStaticSnapshot(await loadSnapshot(executor, updated))
  return {
    kind: "route",
    snapshot,
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds: [route.id],
    previousVersion: route.version,
    resultVersion: updated.version,
    details: {
      previousParentRouteKey: before.currentPath.parentRouteKey,
      previousSegment: before.currentPath.segment,
      parentRouteKey: snapshot.currentPath.parentRouteKey,
      segment: snapshot.currentPath.segment,
      matchMode: snapshot.currentPath.matchMode,
    },
    beforeState: before,
    tags: tagsForSnapshots([snapshot]),
  }
}
