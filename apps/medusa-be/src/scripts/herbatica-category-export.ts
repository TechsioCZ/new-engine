import { readFileSync } from "node:fs"
import {
  decodeXml,
  extractElements,
  extractFirstText,
  normalizeInlineText,
  normalizeText,
  readXmlSource,
} from "./herbatica-xml-utils"

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

function trimHtmlFragment(value?: string): string | undefined {
  const normalized = normalizeText(value)
  if (!normalized) {
    return
  }

  const trimmed = normalized.replace(/^\s+|\s+$/g, "")
  return trimmed === "" ? undefined : trimmed
}

function parseInteger(value?: string): number | undefined {
  const normalized = normalizeInlineText(value)
  if (!normalized) {
    return
  }

  const parsed = Number(normalized.replace(",", "."))
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined
}

function parseBoolean(value?: string): boolean | undefined {
  const normalized = normalizeInlineText(value)?.toLowerCase()
  if (!normalized) {
    return
  }

  if (["1", "true", "yes"].includes(normalized)) {
    return true
  }

  if (["0", "false", "no"].includes(normalized)) {
    return false
  }

  return
}

export function stripHtmlToPlainText(value?: string): string | undefined {
  if (!value) {
    return
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
    return
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

    if (!(id && title)) {
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
      linkText: normalizeInlineText(
        extractFirstText(element.inner, "LINK_TEXT")
      ),
      url: normalizeInlineText(extractFirstText(element.inner, "INDEX_NAME")),
      topDescriptionHtml: trimHtmlFragment(
        extractFirstText(element.inner, "TOP_DESCRIPTION")
      ),
      bottomDescriptionHtml: trimHtmlFragment(
        extractFirstText(element.inner, "BOTTOM_DESCRIPTION")
      ),
      metaTitle: normalizeInlineText(
        extractFirstText(element.inner, "META_TITLE")
      ),
      metaDescription: normalizeInlineText(
        extractFirstText(element.inner, "META_DESCRIPTION")
      ),
      isVisible:
        parseBoolean(extractFirstText(element.inner, "VISIBLE")) ?? true,
      expandInMenu:
        parseBoolean(extractFirstText(element.inner, "EXPAND_IN_MENU")) ??
        false,
      access: normalizeInlineText(extractFirstText(element.inner, "ACCESS")),
      priority: parseInteger(extractFirstText(element.inner, "PRIORITY")),
      pageType: normalizeInlineText(
        extractFirstText(element.inner, "PAGE_TYPE")
      ),
      searchPriority: parseInteger(
        extractFirstText(element.inner, "SEARCH_PRIORITY")
      ),
      isSystem:
        parseBoolean(extractFirstText(element.inner, "IS_SYSTEM")) ?? false,
    })
  }

  return categories
}

export function parseHerbaticaCategoriesXmlFile(
  path: string
): HerbaticaCategoryExport[] {
  return parseHerbaticaCategoriesXml(readFileSync(path, "utf8"))
}

export async function parseHerbaticaCategoriesXmlSource(
  source: string
): Promise<HerbaticaCategoryExport[]> {
  return parseHerbaticaCategoriesXml(await readXmlSource(source))
}
