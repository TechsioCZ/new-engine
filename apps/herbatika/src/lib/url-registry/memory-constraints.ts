import type { Market } from "@/lib/url/types"
import type { UrlRegistryCommandSource } from "./commands"
import { UrlRegistryError } from "./errors"
import {
  entityIdentityKey,
  type MemoryRegistryState,
  slugKey,
  staticIdentityKey,
  staticPathKey,
} from "./memory-state"
import {
  assertNonEmpty,
  assertRouteIdentity,
  assertSafeVersion,
  assertSourceMatchesIdentity,
} from "./memory-validation"
import type {
  EntityRouteIdentity,
  EntityUrlRoute,
  StaticRouteIdentity,
  StaticRoutePath,
  StaticUrlRoute,
  UrlEntitySlug,
  UrlRoute,
  UrlRouteIdentity,
} from "./model"

export const requireTarget = (
  state: MemoryRegistryState,
  target: Readonly<{ routeId: string; identity: UrlRouteIdentity }>,
  source: UrlRegistryCommandSource
): UrlRoute => {
  const route = state.routes.get(target.routeId)
  if (!route) {
    throw new UrlRegistryError("NOT_FOUND", `Route ${target.routeId} not found`)
  }
  assertRouteIdentity(route, target.identity)
  assertSourceMatchesIdentity(source, target.identity)
  return route
}

export const requireEntityTarget = (
  state: MemoryRegistryState,
  target: Readonly<{ routeId: string; identity: EntityRouteIdentity }>,
  source: UrlRegistryCommandSource
): EntityUrlRoute => {
  const route = requireTarget(state, target, source)
  if (route.targetType !== "entity") {
    throw new UrlRegistryError(
      "SOURCE_IDENTITY_MISMATCH",
      `Route ${route.id} is not an entity route`
    )
  }
  return route
}

export const requireStaticTarget = (
  state: MemoryRegistryState,
  target: Readonly<{ routeId: string; identity: StaticRouteIdentity }>,
  source: UrlRegistryCommandSource
): StaticUrlRoute => {
  const route = requireTarget(state, target, source)
  if (route.targetType !== "static") {
    throw new UrlRegistryError(
      "SOURCE_IDENTITY_MISMATCH",
      `Route ${route.id} is not a static route`
    )
  }
  return route
}

export const requireSuccessor = (
  state: MemoryRegistryState,
  successor: Readonly<{ routeId: string; identity: UrlRouteIdentity }>
): UrlRoute => {
  const route = state.routes.get(successor.routeId)
  if (!route) {
    throw new UrlRegistryError(
      "NOT_FOUND",
      `Successor route ${successor.routeId} not found`
    )
  }
  assertRouteIdentity(route, successor.identity)
  return route
}

export const assertExpectedVersion = (
  route: UrlRoute,
  expectedVersion: number
) => {
  assertSafeVersion(expectedVersion, "expectedVersion", 1)
  if (route.version !== expectedVersion) {
    throw new UrlRegistryError(
      "VERSION_CONFLICT",
      `Expected route ${route.id} version ${expectedVersion}, found ${route.version}`,
      { routeId: route.id, expectedVersion, actualVersion: route.version }
    )
  }
}

export const assertMutableRoute = (
  route: UrlRoute,
  expectedVersion: number
) => {
  assertExpectedVersion(route, expectedVersion)
  if (route.status !== "active") {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      `Only an active route can be changed; ${route.id} is ${route.status}`
    )
  }
}

export const assertEntityIdentityAvailable = (
  state: MemoryRegistryState,
  market: Market,
  identity: EntityRouteIdentity
) => {
  const key = entityIdentityKey(market, identity)
  if (
    [...state.routes.values()].some(
      (route) =>
        route.targetType === "entity" &&
        entityIdentityKey(route.market, route) === key
    )
  ) {
    throw new UrlRegistryError(
      "IDENTITY_CONFLICT",
      "The stable entity identity is permanently assigned"
    )
  }
}

export const assertStaticIdentityAvailable = (
  state: MemoryRegistryState,
  market: Market,
  identity: StaticRouteIdentity
) => {
  const key = staticIdentityKey(market, identity)
  if (
    [...state.routes.values()].some(
      (route) =>
        route.targetType === "static" &&
        staticIdentityKey(route.market, route) === key
    )
  ) {
    throw new UrlRegistryError(
      "IDENTITY_CONFLICT",
      "The static route key is permanently assigned in this market"
    )
  }
}

export const assertSlugAvailable = (
  state: MemoryRegistryState,
  candidate: Pick<UrlEntitySlug, "market" | "kind" | "normalizedSlug">
) => {
  const key = slugKey(candidate)
  if ([...state.slugs.values()].some((slug) => slugKey(slug) === key)) {
    throw new UrlRegistryError(
      "SLUG_CONFLICT",
      `Slug ${candidate.normalizedSlug} is permanently reserved`
    )
  }
}

export const assertStaticPathAvailable = (
  state: MemoryRegistryState,
  candidate: Pick<StaticRoutePath, "market" | "parentRouteKey" | "segment">
) => {
  const key = staticPathKey(candidate)
  if (
    [...state.staticPaths.values()].some((path) => staticPathKey(path) === key)
  ) {
    throw new UrlRegistryError(
      "STATIC_PATH_CONFLICT",
      `Static segment ${candidate.segment} is permanently reserved under its parent`
    )
  }
}

export const assertEquivalenceAvailable = (
  state: MemoryRegistryState,
  candidate: Readonly<{
    market: Market
    kind: UrlRoute["kind"]
    equivalenceKey: string | null
    excludedRouteId?: string
  }>
) => {
  if (candidate.equivalenceKey === null) {
    return
  }
  assertNonEmpty(candidate.equivalenceKey, "equivalenceKey")
  const conflict = [...state.routes.values()].some(
    (route) =>
      route.id !== candidate.excludedRouteId &&
      route.status === "active" &&
      route.market === candidate.market &&
      route.kind === candidate.kind &&
      route.equivalenceKey === candidate.equivalenceKey
  )
  if (conflict) {
    throw new UrlRegistryError(
      "EQUIVALENCE_CONFLICT",
      `Active equivalence ${candidate.equivalenceKey} is already assigned`
    )
  }
}
