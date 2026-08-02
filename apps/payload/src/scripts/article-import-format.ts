export const ARTICLE_CONTENT_HEADER_ALIASES = new Set([
  "content",
  "body",
  "text",
  "article",
  "article_text",
  "post_content",
  "post_content_html",
])

export const RICH_TEXT_GZIP_PREFIX = "payload-richtext+gzip-base64:"
export const MEDIA_URL_PREFIX = "payload-media-url:"
export const ARTICLE_CONVERSION_ERROR_PREFIX = "payload-conversion-error:"

export const normalizeArticleHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .toLowerCase()
