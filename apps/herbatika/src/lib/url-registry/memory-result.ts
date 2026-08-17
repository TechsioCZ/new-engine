import type {
  EntityRouteMutationResult,
  GoneMutationResult,
  RouteMutationResult,
  StaticRouteMutationResult,
  UrlRegistryCommand,
  UrlRegistryCommandCommit,
} from "./commands"
import { UrlRegistryError } from "./errors"
import type { MemoryCommandExecutor } from "./memory-command"
import { cloneValue, type MemoryRegistryState } from "./memory-state"
import { sortedUnique } from "./memory-support"
import type {
  EntityRouteSnapshot,
  StaticRouteSnapshot,
  UrlRouteSnapshot,
} from "./model"

export const asRouteMutation = (
  value: RouteMutationResult | GoneMutationResult
): RouteMutationResult => {
  if (!("snapshot" in value)) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Route command replay returned a gone result"
    )
  }
  return value
}

export const asEntityMutation = (
  value: RouteMutationResult | GoneMutationResult
): EntityRouteMutationResult => {
  if (!("snapshot" in value) || value.snapshot.projectionType !== "entity") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Entity command replay returned a non-entity result"
    )
  }
  return {
    snapshot: value.snapshot,
    affectedRouteIds: value.affectedRouteIds,
    commit: value.commit,
  }
}

export const asStaticMutation = (
  value: RouteMutationResult | GoneMutationResult
): StaticRouteMutationResult => {
  if (!("snapshot" in value) || value.snapshot.projectionType !== "static") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Static command replay returned a non-static result"
    )
  }
  return {
    snapshot: value.snapshot,
    affectedRouteIds: value.affectedRouteIds,
    commit: value.commit,
  }
}

export const asGoneMutation = (
  value: RouteMutationResult | GoneMutationResult
): GoneMutationResult => {
  if (!("slug" in value)) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Gone command replay returned a route result"
    )
  }
  return value
}

export const tagsForRoutes = (
  state: MemoryRegistryState,
  routeIds: readonly string[],
  extra: readonly string[] = []
): string[] => {
  const tags = [...extra]
  for (const routeId of new Set(routeIds)) {
    const route = state.routes.get(routeId)
    if (!route) {
      continue
    }
    tags.push(
      `market:${route.market}`,
      `route:${route.market}:${route.kind}:${route.id}`,
      `sitemap:${route.market}`
    )
    if (route.equivalenceKey) {
      tags.push(`equivalence:${route.equivalenceKey}`)
    }
    if (route.targetType === "entity") {
      tags.push(`${route.kind}:${route.market}:${route.sourceId}`)
      for (const slug of state.slugs.values()) {
        if (slug.routeId === route.id) {
          tags.push(
            `route-slug:${route.market}:${route.kind}:${slug.normalizedSlug}`
          )
        }
      }
    } else {
      tags.push(`static-route:${route.market}:${route.staticRouteKey}`)
    }
  }
  return sortedUnique(tags)
}

export const routeMutation = (
  snapshot: UrlRouteSnapshot,
  affectedRouteIds: readonly string[],
  commit: UrlRegistryCommandCommit
): RouteMutationResult =>
  snapshot.projectionType === "entity"
    ? { snapshot, affectedRouteIds, commit }
    : { snapshot, affectedRouteIds, commit }

type NoopInput<Snapshot extends UrlRouteSnapshot = UrlRouteSnapshot> =
  Readonly<{
    executor: MemoryCommandExecutor
    next: MemoryRegistryState
    command: UrlRegistryCommand
    snapshot: Snapshot
    reason: string
  }>

export const finishNoop = ({
  executor,
  next,
  command,
  snapshot,
  reason,
}: NoopInput): RouteMutationResult => {
  const affectedRouteIds = [snapshot.route.id]
  const commit = executor.commit(next, command, {
    outcome: "noop",
    routeId: snapshot.route.id,
    affectedRouteIds,
    previousVersion: snapshot.route.version,
    resultVersion: snapshot.route.version,
    details: { reason },
    tags: null,
    createdAt: executor.timestamp(),
  })
  return executor.finish(
    next,
    command,
    routeMutation(cloneValue(snapshot), affectedRouteIds, commit)
  )
}

export const entityNoop = (
  input: NoopInput<EntityRouteSnapshot>
): EntityRouteMutationResult => asEntityMutation(finishNoop(input))

export const staticNoop = (
  input: NoopInput<StaticRouteSnapshot>
): StaticRouteMutationResult => asStaticMutation(finishNoop(input))
