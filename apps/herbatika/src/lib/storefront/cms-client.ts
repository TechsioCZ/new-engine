import "server-only";

import {
  getMedusaPublishableHeaders,
  PAYLOAD_MEDIA_BASE_URL,
} from "./public-env";
import { storefrontConfig } from "./sdk";

const CMS_LOCALE = "sk";
const CMS_REVALIDATE_SECONDS = 600;
const isDevelopment = process.env.NODE_ENV === "development";

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

const buildCmsUrl = (
  path: string,
  params?: Record<string, string | number>,
) => {
  const url = new URL(
    `/store/cms/${trimSlashes(path)}`,
    storefrontConfig.backendUrl,
  );

  url.searchParams.set("locale", CMS_LOCALE);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }

  return url;
};

export const fetchCmsJson = async <TResponse>(
  path: string,
  params?: Record<string, string | number>,
): Promise<TResponse | null> => {
  let response: Response;

  try {
    response = await fetch(buildCmsUrl(path, params), {
      headers: {
        accept: "application/json",
        ...getMedusaPublishableHeaders(),
      },
      ...(isDevelopment
        ? { cache: "no-store" }
        : {
            next: {
              revalidate: CMS_REVALIDATE_SECONDS,
            },
          }),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  try {
    return (await response.json()) as TResponse;
  } catch {
    return null;
  }
};

const resolveCmsMediaPath = (media: unknown): string | null => {
  if (typeof media === "string") {
    return media.trim() || null;
  }

  if (
    typeof media === "object" &&
    media !== null &&
    "url" in media &&
    typeof media.url === "string"
  ) {
    return media.url.trim() || null;
  }

  return null;
};

export const resolveCmsMediaUrl = (media: unknown): string | null => {
  const mediaPath = resolveCmsMediaPath(media);

  if (!mediaPath) {
    return null;
  }

  try {
    if (/^https?:\/\//i.test(mediaPath)) {
      return new URL(mediaPath).toString();
    }

    if (!PAYLOAD_MEDIA_BASE_URL) {
      return null;
    }

    return new URL(mediaPath, PAYLOAD_MEDIA_BASE_URL).toString();
  } catch {
    return null;
  }
};

export const rewriteCmsHtmlMediaUrls = (html: unknown) => {
  if (typeof html !== "string") {
    return "";
  }

  if (!html) {
    return "";
  }

  return html.replace(
    /\b(src|href)=["'](\/api\/media\/file\/[^"']+)["']/g,
    (_match, attribute: string, url: string) => {
      const resolvedUrl = resolveCmsMediaUrl(url);

      return resolvedUrl ? `${attribute}="${resolvedUrl}"` : _match;
    },
  );
};

export const stripCmsHtml = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return "";
  }

  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};
