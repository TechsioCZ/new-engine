import { isBlogHeadingId } from "@/lib/storefront/blog-heading-id"

const DEFAULT_ALLOWED_HTML_TAGS = new Set([
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

const BLOG_ALLOWED_HTML_TAGS = new Set([
  ...DEFAULT_ALLOWED_HTML_TAGS,
  "code",
  "h1",
  "h5",
  "h6",
  "hr",
  "input",
  "label",
  "sub",
  "sup",
])

const DEFAULT_ALLOWED_GLOBAL_ATTRIBUTES = new Set(["title"])
const BLOG_ALLOWED_GLOBAL_ATTRIBUTES = new Set([
  ...DEFAULT_ALLOWED_GLOBAL_ATTRIBUTES,
  "id",
  "style",
])

const DEFAULT_ALLOWED_TAG_ATTRIBUTES: Record<string, Set<string>> = {
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

const BLOG_ALLOWED_TAG_ATTRIBUTES: Record<string, Set<string>> = {
  ...DEFAULT_ALLOWED_TAG_ATTRIBUTES,
  input: new Set(["checked", "type"]),
  label: new Set(["for", "htmlfor"]),
  li: new Set(["aria-checked", "role", "tabindex", "value"]),
  ol: new Set(["reversed", "start", "type"]),
}

type AllowedAttributeValues = Readonly<
  Record<string, Readonly<Record<string, ReadonlySet<string>>>>
>

export type SanitizeHtmlOptions = {
  additionalAllowedAttributeValues?: AllowedAttributeValues
  additionalAllowedTagAttributes?: Readonly<Record<string, ReadonlySet<string>>>
  additionalAllowedTags?: ReadonlySet<string>
}

type SanitizerProfile = "blog" | "default"

const SAFE_ANCHOR_HREF_REGEX = /^(https?:|mailto:|tel:|\/|#)/i
const SAFE_IMAGE_SRC_REGEX = /^(https?:|\/)/i
const HTTP_URL_REGEX = /^https?:/i
const SELF_CLOSING_TAG_SUFFIX_REGEX = /\/\s*$/
const RENDERABLE_IMAGE_TAG_REGEX = /<\s*img\b/i
const BLOG_TEXT_ALIGN_REGEX = /^(center|justify|left|right)$/
const BLOG_TEXT_DECORATION_REGEX = /^(?:(?:line-through|none|underline)\s*)+$/
const BLOG_PADDING_INLINE_START_REGEX = /^(?:0|[1-9]\d{0,2}(?:\.\d+)?px)$/
const BLOG_LIST_STYLE_TYPE_REGEX = /^(decimal|disc|none)$/
const BOOLEAN_ATTRIBUTE_REGEX = /^(false|true)$/
const TAB_INDEX_REGEX = /^-?1$/
const POSITIVE_INTEGER_REGEX = /^\d+$/
const ORDERED_LIST_TYPE_REGEX = /^[1AaIi]$/
const HTML_ELEMENT_ID_REGEX = /^[a-z0-9:_.-]+$/i
const DEFAULT_VOID_TAGS = new Set(["br", "hr", "img", "input"])
const BLOG_VOID_TAGS = DEFAULT_VOID_TAGS

const SANITIZER_CONFIG_BY_PROFILE = {
  blog: {
    allowedGlobalAttributes: BLOG_ALLOWED_GLOBAL_ATTRIBUTES,
    allowedTagAttributes: BLOG_ALLOWED_TAG_ATTRIBUTES,
    allowedTags: BLOG_ALLOWED_HTML_TAGS,
    voidTags: BLOG_VOID_TAGS,
  },
  default: {
    allowedGlobalAttributes: DEFAULT_ALLOWED_GLOBAL_ATTRIBUTES,
    allowedTagAttributes: DEFAULT_ALLOWED_TAG_ATTRIBUTES,
    allowedTags: DEFAULT_ALLOWED_HTML_TAGS,
    voidTags: DEFAULT_VOID_TAGS,
  },
} satisfies Record<
  SanitizerProfile,
  {
    allowedGlobalAttributes: Set<string>
    allowedTagAttributes: Record<string, Set<string>>
    allowedTags: Set<string>
    voidTags: Set<string>
  }
>

const isSafeAnchorHref = (value: string): boolean =>
  SAFE_ANCHOR_HREF_REGEX.test(value)

const isSafeImageSrc = (value: string): boolean =>
  SAFE_IMAGE_SRC_REGEX.test(value)

const isAllowedImageLoading = (value: string): boolean =>
  value === "lazy" || value === "eager"

const isAllowedImageDecoding = (value: string): boolean =>
  value === "async" || value === "sync" || value === "auto"

const sanitizeBlogStyle = (value: string): string => {
  const declarations: string[] = []

  for (const declaration of value.split(";")) {
    const separator = declaration.indexOf(":")
    if (separator === -1) {
      continue
    }

    const property = declaration.slice(0, separator).trim().toLowerCase()
    const propertyValue = declaration
      .slice(separator + 1)
      .trim()
      .toLowerCase()

    if (
      property === "text-align" &&
      BLOG_TEXT_ALIGN_REGEX.test(propertyValue)
    ) {
      declarations.push(`${property}: ${propertyValue}`)
      continue
    }

    if (
      property === "text-decoration" &&
      BLOG_TEXT_DECORATION_REGEX.test(propertyValue)
    ) {
      declarations.push(`${property}: ${propertyValue}`)
      continue
    }

    if (
      property === "padding-inline-start" &&
      BLOG_PADDING_INLINE_START_REGEX.test(propertyValue)
    ) {
      declarations.push(`${property}: ${propertyValue}`)
      continue
    }

    if (
      property === "list-style-type" &&
      BLOG_LIST_STYLE_TYPE_REGEX.test(propertyValue)
    ) {
      declarations.push(`${property}: ${propertyValue}`)
    }
  }

  return declarations.join("; ")
}

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

type AttributeAllowanceInput = {
  allowedAttributesForTag: Set<string>
  name: string
  options: SanitizeHtmlOptions
  profile: SanitizerProfile
  tag: string
  value: string
}

const isAttributeAllowed = ({
  allowedAttributesForTag,
  name,
  options,
  profile,
  tag,
  value,
}: AttributeAllowanceInput) => {
  if (
    SANITIZER_CONFIG_BY_PROFILE[profile].allowedGlobalAttributes.has(name) ||
    allowedAttributesForTag.has(name)
  ) {
    return true
  }

  return Boolean(
    options.additionalAllowedTagAttributes?.[tag]?.has(name) &&
      options.additionalAllowedAttributeValues?.[tag]?.[name]?.has(value)
  )
}

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

type SanitizedAttributeInput = {
  name: string
  profile: SanitizerProfile
  state: SanitizedAttributeState
  tag: string
  value: string
}

type BlogAttributeInput = Omit<SanitizedAttributeInput, "profile">

const applyBlogGlobalAttribute = ({
  name,
  state,
  value,
}: BlogAttributeInput) => {
  if (name === "id") {
    if (isBlogHeadingId(value)) {
      state.attributes.push(`id="${escapeHtmlAttribute(value)}"`)
    }
    return true
  }

  if (name !== "style") {
    return false
  }

  const style = sanitizeBlogStyle(value)
  if (style) {
    state.attributes.push(`style="${escapeHtmlAttribute(style)}"`)
  }
  return true
}

const applyBlogInputAttribute = ({
  name,
  state,
  tag,
  value,
}: BlogAttributeInput) => {
  if (tag !== "input") {
    return false
  }

  if (name === "type" && value.toLowerCase() === "checkbox") {
    state.attributes.push('type="checkbox"')
  } else if (name === "checked") {
    state.attributes.push("checked")
  }
  return true
}

const applyBlogListItemAttribute = ({
  name,
  state,
  tag,
  value,
}: BlogAttributeInput) => {
  if (tag !== "li") {
    return false
  }

  const isAllowed =
    (name === "aria-checked" && BOOLEAN_ATTRIBUTE_REGEX.test(value)) ||
    (name === "role" && value === "checkbox") ||
    (name === "tabindex" && TAB_INDEX_REGEX.test(value)) ||
    (name === "value" && POSITIVE_INTEGER_REGEX.test(value))
  if (isAllowed) {
    state.attributes.push(`${name}="${escapeHtmlAttribute(value)}"`)
  }
  return true
}

const applyBlogOrderedListAttribute = ({
  name,
  state,
  tag,
  value,
}: BlogAttributeInput) => {
  if (tag !== "ol") {
    return false
  }

  const hasValue =
    (name === "start" && POSITIVE_INTEGER_REGEX.test(value)) ||
    (name === "type" && ORDERED_LIST_TYPE_REGEX.test(value))
  if (hasValue) {
    state.attributes.push(`${name}="${escapeHtmlAttribute(value)}"`)
  } else if (name === "reversed") {
    state.attributes.push("reversed")
  }
  return true
}

const applyBlogLabelAttribute = ({
  name,
  state,
  tag,
  value,
}: BlogAttributeInput) => {
  if (tag !== "label") {
    return false
  }

  if (
    (name === "for" || name === "htmlfor") &&
    HTML_ELEMENT_ID_REGEX.test(value)
  ) {
    state.attributes.push(`for="${escapeHtmlAttribute(value)}"`)
  }
  return true
}

const applyBlogAttribute = (input: BlogAttributeInput) =>
  applyBlogGlobalAttribute(input) ||
  applyBlogInputAttribute(input) ||
  applyBlogListItemAttribute(input) ||
  applyBlogOrderedListAttribute(input) ||
  applyBlogLabelAttribute(input)

const applySanitizedAttribute = ({
  name,
  profile,
  state,
  tag,
  value,
}: SanitizedAttributeInput) => {
  if (tag === "a" && applyAnchorAttribute(state, name, value)) {
    return
  }

  if (tag === "img" && applyImageAttribute(state, name, value)) {
    return
  }

  if (profile === "blog" && applyBlogAttribute({ name, state, tag, value })) {
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

type CollectSanitizedAttributesInput = {
  options: SanitizeHtmlOptions
  profile: SanitizerProfile
  rawAttributes: string
  tag: string
}

const collectSanitizedAttributes = ({
  options,
  profile,
  rawAttributes,
  tag,
}: CollectSanitizedAttributesInput) => {
  const allowedAttributesForTag =
    SANITIZER_CONFIG_BY_PROFILE[profile].allowedTagAttributes[tag] ??
    new Set<string>()
  const parsedAttributes = parseTagAttributes(rawAttributes)

  if (
    profile === "blog" &&
    tag === "input" &&
    !parsedAttributes.some(
      ({ name, value }) => name === "type" && value.toLowerCase() === "checkbox"
    )
  ) {
    return null
  }

  const state = createAttributeState()
  for (const { name, value } of parsedAttributes) {
    if (
      isAttributeAllowed({
        allowedAttributesForTag,
        name,
        options,
        profile,
        tag,
        value,
      })
    ) {
      applySanitizedAttribute({ name, profile, state, tag, value })
    }
  }

  return state
}

const sanitizeOpeningTag = (
  tag: string,
  rawAttributes: string,
  profile: SanitizerProfile,
  options: SanitizeHtmlOptions
) => {
  const state = collectSanitizedAttributes({
    options,
    profile,
    rawAttributes: rawAttributes ?? "",
    tag,
  })
  if (!state) {
    return ""
  }

  if (tag === "a") {
    appendAnchorAttributes(state)
  }

  if (tag === "img" && !appendImageAttributes(state)) {
    return ""
  }

  if (profile === "blog" && tag === "input") {
    state.attributes.push("disabled")
  }

  const attributesString =
    state.attributes.length > 0 ? ` ${state.attributes.join(" ")}` : ""

  if (SANITIZER_CONFIG_BY_PROFILE[profile].voidTags.has(tag)) {
    return `<${tag}${attributesString}>`
  }

  return SELF_CLOSING_TAG_SUFFIX_REGEX.test(rawAttributes ?? "")
    ? `<${tag}${attributesString} />`
    : `<${tag}${attributesString}>`
}

type SanitizeHtmlTagInput = {
  closingSlash: string
  options: SanitizeHtmlOptions
  profile: SanitizerProfile
  rawAttributes: string
  rawTag: string
}

const sanitizeHtmlTag = ({
  closingSlash,
  options,
  profile,
  rawAttributes,
  rawTag,
}: SanitizeHtmlTagInput) => {
  const tag = rawTag.toLowerCase()
  const { allowedTags, voidTags } = SANITIZER_CONFIG_BY_PROFILE[profile]

  if (!(allowedTags.has(tag) || options.additionalAllowedTags?.has(tag))) {
    return ""
  }

  if (closingSlash === "/") {
    return voidTags.has(tag) ? "" : `</${tag}>`
  }

  return sanitizeOpeningTag(tag, rawAttributes, profile, options)
}

const sanitizeHtmlWithProfile = (
  html: string,
  profile: SanitizerProfile,
  options: SanitizeHtmlOptions = {}
): string => {
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
      sanitizeHtmlTag({
        closingSlash,
        options,
        profile,
        rawAttributes,
        rawTag,
      })
  )

  return sanitized.trim()
}

export const sanitizeHtml = (
  html: string,
  options: SanitizeHtmlOptions = {}
): string => sanitizeHtmlWithProfile(html, "default", options)

export const sanitizeBlogHtml = (html: string): string =>
  sanitizeHtmlWithProfile(html, "blog")

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
