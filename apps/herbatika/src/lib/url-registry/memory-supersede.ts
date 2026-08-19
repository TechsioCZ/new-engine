import type {
  RouteMutationResult,
  SupersedeRouteRequest,
  UrlRegistryCommand,
} from "./commands"
import { UrlRegistryError } from "./errors"
import type { MemoryCommandExecutor } from "./memory-command"
import {
  assertMutableRoute,
  requireSuccessor,
  requireTarget,
} from "./memory-constraints"
import { asRouteMutation, routeMutation, tagsForRoutes } from "./memory-result"
import { snapshotRoute } from "./memory-snapshot"
import { assertNoActiveStaticChildren } from "./memory-static-constraints"
import { sortedUnique } from "./memory-support"
import { nextVersion } from "./memory-validation"
import type { UrlRoute } from "./model"

export const supersedeRoute = (
  executor: MemoryCommandExecutor,
  command: UrlRegistryCommand<SupersedeRouteRequest>
): RouteMutationResult => {
  const replay = executor.prepare(command, "supersede-route")
  if (replay) {
    return asRouteMutation(replay)
  }
  const { request } = command
  const next = executor.transactionState()
  const route = requireTarget(next, request.target, request.source)
  const successor = requireSuccessor(next, request.successor)
  assertMutableRoute(route, request.expectedVersion)
  if (
    successor.status !== "active" ||
    successor.id === route.id ||
    successor.market !== route.market ||
    successor.kind !== route.kind ||
    successor.targetType !== route.targetType
  ) {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      "A successor must be a different active route of the same market and kind"
    )
  }
  if (route.targetType === "static") {
    assertNoActiveStaticChildren(next, route)
  }

  const now = executor.timestamp()
  const affected = new Set<string>([route.id])
  const updatedRoute: UrlRoute = {
    ...route,
    status: "superseded",
    successorRouteId: successor.id,
    version: nextVersion(route.version),
    updatedAt: now,
  }
  next.routes.set(route.id, updatedRoute)
  for (const predecessor of next.routes.values()) {
    if (
      predecessor.id !== route.id &&
      predecessor.status === "superseded" &&
      predecessor.successorRouteId === route.id
    ) {
      next.routes.set(predecessor.id, {
        ...predecessor,
        successorRouteId: successor.id,
        version: nextVersion(predecessor.version),
        updatedAt: now,
      })
      affected.add(predecessor.id)
    }
  }
  const affectedRouteIds = sortedUnique([...affected])
  const commit = executor.commit(next, command, {
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds,
    previousVersion: route.version,
    resultVersion: updatedRoute.version,
    details: {
      successorRouteId: successor.id,
      repointedPredecessorRouteIds: affectedRouteIds.filter(
        (routeId) => routeId !== route.id
      ),
    },
    tags: tagsForRoutes(next, [...affectedRouteIds, successor.id]),
    createdAt: now,
  })
  return executor.finish(
    next,
    command,
    routeMutation(snapshotRoute(next, updatedRoute), affectedRouteIds, commit)
  )
}
