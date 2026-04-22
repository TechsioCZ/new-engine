import { readFileSync } from "node:fs"

type XmlElement = {
  attributes: Record<string, string>
  inner: string
}

export type HerbaticaCategoryExport = {
  id: string
  guid?: string
  parentId?: string
  title: string
  linkText?: string
  url?: string
  topDescriptionHtml?: string
  bottomDescriptionHtml?: string
  metaTitle?: string
  metaDescription?: string
  isVisible: boolean
  expandInMenu: boolean
  access?: string
  priority?: number
  pageType?: string
  searchPriority?: number
  isSystem: boolean
}

const ENTITY_MAP: Record<string, string> = {
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&nbsp;": " ",
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      const parsed = Number.parseInt(hex, 16)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replace(/&#([0-9]+);/g, (match, num) => {
      const parsed = Number.parseInt(num, 10)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replace(/&quot;|&apos;|&lt;|&gt;|&amp;|&nbsp;/g, (entity) => {
      return ENTITY_MAP[entity] ?? entity
    })
}

function normalizeText(value?: string): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const decoded = decodeXml(value).replace(/\r\n/g, "\n").trim()
  return decoded === "" ? undefined : decoded
}

function normalizeInlineText(value?: string): string | undefined {
  const normalized = normalizeText(value)
  if (normalized === undefined) {
    return undefined
  }

  return normalized.replace(/\s+/g, " ").trim()
}

function trimHtmlFragment(value?: string): string | undefined {
  const normalized = normalizeText(value)
  if (!normalized) {
    return undefined
  }

  const trimmed = normalized.replace(/^\s+|\s+$/g, "")
  return trimmed === "" ? undefined : trimmed
}

function parseAttributes(raw?: string): Record<string, string> {
  if (!raw) {
    return {}
  }

  const attributes: Record<string, string> = {}
  const regex = /([:\w-]+)\s*=\s*"([^"]*)"/g
  for (const match of raw.matchAll(regex)) {
    const key = normalizeInlineText(match[1])
    if (!key) {
      continue
    }
    attributes[key] = normalizeText(match[2]) ?? ""
  }

  return attributes
}

function extractElements(source: string, tag: string): XmlElement[] {
  const regex = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g")
  const result: XmlElement[] = []

  for (const match of source.matchAll(regex)) {
    result.push({
      attributes: parseAttributes(match[1]),
      inner: match[2] ?? "",
    })
  }

  return result
}

function extractFirstElementContent(
  source: string,
  tag: string
): string | undefined {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`)
  const match = source.match(regex)
  return match?.[1]
}

function extractFirstText(source: string, tag: string): string | undefined {
  return normalizeText(extractFirstElementContent(source, tag))
}

function parseInteger(value?: string): number | undefined {
  const normalized = normalizeInlineText(value)
  if (!normalized) {
    return undefined
  }

  const parsed = Number(normalized.replace(",", "."))
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined
}

function parseBoolean(value?: string): boolean | undefined {
  const normalized = normalizeInlineText(value)?.toLowerCase()
  if (!normalized) {
    return undefined
  }

  if (["1", "true", "yes"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no"].includes(normalized)) {
    return false
  }

  return undefined
}

export function stripHtmlToPlainText(value?: string): string | undefined {
  if (!value) {
    return undefined
  }

  const text = decodeXml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return text === "" ? undefined : text
}

export function excerptPlainText(
  value?: string,
  maxLength = 280
): string | undefined {
  const text = stripHtmlToPlainText(value)
  if (!text) {
    return undefined
  }

  if (text.length <= maxLength) {
    return text
  }

  const sliced = text.slice(0, maxLength)
  const lastSpace = sliced.lastIndexOf(" ")
  const excerpt = (lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()
  return `${excerpt}…`
}

export function parseHerbaticaCategoriesXml(
  xml: string
): HerbaticaCategoryExport[] {
  const categories: HerbaticaCategoryExport[] = []

  for (const element of extractElements(xml, "CATEGORY")) {
    const id = extractFirstText(element.inner, "ID")
    const title = normalizeInlineText(extractFirstText(element.inner, "TITLE"))

    if (!id || !title) {
      continue
    }

    const parentId = normalizeInlineText(
      extractFirstText(element.inner, "PARENT_ID")
    )

    categories.push({
      id,
      guid: normalizeInlineText(extractFirstText(element.inner, "GUID")),
      parentId:
        parentId && parentId !== "0" && parentId !== "1" ? parentId : undefined,
      title,
      linkText: normalizeInlineText(extractFirstText(element.inner, "LINK_TEXT")),
      url: normalizeInlineText(extractFirstText(element.inner, "INDEX_NAME")),
      topDescriptionHtml: trimHtmlFragment(
        extractFirstText(element.inner, "TOP_DESCRIPTION")
      ),
      bottomDescriptionHtml: trimHtmlFragment(
        extractFirstText(element.inner, "BOTTOM_DESCRIPTION")
      ),
      metaTitle: normalizeInlineText(extractFirstText(element.inner, "META_TITLE")),
      metaDescription: normalizeInlineText(
        extractFirstText(element.inner, "META_DESCRIPTION")
      ),
      isVisible: parseBoolean(extractFirstText(element.inner, "VISIBLE")) ?? true,
      expandInMenu:
        parseBoolean(extractFirstText(element.inner, "EXPAND_IN_MENU")) ?? false,
      access: normalizeInlineText(extractFirstText(element.inner, "ACCESS")),
      priority: parseInteger(extractFirstText(element.inner, "PRIORITY")),
      pageType: normalizeInlineText(extractFirstText(element.inner, "PAGE_TYPE")),
      searchPriority: parseInteger(
        extractFirstText(element.inner, "SEARCH_PRIORITY")
      ),
      isSystem: parseBoolean(extractFirstText(element.inner, "IS_SYSTEM")) ?? false,
    })
  }

  return categories
}

export function parseHerbaticaCategoriesXmlFile(
  path: string
): HerbaticaCategoryExport[] {
  return parseHerbaticaCategoriesXml(readFileSync(path, "utf8"))
}
