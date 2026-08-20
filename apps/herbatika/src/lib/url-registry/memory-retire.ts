import type {
  RetireRouteRequest,
  RouteMutationResult,
  UrlRegistryCommand,
} from "./commands"
import { UrlRegistryError } from "./errors"
import type { MemoryCommandExecutor } from "./memory-command"
import { assertExpectedVersion, requireTarget } from "./memory-constraints"
import { asRouteMutation, routeMutation, tagsForRoutes } from "./memory-result"
import { snapshotRoute } from "./memory-snapshot"
import { assertNoActiveStaticChildren } from "./memory-static-constraints"
import { sortedUnique } from "./memory-support"
import { nextVersion } from "./memory-validation"
import type { UrlRoute } from "./model"

export const retireRoute = (
  executor: MemoryCommandExecutor,
  command: UrlRegistryCommand<RetireRouteRequest>
): RouteMutationResult => {
  const replay = executor.prepare(command, "retire-route")
  if (replay) {
    return asRouteMutation(replay)
  }
  const { request } = command
  const next = executor.transactionState()
  const route = requireTarget(next, request.target, request.source)
  assertExpectedVersion(route, request.expectedVersion)
  if (route.status === "retired") {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      `Route ${route.id} is already retired`
    )
  }
  if (route.targetType === "static") {
    assertNoActiveStaticChildren(next, route)
  }

  const now = executor.timestamp()
  const affected = new Set<string>([route.id])
  const retiredRoute: UrlRoute = {
    ...route,
    status: "retired",
    successorRouteId: null,
    version: nextVersion(route.version),
    updatedAt: now,
  }
  next.routes.set(route.id, retiredRoute)
  if (route.status === "active") {
    for (const predecessor of next.routes.values()) {
      if (
        predecessor.status === "superseded" &&
        predecessor.successorRouteId === route.id
      ) {
        next.routes.set(predecessor.id, {
          ...predecessor,
          status: "retired",
          successorRouteId: null,
          version: nextVersion(predecessor.version),
          updatedAt: now,
        })
        affected.add(predecessor.id)
      }
    }
  }
  const affectedRouteIds = sortedUnique([...affected])
  const commit = executor.commit(next, command, {
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds,
    previousVersion: route.version,
    resultVersion: retiredRoute.version,
    details: {
      previousStatus: route.status,
      cascadedPredecessorRouteIds: affectedRouteIds.filter(
        (routeId) => routeId !== route.id
      ),
    },
    tags: tagsForRoutes(next, affectedRouteIds),
    createdAt: now,
  })
  return executor.finish(
    next,
    command,
    routeMutation(snapshotRoute(next, retiredRoute), affectedRouteIds, commit)
  )
}
