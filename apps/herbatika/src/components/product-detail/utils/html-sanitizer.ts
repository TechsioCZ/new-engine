import { sanitizeTagAttributes } from "./html-sanitizer-attributes"

const ALLOWED_HTML_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "em",
  "h2",
  "h3",
  "h4",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
])

const SELF_CLOSING_TAG_SUFFIX_REGEX = /\/\s*$/
const RENDERABLE_IMAGE_TAG_REGEX = /<\s*img\b/i

const sanitizeOpeningTag = (tag: string, rawAttributes: string) => {
  const attributes = sanitizeTagAttributes(tag, rawAttributes)
  if (attributes === null) {
    return ""
  }
  const attributesString =
    attributes.length > 0 ? ` ${attributes.join(" ")}` : ""
  if (tag === "br" || tag === "img") {
    return `<${tag}${attributesString}>`
  }
  return SELF_CLOSING_TAG_SUFFIX_REGEX.test(rawAttributes)
    ? `<${tag}${attributesString} />`
    : `<${tag}${attributesString}>`
}

const sanitizeHtmlTag = (
  closingSlash: string,
  rawTag: string,
  rawAttributes: string
) => {
  const tag = rawTag.toLowerCase()
  if (!ALLOWED_HTML_TAGS.has(tag)) {
    return ""
  }
  if (closingSlash === "/") {
    return tag === "br" || tag === "img" ? "" : `</${tag}>`
  }
  return sanitizeOpeningTag(tag, rawAttributes)
}

export const sanitizeHtml = (html: string): string => {
  if (!html) {
    return ""
  }
  const cleanedHtml = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?<\/embed>/gi, "")
  return cleanedHtml
    .replace(
      /<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g,
      (_, closingSlash: string, rawTag: string, rawAttributes: string) =>
        sanitizeHtmlTag(closingSlash, rawTag, rawAttributes)
    )
    .trim()
}

export const hasRenderableHtmlContent = (
  value: string | null | undefined
): boolean => {
  if (!value) {
    return false
  }
  const sanitizedHtml = sanitizeHtml(value)
  return Boolean(
    sanitizedHtml &&
    (stripHtml(sanitizedHtml).length > 0 ||
      RENDERABLE_IMAGE_TAG_REGEX.test(sanitizedHtml))
  )
}

export const stripHtml = (value: string | null | undefined): string => {
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
