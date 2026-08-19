import type { Market } from "@/lib/url/types"
import {
  assertActiveRoutePageLimit,
  decodeActiveRouteCursor,
  encodeActiveRouteCursor,
} from "./active-route-page"
import {
  entitySnapshot,
  snapshotRoute,
  staticSnapshot,
} from "./memory-snapshot"
import {
  cloneValue,
  entityIdentityKey,
  type MemoryRegistryState,
} from "./memory-state"
import { compareText } from "./memory-support"
import {
  assertMarket,
  assertNonEmpty,
  assertRouteKind,
} from "./memory-validation"
import type {
  ActiveEntityRouteTarget,
  ActiveRouteTarget,
  EntityRouteIdentity,
  EntityRouteSnapshot,
  EntityUrlRoute,
  StaticRouteSnapshot,
  StaticUrlRoute,
  UrlRouteSnapshot,
} from "./model"
import type {
  ActiveEquivalenceLookup,
  ActiveEntityRoutePageRequest,
  EntityIdentityLookup,
  SourceReadResult,
  UrlRegistryPage,
} from "./reads"

export const findActiveEntityRoute = (
  state: MemoryRegistryState,
  input: EntityIdentityLookup
): SourceReadResult<ActiveEntityRouteTarget> => {
  assertMarket(input.market)
  assertNonEmpty(input.sourceSystem, "sourceSystem")
  assertNonEmpty(input.sourceType, "sourceType")
  assertNonEmpty(input.sourceId, "sourceId")
  const identity: EntityRouteIdentity = {
    targetType: "entity",
    sourceSystem: input.sourceSystem,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    staticRouteKey: null,
  }
  const key = entityIdentityKey(input.market, identity)
  const route = [...state.routes.values()].find(
    (candidate): candidate is EntityUrlRoute =>
      candidate.targetType === "entity" &&
      candidate.status === "active" &&
      entityIdentityKey(candidate.market, candidate) === key
  )
  if (!route) {
    return { kind: "missing" }
  }
  const snapshot = entitySnapshot(state, route)
  return {
    kind: "found",
    value: cloneValue({
      projectionType: "entity",
      route: snapshot.route,
      currentSlug: snapshot.currentSlug,
    }),
  }
}

export const listActiveEntityRoutes = (
  state: MemoryRegistryState,
  input: ActiveEntityRoutePageRequest
): SourceReadResult<UrlRegistryPage<ActiveEntityRouteTarget>> => {
  assertMarket(input.market)
  assertRouteKind(input.kind)
  assertActiveRoutePageLimit(input.limit)
  const afterId = decodeActiveRouteCursor(input.cursor)
  const routes = [...state.routes.values()]
    .filter(
      (route): route is EntityUrlRoute =>
        route.targetType === "entity" &&
        route.market === input.market &&
        route.kind === input.kind &&
        route.status === "active" &&
        (afterId === null || compareText(route.id, afterId) > 0)
    )
    .sort((left, right) => compareText(left.id, right.id))
    .slice(0, input.limit + 1)
  const hasNext = routes.length > input.limit
  const pageRoutes = routes.slice(0, input.limit)
  const items = pageRoutes.map((route): ActiveEntityRouteTarget => {
    const snapshot = entitySnapshot(state, route)
    return {
      projectionType: "entity",
      route: snapshot.route,
      currentSlug: snapshot.currentSlug,
    }
  })
  return {
    kind: "found",
    value: cloneValue({
      items,
      nextCursor:
        hasNext && pageRoutes.length > 0
          ? encodeActiveRouteCursor(pageRoutes.at(-1)?.id as string)
          : null,
    }),
  }
}

export const findEntityRoute = (
  state: MemoryRegistryState,
  input: EntityIdentityLookup
): SourceReadResult<EntityRouteSnapshot> => {
  assertMarket(input.market)
  assertNonEmpty(input.sourceSystem, "sourceSystem")
  assertNonEmpty(input.sourceType, "sourceType")
  assertNonEmpty(input.sourceId, "sourceId")
  const identity: EntityRouteIdentity = {
    targetType: "entity",
    sourceSystem: input.sourceSystem,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    staticRouteKey: null,
  }
  const key = entityIdentityKey(input.market, identity)
  const route = [...state.routes.values()].find(
    (candidate): candidate is EntityUrlRoute =>
      candidate.targetType === "entity" &&
      entityIdentityKey(candidate.market, candidate) === key
  )
  return route
    ? { kind: "found", value: cloneValue(entitySnapshot(state, route)) }
    : { kind: "missing" }
}

export const findActiveEquivalents = (
  state: MemoryRegistryState,
  input: ActiveEquivalenceLookup
): SourceReadResult<readonly ActiveRouteTarget[]> => {
  assertRouteKind(input.kind)
  assertNonEmpty(input.equivalenceKey, "equivalenceKey")
  const routes = [...state.routes.values()]
    .filter(
      (route) =>
        route.status === "active" &&
        route.kind === input.kind &&
        route.equivalenceKey === input.equivalenceKey
    )
    .sort(
      (left, right) =>
        compareText(left.market, right.market) || compareText(left.id, right.id)
    )
  if (routes.length === 0) {
    return { kind: "missing" }
  }
  if (routes.length > 4) {
    return {
      kind: "invalid-response",
      causeCode: "EQUIVALENCE_MARKET_LIMIT_EXCEEDED",
    }
  }
  const value = routes.map((route): ActiveRouteTarget => {
    const snapshot = snapshotRoute(state, route)
    return snapshot.projectionType === "entity"
      ? {
          projectionType: "entity",
          route: snapshot.route,
          currentSlug: snapshot.currentSlug,
        }
      : {
          projectionType: "static",
          route: snapshot.route,
          currentPath: snapshot.currentPath,
        }
  })
  return { kind: "found", value: cloneValue(value) }
}

export const listStaticRouteSnapshots = (
  state: MemoryRegistryState,
  market: Market
): SourceReadResult<readonly StaticRouteSnapshot[]> => {
  assertMarket(market)
  const value = [...state.routes.values()]
    .filter(
      (route): route is StaticUrlRoute =>
        route.targetType === "static" && route.market === market
    )
    .sort((left, right) =>
      compareText(left.staticRouteKey, right.staticRouteKey)
    )
    .map((route) => staticSnapshot(state, route))
  return { kind: "found", value: cloneValue(value) }
}

export const getRoute = (
  state: MemoryRegistryState,
  routeId: string
): SourceReadResult<UrlRouteSnapshot> => {
  assertNonEmpty(routeId, "routeId")
  const route = state.routes.get(routeId)
  return route
    ? { kind: "found", value: cloneValue(snapshotRoute(state, route)) }
    : { kind: "missing" }
}
