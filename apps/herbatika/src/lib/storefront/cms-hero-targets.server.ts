// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import type { Market } from "@/lib/url/types"
import type { CmsHeroBannerItem } from "./cms-hero-carousels"
import {
  collectCmsHeroProjectionRequirements,
  type HeroEntityTargetKind,
  mapCmsHeroBannersToPublicTargets,
} from "./cms-hero-targets"
import type { PublicEntitySlugMap } from "./ssr/public-entity-projection-map"
import {
  readRequiredPublicEntitySlugs,
  readRequiredPublicStaticHrefs,
} from "./ssr/public-entity-projections"

export const hydrateCmsHeroBannerTargets = async (
  banners: readonly CmsHeroBannerItem[],
  market: Market
) => {
  const requirements = collectCmsHeroProjectionRequirements(banners)
  const entityEntries = Object.entries(requirements.entityIdentitiesByKind) as [
    HeroEntityTargetKind,
    NonNullable<
      (typeof requirements.entityIdentitiesByKind)[HeroEntityTargetKind]
    >,
  ][]
  const [entityResults, staticResult] = await Promise.all([
    Promise.all(
      entityEntries.map(([kind, requiredSourceIdentities]) =>
        readRequiredPublicEntitySlugs({
          kind,
          market,
          requiredSourceIdentities,
        })
      )
    ),
    requirements.staticRouteKeys.length
      ? readRequiredPublicStaticHrefs({
          market,
          requiredRouteKeys: requirements.staticRouteKeys,
        })
      : Promise.resolve({ kind: "found" as const, value: {} }),
  ])

  // Projection reads are best-effort: an unavailable registry projection
  // degrades the affected banners to link-free display instead of failing
  // the homepage.
  const entityPublicSlugsByKind: Partial<
    Record<HeroEntityTargetKind, PublicEntitySlugMap>
  > = {}
  for (const [index, [kind]] of entityEntries.entries()) {
    const result = entityResults[index]
    entityPublicSlugsByKind[kind] = result?.kind === "found" ? result.value : {}
  }

  return mapCmsHeroBannersToPublicTargets(banners, {
    entityPublicSlugsByKind,
    staticHrefsByRouteKey:
      staticResult.kind === "found" ? staticResult.value : {},
  })
}
