"use client"

import { sanitize } from "isomorphic-dompurify"
import { createElement, Fragment } from "react"
import type { ReactNode } from "react"

/*
 * Sanitized rich-text renderer shared by storefront consumers.
 *
 * @component SafeHtml
 * @componentVersion v1.0.0
 * @skill safe-html-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */

export interface SafeHtmlPolicy {
  allowedAttributes?: Readonly<Record<string, readonly string[]>>
  allowedTags: readonly string[]
  sanitize?: (html: string) => string
}

export interface SafeHtmlProps {
  html: string
  policy: SafeHtmlPolicy
}

const ATTRIBUTE_NAME_PATTERN = /^[a-z][a-z0-9:-]*$/u
const TAG_NAME_PATTERN = /^[a-z][a-z0-9-]*$/u
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*$/iu
const EVENT_ATTRIBUTE_PATTERN = /^on/iu
const SAFE_URL_SCHEMES = new Set(["http", "https", "mailto", "tel"])
const URL_ATTRIBUTES = new Set([
  "action",
  "formaction",
  "href",
  "src",
  "xlink:href",
])
const URL_LIST_ATTRIBUTES = new Set(["srcset"])
const FORBIDDEN_ATTRIBUTES = new Set(["style"])
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
])
interface SafeElementProperties extends Record<string, unknown> {
  rel?: unknown
  target?: unknown
}

const REACT_ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  "accept-charset": "acceptCharset",
  charset: "charSet",
  class: "className",
  colspan: "colSpan",
  crossorigin: "crossOrigin",
  for: "htmlFor",
  "http-equiv": "httpEquiv",
  rowspan: "rowSpan",
  srcset: "srcSet",
  tabindex: "tabIndex",
  usemap: "useMap",
}

const normalizeName = (value: string): string => value.trim().toLowerCase()

const isAllowedPolicyAttribute = (attribute: string): boolean =>
  ATTRIBUTE_NAME_PATTERN.test(attribute) &&
  !EVENT_ATTRIBUTE_PATTERN.test(attribute) &&
  !FORBIDDEN_ATTRIBUTES.has(attribute)

const createAllowedTags = (policy: SafeHtmlPolicy): ReadonlySet<string> => {
  const allowedTags = new Set<string>()
  for (const rawTag of policy.allowedTags) {
    const tag = normalizeName(rawTag)
    if (TAG_NAME_PATTERN.test(tag)) {
      allowedTags.add(tag)
    }
  }
  return allowedTags
}

const createAllowedAttributes = (
  policy: SafeHtmlPolicy,
): ReadonlyMap<string, ReadonlySet<string>> => {
  const attributesByTag = new Map<string, ReadonlySet<string>>()

  for (const [rawTag, rawAttributes] of Object.entries(
    policy.allowedAttributes ?? {},
  )) {
    const tag = normalizeName(rawTag)
    if (!(tag === "*" || TAG_NAME_PATTERN.test(tag))) {
      continue
    }

    const allowedAttributes = new Set<string>()
    for (const rawAttribute of rawAttributes) {
      const attribute = normalizeName(rawAttribute)
      if (isAllowedPolicyAttribute(attribute)) {
        allowedAttributes.add(attribute)
      }
    }
    attributesByTag.set(tag, allowedAttributes)
  }

  return attributesByTag
}

const flattenAllowedAttributes = (
  attributesByTag: ReadonlyMap<string, ReadonlySet<string>>,
): string[] => {
  const allowedAttributes = new Set<string>()
  for (const attributes of attributesByTag.values()) {
    for (const attribute of attributes) {
      allowedAttributes.add(attribute)
    }
  }
  return [...allowedAttributes]
}

const isSafeUrl = (value: string): boolean => {
  const normalizedValue = value.trim()
  const colonIndex = normalizedValue.indexOf(":")
  if (colonIndex === -1) {
    return true
  }
  const scheme = normalizedValue.slice(0, colonIndex)
  return (
    URL_SCHEME_PATTERN.test(scheme) &&
    SAFE_URL_SCHEMES.has(scheme.toLowerCase())
  )
}

