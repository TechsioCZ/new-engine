import "server-only"

import type { CmsMedia } from "./cms-types"
import { resolveMedusaBackendUrl, resolvePayloadBaseUrl } from "./runtime-env"
import { storefrontConfig } from "./sdk"

const CMS_LOCALE = "sk"
const CMS_REVALIDATE_SECONDS = 600
const CMS_MEDUSA_BASE_URL = resolveMedusaBackendUrl()
const CMS_MEDIA_BASE_URL = resolvePayloadBaseUrl(CMS_MEDUSA_BASE_URL)

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "")

const buildCmsUrl = (
  path: string,
  params?: Record<string, string | number>
) => {
  const url = new URL(`/store/cms/${trimSlashes(path)}`, CMS_MEDUSA_BASE_URL)

  url.searchParams.set("locale", CMS_LOCALE)

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value))
  }

  return url
}

export const fetchCmsJson = async <TResponse>(
  path: string,
  params?: Record<string, string | number>
): Promise<TResponse | null> => {
  let response: Response

  try {
    response = await fetch(buildCmsUrl(path, params), {
      headers: {
        accept: "application/json",
        "x-publishable-api-key": storefrontConfig.publishableKey,
      },
      next: {
        revalidate: CMS_REVALIDATE_SECONDS,
      },
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  return (await response.json()) as TResponse
}

const resolveCmsMediaPath = (
  media: CmsMedia | string | null | undefined
): string | null => {
  if (typeof media === "string") {
    return media
  }

  return media?.url ?? null
}

export const resolveCmsMediaUrl = (
  media: CmsMedia | string | null | undefined
): string | null => {
  const mediaPath = resolveCmsMediaPath(media)

  if (!mediaPath) {
    return null
  }

  try {
    return new URL(mediaPath, CMS_MEDIA_BASE_URL).toString()
  } catch {
    return null
  }
}

export const rewriteCmsHtmlMediaUrls = (html: string) => {
  if (!html) {
    return ""
  }

  return html.replace(
    /\b(src|href)=["'](\/api\/media\/file\/[^"']+)["']/g,
    (_match, attribute: string, url: string) =>
      `${attribute}="${new URL(url, CMS_MEDIA_BASE_URL).toString()}"`
  )
}

export const stripCmsHtml = (value: string | null | undefined) => {
  if (!value) {
    return ""
  }

  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}
