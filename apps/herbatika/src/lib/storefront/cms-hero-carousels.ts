import type { HeroBannerItem } from "@/components/homepage/homepage.data.types"
import { fetchCmsJson, resolveCmsMediaUrl } from "./cms-client"
import type { CmsHeroCarousel } from "./cms-types"

const CMS_HERO_CAROUSEL_LIMIT = 8
const DEFAULT_HERO_HREF = "/"

type CmsHeroCarouselsResponse = {
  heroCarousels?: CmsHeroCarousel[] | null
}

const cleanString = (value: string | null | undefined) => value?.trim() ?? ""

export const mapCmsHeroCarouselToHeroBanner = (
  item: CmsHeroCarousel
): HeroBannerItem | null => {
  const imageSrc = resolveCmsMediaUrl(item.image)
  const title = cleanString(item.heading)

  if (!(imageSrc && title)) {
    return null
  }

  const ctaLabel = cleanString(item.button)
  const href = cleanString(item.buttonHref)
  const imageAlt = cleanString(
    typeof item.image === "object" && item.image ? item.image.alt : null
  )
  const subtitle = cleanString(item.subheading)

  return {
    id: `cms-hero-carousel-${item.id}`,
    title,
    ...(subtitle ? { subtitle } : {}),
    ...(ctaLabel ? { ctaLabel } : {}),
    href: href || DEFAULT_HERO_HREF,
    ...(imageAlt ? { imageAlt } : {}),
    imageSrc,
  }
}

export const fetchCmsHeroBanners = async () => {
  const response = await fetchCmsJson<CmsHeroCarouselsResponse>(
    "hero-carousels",
    {
      limit: CMS_HERO_CAROUSEL_LIMIT,
      sort: "-createdAt",
    }
  )

  return (response?.heroCarousels ?? [])
    .map(mapCmsHeroCarouselToHeroBanner)
    .filter((banner): banner is HeroBannerItem => Boolean(banner))
}
