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

export const isSanitizedHtmlTagAllowed = (tag: string) =>
  ALLOWED_HTML_TAGS.has(tag)

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

type AllowedAttributeValues = Readonly<
  Record<string, Readonly<Record<string, ReadonlySet<string>>>>
>

export interface SanitizeHtmlOptions {
  additionalAllowedAttributeValues?: AllowedAttributeValues
  additionalAllowedTagAttributes?: Readonly<Record<string, ReadonlySet<string>>>
  additionalAllowedTags?: ReadonlySet<string>
}

// Case-insensitivity is spelled out as ASCII case pairs rather than the `i` flag.
// Combined with the required `u` flag, `i` switches to full Unicode case folding, so `s`
// would also match U+017F (LATIN SMALL LETTER LONG S). That widens this sanitizer's
// filter surface: `<ſcript>…</ſcript>` would become strippable, and stripping it can
// splice the surrounding text into a new live tag (`<im` + `g src=…>` -> `<img src=…>`).
const SAFE_ANCHOR_HREF_REGEX =
  /^(?:[hH][tT][tT][pP][sS]?:|[mM][aA][iI][lL][tT][oO]:|[tT][eE][lL]:|\/|#)/u
const SAFE_IMAGE_SRC_REGEX = /^(?:[hH][tT][tT][pP][sS]?:|\/)/u
const HTTP_URL_REGEX = /^[hH][tT][tT][pP][sS]?:/u
const SELF_CLOSING_TAG_SUFFIX_REGEX = /\/\s*$/u
const RENDERABLE_IMAGE_TAG_REGEX = /<\s*[iI][mM][gG]\b/u

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

const isAttributeNameCharacter = (character: string) =>
  /[a-zA-Z0-9:-]/u.test(character)

const skipWhitespace = (value: string, startIndex: number) => {
  let index = startIndex
  while (/\s/u.test(value[index] ?? "")) {
    index += 1
  }
  return index
}

const readAttributeName = (rawAttributes: string, startIndex: number) => {
  let index = startIndex
  while (isAttributeNameCharacter(rawAttributes[index] ?? "")) {
    index += 1
  }
  return {
    index,
    name: rawAttributes.slice(startIndex, index).toLowerCase(),
  }
}

const readQuotedAttributeValue = (
  rawAttributes: string,
  startIndex: number,
  quote: string,
) => {
  let index = startIndex
  while (index < rawAttributes.length && rawAttributes[index] !== quote) {
    index += 1
  }
  const value = rawAttributes.slice(startIndex, index)
  return {
    index: rawAttributes[index] === quote ? index + 1 : index,
    value,
  }
}

const readUnquotedAttributeValue = (
  rawAttributes: string,
  startIndex: number,
) => {
  let index = startIndex
  while (
    index < rawAttributes.length &&
    !/[\s"'=<>`]/u.test(rawAttributes[index] ?? "")
  ) {
    index += 1
  }
  return {
    index,
    value: rawAttributes.slice(startIndex, index),
  }
}

const readAttributeValue = (rawAttributes: string, startIndex: number) => {
  if (rawAttributes[startIndex] !== "=") {
    return { index: startIndex, value: "" }
  }
  const valueStart = skipWhitespace(rawAttributes, startIndex + 1)
  const quote = rawAttributes[valueStart]
  if (quote === '"' || quote === "'") {
    return readQuotedAttributeValue(rawAttributes, valueStart + 1, quote)
  }
  return readUnquotedAttributeValue(rawAttributes, valueStart)
}

const parseTagAttributes = (rawAttributes: string) => {
  const attributes: { name: string; value: string }[] = []
  let index = 0

  while (index < rawAttributes.length) {
    const nameStart = skipWhitespace(rawAttributes, index)
    const nameResult = readAttributeName(rawAttributes, nameStart)
    if (nameResult.name === "") {
      index = nameStart + 1
    } else {
      const equalsIndex = skipWhitespace(rawAttributes, nameResult.index)
      const valueResult = readAttributeValue(rawAttributes, equalsIndex)
      const { index: nextIndex, value } = valueResult
      attributes.push({
        name: nameResult.name,
        value: value.trim(),
      })
      index = nextIndex
    }
  }

  return attributes
}

interface AttributeAllowanceInput {
  allowedAttributesForTag: Set<string>
  name: string
  options: SanitizeHtmlOptions
  tag: string
  value: string
}

const isAttributeAllowed = ({
  allowedAttributesForTag,
  name,
  options,
  tag,
  value,
}: AttributeAllowanceInput) => {
  if (
    ALLOWED_GLOBAL_ATTRIBUTES.has(name) ||
    allowedAttributesForTag.has(name)
  ) {
    return true
  }

  return (
    options.additionalAllowedTagAttributes?.[tag]?.has(name) === true &&
    options.additionalAllowedAttributeValues?.[tag]?.[name]?.has(value) === true
  )
}

interface SanitizedAttributeState {
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
  hasImageDecoding: false,
  hasImageLoading: false,
  href: null,
  imageSrc: null,
  rel: null,
  target: null,
})

const applyAnchorAttribute = (
  state: SanitizedAttributeState,
  name: string,
  value: string,
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
  value: string,
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
  value: string,
) => {
  if (tag === "a" && applyAnchorAttribute(state, name, value)) {
    return
  }

  if (tag === "img" && applyImageAttribute(state, name, value)) {
    return
  }

  if (value !== "") {
    state.attributes.push(`${name}="${escapeHtmlAttribute(value)}"`)
  }
}

const appendAnchorAttributes = (state: SanitizedAttributeState) => {
  if (state.href === null || state.href === "") {
    return
  }

  state.attributes.push(`href="${escapeHtmlAttribute(state.href)}"`)

  if (HTTP_URL_REGEX.test(state.href)) {
    state.attributes.push('target="_blank"', 'rel="noopener noreferrer"')
    return
  }

  if (state.target !== null && state.target !== "") {
    state.attributes.push(`target="${escapeHtmlAttribute(state.target)}"`)
  }

  if (state.rel !== null && state.rel !== "") {
    state.attributes.push(`rel="${escapeHtmlAttribute(state.rel)}"`)
  }
}

const appendImageAttributes = (state: SanitizedAttributeState) => {
  if (state.imageSrc === null || state.imageSrc === "") {
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

const sanitizeOpeningTag = (
  tag: string,
  rawAttributes: string,
  options: SanitizeHtmlOptions,
) => {
  const allowedAttributesForTag =
    ALLOWED_TAG_ATTRIBUTES[tag] ?? new Set<string>()
  const state = createAttributeState()

  for (const attribute of parseTagAttributes(rawAttributes ?? "")) {
    const { name, value } = attribute

    if (
      !isAttributeAllowed({
        allowedAttributesForTag,
        name,
        options,
        tag,
        value,
      })
    ) {
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

  if (tag === "br" || tag === "hr" || tag === "img") {
    return `<${tag}${attributesString}>`
  }

  return SELF_CLOSING_TAG_SUFFIX_REGEX.test(rawAttributes ?? "")
    ? `<${tag}${attributesString} />`
    : `<${tag}${attributesString}>`
}

const sanitizeHtmlTag = (
  closingSlash: string,
  rawTag: string,
  rawAttributes: string,
  options: SanitizeHtmlOptions,
) => {
  const tag = rawTag.toLowerCase()

  if (
    !(
      ALLOWED_HTML_TAGS.has(tag) ||
      options.additionalAllowedTags?.has(tag) === true
    )
  ) {
    return ""
  }

  if (closingSlash === "/") {
    return tag === "br" || tag === "hr" || tag === "img" ? "" : `</${tag}>`
  }

  return sanitizeOpeningTag(tag, rawAttributes, options)
}

const sanitizeMatchedHtmlTag = (
  matchedTag: string,
  options: SanitizeHtmlOptions,
) => {
  const innerTag = matchedTag.slice(1, -1).trim()
  const isClosing = innerTag.startsWith("/")
  const tagContent = isClosing ? innerTag.slice(1).trimStart() : innerTag
  const tagEnd = tagContent.search(/[\s/]/u)
  const rawTag = tagEnd === -1 ? tagContent : tagContent.slice(0, tagEnd)
  const rawAttributes = tagEnd === -1 ? "" : tagContent.slice(tagEnd)
  return sanitizeHtmlTag(isClosing ? "/" : "", rawTag, rawAttributes, options)
}

export const sanitizeHtml = (
  html: string,
  options: SanitizeHtmlOptions = {},
): string => {
  if (html === "") {
    return ""
  }

  // `script` and `style` spell out ASCII case pairs (see the regex constants above);
  // `iframe`/`object`/`embed` contain no `s`, so `iu` is equivalent to `i` for them.
  const cleanedHtml = html
    .replaceAll(/<!--[\s\S]*?-->/gu, "")
    .replaceAll(
      /<[sS][cC][rR][iI][pP][tT][\s\S]*?<\/[sS][cC][rR][iI][pP][tT]>/gu,
      "",
    )
    .replaceAll(/<[sS][tT][yY][lL][eE][\s\S]*?<\/[sS][tT][yY][lL][eE]>/gu, "")
    .replaceAll(/<iframe[\s\S]*?<\/iframe>/giu, "")
    .replaceAll(/<object[\s\S]*?<\/object>/giu, "")
    .replaceAll(/<embed[\s\S]*?<\/embed>/giu, "")

  const sanitized = cleanedHtml.replaceAll(
    /<\s*\/?\s*[a-zA-Z0-9]+[^>]*>/gu,
    (matchedTag: string) => sanitizeMatchedHtmlTag(matchedTag, options),
  )

  return sanitized.trim()
}

export const stripHtml = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === "") {
    return ""
  }

  return value
    .replaceAll(
      /<[sS][tT][yY][lL][eE][^>]*>[\s\S]*?<\/[sS][tT][yY][lL][eE]>/gu,
      " ",
    )
    .replaceAll(
      /<[sS][cC][rR][iI][pP][tT][^>]*>[\s\S]*?<\/[sS][cC][rR][iI][pP][tT]>/gu,
      " ",
    )
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll(/&[nN][bB][sS][pP];/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim()
}

export const hasRenderableHtmlContent = (
  value: string | null | undefined,
): boolean => {
  if (value === null || value === undefined || value === "") {
    return false
  }

  const sanitizedHtml = sanitizeHtml(value)
  if (sanitizedHtml === "") {
    return false
  }

  return (
    stripHtml(sanitizedHtml).length > 0 ||
    RENDERABLE_IMAGE_TAG_REGEX.test(sanitizedHtml)
  )
}