const isSafeUrlList = (value: string): boolean =>
  value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/u)[0] ?? "")
    .every((candidate) => candidate !== "" && isSafeUrl(candidate))

const isHtmlElement = (node: Node): node is Element => node.nodeType === 1

const isAllowedAttributeValue = (name: string, value: string): boolean => {
  if (URL_ATTRIBUTES.has(name)) {
    return isSafeUrl(value)
  }
  if (URL_LIST_ATTRIBUTES.has(name)) {
    return isSafeUrlList(value)
  }
  return true
}

const createElementProperties = (
  element: Element,
  key: string,
  allowedAttributes: ReadonlySet<string>,
): SafeElementProperties => {
  const properties: SafeElementProperties = { key }

  for (const attribute of element.attributes) {
    const name = normalizeName(attribute.name)
    if (
      !allowedAttributes.has(name) ||
      !isAllowedPolicyAttribute(name) ||
      !isAllowedAttributeValue(name, attribute.value)
    ) {
      continue
    }

    properties[REACT_ATTRIBUTE_NAMES[name] ?? name] = attribute.value
  }

  if (properties.target === "_blank") {
    const existingRelTokens =
      typeof properties.rel === "string"
        ? properties.rel.split(/\s+/u).filter((token) => token !== "")
        : []
    const relTokens = new Set([...existingRelTokens, "noopener", "noreferrer"])
    properties.rel = [...relTokens].join(" ")
  }

  return properties
}

interface RenderNodeInput {
  allowedAttributesByTag: ReadonlyMap<string, ReadonlySet<string>>
  allowedTags: ReadonlySet<string>
  key: string
  node: Node
}

const renderSanitizedNode = ({
  allowedAttributesByTag,
  allowedTags,
  key,
  node,
}: RenderNodeInput): ReactNode => {
  if (node.nodeType === 3) {
    return node.textContent
  }
  if (!isHtmlElement(node)) {
    return null
  }

  const tag = normalizeName(node.tagName)
  if (!allowedTags.has(tag)) {
    return null
  }

  const allowedAttributes = new Set([
    ...(allowedAttributesByTag.get("*") ?? []),
    ...(allowedAttributesByTag.get(tag) ?? []),
  ])
  const properties = createElementProperties(node, key, allowedAttributes)
  const children = [...node.childNodes].map((child, index): ReactNode =>
    renderSanitizedNode({
      allowedAttributesByTag,
      allowedTags,
      key: `${key}-${index}`,
      node: child,
    }),
  )

  return VOID_TAGS.has(tag)
    ? createElement(tag, properties)
    : createElement(tag, properties, children)
}

export const SafeHtml = ({ html, policy }: SafeHtmlProps) => {
  if (html === "") {
    return null
  }

  const allowedTags = createAllowedTags(policy)
  if (allowedTags.size === 0) {
    return null
  }

  const allowedAttributesByTag = createAllowedAttributes(policy)
  const sanitizerConfig = {
    ALLOWED_ATTR: flattenAllowedAttributes(allowedAttributesByTag),
    ALLOWED_TAGS: [...allowedTags],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ["style"],
    FORBID_TAGS: ["iframe", "object", "script", "style", "template"],
  }
  const policySanitizedHtml = policy.sanitize?.(html) ?? html
  const fragment = sanitize(policySanitizedHtml, {
    ...sanitizerConfig,
    RETURN_DOM_FRAGMENT: true,
  })
  const content = [...fragment.childNodes].map((node, index): ReactNode =>
    renderSanitizedNode({
      allowedAttributesByTag,
      allowedTags,
      key: `safe-html-${index}`,
      node,
    }),
  )
  return <Fragment key="safe-html-content">{content}</Fragment>
}
