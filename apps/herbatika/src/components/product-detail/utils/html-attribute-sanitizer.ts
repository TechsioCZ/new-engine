import { parseTagAttributes } from "@/components/product-detail/utils/html-attribute-parser"
import {
  HTTP_URL_REGEX,
  isAllowedHtmlAttribute,
  SAFE_ANCHOR_HREF_REGEX,
  SAFE_IMAGE_SRC_REGEX,
} from "@/components/product-detail/utils/html-sanitizer-policy"
import type { SanitizeHtmlOptions } from "@/components/product-detail/utils/html-sanitizer-policy"

interface SanitizedAttributeState {
  attributes: string[]
  href: string | null
  imageSrc: string | null
  hasImageLoading: boolean
  hasImageDecoding: boolean
  target: string | null
  rel: string | null
}

const escapeHtmlAttribute = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

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
    if (SAFE_ANCHOR_HREF_REGEX.test(value)) {
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
    if (SAFE_IMAGE_SRC_REGEX.test(value)) {
      state.imageSrc = value
    }
    return true
  }
  if (name === "loading") {
    state.hasImageLoading = value === "lazy" || value === "eager"
    return true
  }
  if (name === "decoding") {
    state.hasImageDecoding =
      value === "async" || value === "sync" || value === "auto"
    return true
  }
  return false
}

const applyAttribute = (
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

export const sanitizeTagAttributes = (
  tag: string,
  rawAttributes: string,
  options: SanitizeHtmlOptions,
): string[] | null => {
  const state = createAttributeState()
  for (const { name, value } of parseTagAttributes(rawAttributes)) {
    if (isAllowedHtmlAttribute(tag, name, value, options)) {
      applyAttribute(state, tag, name, value)
    }
  }
  if (tag === "a") {
    appendAnchorAttributes(state)
  }
  if (tag === "img" && !appendImageAttributes(state)) {
    return null
  }
  return state.attributes
}
