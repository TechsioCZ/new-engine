import { readFileSync } from "node:fs"

import {
  decodeXml,
  extractElements,
  extractFirstText,
  normalizeInlineText,
  normalizeText,
  readXmlSource,
} from "./herbatica-xml-utils"

export interface HerbaticaCategoryExport {
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

const trimHtmlFragment = (value?: string): string | undefined => {
  const normalized = normalizeText(value)
  if (normalized === undefined || normalized === "") {
    return undefined
  }

  const trimmed = normalized.replaceAll(/^\s+|\s+$/gu, "")
  return trimmed === "" ? undefined : trimmed
}

const parseInteger = (value?: string): number | undefined => {
  const normalized = normalizeInlineText(value)
  if (normalized === undefined || normalized === "") {
    return undefined
  }

  const parsed = Number(normalized.replace(",", "."))
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined
}

const parseBoolean = (value?: string): boolean | undefined => {
  const normalized = normalizeInlineText(value)?.toLowerCase()
  if (normalized === undefined || normalized === "") {
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

const resolveParentId = (parentId?: string): string | undefined => {
  if (
    parentId === undefined ||
    parentId === "" ||
    parentId === "0" ||
    parentId === "1"
  ) {
    return undefined
  }

  return parentId
}

export const stripHtmlToPlainText = (value?: string): string | undefined => {
  if (value === undefined || value === "") {
    return undefined
  }

  const text = decodeXml(value)
    .replaceAll(/<script[\s\S]*?<\/script>/giu, " ")
    .replaceAll(/<style[\s\S]*?<\/style>/giu, " ")
    .replaceAll(/<br\s*\/?>/giu, " ")
    .replaceAll(/<\/p\s*>/giu, " ")
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim()

  return text === "" ? undefined : text
}

export const excerptPlainText = (
  value?: string,
  maxLength = 280,
): string | undefined => {
  const text = stripHtmlToPlainText(value)
  if (text === undefined) {
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

export const parseHerbaticaCategoriesXml = (
  xml: string,
): HerbaticaCategoryExport[] => {
  const categories: HerbaticaCategoryExport[] = []

  for (const element of extractElements(xml, "CATEGORY")) {
    const id = extractFirstText(element.inner, "ID")
    const title = normalizeInlineText(extractFirstText(element.inner, "TITLE"))

    if (id === undefined || id === "" || title === undefined || title === "") {
      continue
    }

    const parentId = normalizeInlineText(
      extractFirstText(element.inner, "PARENT_ID"),
    )

    const guid = normalizeInlineText(extractFirstText(element.inner, "GUID"))
    const resolvedParentId = resolveParentId(parentId)
    const linkText = normalizeInlineText(
      extractFirstText(element.inner, "LINK_TEXT"),
    )
    const url = normalizeInlineText(
      extractFirstText(element.inner, "INDEX_NAME"),
    )
    const topDescriptionHtml = trimHtmlFragment(
      extractFirstText(element.inner, "TOP_DESCRIPTION"),
    )
    const bottomDescriptionHtml = trimHtmlFragment(
      extractFirstText(element.inner, "BOTTOM_DESCRIPTION"),
    )
    const metaTitle = normalizeInlineText(
      extractFirstText(element.inner, "META_TITLE"),
    )
    const metaDescription = normalizeInlineText(
      extractFirstText(element.inner, "META_DESCRIPTION"),
    )
    const access = normalizeInlineText(
      extractFirstText(element.inner, "ACCESS"),
    )
    const priority = parseInteger(extractFirstText(element.inner, "PRIORITY"))
    const pageType = normalizeInlineText(
      extractFirstText(element.inner, "PAGE_TYPE"),
    )
    const searchPriority = parseInteger(
      extractFirstText(element.inner, "SEARCH_PRIORITY"),
    )

    categories.push({
      access,
      bottomDescriptionHtml,
      expandInMenu:
        parseBoolean(extractFirstText(element.inner, "EXPAND_IN_MENU")) ??
        false,
      guid,
      id,
      isSystem:
        parseBoolean(extractFirstText(element.inner, "IS_SYSTEM")) ?? false,
      isVisible:
        parseBoolean(extractFirstText(element.inner, "VISIBLE")) ?? true,
      linkText,
      metaDescription,
      metaTitle,
      pageType,
      parentId: resolvedParentId,
      priority,
      searchPriority,
      title,
      topDescriptionHtml,
      url,
    })
  }

  return categories
}

export const parseHerbaticaCategoriesXmlFile = (
  path: string,
): HerbaticaCategoryExport[] =>
  parseHerbaticaCategoriesXml(readFileSync(path, "utf-8"))

export const parseHerbaticaCategoriesXmlSource = async (
  source: string,
): Promise<HerbaticaCategoryExport[]> =>
  parseHerbaticaCategoriesXml(await readXmlSource(source))
