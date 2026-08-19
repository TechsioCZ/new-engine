import type { Market } from "@/lib/url/types"
import { UrlRegistryError } from "./errors"
import { staticSnapshot } from "./memory-snapshot"
import type { MemoryRegistryState } from "./memory-state"
import type { StaticUrlRoute } from "./model"

const findStaticRoute = (
  state: MemoryRegistryState,
  market: Market,
  routeKey: string
): StaticUrlRoute | undefined =>
  [...state.routes.values()].find(
    (route): route is StaticUrlRoute =>
      route.targetType === "static" &&
      route.market === market &&
      route.staticRouteKey === routeKey
  )

export const assertStaticParent = (
  state: MemoryRegistryState,
  market: Market,
  routeKey: string,
  parentRouteKey: string | null
) => {
  const visited = new Set([routeKey])
  let nextParent = parentRouteKey
  while (nextParent !== null) {
    if (visited.has(nextParent)) {
      throw new UrlRegistryError(
        "INVALID_TRANSITION",
        "A static parent change would create a cycle"
      )
    }
    visited.add(nextParent)
    const parent = findStaticRoute(state, market, nextParent)
    if (!parent || parent.status !== "active") {
      throw new UrlRegistryError(
        "INVALID_TRANSITION",
        `Static parent ${nextParent} is missing or inactive`
      )
    }
    nextParent = staticSnapshot(state, parent).currentPath.parentRouteKey
  }
}

export const assertNoActiveStaticChildren = (
  state: MemoryRegistryState,
  route: StaticUrlRoute
) => {
  const hasChild = [...state.routes.values()].some(
    (candidate) =>
      candidate.targetType === "static" &&
      candidate.market === route.market &&
      candidate.status === "active" &&
      staticSnapshot(state, candidate).currentPath.parentRouteKey ===
        route.staticRouteKey
  )
  if (hasChild) {
    throw new UrlRegistryError(
      "INVALID_TRANSITION",
      `Static route ${route.staticRouteKey} has active children`
    )
  }
}
