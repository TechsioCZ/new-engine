import type {
  ChangeStaticPathRequest,
  CreateStaticRouteRequest,
  StaticRouteMutationResult,
  UrlRegistryCommand,
} from "./commands"
import { UrlRegistryError } from "./errors"
import type { MemoryCommandExecutor } from "./memory-command"
import {
  assertEquivalenceAvailable,
  assertMutableRoute,
  assertStaticIdentityAvailable,
  assertStaticPathAvailable,
  requireStaticTarget,
} from "./memory-constraints"
import {
  assertCreateVersion,
  assertStaticCreateRequest,
  assertStaticPathInput,
} from "./memory-input"
import { asStaticMutation, staticNoop, tagsForRoutes } from "./memory-result"
import { staticSnapshot } from "./memory-snapshot"
import { assertStaticParent } from "./memory-static-constraints"
import { nextVersion } from "./memory-validation"
import type { StaticRoutePath, StaticUrlRoute } from "./model"

export const createStaticRoute = (
  executor: MemoryCommandExecutor,
  command: UrlRegistryCommand<CreateStaticRouteRequest>
): StaticRouteMutationResult => {
  const replay = executor.prepare(command, "create-static-route")
  if (replay) {
    return asStaticMutation(replay)
  }
  const { request } = command
  assertCreateVersion(request.expectedVersion)
  assertStaticCreateRequest(request)
  const next = executor.transactionState()
  assertStaticIdentityAvailable(
    next,
    request.route.market,
    request.route.identity
  )
  assertStaticParent(
    next,
    request.route.market,
    request.route.identity.staticRouteKey,
    request.path.parentRouteKey
  )
  assertStaticPathAvailable(next, {
    market: request.route.market,
    parentRouteKey: request.path.parentRouteKey,
    segment: request.path.segment,
  })
  assertEquivalenceAvailable(next, {
    ...request.route,
    kind: "static",
  })

  const now = executor.timestamp()
  const route: StaticUrlRoute = {
    id: executor.newId(next, "route"),
    market: request.route.market,
    kind: "static",
    ...request.route.identity,
    equivalenceKey: request.route.equivalenceKey,
    indexPolicy: request.route.indexPolicy,
    status: "active",
    successorRouteId: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
  next.routes.set(route.id, route)
  const path: StaticRoutePath = {
    id: executor.newId(next, "static-path"),
    market: route.market,
    routeKey: route.staticRouteKey,
    parentRouteKey: request.path.parentRouteKey,
    segment: request.path.segment,
    matchMode: request.path.matchMode,
    disposition: "current",
    introducedInVersion: 1,
    createdAt: now,
  }
  next.staticPaths.set(path.id, path)
  const affectedRouteIds = [route.id]
  const commit = executor.commit(next, command, {
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds,
    previousVersion: null,
    resultVersion: 1,
    details: {
      parentRouteKey: path.parentRouteKey,
      segment: path.segment,
      matchMode: path.matchMode,
    },
    tags: tagsForRoutes(next, affectedRouteIds),
    createdAt: now,
  })
  return executor.finish(next, command, {
    snapshot: staticSnapshot(next, route),
    affectedRouteIds,
    commit,
  })
}

export const changeStaticPath = (
  executor: MemoryCommandExecutor,
  command: UrlRegistryCommand<ChangeStaticPathRequest>
): StaticRouteMutationResult => {
  const replay = executor.prepare(command, "change-static-path")
  if (replay) {
    return asStaticMutation(replay)
  }
  const { request } = command
  assertStaticPathInput(request.path)
  const next = executor.transactionState()
  const route = requireStaticTarget(next, request.target, request.source)
  assertMutableRoute(route, request.expectedVersion)
  assertStaticParent(
    next,
    route.market,
    route.staticRouteKey,
    request.path.parentRouteKey
  )
  const before = staticSnapshot(next, route)
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
    return staticNoop({
      executor,
      next,
      command,
      snapshot: before,
      reason: "same-current-path",
    })
  }
  assertStaticPathAvailable(next, {
    market: route.market,
    parentRouteKey: request.path.parentRouteKey,
    segment: request.path.segment,
  })
  const now = executor.timestamp()
  next.staticPaths.set(before.currentPath.id, {
    ...before.currentPath,
    disposition: "alias",
  })
  const version = nextVersion(route.version)
  const currentPath: StaticRoutePath = {
    id: executor.newId(next, "static-path"),
    market: route.market,
    routeKey: route.staticRouteKey,
    parentRouteKey: request.path.parentRouteKey,
    segment: request.path.segment,
    matchMode: request.path.matchMode,
    disposition: "current",
    introducedInVersion: version,
    createdAt: now,
  }
  next.staticPaths.set(currentPath.id, currentPath)
  const updated: StaticUrlRoute = { ...route, version, updatedAt: now }
  next.routes.set(route.id, updated)
  const affectedRouteIds = [route.id]
  const commit = executor.commit(next, command, {
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds,
    previousVersion: route.version,
    resultVersion: updated.version,
    details: {
      previousParentRouteKey: before.currentPath.parentRouteKey,
      previousSegment: before.currentPath.segment,
      parentRouteKey: currentPath.parentRouteKey,
      segment: currentPath.segment,
      matchMode: currentPath.matchMode,
    },
    tags: tagsForRoutes(next, affectedRouteIds),
    createdAt: now,
  })
  return executor.finish(next, command, {
    snapshot: staticSnapshot(next, updated),
    affectedRouteIds,
    commit,
  })
}
