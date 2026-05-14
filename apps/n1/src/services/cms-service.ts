import { getMedusaBackendUrl } from "@/lib/medusa-backend-url"

export type CmsPage = {
  id: number
  slug: string
  title: string
  content?: unknown
  meta?: {
    title?: string | null
    description?: string | null
  }
}

type CmsPageResponse = {
  page?: CmsPage
}

const DEFAULT_CMS_LOCALE = "cs"

export async function getCmsPage(
  slug: string,
  locale = DEFAULT_CMS_LOCALE
): Promise<CmsPage | null> {
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

  if (!publishableKey) {
    return null
  }

  const baseUrl = getMedusaBackendUrl()
  const response = await fetch(
    `${baseUrl}/store/cms/pages/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    {
      cache: "no-store",
      headers: {
        "x-publishable-api-key": publishableKey,
      },
    }
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as CmsPageResponse
  return data.page ?? null
}
