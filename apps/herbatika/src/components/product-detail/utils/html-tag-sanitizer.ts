import { sanitizeTagAttributes } from "@/components/product-detail/utils/html-attribute-sanitizer"
import {
  isAllowedHtmlTag,
  SELF_CLOSING_TAG_SUFFIX_REGEX,
} from "@/components/product-detail/utils/html-sanitizer-policy"
import type { SanitizeHtmlOptions } from "@/components/product-detail/utils/html-sanitizer-policy"

const VOID_HTML_TAGS = new Set(["br", "hr", "img"])

const sanitizeOpeningTag = (
  tag: string,
  rawAttributes: string,
  options: SanitizeHtmlOptions,
) => {
  const attributes = sanitizeTagAttributes(tag, rawAttributes, options)
  if (attributes === null) {
    return ""
  }
  const attributesString =
    attributes.length > 0 ? ` ${attributes.join(" ")}` : ""
  if (VOID_HTML_TAGS.has(tag)) {
    return `<${tag}${attributesString}>`
  }
  return SELF_CLOSING_TAG_SUFFIX_REGEX.test(rawAttributes)
    ? `<${tag}${attributesString} />`
    : `<${tag}${attributesString}>`
}

const sanitizeHtmlTag = (
  isClosing: boolean,
  rawTag: string,
  rawAttributes: string,
  options: SanitizeHtmlOptions,
) => {
  const tag = rawTag.toLowerCase()
  if (!isAllowedHtmlTag(tag, options)) {
    return ""
  }
  if (isClosing) {
    return VOID_HTML_TAGS.has(tag) ? "" : `</${tag}>`
  }
  return sanitizeOpeningTag(tag, rawAttributes, options)
}

export const sanitizeMatchedHtmlTag = (
  matchedTag: string,
  options: SanitizeHtmlOptions,
) => {
  const innerTag = matchedTag.slice(1, -1).trim()
  const isClosing = innerTag.startsWith("/")
  const tagContent = isClosing ? innerTag.slice(1).trimStart() : innerTag
  const tagEnd = tagContent.search(/[\s/]/u)
  const rawTag = tagEnd === -1 ? tagContent : tagContent.slice(0, tagEnd)
  const rawAttributes = tagEnd === -1 ? "" : tagContent.slice(tagEnd)
  return sanitizeHtmlTag(isClosing, rawTag, rawAttributes, options)
}
