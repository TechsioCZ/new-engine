import type { HeroBannerItem } from "@/components/homepage/homepage.data.types"
import { fetchCmsJson, resolveCmsMediaUrl } from "./cms-client"
import type { CmsHeroCarousel } from "./cms-types"

const CMS_HERO_CAROUSEL_LIMIT = 8
const SAFE_ABSOLUTE_HREF_PROTOCOLS = new Set(["http:", "https:"])

type CmsHeroCarouselsResponse = {
  heroCarousels?: CmsHeroCarousel[] | null
}

const cleanString = (value: string | null | undefined) => value?.trim() ?? ""

const resolveSafeHeroHref = (value: string | null | undefined) => {
  const href = cleanString(value)

  if (!href) {
    return null
  }

  if (href.startsWith("/")) {
    return href.startsWith("//") ? null : href
  }

  try {
    const url = new URL(href)
    return SAFE_ABSOLUTE_HREF_PROTOCOLS.has(url.protocol)
      ? url.toString()
      : null
  } catch {
    return null
  }
}

export const mapCmsHeroCarouselToHeroBanner = (
  item: CmsHeroCarousel
): HeroBannerItem | null => {
  const imageSrc = resolveCmsMediaUrl(item.image)
  const href = resolveSafeHeroHref(item.buttonHref)
  const title = cleanString(item.heading)

  if (!(imageSrc && href)) {
    return null
  }

  const ctaLabel = cleanString(item.button)
  const imageAlt = cleanString(
    typeof item.image === "object" && item.image ? item.image.alt : null
  )
  const subtitle = cleanString(item.subheading)

  return {
    id: `cms-hero-carousel-${item.id}`,
    ...(title ? { title } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(ctaLabel ? { ctaLabel } : {}),
    href,
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
