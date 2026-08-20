import type {
  ChangeSlugRequest,
  CreateEntityRouteRequest,
  EntityRouteMutationResult,
  UrlRegistryCommand,
} from "./commands"
import { UrlRegistryError } from "./errors"
import type { MemoryCommandExecutor } from "./memory-command"
import {
  assertEntityIdentityAvailable,
  assertEquivalenceAvailable,
  assertMutableRoute,
  assertSlugAvailable,
  requireEntityTarget,
} from "./memory-constraints"
import {
  assertCreateVersion,
  assertEntityCreateRequest,
  assertSlugInput,
} from "./memory-input"
import { asEntityMutation, entityNoop, tagsForRoutes } from "./memory-result"
import { entitySnapshot } from "./memory-snapshot"
import { nextVersion } from "./memory-validation"
import type { EntityUrlRoute, UrlEntitySlug } from "./model"

export const createEntityRoute = (
  executor: MemoryCommandExecutor,
  command: UrlRegistryCommand<CreateEntityRouteRequest>
): EntityRouteMutationResult => {
  const replay = executor.prepare(command, "create-entity-route")
  if (replay) {
    return asEntityMutation(replay)
  }
  const { request } = command
  assertCreateVersion(request.expectedVersion)
  assertEntityCreateRequest(request)
  const next = executor.transactionState()
  assertEntityIdentityAvailable(
    next,
    request.route.market,
    request.route.identity
  )
  assertSlugAvailable(next, {
    market: request.route.market,
    kind: request.route.kind,
    normalizedSlug: request.slug.normalizedSlug,
  })
  assertEquivalenceAvailable(next, request.route)

  const now = executor.timestamp()
  const route: EntityUrlRoute = {
    id: executor.newId(next, "route"),
    market: request.route.market,
    kind: request.route.kind,
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
  const slug: UrlEntitySlug = {
    id: executor.newId(next, "slug"),
    market: route.market,
    kind: route.kind,
    normalizedSlug: request.slug.normalizedSlug,
    routeId: route.id,
    disposition: "current",
    normalizationVersion: request.slug.normalizationVersion,
    createdAt: now,
  }
  next.slugs.set(slug.id, slug)
  const affectedRouteIds = [route.id]
  const commit = executor.commit(next, command, {
    outcome: "applied",
    routeId: route.id,
    affectedRouteIds,
    previousVersion: null,
    resultVersion: 1,
    details: { normalizedSlug: slug.normalizedSlug },
    tags: tagsForRoutes(next, affectedRouteIds),
    createdAt: now,
  })
  return executor.finish(next, command, {
    snapshot: entitySnapshot(next, route),
    affectedRouteIds,
    commit,
  })
}

export const changeEntitySlug = (
  executor: MemoryCommandExecutor,
  command: UrlRegistryCommand<ChangeSlugRequest>
): EntityRouteMutationResult => {
  const replay = executor.prepare(command, "change-slug")
  if (replay) {
    return asEntityMutation(replay)
  }
  const { request } = command
  assertSlugInput(request.slug)
  const next = executor.transactionState()
  const route = requireEntityTarget(next, request.target, request.source)
  assertMutableRoute(route, request.expectedVersion)
  const before = entitySnapshot(next, route)
  if (before.currentSlug.normalizedSlug === request.slug.normalizedSlug) {
    if (
      before.currentSlug.normalizationVersion !==
      request.slug.normalizationVersion
    ) {
      throw new UrlRegistryError(
        "INVALID_TRANSITION",
        "A current slug cannot change normalization version in place"
      )
    }
    return entityNoop({
      executor,
      next,
      command,
      snapshot: before,
      reason: "same-current-slug",
    })
  }
  assertSlugAvailable(next, {
    ...request.slug,
    market: route.market,
    kind: route.kind,
  })
  const now = executor.timestamp()
  next.slugs.set(before.currentSlug.id, {
    ...before.currentSlug,
    disposition: "alias",
  })
  const currentSlug: UrlEntitySlug = {
    id: executor.newId(next, "slug"),
    market: route.market,
    kind: route.kind,
    normalizedSlug: request.slug.normalizedSlug,
    routeId: route.id,
    disposition: "current",
    normalizationVersion: request.slug.normalizationVersion,
    createdAt: now,
  }
  next.slugs.set(currentSlug.id, currentSlug)
  const updated: EntityUrlRoute = {
    ...route,
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
      previousSlug: before.currentSlug.normalizedSlug,
      currentSlug: currentSlug.normalizedSlug,
    },
    tags: tagsForRoutes(next, affectedRouteIds, [
      `route-slug:${route.market}:${route.kind}:${before.currentSlug.normalizedSlug}`,
    ]),
    createdAt: now,
  })
  return executor.finish(next, command, {
    snapshot: entitySnapshot(next, updated),
    affectedRouteIds,
    commit,
  })
}
