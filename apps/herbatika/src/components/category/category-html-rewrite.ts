import type { HttpTypes } from "@medusajs/types";
import { routes } from "@/lib/routes";

const SHOW_MORE_MARKER_PATTERN = /#showmore#/gi;
const SHOW_MORE_MARKER_PARAGRAPH_PATTERN =
  /<p[^>]*>\s*(?:<span[^>]*>)?\s*#showmore#\s*(?:<\/span>)?\s*<\/p>/gi;
const HERBATICA_LEGACY_HOSTNAMES = new Set([
  "herbatica.sk",
  "www.herbatica.sk",
]);
const HERBATICA_LEGACY_MEDIA_BASE_URL =
  "https://cdn.myshoptet.com/usr/www.herbatica.sk/";
const HERBATICA_LEGACY_MEDIA_PATH_PREFIX = "/user/documents/upload/";

const stripShowMoreMarker = (html: string) => {
  return html
    .replace(SHOW_MORE_MARKER_PARAGRAPH_PATTERN, "")
    .replace(SHOW_MORE_MARKER_PATTERN, "")
    .trim();
};

const resolveLegacyCategoryHref = (
  href: string,
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>,
) => {
  const trimmedHref = href.trim();
  if (!trimmedHref || trimmedHref.startsWith("#")) {
    return href;
  }

  let pathname = trimmedHref;

  try {
    const url = new URL(trimmedHref);
    if (!HERBATICA_LEGACY_HOSTNAMES.has(url.hostname)) {
      return href;
    }

    pathname = url.pathname;
  } catch {
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedHref)) {
      return href;
    }
  }

  const normalizedPath = pathname.replace(/^\/+|\/+$/g, "");
  if (!normalizedPath) {
    return href;
  }

  const segments = normalizedPath.split("/");
  const handle = segments[0] === "c" ? segments[1] : segments[0];
  if (!handle || !categoryByHandle.has(handle)) {
    return href;
  }

  return routes.category.detail(handle);
};

const resolveLegacyMediaUrl = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return value;
  }

  let url: URL;
  try {
    url = new URL(trimmedValue, "https://www.herbatica.sk");
  } catch {
    return value;
  }

  const isRelativeUrl = trimmedValue.startsWith("/");
  const isLegacyHost = HERBATICA_LEGACY_HOSTNAMES.has(url.hostname);
  if (!isRelativeUrl && !isLegacyHost) {
    return value;
  }

  if (!url.pathname.startsWith(HERBATICA_LEGACY_MEDIA_PATH_PREFIX)) {
    return value;
  }

  return new URL(
    `${url.pathname.replace(/^\/+/, "")}${url.search}${url.hash}`,
    HERBATICA_LEGACY_MEDIA_BASE_URL,
  ).toString();
};

const rewriteLegacyMediaUrls = (html: string) => {
  return html.replace(
    /\b(src|href)=(["'])(.*?)\2/gi,
    (_match, attribute: string, quote: string, url: string) => {
      return `${attribute}=${quote}${resolveLegacyMediaUrl(url)}${quote}`;
    },
  );
};

const rewriteLegacyCategoryLinks = (
  html: string,
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>,
) => {
  return html.replace(
    /\bhref=(["'])(.*?)\1/gi,
    (_match, quote: string, href: string) => {
      return `href=${quote}${resolveLegacyCategoryHref(
        href,
        categoryByHandle,
      )}${quote}`;
    },
  );
};

export const rewriteCategoryMetadataHtml = (
  html: string,
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>,
) => {
  return rewriteLegacyCategoryLinks(
    rewriteLegacyMediaUrls(stripShowMoreMarker(html)),
    categoryByHandle,
  );
};
