import "server-only"
import { isRecord, getRecordValue } from "@techsio/std/object"

import type { HeroBannerItem } from "@/components/homepage/homepage-data-types"

import { fetchCmsJson, resolveCmsMediaUrl } from "./cms-client"
import type { CmsHeroCarousel } from "./cms-types"

const CMS_HERO_CAROUSEL_LIMIT = 8
const SAFE_ABSOLUTE_HREF_PROTOCOLS = new Set(["http:", "https:"])

const readString = (record: object, key: string): string | null => {
  const value = getRecordValue(record, key)
  return typeof value === "string" ? value : null
}

const parseCmsHeroCarousel = (value: unknown): CmsHeroCarousel | null => {
  if (!isRecord(value)) {
    return null
  }
  const id = getRecordValue(value, "id")
  if (typeof id !== "string" && typeof id !== "number") {
    return null
  }

  const rawImage = getRecordValue(value, "image")
  let image: CmsHeroCarousel["image"] = null
  if (typeof rawImage === "string") {
    image = rawImage
  } else if (isRecord(rawImage)) {
    image = {
      alt: readString(rawImage, "alt"),
      url: readString(rawImage, "url"),
    }
  }

  return {
    button: readString(value, "button"),
    buttonHref: readString(value, "buttonHref"),
    heading: readString(value, "heading"),
    id,
    image,
    subheading: readString(value, "subheading"),
  }
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

const mapCmsHeroCarouselToHeroBanner = (
  item: CmsHeroCarousel,
): HeroBannerItem | null => {
  const imageSrc = resolveCmsMediaUrl(item.image)
  const href = resolveSafeHeroHref(item.buttonHref)
  const title = cleanString(item.heading)

  if (imageSrc === null || href === null) {
    return null
  }

  const ctaLabel = cleanString(item.button)
  const imageAlt = cleanString(
    typeof item.image === "object" && item.image ? item.image.alt : null,
  )
  const subtitle = cleanString(item.subheading)

  return {
    id: `cms-hero-carousel-${item.id}`,
    ...(title.length > 0 ? { title } : {}),
    ...(subtitle.length > 0 ? { subtitle } : {}),
    ...(ctaLabel.length > 0 ? { ctaLabel } : {}),
    href,
    ...(imageAlt.length > 0 ? { imageAlt } : {}),
    imageSrc,
  }
}

export const fetchCmsHeroBanners = async () => {
  const response = await fetchCmsJson("hero-carousels", {
    limit: CMS_HERO_CAROUSEL_LIMIT,
    sort: "-createdAt",
  })
  if (!isRecord(response)) {
    return []
  }
  const itemsValue = getRecordValue(response, "heroCarousels")
  const rawItems = Array.isArray(itemsValue) ? itemsValue : []

  return rawItems
    .map(parseCmsHeroCarousel)
    .filter((item): item is CmsHeroCarousel => item !== null)
    .map(mapCmsHeroCarouselToHeroBanner)
    .filter((banner): banner is HeroBannerItem => Boolean(banner))
}
