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
  guid?: string | undefined
  parentId?: string | undefined
  title: string
  linkText?: string | undefined
  url?: string | undefined
  topDescriptionHtml?: string | undefined
  bottomDescriptionHtml?: string | undefined
  metaTitle?: string | undefined
  metaDescription?: string | undefined
  isVisible: boolean
  expandInMenu: boolean
  access?: string | undefined
  priority?: number | undefined
  pageType?: string | undefined
  searchPriority?: number | undefined
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

    const guid = normalizeInlineText(extractFirstText(element.inner, "GUID"))
    const resolvedParentId =
      parentId && parentId !== "0" && parentId !== "1" ? parentId : undefined
    const linkText = normalizeInlineText(
      extractFirstText(element.inner, "LINK_TEXT")
    )
    const url = normalizeInlineText(
      extractFirstText(element.inner, "INDEX_NAME")
    )
    const topDescriptionHtml = trimHtmlFragment(
      extractFirstText(element.inner, "TOP_DESCRIPTION")
    )
    const bottomDescriptionHtml = trimHtmlFragment(
      extractFirstText(element.inner, "BOTTOM_DESCRIPTION")
    )
    const metaTitle = normalizeInlineText(
      extractFirstText(element.inner, "META_TITLE")
    )
    const metaDescription = normalizeInlineText(
      extractFirstText(element.inner, "META_DESCRIPTION")
    )
    const access = normalizeInlineText(
      extractFirstText(element.inner, "ACCESS")
    )
    const priority = parseInteger(extractFirstText(element.inner, "PRIORITY"))
    const pageType = normalizeInlineText(
      extractFirstText(element.inner, "PAGE_TYPE")
    )
    const searchPriority = parseInteger(
      extractFirstText(element.inner, "SEARCH_PRIORITY")
    )

    categories.push({
      id,
      guid,
      parentId: resolvedParentId,
      title,
      linkText,
      url,
      topDescriptionHtml,
      bottomDescriptionHtml,
      metaTitle,
      metaDescription,
      isVisible:
        parseBoolean(extractFirstText(element.inner, "VISIBLE")) ?? true,
      expandInMenu:
        parseBoolean(extractFirstText(element.inner, "EXPAND_IN_MENU")) ??
        false,
      access,
      priority,
      pageType,
      searchPriority,
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
