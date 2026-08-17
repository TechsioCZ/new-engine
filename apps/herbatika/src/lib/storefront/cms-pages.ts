import { fetchCmsJson } from "./cms-client"
import { rewriteCmsHtmlMediaUrls } from "./cms-content"
import type { CmsLocale } from "./cms-locale"
import type { CmsPage } from "./cms-types"

type CmsPageResponse = {
  page?: CmsPage | null
}

export const fetchCmsPageBySlug = async (slug: string, locale: CmsLocale) => {
  const response = await fetchCmsJson<CmsPageResponse>(
    `pages/${encodeURIComponent(slug)}`,
    { locale }
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
