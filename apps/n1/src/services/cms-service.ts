import { getMedusaBackendUrl } from "@/lib/medusa-backend-url"

export interface CmsPage {
  id: number
  slug: string
  title: string
  content?: unknown
  meta?: {
    title?: string | null
    description?: string | null
  }
}

const isNullableString = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string"

const isCmsMeta = (value: unknown): value is NonNullable<CmsPage["meta"]> => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  if ("title" in value && !isNullableString(value.title)) {
    return false
  }
  return !("description" in value) || isNullableString(value.description)
}

const isCmsPage = (value: unknown): value is CmsPage => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  if (!("id" in value) || typeof value.id !== "number") {
    return false
  }
  if (!("slug" in value) || typeof value.slug !== "string") {
    return false
  }
  if (!("title" in value) || typeof value.title !== "string") {
    return false
  }
  return !("meta" in value) || value.meta === undefined || isCmsMeta(value.meta)
}

const DEFAULT_CMS_LOCALE = "cs"

export const getCmsPage = async (
  slug: string,
  locale = DEFAULT_CMS_LOCALE,
): Promise<CmsPage | null> => {
  const { NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: publishableKey } = process.env

  if (
    publishableKey === null ||
    publishableKey === undefined ||
    publishableKey === ""
  ) {
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
    },
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    return null
  }

  const data: unknown = await response.json()
  if (typeof data !== "object" || data === null || !("page" in data)) {
    return null
  }

  return isCmsPage(data.page) ? data.page : null
}
