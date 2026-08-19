import type {
  RetireRouteRequest,
  SupersedeRouteRequest,
  UrlRegistryCommand,
  UrlRoute,
  UrlRouteIdentity,
  UrlRouteSnapshot,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import { type RouteCommandDraft, tagsForSnapshots } from "./command-finalizer"
import {
  assertExpectedVersion,
  assertRouteIdentity,
  assertSourceMatchesIdentity,
  assertUuid,
} from "./input-validation"
import { loadRoute, loadSnapshot } from "./snapshot-store"
import type { SqlExecutor } from "./sql"
import {
  assertNoActiveStaticChildren,
  lockLifecycleRoutes,
} from "./write-context"

const byId = (routes: readonly UrlRoute[], id: string): UrlRoute => {
  const route = routes.find((candidate) => candidate.id === id)
  if (!route) {
    throw new UrlRegistryError("NOT_FOUND", `Route ${id} not found`)
  }
  return route
}

const loadSnapshots = async (
  executor: SqlExecutor,
  routeIds: readonly string[]
): Promise<UrlRouteSnapshot[]> => {
  const snapshots: UrlRouteSnapshot[] = []
  for (const routeId of [...new Set(routeIds)].sort()) {
    const route = await loadRoute(executor, routeId)
    if (!route) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Affected route ${routeId} disappeared`
      )
    }
    snapshots.push(await loadSnapshot(executor, route))
  }
  return snapshots
}

export const retireRoute = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand<RetireRouteRequest<UrlRouteIdentity>>
): Promise<RouteCommandDraft> => {
  const { request } = command
  assertUuid(request.target.routeId, "target.routeId")
  const locked = await lockLifecycleRoutes(
    executor,
    [request.target.routeId],
    request.target.routeId
  )
  const route = byId(locked, request.target.routeId)
  assertRouteIdentity(route, request.target.identity)
  assertSourceMatchesIdentity(request.source, request.target.identity)
  assertExpectedVersion(route, request.expectedVersion)
  if (route.status === "retired") {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      `Route ${route.id} is already retired`
    )
  }
  if (route.targetType === "static") {
    await assertNoActiveStaticChildren(executor, route)
  }
  const inbound =
    route.status === "active"
      ? locked.filter(
          (candidate) =>
            candidate.id !== route.id &&
            candidate.status === "superseded" &&
            candidate.successorRouteId === route.id
        )
      : []
  const affectedRouteIds = [...inbound.map(({ id }) => id), route.id].sort()
  const beforeSnapshots = await loadSnapshots(executor, affectedRouteIds)
  const before = beforeSnapshots.find(
    ({ route: candidate }) => candidate.id === route.id
  )
  if (!before) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Target route disappeared"
    )
  }
  if (inbound.length > 0) {
    await executor.query(
      `UPDATE url_registry.url_route
          SET status = 'retired', successor_route_id = NULL,
              version = version + 1
        WHERE id = ANY($1::uuid[])`,
      [inbound.map((candidate) => candidate.id).sort()]
    )
  }
  await executor.query(
    `UPDATE url_registry.url_route
        SET status = 'retired', successor_route_id = NULL,
            version = version + 1
      WHERE id = $1`,
    [route.id]
  )
  const snapshots = await loadSnapshots(executor, affectedRouteIds)
  const snapshot = snapshots.find(
    ({ route: candidate }) => candidate.id === route.id
  )
  if (!snapshot) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Retired route disappeared"
    )
  }
  return {
    kind: "route",
    snapshot,
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds,
    previousVersion: route.version,
    resultVersion: snapshot.route.version,
    details: {
      previousStatus: route.status,
      cascadedPredecessorRouteIds: inbound.map(({ id }) => id).sort(),
    },
    beforeState: {
      targetSnapshot: before,
      affectedRouteSnapshots: beforeSnapshots,
    },
    affectedAfterSnapshots: snapshots,
    tags: tagsForSnapshots(snapshots),
  }
}

export const supersedeRoute = async (
  executor: SqlExecutor,
  command: UrlRegistryCommand<SupersedeRouteRequest>
): Promise<RouteCommandDraft> => {
  const { request } = command
  assertUuid(request.target.routeId, "target.routeId")
  assertUuid(request.successor.routeId, "successor.routeId")
  const locked = await lockLifecycleRoutes(
    executor,
    [request.target.routeId, request.successor.routeId],
    request.target.routeId
  )
  const route = byId(locked, request.target.routeId)
  const successor = byId(locked, request.successor.routeId)
  assertRouteIdentity(route, request.target.identity)
  assertRouteIdentity(successor, request.successor.identity)
  assertSourceMatchesIdentity(request.source, request.target.identity)
  assertExpectedVersion(route, request.expectedVersion)
  if (
    route.status !== "active" ||
    successor.status !== "active" ||
    route.id === successor.id ||
    route.market !== successor.market ||
    route.kind !== successor.kind ||
    route.targetType !== successor.targetType
  ) {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      "A successor must be a different active route of the same market and kind"
    )
  }
  if (route.targetType === "static") {
    await assertNoActiveStaticChildren(executor, route)
  }
  const inbound = locked.filter(
    (candidate) =>
      candidate.id !== route.id &&
      candidate.id !== successor.id &&
      candidate.status === "superseded" &&
      candidate.successorRouteId === route.id
  )
  const affectedRouteIds = [...inbound.map(({ id }) => id), route.id].sort()
  const beforeSnapshots = await loadSnapshots(executor, affectedRouteIds)
  const before = beforeSnapshots.find(
    ({ route: candidate }) => candidate.id === route.id
  )
  if (!before) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Target route disappeared"
    )
  }
  if (inbound.length > 0) {
    await executor.query(
      `UPDATE url_registry.url_route
          SET successor_route_id = $2, version = version + 1
        WHERE id = ANY($1::uuid[])`,
      [inbound.map(({ id }) => id).sort(), successor.id]
    )
  }
  await executor.query(
    `UPDATE url_registry.url_route
        SET status = 'superseded', successor_route_id = $2,
            version = version + 1
      WHERE id = $1`,
    [route.id, successor.id]
  )
  const snapshots = await loadSnapshots(executor, [
    ...affectedRouteIds,
    successor.id,
  ])
  const snapshot = snapshots.find(
    ({ route: candidate }) => candidate.id === route.id
  )
  if (!snapshot) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Superseded route disappeared"
    )
  }
  const affectedSnapshots = snapshots.filter(({ route: candidate }) =>
    affectedRouteIds.includes(candidate.id)
  )
  return {
    kind: "route",
    snapshot,
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds,
    previousVersion: route.version,
    resultVersion: snapshot.route.version,
    details: {
      successorRouteId: successor.id,
      repointedPredecessorRouteIds: inbound.map(({ id }) => id).sort(),
    },
    beforeState: {
      targetSnapshot: before,
      affectedRouteSnapshots: beforeSnapshots,
    },
    affectedAfterSnapshots: affectedSnapshots,
    tags: tagsForSnapshots(snapshots),
  }
}
