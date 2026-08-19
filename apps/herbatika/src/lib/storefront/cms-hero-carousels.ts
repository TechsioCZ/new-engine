// Pages Router rejects the App-Router-only `server-only` marker. CMS callers
// must remain in server entry points and always provide an explicit locale.

import type { HeroBannerItem } from "@/components/homepage/homepage.data.types"
import { fetchCmsJson } from "./cms-client"
import { resolveCmsMediaUrl } from "./cms-content"
import type { CmsHeroButtonTarget, CmsHeroCarousel } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"

const CMS_HERO_CAROUSEL_LIMIT = 8
const LEGACY_HERO_QUERY_OR_FRAGMENT = /[?#]/
const TRAILING_SLASHES = /\/+$/
const LEGACY_STATIC_HERO_TARGETS = new Map<
  string,
  Extract<CmsHeroButtonTarget, { targetType: "static" }>["staticRouteKey"]
>([
  ["/o-nas", "root:about"],
  ["/rolunk", "root:about"],
  ["/despre-noi", "root:about"],
  ["/kontakt", "root:contact"],
  ["/kapcsolat", "root:contact"],
  ["/contact", "root:contact"],
  ["/casto-kladene-otazky", "root:faq"],
  ["/caste-dotazy", "root:faq"],
  ["/gyakori-kerdesek", "root:faq"],
  ["/intrebari-frecvente", "root:faq"],
  ["/doprava", "root:shipping"],
  ["/szallitas", "root:shipping"],
  ["/livrare", "root:shipping"],
  ["/vratenie-tovaru", "root:returns"],
  ["/vraceni-zbozi", "root:returns"],
  ["/visszakuldes", "root:returns"],
  ["/retururi", "root:returns"],
  ["/obchodne-podmienky", "root:terms"],
  ["/obchodni-podminky", "root:terms"],
  ["/altalanos-szerzodesi-feltetelek", "root:terms"],
  ["/termeni-si-conditii", "root:terms"],
  ["/ochrana-osobnych-udajov", "root:privacy"],
  ["/ochrana-osobnich-udaju", "root:privacy"],
  ["/adatvedelmi-tajekoztato", "root:privacy"],
  ["/politica-de-confidentialitate", "root:privacy"],
  ["/cookies", "root:cookies"],
  ["/cookie-tajekoztato", "root:cookies"],
  ["/politica-cookies", "root:cookies"],
])

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

const normalizeLegacyStaticButtonTarget = (
  value: string | null | undefined
): CmsHeroButtonTarget | null => {
  const rawPath = cleanString(value)
  if (!rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return null
  }
  const path = (rawPath.split(LEGACY_HERO_QUERY_OR_FRAGMENT, 1)[0] ?? "")
    .replace(TRAILING_SLASHES, "")
    .toLowerCase()
  const staticRouteKey = LEGACY_STATIC_HERO_TARGETS.get(path)

  return staticRouteKey ? { staticRouteKey, targetType: "static" } : null
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
  const buttonTarget =
    normalizeButtonTarget(item.buttonTarget) ??
    normalizeLegacyStaticButtonTarget(item.buttonHref)

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
