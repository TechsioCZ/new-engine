import type { HomepagePromoContent } from "@/components/homepage/homepage.data.types"
import { assertServerOnly } from "@/lib/server-guard"
import { resolveCmsMediaUrl } from "./cms-client"
import { fetchCmsPageBySlug } from "./cms-pages"
import type { CmsMedia, CmsPage } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"

assertServerOnly("storefront/cms-homepage-promo")

const HOMEPAGE_PROMO_PAGE_SLUG = "homepage-promo"

const getMediaAlt = (media: CmsMedia | string | null | undefined) =>
  typeof media === "object" ? (media?.alt?.trim() ?? undefined) : undefined

export const mapCmsPageToHomepagePromo = (
  page: CmsPage | null
): HomepagePromoContent | null => {
  const heading = page?.title?.trim()
  const contentHtml = page?.content?.trim()

  if (!(heading && contentHtml)) {
    return null
  }

  const image = page?.meta?.image
  const imageSrc = resolveCmsMediaUrl(image) ?? undefined

  return {
    contentHtml,
    heading,
    imageAlt: getMediaAlt(image),
    imageSrc,
  }
}

export const fetchCmsHomepagePromo = async (locale: HerbatikaLocale) =>
  mapCmsPageToHomepagePromo(
    await fetchCmsPageBySlug(HOMEPAGE_PROMO_PAGE_SLUG, locale)
  )
