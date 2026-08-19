import type { HeroBannerItem } from "@/components/homepage/homepage.data.types"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import { createUrlRegistrySourceIdentity } from "@/lib/url-registry/source-identity"
import type { CmsHeroBannerItem } from "./cms-hero-carousels"
import type { CmsHeroButtonTarget } from "./cms-types"
import type {
  PublicEntitySlugMap,
  PublicStaticHrefMap,
  RequiredEntityIdentity,
} from "./ssr/public-entity-projection-map"

type EntityButtonTarget = Extract<CmsHeroButtonTarget, { targetType: "entity" }>
export type HeroEntityTargetKind = EntityButtonTarget["sourceType"]

export type CmsHeroProjectionRequirements = Readonly<{
  entityIdentitiesByKind: Readonly<
    Partial<Record<HeroEntityTargetKind, readonly RequiredEntityIdentity[]>>
  >
  staticRouteKeys: readonly string[]
}>

export type CmsHeroProjectionMaps = Readonly<{
  entityPublicSlugsByKind: Readonly<
    Partial<Record<HeroEntityTargetKind, PublicEntitySlugMap>>
  >
  staticHrefsByRouteKey: PublicStaticHrefMap
}>

export const collectCmsHeroProjectionRequirements = (
  banners: readonly CmsHeroBannerItem[]
): CmsHeroProjectionRequirements => {
  const entityIdentitiesByKind: Partial<
    Record<HeroEntityTargetKind, RequiredEntityIdentity[]>
  > = {}
  const staticRouteKeys = new Set<string>()

  for (const banner of banners) {
    const target = banner.buttonTarget
    if (target?.targetType === "entity") {
      const identity = createUrlRegistrySourceIdentity(
        target.sourceType,
        target.sourceId
      )
      if (identity.sourceSystem !== target.sourceSystem) {
        continue
      }
      const identities = entityIdentitiesByKind[target.sourceType] ?? []
      identities.push({
        sourceId: identity.sourceId,
        sourceSystem: identity.sourceSystem,
        sourceType: identity.sourceType,
      })
      entityIdentitiesByKind[target.sourceType] = identities
    } else if (target?.targetType === "static") {
      staticRouteKeys.add(target.staticRouteKey)
    }
  }

  return {
    entityIdentitiesByKind,
    staticRouteKeys: [...staticRouteKeys],
  }
}

export const mapCmsHeroBannersToPublicTargets = (
  banners: readonly CmsHeroBannerItem[],
  projections: CmsHeroProjectionMaps
): SourceReadResult<HeroBannerItem[]> => {
  const projected: HeroBannerItem[] = []

  for (const banner of banners) {
    const { buttonTarget, ...display } = banner
    if (!buttonTarget) {
      projected.push(display)
      continue
    }

    if (buttonTarget.targetType === "static") {
      const href =
        projections.staticHrefsByRouteKey[buttonTarget.staticRouteKey]
      if (!href) {
        return {
          causeCode: "MISSING_HERO_STATIC_PUBLIC_PROJECTION",
          kind: "invalid-response",
        }
      }
      projected.push({
        ...display,
        ctaTarget: { href, kind: "static" },
      })
      continue
    }

    const identity = createUrlRegistrySourceIdentity(
      buttonTarget.sourceType,
      buttonTarget.sourceId
    )
    if (identity.sourceSystem !== buttonTarget.sourceSystem) {
      return {
        causeCode: "INVALID_HERO_ENTITY_SOURCE_IDENTITY",
        kind: "invalid-response",
      }
    }
    const publicSlug =
      projections.entityPublicSlugsByKind[buttonTarget.sourceType]?.[
        buttonTarget.sourceId
      ]
    if (!publicSlug) {
      return {
        causeCode: "MISSING_HERO_ENTITY_PUBLIC_PROJECTION",
        kind: "invalid-response",
      }
    }
    projected.push({
      ...display,
      ctaTarget: { kind: buttonTarget.sourceType, publicSlug },
    })
  }

  return { kind: "found", value: projected }
}
