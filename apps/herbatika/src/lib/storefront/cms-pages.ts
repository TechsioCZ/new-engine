import { fetchCmsJson } from "./cms-client"
import { rewriteCmsHtmlMediaUrls } from "./cms-content"
import type { CmsPage } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"

type CmsPageResponse = {
  page?: CmsPage | null
}

export const fetchCmsPageBySlug = async (
  slug: string,
  locale: HerbatikaLocale
) => {
  const response = await fetchCmsJson<CmsPageResponse>(
    `pages/${encodeURIComponent(slug)}`,
    locale
  )
  const page = response?.page

  if (!(page?.slug && page.title)) {
    return null
  }

  return {
    ...page,
    content: rewriteCmsHtmlMediaUrls(page.content ?? ""),
  }
}
