// Pages Router rejects the App-Router-only `server-only` marker. CMS callers
// must remain in server entry points and always provide an explicit locale.

import type { HeroBannerItem } from "@/components/homepage/homepage.data.types"
import { fetchCmsJson } from "./cms-client"
import { resolveCmsMediaUrl } from "./cms-content"
import type { CmsHeroButtonTarget, CmsHeroCarousel } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"

const CMS_HERO_CAROUSEL_LIMIT = 8

type CmsHeroCarouselsResponse = {
  heroCarousels?: CmsHeroCarousel[] | null
}

export type CmsHeroBannerItem = Omit<HeroBannerItem, "ctaTarget"> & {
  buttonTarget?: CmsHeroButtonTarget
}

const cleanString = (value: string | null | undefined) => value?.trim() ?? ""

const normalizeButtonTarget = (
  target: CmsHeroButtonTarget | null | undefined
): CmsHeroButtonTarget | null => {
  if (target?.targetType === "static") {
    return target
  }
  if (target?.targetType !== "entity") {
    return null
  }
  const sourceId = cleanString(target.sourceId)
  return sourceId ? { ...target, sourceId } : null
}

export const mapCmsHeroCarouselToHeroBanner = (
  item: CmsHeroCarousel
): CmsHeroBannerItem | null => {
  const imageSrc = resolveCmsMediaUrl(item.image)
  const title = cleanString(item.heading)

  if (!imageSrc) {
    return null
  }

  const ctaLabel = cleanString(item.button)
  const imageAlt = cleanString(
    typeof item.image === "object" && item.image ? item.image.alt : null
  )
  const subtitle = cleanString(item.subheading)
  const buttonTarget = normalizeButtonTarget(item.buttonTarget)

  return {
    id: `cms-hero-carousel-${item.id}`,
    ...(title ? { title } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(ctaLabel ? { ctaLabel } : {}),
    ...(buttonTarget ? { buttonTarget } : {}),
    ...(imageAlt ? { imageAlt } : {}),
    imageSrc,
  }
}

export const fetchCmsHeroBanners = async (locale?: HerbatikaLocale) => {
  const response = await fetchCmsJson<CmsHeroCarouselsResponse>(
    "hero-carousels",
    {
      params: {
        limit: CMS_HERO_CAROUSEL_LIMIT,
        sort: "-createdAt",
      },
      locale,
    }
  )

  return (response?.heroCarousels ?? [])
    .map(mapCmsHeroCarouselToHeroBanner)
    .filter((banner): banner is CmsHeroBannerItem => Boolean(banner))
}
