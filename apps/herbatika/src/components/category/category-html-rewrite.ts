import type { HttpTypes } from "@medusajs/types"

const SHOW_MORE_MARKER_PATTERN = /#showmore#/giu
const SHOW_MORE_MARKER_PARAGRAPH_PATTERN =
  /<p[^>]*>\s*(?:<span[^>]*>)?\s*#showmore#\s*(?:<\/span>)?\s*<\/p>/giu
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/iu
const LEADING_SLASHES_PATTERN = /^\/+/u
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

    ;({ pathname } = url)
  } catch {
    if (URL_SCHEME_PATTERN.test(trimmedHref)) {
      return href
    }
  }

  const normalizedPath = pathname.replaceAll(/^\/+|\/+$/gu, "")
  if (!normalizedPath || normalizedPath.startsWith("c/")) {
    return href
  }

  const [handle] = normalizedPath.split("/")
  if (!(handle && categoryByHandle.has(handle))) {
    return href
  }

  return `/c/${handle}`
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
    HERBATICA_LEGACY_MEDIA_BASE_URL,
  ).toString()
}

const splitHtmlAttribute = (attribute: string) => {
  const equalsIndex = attribute.indexOf("=")
  const quote = attribute.at(equalsIndex + 1)
  if (equalsIndex < 1 || (quote !== '"' && quote !== "'")) {
    return null
  }

  return {
    name: attribute.slice(0, equalsIndex),
    quote,
    value: attribute.slice(equalsIndex + 2, -1),
  }
}

const rewriteLegacyMediaUrls = (html: string) =>
  html.replaceAll(
    /\b(?:src|href)="[^"]*"|\b(?:src|href)='[^']*'/giu,
    (attribute) => {
      const parts = splitHtmlAttribute(attribute)
      if (parts === null) {
        return attribute
      }

      return `${parts.name}=${parts.quote}${resolveLegacyMediaUrl(parts.value)}${parts.quote}`
    },
  )

const rewriteLegacyCategoryLinks = (
  html: string,
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>,
) =>
  html.replaceAll(/\bhref="[^"]*"|\bhref='[^']*'/giu, (attribute) => {
    const parts = splitHtmlAttribute(attribute)
    if (parts === null) {
      return attribute
    }

    return `href=${parts.quote}${resolveLegacyCategoryHref(
      parts.value,
      categoryByHandle,
    )}${parts.quote}`
  })

export const rewriteCategoryMetadataHtml = (
  html: string,
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>,
) =>
  rewriteLegacyCategoryLinks(
    rewriteLegacyMediaUrls(stripShowMoreMarker(html)),
    categoryByHandle,
  )
