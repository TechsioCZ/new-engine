import type { Producer } from "@/types/product"
import type { ParsedProducerInfo, ProducerEntity } from "@/types/product-page"

const TAX_ID_REGEX = /TAX ID:\s*/i
const PHONE_PREFIX_REGEX = /Tel:\s*/i
const MANUFACTURER_PREFIX_REGEX = /^.*výrobce:\s*/i
const DISTRIBUTOR_PREFIX_REGEX = /^.*Distributor do ČR:\s*/i
const RESPONSIBLE_PERSON_REGEX = /osoba zodpovědná|zodpovědná osoba/i
const MANUFACTURER_REGEX = /výrobce:/i
const PARAGRAPH_REGEX = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
const ANCHOR_HREF_REGEX = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/i
const HTML_TAG_REGEX = /<[^>]+>/g

const getSectionEndIndex = (
  primaryIndex: number,
  secondaryIndex: number,
  total: number
): number => {
  if (primaryIndex > -1) {
    return primaryIndex
  }
  if (secondaryIndex > -1) {
    return secondaryIndex
  }
  return total
}

const parseSection = (
  paragraphs: string[],
  startIndex: number,
  endIndex: number,
  parser: (sectionParagraphs: string[]) => ProducerEntity | undefined
): ProducerEntity | undefined => {
  if (startIndex < 0) {
    return
  }
  return parser(paragraphs.slice(startIndex, endIndex))
}

const extractDistributorAtIndex = (
  paragraphs: string[],
  index: number
): string | undefined => {
  if (index < 0) {
    return
  }
  const distributorParagraph = paragraphs[index]
  return distributorParagraph
    ? extractDistributor(distributorParagraph)
    : undefined
}

export const parseProducerData = (
  attributes?: Producer["attributes"]
): ParsedProducerInfo | null => {
  if (!attributes || attributes.length === 0) {
    return null
  }

  const sizingAttr = attributes.find(
    (attr) => attr.attributeType?.name === "sizing_info"
  )

  if (!sizingAttr?.value) {
    return null
  }

  try {
    const sizingGuideUrl = extractFirstHref(sizingAttr.value)
    const paragraphs = extractParagraphs(sizingAttr.value)
    const manufacturerIndex = paragraphs.findIndex((paragraph) =>
      MANUFACTURER_REGEX.test(paragraph)
    )

    const responsibleIndex = paragraphs.findIndex((paragraph) =>
      RESPONSIBLE_PERSON_REGEX.test(paragraph)
    )

    const distributorIndex = paragraphs.findIndex((paragraph) =>
      paragraph.includes("Distributor do ČR:")
    )

    const manufacturerEndIndex = getSectionEndIndex(
      responsibleIndex,
      distributorIndex,
      paragraphs.length
    )
    const manufacturer = parseSection(
      paragraphs,
      manufacturerIndex,
      manufacturerEndIndex,
      parseManufacturerSection
    )

    const responsibleEndIndex = getSectionEndIndex(
      distributorIndex,
      -1,
      paragraphs.length
    )
    const responsiblePerson = parseSection(
      paragraphs,
      responsibleIndex,
      responsibleEndIndex,
      parseResponsibleSection
    )

    const distributor = extractDistributorAtIndex(paragraphs, distributorIndex)

    return {
      sizingGuideUrl,
      manufacturer,
      responsiblePerson,
      distributor,
    }
  } catch (error) {
    console.error("[parseProducerData] Unexpected error:", error)
    return null
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
}

function normalizeText(value: string): string {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim()
}

function stripHtml(value: string): string {
  return normalizeText(value.replace(HTML_TAG_REGEX, " "))
}

function extractFirstHref(html: string): string | undefined {
  const match = html.match(ANCHOR_HREF_REGEX)
  return match?.[1] ? decodeHtmlEntities(match[1]) : undefined
}

function extractParagraphs(html: string): string[] {
  const matches = Array.from(html.matchAll(PARAGRAPH_REGEX))
  return matches
    .map(([, paragraph = ""]) => stripHtml(paragraph))
    .filter(Boolean)
}

function findTaxId(paragraphs: string[]): string | undefined {
  return paragraphs
    .find((paragraph) => paragraph.includes("TAX ID:"))
    ?.replace(TAX_ID_REGEX, "")
    .trim()
}

function findEmail(paragraphs: string[]): string | undefined {
  return paragraphs.find((paragraph) => paragraph.includes("@"))?.trim()
}

function findPhone(paragraphs: string[]): string | undefined {
  return paragraphs
    .find((paragraph) => paragraph.includes("Tel:"))
    ?.replace(PHONE_PREFIX_REGEX, "")
    .trim()
}

function parseEntitySection(paragraphs: string[], labelRegex: RegExp) {
  const content = paragraphs
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !labelRegex.test(paragraph))

  if (content.length === 0) {
    return
  }

  const primaryContent = content.filter(
    (paragraph) =>
      !paragraph.includes("@") &&
      !paragraph.includes("TAX ID:") &&
      !paragraph.includes("Tel:")
  )
  const [name = "", ...addressLines] = primaryContent

  return {
    name,
    address: addressLines.join(", "),
    taxId: findTaxId(content),
    email: findEmail(content),
    phone: findPhone(content),
  }
}

function parseResponsibleSection(
  paragraphs: string[]
): ProducerEntity | undefined {
  return parseEntitySection(paragraphs, RESPONSIBLE_PERSON_REGEX)
}

function parseManufacturerSection(
  paragraphs: string[]
): ProducerEntity | undefined {
  const info = parseEntitySection(paragraphs, MANUFACTURER_REGEX)
  if (!info?.name) {
    return
  }

  return {
    ...info,
    name: info.name.replace(MANUFACTURER_PREFIX_REGEX, "").trim(),
  }
}

function extractDistributor(paragraph: string): string | undefined {
  const text = paragraph.trim()
  if (!text) {
    return
  }

  return text.replace(DISTRIBUTOR_PREFIX_REGEX, "").trim() || undefined
}
