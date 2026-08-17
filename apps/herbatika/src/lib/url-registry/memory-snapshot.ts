import { UrlRegistryError } from "./errors"
import { cloneValue, type MemoryRegistryState } from "./memory-state"
import type {
  EntityRouteSnapshot,
  EntityUrlRoute,
  StaticRouteSnapshot,
  StaticUrlRoute,
  UrlRoute,
  UrlRouteSnapshot,
} from "./model"

export const entitySnapshot = (
  state: MemoryRegistryState,
  route: EntityUrlRoute
): EntityRouteSnapshot => {
  const history = [...state.slugs.values()].filter(
    (slug) => slug.routeId === route.id
  )
  const currentSlugs = history.filter((slug) => slug.disposition === "current")
  if (currentSlugs.length !== 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      `Entity route ${route.id} must have exactly one current slug`
    )
  }
  return {
    projectionType: "entity",
    route: cloneValue(route),
    currentSlug: cloneValue(currentSlugs[0]),
    slugHistory: cloneValue(history),
  }
}

export const staticSnapshot = (
  state: MemoryRegistryState,
  route: StaticUrlRoute
): StaticRouteSnapshot => {
  const history = [...state.staticPaths.values()].filter(
    (path) =>
      path.market === route.market && path.routeKey === route.staticRouteKey
  )
  const currentPaths = history.filter((path) => path.disposition === "current")
  if (currentPaths.length !== 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      `Static route ${route.id} must have exactly one current path`
    )
  }
  return {
    projectionType: "static",
    route: cloneValue(route),
    currentPath: cloneValue(currentPaths[0]),
    pathHistory: cloneValue(history),
  }
}

export const snapshotRoute = (
  state: MemoryRegistryState,
  route: UrlRoute
): UrlRouteSnapshot =>
  route.targetType === "entity"
    ? entitySnapshot(state, route)
    : staticSnapshot(state, route)

export const asEntitySnapshot = (
  snapshot: UrlRouteSnapshot
): EntityRouteSnapshot => {
  if (snapshot.projectionType !== "entity") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      `Expected entity snapshot for route ${snapshot.route.id}`
    )
  }
  return snapshot
}

export const asStaticSnapshot = (
  snapshot: UrlRouteSnapshot
): StaticRouteSnapshot => {
  if (snapshot.projectionType !== "static") {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      `Expected static snapshot for route ${snapshot.route.id}`
    )
  }
  return snapshot
}
