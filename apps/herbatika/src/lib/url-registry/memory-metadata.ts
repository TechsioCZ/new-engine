import type {
  RouteMutationResult,
  UpdateRouteRequest,
  UrlRegistryCommand,
} from "./commands"
import type { MemoryCommandExecutor } from "./memory-command"
import {
  assertEquivalenceAvailable,
  assertMutableRoute,
  requireTarget,
} from "./memory-constraints"
import {
  asRouteMutation,
  finishNoop,
  routeMutation,
  tagsForRoutes,
} from "./memory-result"
import { snapshotRoute } from "./memory-snapshot"
import { assertMetadata, nextVersion } from "./memory-validation"
import type { UrlRoute } from "./model"

export const updateRouteMetadata = (
  executor: MemoryCommandExecutor,
  command: UrlRegistryCommand<UpdateRouteRequest>
): RouteMutationResult => {
  const replay = executor.prepare(command, "update-route")
  if (replay) {
    return asRouteMutation(replay)
  }
  const { request } = command
  assertMetadata(request.metadata)
  const next = executor.transactionState()
  const route = requireTarget(next, request.target, request.source)
  assertMutableRoute(route, request.expectedVersion)
  const before = snapshotRoute(next, route)
  if (
    route.equivalenceKey === request.metadata.equivalenceKey &&
    route.indexPolicy === request.metadata.indexPolicy
  ) {
    return finishNoop({
      executor,
      next,
      command,
      snapshot: before,
      reason: "same-route-metadata",
    })
  }
  assertEquivalenceAvailable(next, {
    market: route.market,
    kind: route.kind,
    equivalenceKey: request.metadata.equivalenceKey,
    excludedRouteId: route.id,
  })
  const now = executor.timestamp()
  const updated: UrlRoute = {
    ...route,
    equivalenceKey: request.metadata.equivalenceKey,
    indexPolicy: request.metadata.indexPolicy,
    version: nextVersion(route.version),
    updatedAt: now,
  }
  next.routes.set(route.id, updated)
  const affectedRouteIds = [route.id]
  const commit = executor.commit(next, command, {
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds,
    previousVersion: route.version,
    resultVersion: updated.version,
    details: {
      previousEquivalenceKey: route.equivalenceKey,
      equivalenceKey: updated.equivalenceKey,
      previousIndexPolicy: route.indexPolicy,
      indexPolicy: updated.indexPolicy,
    },
    tags: tagsForRoutes(
      next,
      affectedRouteIds,
      route.equivalenceKey ? [`equivalence:${route.equivalenceKey}`] : []
    ),
    createdAt: now,
  })
  return executor.finish(
    next,
    command,
    routeMutation(snapshotRoute(next, updated), affectedRouteIds, commit)
  )
}
