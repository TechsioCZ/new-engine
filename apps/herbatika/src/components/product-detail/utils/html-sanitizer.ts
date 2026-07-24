import DOMPurify from "isomorphic-dompurify"

const ALLOWED_HTML_TAGS = [
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
]

const ALLOWED_GLOBAL_ATTRIBUTES: ReadonlySet<string> = new Set(["title"])
const ALLOWED_TAG_ATTRIBUTES: Record<string, ReadonlySet<string>> = {
  a: new Set(["href", "target", "rel", "title"]),
  img: new Set([
    "src",
    "alt",
    "width",
    "height",
    "loading",
    "decoding",
    "title",
  ]),
  td: new Set(["colspan", "rowspan", "title"]),
  th: new Set(["colspan", "rowspan", "title"]),
}
const ALLOWED_ATTRIBUTE_NAMES = [
  "href",
  "target",
  "rel",
  "title",
  "src",
  "alt",
  "width",
  "height",
  "loading",
  "decoding",
  "colspan",
  "rowspan",
]

const SAFE_ANCHOR_HREF_REGEX = /^(https?:|mailto:|tel:|\/|#)/i
const SAFE_IMAGE_SRC_REGEX = /^(https?:|\/)/i
const HTTP_URL_REGEX = /^https?:/i
const RENDERABLE_IMAGE_TAG_REGEX = /<\s*img\b/i
const IMAGE_LOADING_VALUES: ReadonlySet<string> = new Set(["lazy", "eager"])
const IMAGE_DECODING_VALUES: ReadonlySet<string> = new Set([
  "async",
  "sync",
  "auto",
])

const enforceAllowedAttributes = (element: Element, tag: string): void => {
  const allowedForTag = ALLOWED_TAG_ATTRIBUTES[tag]
  // Snapshot: removeAttribute mutates the live NamedNodeMap mid-iteration.
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase()
    const isAllowed =
      ALLOWED_GLOBAL_ATTRIBUTES.has(name) || allowedForTag?.has(name) === true
    if (!isAllowed || attribute.value.trim() === "") {
      element.removeAttribute(attribute.name)
    }
  }
}

const enforceAnchorPolicy = (element: Element): void => {
  const href = element.getAttribute("href")?.trim() ?? ""
  if (!href || !SAFE_ANCHOR_HREF_REGEX.test(href)) {
    element.removeAttribute("href")
    return
  }
  if (HTTP_URL_REGEX.test(href)) {
    element.setAttribute("target", "_blank")
    element.setAttribute("rel", "noopener noreferrer")
  }
}

const enforceImagePolicy = (element: Element): void => {
  const src = element.getAttribute("src")?.trim() ?? ""
  if (!src || !SAFE_IMAGE_SRC_REGEX.test(src)) {
    element.remove()
    return
  }
  const loading = element.getAttribute("loading") ?? ""
  if (!IMAGE_LOADING_VALUES.has(loading)) {
    element.setAttribute("loading", "lazy")
  }
  const decoding = element.getAttribute("decoding") ?? ""
  if (!IMAGE_DECODING_VALUES.has(decoding)) {
    element.setAttribute("decoding", "async")
  }
}

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (typeof node.tagName !== "string") {
    return
  }
  const tag = node.tagName.toLowerCase()
  enforceAllowedAttributes(node, tag)
  if (tag === "a") {
    enforceAnchorPolicy(node)
  } else if (tag === "img") {
    enforceImagePolicy(node)
  }
})

// Href/src protocol policy is enforced in the afterSanitizeAttributes hook
// (SAFE_ANCHOR_HREF_REGEX / SAFE_IMAGE_SRC_REGEX); DOMPurify's
// ALLOWED_URI_REGEXP is unsuitable because it is applied to every attribute
// value, not just URI attributes.
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ALLOWED_HTML_TAGS,
  ALLOWED_ATTR: ALLOWED_ATTRIBUTE_NAMES,
} as const

export const sanitizeHtml = (html: string): string => {
  if (!html) {
    return ""
  }
  return DOMPurify.sanitize(html, SANITIZE_CONFIG).trim()
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
