import type { HttpTypes } from "@medusajs/types"

import { asRecord } from "./product-card.parsers"

const SENTENCE_BOUNDARY_PATTERN = /(?<=[.!?])\s+/u
const SENTENCE_TRAILING_PUNCTUATION_PATTERN = /[.!?]+$/u

const decodeHtmlEntities = (value: string): string =>
  value
    .replaceAll(/&nbsp;/giu, " ")
    .replaceAll(/&amp;/giu, "&")
    .replaceAll(/&lt;/giu, "<")
    .replaceAll(/&gt;/giu, ">")
    .replaceAll(/&quot;/giu, '"')
    .replaceAll(/&#39;/giu, "'")

const stripHtml = (value: string): string =>
  decodeHtmlEntities(value)
    .replaceAll(/<br\s*\/?>/giu, "\n")
    .replaceAll(/<\/(?:p|div|li|ul|ol|h[1-6])>/giu, "\n")
    .replaceAll(/<[^>]*>/gu, "")
    .replaceAll(/[ \t]+\n/gu, "\n")
    .replaceAll(/\n{2,}/gu, "\n")
    .replaceAll(/[ \t]{2,}/gu, " ")
    .trim()

const toBulletLines = (value: string): string | null => {
  const sentences = value
    .split(SENTENCE_BOUNDARY_PATTERN)
    .map((sentence) =>
      sentence.trim().replace(SENTENCE_TRAILING_PUNCTUATION_PATTERN, ""),
    )
    .filter(Boolean)

  if (sentences.length < 2) {
    return null
  }

  return sentences
    .slice(0, 3)
    .map((sentence) => `• ${sentence}`)
    .join("\n")
}

const extractListItems = (value: string): string[] => {
  const listMatches = [...value.matchAll(/<li[^>]*>[\s\S]*?<\/li>/giu)]
  if (listMatches.length === 0) {
    return []
  }

  return listMatches.flatMap((item) => {
    const content = stripHtml(item[0])
    return content.length > 0 ? [content] : []
  })
}

export const resolveDescription = (
  product: HttpTypes.StoreProduct,
): string | null => {
  const metadata = asRecord(product.metadata)
  const contentSectionsMap = asRecord(metadata?.["content_sections_map"])
  const descriptionSection =
    typeof contentSectionsMap?.["description"] === "string"
      ? contentSectionsMap["description"]
      : null
  const usageSection =
    typeof contentSectionsMap?.["usage"] === "string"
      ? contentSectionsMap["usage"]
      : null
  const shortDescription =
    typeof metadata?.["short_description"] === "string"
      ? metadata["short_description"]
      : null

  const htmlCandidates = [
    descriptionSection,
    usageSection,
    shortDescription,
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  )

  for (const candidate of htmlCandidates) {
    const listItems = extractListItems(candidate)
    if (listItems.length === 0) {
      continue
    }

    const cardListItems = listItems.length > 1 ? listItems.slice(1) : listItems

    return cardListItems
      .slice(0, 3)
      .map((item) => `• ${item}`)
      .join("\n")
  }

  const textSource = htmlCandidates.find(
    (candidate) => stripHtml(candidate).length > 0,
  )
  if (textSource === undefined) {
    return null
  }

  const text = stripHtml(textSource)
  if (text.length === 0) {
    return null
  }

  return toBulletLines(text) ?? text
}
