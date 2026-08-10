import type { Brand } from "@/types/product"
import type { BrandEntity, ParsedBrandInfo } from "@/types/product-page"

const TAX_ID_REGEX = /TAX ID:\s*/iu
const PHONE_PREFIX_REGEX = /Tel:\s*/iu
const MANUFACTURER_PREFIX_REGEX = /^.*Výrobce:\s*/u
const DISTRIBUTOR_PREFIX_REGEX = /^.*Distributor do ČR:\s*/iu

const getSectionEndIndex = (
  primaryIndex: number,
  secondaryIndex: number,
  total: number,
): number => {
  if (primaryIndex > -1) {
    return primaryIndex
  }
  if (secondaryIndex > -1) {
    return secondaryIndex
  }
  return total
}

const findTaxId = (paragraphs: Element[]): string | undefined =>
  paragraphs
    .find((paragraph) => paragraph.textContent?.includes("TAX ID:"))
    ?.textContent?.replace(TAX_ID_REGEX, "")
    .trim()

const findEmail = (paragraphs: Element[]): string | undefined => {
  const linkedEmail = paragraphs
    .find((paragraph) => paragraph.querySelector("a"))
    ?.querySelector("a")
    ?.textContent?.trim()
  if (linkedEmail !== undefined && linkedEmail !== "") {
    return linkedEmail
  }
  return paragraphs
    .find((paragraph) => paragraph.textContent?.includes("@"))
    ?.textContent?.trim()
}

const findPhone = (paragraphs: Element[]): string | undefined =>
  paragraphs
    .find((paragraph) => paragraph.textContent?.includes("Tel:"))
    ?.textContent?.replace(PHONE_PREFIX_REGEX, "")
    .trim()

const parseManufacturerSection = (
  paragraphs: Element[],
): BrandEntity | undefined => {
  if (paragraphs.length === 0) {
    return undefined
  }

  const name =
    paragraphs[0]?.textContent?.replace(MANUFACTURER_PREFIX_REGEX, "").trim() ??
    ""

  if (name === "") {
    return undefined
  }

  const addressParts = [
    paragraphs[1]?.textContent?.trim(),
    paragraphs[2]?.textContent?.trim(),
  ].filter(Boolean)

  return {
    address: addressParts.join(", "),
    email: findEmail(paragraphs),
    name,
    phone: findPhone(paragraphs),
    taxId: findTaxId(paragraphs),
  }
}

const parseResponsibleSection = (
  paragraphs: Element[],
): BrandEntity | undefined => {
  if (paragraphs.length < 2) {
    return undefined
  }

  const name = paragraphs[1]?.textContent?.trim() ?? ""

  if (name === "") {
    return undefined
  }

  return {
    address: paragraphs[2]?.textContent?.trim() ?? "",
    email: findEmail(paragraphs),
    name,
    phone: findPhone(paragraphs),
    taxId: findTaxId(paragraphs),
  }
}

const extractDistributor = (paragraph: Element): string | undefined => {
  const text = paragraph.textContent?.trim()
  if (!text) {
    return undefined
  }

  const distributor = text.replace(DISTRIBUTOR_PREFIX_REGEX, "").trim()
  return distributor === "" ? undefined : distributor
}

const parseSection = (
  paragraphs: Element[],
  startIndex: number,
  endIndex: number,
  parser: (sectionParagraphs: Element[]) => BrandEntity | undefined,
): BrandEntity | undefined => {
  if (startIndex < 0) {
    return undefined
  }
  return parser(paragraphs.slice(startIndex, endIndex))
}

const extractDistributorAtIndex = (
  paragraphs: Element[],
  index: number,
): string | undefined => {
  if (index < 0) {
    return undefined
  }
  const distributorParagraph = paragraphs[index]
  return distributorParagraph
    ? extractDistributor(distributorParagraph)
    : undefined
}

export const parseBrandData = (
  attributes?: Brand["attributes"],
): ParsedBrandInfo | null => {
  if (!attributes || attributes.length === 0) {
    return null
  }

  const sizingAttr = attributes.find(
    (attr) => attr.attributeType?.name === "sizing_info",
  )

  if (sizingAttr?.value === undefined || sizingAttr.value === "") {
    return null
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(sizingAttr.value, "text/html")

    const parserError = doc.querySelector("parsererror")
    if (parserError) {
      console.error("[parseBrandData] HTML parsing failed")
      return null
    }

    const firstLink = doc.querySelector("a")
    const sizingGuideUrl = firstLink?.href === "" ? undefined : firstLink?.href
    const paragraphs = [...doc.querySelectorAll("p")]
    const manufacturerIndex = paragraphs.findIndex((paragraph) =>
      paragraph.textContent?.includes("Výrobce:"),
    )
    const responsibleIndex = paragraphs.findIndex((paragraph) =>
      paragraph.textContent?.includes("Osoba zodpovědná"),
    )
    const distributorIndex = paragraphs.findIndex((paragraph) =>
      paragraph.textContent?.includes("Distributor do ČR:"),
    )

    const manufacturer = parseSection(
      paragraphs,
      manufacturerIndex,
      getSectionEndIndex(responsibleIndex, distributorIndex, paragraphs.length),
      parseManufacturerSection,
    )
    const responsiblePerson = parseSection(
      paragraphs,
      responsibleIndex,
      getSectionEndIndex(distributorIndex, -1, paragraphs.length),
      parseResponsibleSection,
    )

    return {
      distributor: extractDistributorAtIndex(paragraphs, distributorIndex),
      manufacturer,
      responsiblePerson,
      sizingGuideUrl,
    }
  } catch (error) {
    console.error("[parseBrandData] Unexpected error:", error)
    return null
  }
}
