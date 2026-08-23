import type { CmsMedia } from "./cms-types"
import { resolvePublicPayloadBaseUrl } from "./runtime-env"

const CMS_MEDIA_BASE_URL = resolvePublicPayloadBaseUrl()

const resolveCmsMediaPath = (
  media: CmsMedia | string | null | undefined
): string | null => {
  if (typeof media === "string") {
    return media
  }

  return media?.url ?? null
}

// Imported CMS content can carry Payload media URLs as absolute origins baked in
// at import time (e.g. a build-time or another environment's host). Re-base any
// Payload media URL (`/api/media/...`) onto the configured public base so it is
// always reachable by the browser; leave foreign hosts (product CDN, etc.) alone.
const rebaseCmsMediaUrl = (rawUrl: string): string | null => {
  try {
    const parsed = CMS_MEDIA_BASE_URL
      ? new URL(rawUrl, CMS_MEDIA_BASE_URL)
      : new URL(rawUrl)
    if (CMS_MEDIA_BASE_URL && parsed.pathname.startsWith("/api/media/")) {
      return new URL(
        `${parsed.pathname}${parsed.search}`,
        CMS_MEDIA_BASE_URL
      ).toString()
    }
    return parsed.toString()
  } catch {
    return null
  }
}

export const resolveCmsMediaUrl = (
  media: CmsMedia | string | null | undefined
): string | null => {
  const mediaPath = resolveCmsMediaPath(media)
  if (!mediaPath) {
    return null
  }

  return rebaseCmsMediaUrl(mediaPath)
}

export const rewriteCmsHtmlMediaUrls = (html: string) => {
  if (!html) {
    return ""
  }

  if (!CMS_MEDIA_BASE_URL) {
    return html
  }

  // Matches both relative (`/api/media/file/...`) and absolute
  // (`https://any-host/api/media/file/...`) Payload media references.
  return html.replace(
    /\b(src|href)=["']((?:https?:\/\/[^"']+)?\/api\/media\/file\/[^"']+)["']/g,
    (match, attribute: string, url: string) => {
      const rebased = rebaseCmsMediaUrl(url)
      return rebased ? `${attribute}="${rebased}"` : match
    }
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
