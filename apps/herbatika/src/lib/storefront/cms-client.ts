import "server-only"
import type { CmsMediaValue } from "./cms-types"
import {
  resolveMedusaBackendUrl,
  resolvePublicPayloadBaseUrl,
} from "./runtime-env"
import { storefrontConfig } from "./sdk"

const CMS_LOCALE = "sk"
const CMS_REVALIDATE_SECONDS = 600
const CMS_MEDUSA_BASE_URL = resolveMedusaBackendUrl()
const CMS_MEDIA_BASE_URL = resolvePublicPayloadBaseUrl()

const trimSlashes = (value: string) => value.replaceAll(/^\/+|\/+$/gu, "")

const buildCmsUrl = (
  path: string,
  params?: Record<string, string | number>,
) => {
  const url = new URL(`/store/cms/${trimSlashes(path)}`, CMS_MEDUSA_BASE_URL)

  url.searchParams.set("locale", CMS_LOCALE)

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value))
  }

  return url
}

export const fetchCmsJson = async (
  path: string,
  params?: Record<string, string | number>,
): Promise<unknown> => {
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

  const payload: unknown = await response.json()
  return payload
}

const resolveCmsMediaPath = (media: CmsMediaValue): string | null => {
  if (typeof media === "string") {
    return media
  }

  return media?.url ?? null
}

export const resolveCmsMediaUrl = (media: CmsMediaValue): string | null => {
  const mediaPath = resolveCmsMediaPath(media)

  if (mediaPath === null || mediaPath.length === 0) {
    return null
  }

  try {
    return CMS_MEDIA_BASE_URL === null
      ? new URL(mediaPath).toString()
      : new URL(mediaPath, CMS_MEDIA_BASE_URL).toString()
  } catch {
    return null
  }
}

export const rewriteCmsHtmlMediaUrls = (html: string) => {
  if (!html) {
    return ""
  }

  if (CMS_MEDIA_BASE_URL === null || CMS_MEDIA_BASE_URL.length === 0) {
    return html
  }

  return html.replaceAll(
    /\b(?:src|href)=["']\/api\/media\/file\/[^"']+["']/gu,
    (match) => {
      const separatorIndex = match.indexOf("=")
      const attribute = match.slice(0, separatorIndex)
      const url = match.slice(separatorIndex + 2, -1)
      return `${attribute}="${new URL(url, CMS_MEDIA_BASE_URL).toString()}"`
    },
  )
}

export const stripCmsHtml = (value: string | null | undefined) => {
  if (value === null || value === undefined || value.length === 0) {
    return ""
  }

  return value
    .replaceAll(/<style[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replaceAll(/<script[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll(/&nbsp;/giu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim()
}
