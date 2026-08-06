import { fetchCmsJson, rewriteCmsHtmlMediaUrls } from "./cms-client"
import type { CmsPage } from "./cms-types"
import type { HerbatikaLocale } from "./market-context"
import { getMarketServerContext } from "./market-context.server"

type CmsPageResponse = {
  page?: CmsPage | null
}

const normalizeCmsPage = (page: CmsPage | null | undefined) => {
  if (!(page?.id && page.title)) {
    return null
  }

  return {
    ...page,
    content: rewriteCmsHtmlMediaUrls(page.content ?? ""),
  }
}

/**
 * Seed/sync-only slug reader. Public routing resolves URLR.entityId and must
 * use fetchCmsPageById so Payload slug renames cannot break content loading.
 */
export const fetchCmsPageBySlug = async (slug: string) => {
  const marketContext = await getMarketServerContext()
  const response = await fetchCmsJson<CmsPageResponse>(
    `pages/${encodeURIComponent(slug)}`,
    marketContext.locale
  )

  return normalizeCmsPage(response?.page)
}

/** Load published page content by stable Payload document ID and market locale. */
export const fetchCmsPageById = async (
  id: string | number,
  locale: HerbatikaLocale
) => {
  const response = await fetchCmsJson<CmsPageResponse>(
    `pages/by-id/${encodeURIComponent(String(id))}`,
    locale
  )

  return normalizeCmsPage(response?.page)
}
