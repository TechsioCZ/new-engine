import "server-only"
import type { HomepagePromoContent } from "@/components/homepage/homepage.data.types"

import { resolveCmsMediaUrl } from "./cms-client"
import { fetchCmsPageBySlug } from "./cms-pages"
import type { CmsMediaValue, CmsPage } from "./cms-types"

const HOMEPAGE_PROMO_PAGE_SLUG = "homepage-promo"

const getMediaAlt = (media: CmsMediaValue) =>
  typeof media === "object" ? (media?.alt?.trim() ?? undefined) : undefined

export const mapCmsPageToHomepagePromo = (
  page: CmsPage | null,
): HomepagePromoContent | null => {
  const heading = page?.title?.trim()
  const contentHtml = page?.content?.trim()

  if (
    heading === undefined ||
    heading.length === 0 ||
    contentHtml === undefined ||
    contentHtml.length === 0
  ) {
    return null
  }

  const image = page?.meta?.image
  const imageSrc = resolveCmsMediaUrl(image) ?? undefined

  const imageAlt = getMediaAlt(image)
  return {
    contentHtml,
    heading,
    ...(imageAlt === undefined ? {} : { imageAlt }),
    ...(imageSrc === undefined ? {} : { imageSrc }),
  }
}

export const fetchCmsHomepagePromo = async () =>
  mapCmsPageToHomepagePromo(await fetchCmsPageBySlug(HOMEPAGE_PROMO_PAGE_SLUG))
