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

const ALLOWED_TAG_ATTRIBUTES: Readonly<Record<string, ReadonlySet<string>>> = {
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

// ASCII case pairs avoid the broader Unicode folding of the `i` flag.
export const SAFE_ANCHOR_HREF_REGEX =
  /^(?:[hH][tT][tT][pP][sS]?:|[mM][aA][iI][lL][tT][oO]:|[tT][eE][lL]:|\/|#)/u
export const SAFE_IMAGE_SRC_REGEX = /^(?:[hH][tT][tT][pP][sS]?:|\/)/u
export const HTTP_URL_REGEX = /^[hH][tT][tT][pP][sS]?:/u
export const SELF_CLOSING_TAG_SUFFIX_REGEX = /\/\s*$/u

export const isAllowedHtmlTag = (tag: string, options: SanitizeHtmlOptions) =>
  ALLOWED_HTML_TAGS.has(tag) || options.additionalAllowedTags?.has(tag) === true

export const isAllowedHtmlAttribute = (
  tag: string,
  name: string,
  value: string,
  options: SanitizeHtmlOptions,
) =>
  ALLOWED_GLOBAL_ATTRIBUTES.has(name) ||
  ALLOWED_TAG_ATTRIBUTES[tag]?.has(name) === true ||
  (options.additionalAllowedTagAttributes?.[tag]?.has(name) === true &&
    options.additionalAllowedAttributeValues?.[tag]?.[name]?.has(value) ===
      true)
