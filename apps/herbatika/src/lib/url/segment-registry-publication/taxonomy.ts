import type { Market, StaticRootPageKey } from "@/lib/url/types"
import {
  buildPopulationStaticTaxonomy,
  hashPopulationStaticTaxonomy,
} from "@/lib/url-registry/population/static-taxonomy"

export type RequiredPublicationRoute = Readonly<{
  routeKey: string
  staticPageKey: StaticRootPageKey
}>

export const currentPublicationTaxonomySha256 = (): string =>
  hashPopulationStaticTaxonomy().slice("sha256:".length)

export const requiredPublicationRoutes = (
  market: Market
): readonly RequiredPublicationRoute[] =>
  buildPopulationStaticTaxonomy()
    .filter(
      (route) =>
        route.market === market &&
        route.parentRouteKey === null &&
        route.indexPolicy === "indexable" &&
        route.routeKey.startsWith("root:")
    )
    .map((route) => ({
      routeKey: route.routeKey,
      staticPageKey: route.routeKey.slice("root:".length) as StaticRootPageKey,
    }))
    .sort((left, right) => left.routeKey.localeCompare(right.routeKey, "en"))
