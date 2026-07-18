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

const escapeHtmlAttribute = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const parseTagAttributes = (rawAttributes: string) => {
  const attributes: Array<{ name: string; value: string }> = []
  const pattern =
    /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match = pattern.exec(rawAttributes)
  while (match) {
    const name = match[1]?.toLowerCase()
    if (name) {
      attributes.push({
        name,
        value: (match[2] ?? match[3] ?? match[4] ?? "").trim(),
      })
    }
    match = pattern.exec(rawAttributes)
  }
  return attributes
}

type AttributeState = {
  attributes: string[]
  href: string | null
  imageSrc: string | null
  hasImageLoading: boolean
  hasImageDecoding: boolean
  target: string | null
  rel: string | null
}

const createState = (): AttributeState => ({
  attributes: [],
  href: null,
  imageSrc: null,
  hasImageLoading: false,
  hasImageDecoding: false,
  target: null,
  rel: null,
})

export const sanitizeTagAttributes = (tag: string, rawAttributes: string) => {
  const allowed = ALLOWED_TAG_ATTRIBUTES[tag] ?? new Set<string>()
  const state = createState()
  for (const { name, value } of parseTagAttributes(rawAttributes)) {
    if (!(ALLOWED_GLOBAL_ATTRIBUTES.has(name) || allowed.has(name))) {
      continue
    }
    if (tag === "a" && name === "href") {
      state.href = SAFE_ANCHOR_HREF_REGEX.test(value) ? value : null
    } else if (tag === "a" && name === "target") {
      state.target = value
    } else if (tag === "a" && name === "rel") {
      state.rel = value
    } else if (tag === "img" && name === "src") {
      state.imageSrc = SAFE_IMAGE_SRC_REGEX.test(value) ? value : null
    } else if (tag === "img" && name === "loading") {
      state.hasImageLoading = value === "lazy" || value === "eager"
    } else if (tag === "img" && name === "decoding") {
      state.hasImageDecoding = ["async", "sync", "auto"].includes(value)
    } else if (value) {
      state.attributes.push(`${name}="${escapeHtmlAttribute(value)}"`)
    }
  }
  if (tag === "a" && state.href) {
    state.attributes.push(`href="${escapeHtmlAttribute(state.href)}"`)
    if (HTTP_URL_REGEX.test(state.href)) {
      state.attributes.push('target="_blank"', 'rel="noopener noreferrer"')
    } else {
      if (state.target)
        state.attributes.push(`target="${escapeHtmlAttribute(state.target)}"`)
      if (state.rel)
        state.attributes.push(`rel="${escapeHtmlAttribute(state.rel)}"`)
    }
  }
  if (tag === "img") {
    if (!state.imageSrc) return null
    state.attributes.push(`src="${escapeHtmlAttribute(state.imageSrc)}"`)
    if (!state.hasImageLoading) state.attributes.push('loading="lazy"')
    if (!state.hasImageDecoding) state.attributes.push('decoding="async"')
  }
  return state.attributes
}
