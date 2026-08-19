import {
  assertPublicPathCollisionFree,
  type PublicPathClaim,
} from "@/lib/url/path-collision"
import { buildPath } from "@/lib/url/public-url"
import type { UrlRegistry } from "../contracts"
import {
  POPULATION_ENTITY_KINDS,
  POPULATION_MARKETS,
  type PopulationManifest,
} from "./manifest-contracts"
import { type PopulationStaticRoute, staticRoutePath } from "./static-taxonomy"

const entityKey = (entity: PopulationManifest["entities"][number]) =>
  `${entity.market}:${entity.kind}:${entity.sourceId}`

const staticKey = (route: PopulationStaticRoute) =>
  `${route.market}:static:${route.routeKey}`

export const assertPopulationPaths = (
  manifest: PopulationManifest,
  statics: readonly PopulationStaticRoute[]
) => {
  const pathClaims: readonly PublicPathClaim[] = [
    ...manifest.entities.map((entity) => ({
      claimId: `population:${entityKey(entity)}`,
      claimKind: "current-slug" as const,
      market: entity.market,
      owner: {
        equivalenceKey: entity.equivalenceKey,
        routeId: entityKey(entity),
        routeKind: entity.kind,
        sourceId: entity.sourceId,
        sourceKind: entity.kind,
      },
      path: buildPath(
        { kind: entity.kind, slug: entity.publicSlug },
        entity.market
      ),
    })),
    ...statics.map((route) => ({
      claimId: `population:${staticKey(route)}`,
      claimKind:
        route.matchMode === "prefix"
          ? ("prefix" as const)
          : ("static" as const),
      market: route.market,
      owner: {
        equivalenceKey: route.equivalenceKey,
        routeId: staticKey(route),
        routeKind: "static",
        sourceId: route.routeKey,
        sourceKind: "route-taxonomy",
      },
      path: staticRoutePath(route, statics),
    })),
  ]
  assertPublicPathCollisionFree({ pathClaims })
}

export const readAllActivePopulationEntityKeys = async (
  registry: UrlRegistry
): Promise<readonly string[]> => {
  const keys: string[] = []
  for (const market of POPULATION_MARKETS) {
    for (const kind of POPULATION_ENTITY_KINDS) {
      let cursor: string | undefined
      do {
        const page = await registry.listActiveEntityRoutes({
          cursor,
          kind,
          limit: 100,
          market,
        })
        if (page.kind !== "found") {
          throw new Error(
            `Cannot enumerate active URLR routes for ${market}:${kind}`
          )
        }
        keys.push(
          ...page.value.items.map(
            ({ route }) => `${route.market}:${route.kind}:${route.sourceId}`
          )
        )
        cursor = page.value.nextCursor ?? undefined
      } while (cursor)
    }
  }
  return keys
}

export const readActivePopulationStaticKeys = async (registry: UrlRegistry) => {
  const keys: string[] = []
  for (const market of POPULATION_MARKETS) {
    const result = await registry.listStaticRouteSnapshots(market)
    if (result.kind === "found") {
      keys.push(
        ...result.value
          .filter(({ route }) => route.status === "active")
          .map(({ route }) => `${market}:static:${route.staticRouteKey}`)
      )
    }
  }
  return keys
}
