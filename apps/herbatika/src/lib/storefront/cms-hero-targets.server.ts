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

  const entityPublicSlugsByKind: Partial<
    Record<HeroEntityTargetKind, PublicEntitySlugMap>
  > = {}
  for (const [index, [kind]] of entityEntries.entries()) {
    const result = entityResults[index]
    if (!result || result.kind !== "found") {
      return (
        result ?? {
          causeCode: "MISSING_HERO_ENTITY_PUBLIC_PROJECTION_RESULT",
          kind: "invalid-response" as const,
        }
      )
    }
    entityPublicSlugsByKind[kind] = result.value
  }
  if (staticResult.kind !== "found") {
    return staticResult
  }

  return mapCmsHeroBannersToPublicTargets(banners, {
    entityPublicSlugsByKind,
    staticHrefsByRouteKey: staticResult.value,
  })
}
