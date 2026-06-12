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

const ALLOWED_GLOBAL_ATTRIBUTES = new Set(["title"])

const ALLOWED_TAG_ATTRIBUTES: Record<string, Set<string>> = {
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

const SAFE_ANCHOR_HREF_REGEX = /^(https?:|mailto:|tel:|\/|#)/i
const SAFE_IMAGE_SRC_REGEX = /^(https?:|\/)/i
const HTTP_URL_REGEX = /^https?:/i
const SELF_CLOSING_TAG_SUFFIX_REGEX = /\/\s*$/
const RENDERABLE_IMAGE_TAG_REGEX = /<\s*img\b/i

const isSafeAnchorHref = (value: string): boolean =>
  SAFE_ANCHOR_HREF_REGEX.test(value)

const isSafeImageSrc = (value: string): boolean =>
  SAFE_IMAGE_SRC_REGEX.test(value)

const isAllowedImageLoading = (value: string): boolean =>
  value === "lazy" || value === "eager"

const isAllowedImageDecoding = (value: string): boolean =>
  value === "async" || value === "sync" || value === "auto"

const escapeHtmlAttribute = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const parseTagAttributes = (rawAttributes: string) => {
  const attributes: Array<{ name: string; value: string }> = []
  const attributePattern =
    /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

  let match = attributePattern.exec(rawAttributes)
  while (match) {
    const name = match[1]?.toLowerCase()
    const value = (match[2] ?? match[3] ?? match[4] ?? "").trim()

    if (name) {
      attributes.push({ name, value })
    }

    match = attributePattern.exec(rawAttributes)
  }

  return attributes
}

const isAttributeAllowed = (
  name: string,
  allowedAttributesForTag: Set<string>
) => ALLOWED_GLOBAL_ATTRIBUTES.has(name) || allowedAttributesForTag.has(name)

type SanitizedAttributeState = {
  attributes: string[]
  href: string | null
  imageSrc: string | null
  hasImageLoading: boolean
  hasImageDecoding: boolean
  target: string | null
  rel: string | null
}

const createAttributeState = (): SanitizedAttributeState => ({
  attributes: [],
  href: null,
  imageSrc: null,
  hasImageLoading: false,
  hasImageDecoding: false,
  target: null,
  rel: null,
})

const applyAnchorAttribute = (
  state: SanitizedAttributeState,
  name: string,
  value: string
) => {
  if (name === "href") {
    if (isSafeAnchorHref(value)) {
      state.href = value
    }
    return true
  }

  if (name === "target") {
    state.target = value
    return true
  }

  if (name === "rel") {
    state.rel = value
    return true
  }

  return false
}

const applyImageAttribute = (
  state: SanitizedAttributeState,
  name: string,
  value: string
) => {
  if (name === "src") {
    if (isSafeImageSrc(value)) {
      state.imageSrc = value
    }
    return true
  }

  if (name === "loading") {
    state.hasImageLoading = isAllowedImageLoading(value)
    return true
  }

  if (name === "decoding") {
    state.hasImageDecoding = isAllowedImageDecoding(value)
    return true
  }

  return false
}

const applySanitizedAttribute = (
  state: SanitizedAttributeState,
  tag: string,
  name: string,
  value: string
) => {
  if (tag === "a" && applyAnchorAttribute(state, name, value)) {
    return
  }

  if (tag === "img" && applyImageAttribute(state, name, value)) {
    return
  }

  if (value) {
    state.attributes.push(`${name}="${escapeHtmlAttribute(value)}"`)
  }
}

const appendAnchorAttributes = (state: SanitizedAttributeState) => {
  if (!state.href) {
    return
  }

  state.attributes.push(`href="${escapeHtmlAttribute(state.href)}"`)

  if (HTTP_URL_REGEX.test(state.href)) {
    state.attributes.push('target="_blank"')
    state.attributes.push('rel="noopener noreferrer"')
    return
  }

  if (state.target) {
    state.attributes.push(`target="${escapeHtmlAttribute(state.target)}"`)
  }

  if (state.rel) {
    state.attributes.push(`rel="${escapeHtmlAttribute(state.rel)}"`)
  }
}

const appendImageAttributes = (state: SanitizedAttributeState) => {
  if (!state.imageSrc) {
    return false
  }

  state.attributes.push(`src="${escapeHtmlAttribute(state.imageSrc)}"`)

  if (!state.hasImageLoading) {
    state.attributes.push('loading="lazy"')
  }

  if (!state.hasImageDecoding) {
    state.attributes.push('decoding="async"')
  }

  return true
}

const sanitizeOpeningTag = (tag: string, rawAttributes: string) => {
  const allowedAttributesForTag =
    ALLOWED_TAG_ATTRIBUTES[tag] ?? new Set<string>()
  const state = createAttributeState()

  for (const attribute of parseTagAttributes(rawAttributes ?? "")) {
    const { name, value } = attribute

    if (!isAttributeAllowed(name, allowedAttributesForTag)) {
      continue
    }

    applySanitizedAttribute(state, tag, name, value)
  }

  if (tag === "a") {
    appendAnchorAttributes(state)
  }

  if (tag === "img" && !appendImageAttributes(state)) {
    return ""
  }

  const attributesString =
    state.attributes.length > 0 ? ` ${state.attributes.join(" ")}` : ""

  if (tag === "br" || tag === "img") {
    return `<${tag}${attributesString}>`
  }

  return SELF_CLOSING_TAG_SUFFIX_REGEX.test(rawAttributes ?? "")
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

  const sanitized = cleanedHtml.replace(
    /<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g,
    (_, closingSlash: string, rawTag: string, rawAttributes: string) =>
      sanitizeHtmlTag(closingSlash, rawTag, rawAttributes)
  )

  return sanitized.trim()
}

export const hasRenderableHtmlContent = (
  value: string | null | undefined
): boolean => {
  if (!value) {
    return false
  }

  const sanitizedHtml = sanitizeHtml(value)
  if (!sanitizedHtml) {
    return false
  }

  return (
    stripHtml(sanitizedHtml).length > 0 ||
    RENDERABLE_IMAGE_TAG_REGEX.test(sanitizedHtml)
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
