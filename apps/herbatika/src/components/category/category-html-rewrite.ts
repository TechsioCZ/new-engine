import type { HttpTypes } from "@medusajs/types"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import type { Market } from "@/lib/url/types"

const SHOW_MORE_MARKER_PATTERN = /#showmore#/gi
const SHOW_MORE_MARKER_PARAGRAPH_PATTERN =
  /<p[^>]*>\s*(?:<span[^>]*>)?\s*#showmore#\s*(?:<\/span>)?\s*<\/p>/gi
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i
const LEADING_SLASHES_PATTERN = /^\/+/
const HERBATICA_LEGACY_HOSTNAMES = new Set(["herbatica.sk", "www.herbatica.sk"])
const HERBATICA_LEGACY_MEDIA_BASE_URL =
  "https://cdn.myshoptet.com/usr/www.herbatica.sk/"
const HERBATICA_LEGACY_MEDIA_PATH_PREFIX = "/user/documents/upload/"

const stripShowMoreMarker = (html: string) =>
  html
    .replace(SHOW_MORE_MARKER_PARAGRAPH_PATTERN, "")
    .replace(SHOW_MORE_MARKER_PATTERN, "")
    .trim()

const resolveLegacyCategoryHref = (
  href: string,
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>,
  publicSlugsById: Readonly<Record<string, string>>,
  market: Market
) => {
  const trimmedHref = href.trim()
  if (!trimmedHref || trimmedHref.startsWith("#")) {
    return href
  }

  let pathname = trimmedHref

  try {
    const url = new URL(trimmedHref)
    if (!HERBATICA_LEGACY_HOSTNAMES.has(url.hostname)) {
      return href
    }

    pathname = url.pathname
  } catch {
    if (URL_SCHEME_PATTERN.test(trimmedHref)) {
      return href
    }
  }

  const normalizedPath = pathname.replace(/^\/+|\/+$/g, "")
  if (!normalizedPath) {
    return href
  }

  const pathSegments = normalizedPath.split("/")
  const handle = pathSegments[0] === "c" ? pathSegments[1] : pathSegments[0]
  const category = handle ? categoryByHandle.get(handle) : undefined
  if (!category) {
    return href
  }

  return buildProjectedEntityPath(
    "category",
    { publicSlug: publicSlugsById[category.id] },
    market
  )
}

const resolveLegacyMediaUrl = (value: string) => {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return value
  }

  let url: URL
  try {
    url = new URL(trimmedValue, "https://www.herbatica.sk")
  } catch {
    return value
  }

  const isRelativeUrl = trimmedValue.startsWith("/")
  const isLegacyHost = HERBATICA_LEGACY_HOSTNAMES.has(url.hostname)
  if (!(isRelativeUrl || isLegacyHost)) {
    return value
  }

  if (!url.pathname.startsWith(HERBATICA_LEGACY_MEDIA_PATH_PREFIX)) {
    return value
  }

  return new URL(
    `${url.pathname.replace(LEADING_SLASHES_PATTERN, "")}${url.search}${url.hash}`,
    HERBATICA_LEGACY_MEDIA_BASE_URL
  ).toString()
}

const rewriteLegacyMediaUrls = (html: string) =>
  html.replace(
    /\b(src|href)=(["'])(.*?)\2/gi,
    (_match, attribute: string, quote: string, url: string) =>
      `${attribute}=${quote}${resolveLegacyMediaUrl(url)}${quote}`
  )

const rewriteLegacyCategoryLinks = (
  html: string,
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>,
  publicSlugsById: Readonly<Record<string, string>>,
  market: Market
) =>
  html.replace(
    /\bhref=(["'])(.*?)\1/gi,
    (_match, quote: string, href: string) => {
      const resolvedHref = resolveLegacyCategoryHref(
        href,
        categoryByHandle,
        publicSlugsById,
        market
      )
      return resolvedHref ? `href=${quote}${resolvedHref}${quote}` : ""
    }
  )

export const rewriteCategoryMetadataHtml = (
  html: string,
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>,
  publicSlugsById: Readonly<Record<string, string>>,
  market: Market
) =>
  rewriteLegacyCategoryLinks(
    rewriteLegacyMediaUrls(stripShowMoreMarker(html)),
    categoryByHandle,
    publicSlugsById,
    market
  )
