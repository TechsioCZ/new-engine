import type { Producer } from "@/types/product"
import type { ParsedProducerInfo, ProducerEntity } from "@/types/product-page"

const TAX_ID_REGEX = /TAX ID:\s*/i
const PHONE_PREFIX_REGEX = /Tel:\s*/i
const MANUFACTURER_PREFIX_REGEX = /^.*Výrobce:\s*/
const DISTRIBUTOR_PREFIX_REGEX = /^.*Distributor do ČR:\s*/i

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
  paragraphs: Element[],
  startIndex: number,
  endIndex: number,
  parser: (sectionParagraphs: Element[]) => ProducerEntity | undefined
): ProducerEntity | undefined => {
  if (startIndex < 0) {
    return
  }
  return parser(paragraphs.slice(startIndex, endIndex))
}

const extractDistributorAtIndex = (
  paragraphs: Element[],
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

  if (typeof DOMParser === "undefined") {
    return null
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(sizingAttr.value, "text/html")

    // Check for parsing errors
    const parserError = doc.querySelector("parsererror")
    if (parserError) {
      console.error("[parseProducerData] HTML parsing failed")
      return null
    }

    const firstLink = doc.querySelector("a")
    const sizingGuideUrl = firstLink?.href || undefined
    const paragraphs = Array.from(doc.querySelectorAll("p"))
    const manufacturerIndex = paragraphs.findIndex((p) =>
      p.textContent?.includes("Výrobce:")
    )

    const responsibleIndex = paragraphs.findIndex((p) =>
      p.textContent?.includes("Osoba zodpovědná")
    )

    const distributorIndex = paragraphs.findIndex((p) =>
      p.textContent?.includes("Distributor do ČR:")
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

function findTaxId(paragraphs: Element[]): string | undefined {
  return paragraphs
    .find((p) => p.textContent?.includes("TAX ID:"))
    ?.textContent?.replace(TAX_ID_REGEX, "")
    .trim()
}

function findEmail(paragraphs: Element[]): string | undefined {
  const emailElement = paragraphs.find((p) => p.querySelector("a"))
  return (
    emailElement?.querySelector("a")?.textContent?.trim() ||
    paragraphs.find((p) => p.textContent?.includes("@"))?.textContent?.trim()
  )
}

function findPhone(paragraphs: Element[]): string | undefined {
  return paragraphs
    .find((p) => p.textContent?.includes("Tel:"))
    ?.textContent?.replace(PHONE_PREFIX_REGEX, "")
    .trim()
}

function parseManufacturerSection(
  paragraphs: Element[]
): ProducerEntity | undefined {
  if (paragraphs.length === 0) {
    return
  }

  const name =
    paragraphs[0]?.textContent?.replace(MANUFACTURER_PREFIX_REGEX, "").trim() ||
    ""

  if (!name) {
    return
  }

  const addressParts = [
    paragraphs[1]?.textContent?.trim(),
    paragraphs[2]?.textContent?.trim(),
  ].filter(Boolean)

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
  paragraphs: Element[]
): ProducerEntity | undefined {
  if (paragraphs.length < 2) {
    return
  }

  const name = paragraphs[1]?.textContent?.trim() || ""

  if (!name) {
    return
  }

  const address = paragraphs[2]?.textContent?.trim() || ""

  // Use helper functions to extract contact details
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

function extractDistributor(paragraph: Element): string | undefined {
  const text = paragraph.textContent?.trim()
  if (!text) {
    return
  }

  return text.replace(DISTRIBUTOR_PREFIX_REGEX, "").trim() || undefined
}
