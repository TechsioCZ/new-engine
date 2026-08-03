import type { CmsMedia } from "./cms-types"
import { resolveMedusaBackendUrl, resolvePayloadBaseUrl } from "./runtime-env"

const CMS_MEDIA_BASE_URL = resolvePayloadBaseUrl(resolveMedusaBackendUrl())

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
