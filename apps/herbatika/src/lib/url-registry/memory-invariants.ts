import { UrlRegistryError } from "./errors"
import { assertCommandArtifacts } from "./memory-artifact-invariants"
import { entitySnapshot, staticSnapshot } from "./memory-snapshot"
import {
  entityIdentityKey,
  type MemoryRegistryState,
  slugKey,
  staticIdentityKey,
  staticPathKey,
} from "./memory-state"
import { assertSafeVersion } from "./memory-validation"
import type {
  StaticRoutePath,
  StaticUrlRoute,
  UrlEntitySlug,
  UrlRoute,
} from "./model"

const assertRouteLifecycle = (state: MemoryRegistryState, route: UrlRoute) => {
  if (route.status !== "superseded") {
    if (route.successorRouteId !== null) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `${route.status} route ${route.id} cannot have a successor`
      )
    }
    return
  }
  const successor = route.successorRouteId
    ? state.routes.get(route.successorRouteId)
    : undefined
  if (
    !successor ||
    successor.status !== "active" ||
    successor.market !== route.market ||
    successor.targetType !== route.targetType ||
    successor.kind !== route.kind
  ) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      `Superseded route ${route.id} must point directly to an active same-kind route`
    )
  }
}

const assertStaticParentGraph = (
  state: MemoryRegistryState,
  route: StaticUrlRoute,
  currentPath: StaticRoutePath
) => {
  const visited = new Set([route.staticRouteKey])
  let parentKey = currentPath.parentRouteKey
  while (parentKey !== null) {
    if (visited.has(parentKey)) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Static route ${route.staticRouteKey} has a parent cycle`
      )
    }
    visited.add(parentKey)
    const parent = [...state.routes.values()].find(
      (candidate): candidate is StaticUrlRoute =>
        candidate.targetType === "static" &&
        candidate.market === route.market &&
        candidate.staticRouteKey === parentKey
    )
    if (!parent || (route.status === "active" && parent.status !== "active")) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Static parent ${parentKey} must exist and be active for an active child`
      )
    }
    parentKey = staticSnapshot(state, parent).currentPath.parentRouteKey
  }
}

const assertRouteProjection = (state: MemoryRegistryState, route: UrlRoute) => {
  if (route.targetType === "entity") {
    entitySnapshot(state, route)
    return
  }
  const snapshot = staticSnapshot(state, route)
  if (snapshot.currentPath.introducedInVersion > route.version) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      `Static route ${route.id} has a path from a future route version`
    )
  }
  assertStaticParentGraph(state, route, snapshot.currentPath)
}

const assertRoutes = (state: MemoryRegistryState) => {
  const identities = new Set<string>()
  const equivalences = new Set<string>()
  for (const [storedId, route] of state.routes) {
    if (storedId !== route.id) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Route map key ${storedId} does not match record ID ${route.id}`
      )
    }
    assertSafeVersion(route.version, `route ${route.id} version`, 1)
    const identity =
      route.targetType === "entity"
        ? entityIdentityKey(route.market, route)
        : staticIdentityKey(route.market, route)
    if (identities.has(identity)) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Stable identity ${identity} is assigned more than once`
      )
    }
    identities.add(identity)
    if (route.status === "active" && route.equivalenceKey !== null) {
      const key = JSON.stringify([
        route.market,
        route.kind,
        route.equivalenceKey,
      ])
      if (equivalences.has(key)) {
        throw new UrlRegistryError(
          "INVARIANT_VIOLATION",
          `Active equivalence ${key} is assigned more than once`
        )
      }
      equivalences.add(key)
    }
    assertRouteLifecycle(state, route)
    assertRouteProjection(state, route)
  }
}

const assertAttachedSlug = (
  state: MemoryRegistryState,
  slug: UrlEntitySlug
) => {
  const route = slug.routeId ? state.routes.get(slug.routeId) : undefined
  if (
    !route ||
    route.targetType !== "entity" ||
    route.market !== slug.market ||
    route.kind !== slug.kind
  ) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      `Slug ${slug.id} must belong to one same-market entity route`
    )
  }
}

const assertSlugs = (state: MemoryRegistryState) => {
  const paths = new Set<string>()
  for (const [storedId, slug] of state.slugs) {
    if (storedId !== slug.id) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Slug map key ${storedId} does not match record ID ${slug.id}`
      )
    }
    const key = slugKey(slug)
    if (paths.has(key)) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Entity slug ${key} is reserved more than once`
      )
    }
    paths.add(key)
    if (slug.disposition === "gone" && slug.routeId === null) {
      continue
    }
    assertAttachedSlug(state, slug)
  }
}

const findStaticRoute = (
  state: MemoryRegistryState,
  path: StaticRoutePath
): StaticUrlRoute | undefined =>
  [...state.routes.values()].find(
    (candidate): candidate is StaticUrlRoute =>
      candidate.targetType === "static" &&
      candidate.market === path.market &&
      candidate.staticRouteKey === path.routeKey
  )

const assertStaticPaths = (state: MemoryRegistryState) => {
  const paths = new Set<string>()
  for (const [storedId, path] of state.staticPaths) {
    if (storedId !== path.id) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Static path map key ${storedId} does not match record ID ${path.id}`
      )
    }
    assertSafeVersion(path.introducedInVersion, "introducedInVersion", 1)
    const key = staticPathKey(path)
    if (paths.has(key)) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Static path ${key} is reserved more than once`
      )
    }
    paths.add(key)
    const route = findStaticRoute(state, path)
    if (!route || path.introducedInVersion > route.version) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        `Static path ${path.id} has no valid matching route version`
      )
    }
  }
}

export const assertMemoryInvariants = (state: MemoryRegistryState) => {
  assertRoutes(state)
  assertSlugs(state)
  assertStaticPaths(state)
  assertCommandArtifacts(state)
}
