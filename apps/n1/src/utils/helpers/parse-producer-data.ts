import type { Producer } from "@/types/product"
import type { ParsedProducerInfo, ProducerEntity } from "@/types/product-page"

const TAX_ID_PREFIX_REGEX = /^TAX ID:\s*/i
const PHONE_PREFIX_REGEX = /^Tel:\s*/i
const MANUFACTURER_PREFIX_REGEX = /^.*(?:V\u00fdrobce|Vyrobce):\s*/i
const DISTRIBUTOR_PREFIX_REGEX = /^.*Distributor do (?:\u010cR|CR):\s*/i
const TAG_REGEX = /<[^>]+>/g
const PARAGRAPH_REGEX = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
const LINK_HREF_REGEX = /<a\b[^>]*href=(["'])(.*?)\1/i
const SEARCH_NORMALIZATION_REGEX = /[\u0300-\u036f]/g
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const LATIN_NAMED_ENTITY_REGEX =
  /^([A-Za-z]{1,2})(acute|caron|cedil|circ|grave|macr|ring|tilde|uml)$/

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
}

const HTML_ENTITY_DIACRITIC_MAP: Record<string, string> = {
  acute: "\u0301",
  caron: "\u030C",
  cedil: "\u0327",
  circ: "\u0302",
  grave: "\u0300",
  macr: "\u0304",
  ring: "\u030A",
  tilde: "\u0303",
  uml: "\u0308",
}

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

const normalizeForSearch = (value: string): string =>
  value.normalize("NFD").replace(SEARCH_NORMALIZATION_REGEX, "").toLowerCase()

const isValidCodePoint = (value: number): boolean =>
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 0x10_ff_ff &&
  !(value >= 0xd8_00 && value <= 0xdf_ff)

const decodeNumericHtmlEntity = (
  entity: string,
  token: string,
  base: 10 | 16
): string => {
  const codePoint = Number.parseInt(token, base)

  return isValidCodePoint(codePoint) ? String.fromCodePoint(codePoint) : entity
}

const decodeLatinNamedEntity = (token: string): string | undefined => {
  const match = token.match(LATIN_NAMED_ENTITY_REGEX)

  if (!match) {
    return
  }

  const [, baseLetter, diacriticName = ""] = match
  const diacritic = HTML_ENTITY_DIACRITIC_MAP[diacriticName.toLowerCase()]

  return diacritic ? `${baseLetter}${diacritic}`.normalize("NFC") : undefined
}

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token: string) => {
    const lowerToken = token.toLowerCase()

    if (lowerToken.startsWith("#x")) {
      return decodeNumericHtmlEntity(entity, lowerToken.slice(2), 16)
    }

    if (lowerToken.startsWith("#")) {
      return decodeNumericHtmlEntity(entity, lowerToken.slice(1), 10)
    }

    return (
      HTML_ENTITY_MAP[lowerToken] ?? decodeLatinNamedEntity(token) ?? entity
    )
  })

const stripTags = (value: string): string =>
  value.replace(/<br\s*\/?>/gi, "\n").replace(TAG_REGEX, "")

const cleanText = (value: string): string =>
  stripTags(decodeHtmlEntities(value)).replace(/\s+/g, " ").trim()

const extractParagraphs = (html: string): string[] => {
  const paragraphs: string[] = []

  for (const match of html.matchAll(PARAGRAPH_REGEX)) {
    paragraphs.push(cleanText(match[1] ?? ""))
  }

  return paragraphs
}

const extractFirstLinkHref = (html: string): string | undefined => {
  const match = html.match(LINK_HREF_REGEX)
  return match?.[2] ? decodeHtmlEntities(match[2]) : undefined
}

const findParagraphIndex = (paragraphs: string[], pattern: string): number =>
  paragraphs.findIndex((paragraph) =>
    normalizeForSearch(paragraph).includes(pattern)
  )

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
    const sizingGuideUrl = extractFirstLinkHref(sizingAttr.value)
    const paragraphs = extractParagraphs(sizingAttr.value)

    const manufacturerIndex = findParagraphIndex(paragraphs, "vyrobce:")
    const responsibleIndex = findParagraphIndex(paragraphs, "osoba zodpovedna")
    const distributorIndex = findParagraphIndex(
      paragraphs,
      "distributor do cr:"
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

    if (!(sizingGuideUrl || manufacturer || responsiblePerson || distributor)) {
      return null
    }

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

function findTaxId(paragraphs: string[]): string | undefined {
  return paragraphs
    .find((paragraph) =>
      normalizeForSearch(paragraph).includes(normalizeForSearch("TAX ID:"))
    )
    ?.replace(TAX_ID_PREFIX_REGEX, "")
    .trim()
}

function findEmail(paragraphs: string[]): string | undefined {
  return paragraphs
    .map((paragraph) => paragraph.match(EMAIL_REGEX)?.[0])
    .find(Boolean)
}

function findPhone(paragraphs: string[]): string | undefined {
  return paragraphs
    .find((paragraph) =>
      normalizeForSearch(paragraph).startsWith(normalizeForSearch("Tel:"))
    )
    ?.replace(PHONE_PREFIX_REGEX, "")
    .trim()
}

function parseManufacturerSection(
  paragraphs: string[]
): ProducerEntity | undefined {
  if (paragraphs.length === 0) {
    return
  }

  const name =
    paragraphs[0]?.replace(MANUFACTURER_PREFIX_REGEX, "").trim() || ""

  if (!name) {
    return
  }

  const addressParts = [paragraphs[1], paragraphs[2]].filter(Boolean)
  const address = addressParts.join(", ")

  const taxId = findTaxId(paragraphs)
  const email = findEmail(paragraphs)
  const phone = findPhone(paragraphs)

  return {
    name,
    address,
    taxId,
    email,
    phone,
  }
}

function parseResponsibleSection(
  paragraphs: string[]
): ProducerEntity | undefined {
  if (paragraphs.length < 2) {
    return
  }

  const name = paragraphs[1]?.trim() || ""

  if (!name) {
    return
  }

  const address = paragraphs[2]?.trim() || ""
  const taxId = findTaxId(paragraphs)
  const email = findEmail(paragraphs)
  const phone = findPhone(paragraphs)

  return {
    name,
    address,
    taxId,
    email,
    phone,
  }
}

function extractDistributor(paragraph: string): string | undefined {
  const text = paragraph.trim()
  if (!text) {
    return
  }

  return text.replace(DISTRIBUTOR_PREFIX_REGEX, "").trim() || undefined
}
