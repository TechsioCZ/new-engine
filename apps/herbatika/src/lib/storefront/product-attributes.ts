import type { ProductAttribute } from "@techsio/storefront-data/product-attributes/types"
import type { ProductDetailContentSection } from "@/components/product-detail/product-detail.types"

const WARRANTY_DEFINITION_KEY = "warranty"
const OTHER_SECTION_KEY = "other"
const ROMANIAN_LOCALE = "ro-RO"
const SLOVAK_WARRANTY_DURATION_PATTERN =
  /^(\d+)\s+(mesiac|mesiace|mesiacov|rok|roky|rokov)$/i

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")

const localizeWarrantyDuration = (value: string, locale: string) => {
  if (locale !== ROMANIAN_LOCALE) {
    return value
  }

  const match = SLOVAK_WARRANTY_DURATION_PATTERN.exec(value)
  if (!match) {
    return value
  }

  const count = Number.parseInt(match[1] ?? "", 10)
  const sourceUnit = match[2]?.toLocaleLowerCase("sk-SK")
  if (!Number.isSafeInteger(count) || count < 1 || !sourceUnit) {
    return value
  }

  const isMonth = sourceUnit.startsWith("mesiac")
  let romanianUnit = "ani"
  if (isMonth) {
    romanianUnit = count === 1 ? "lună" : "luni"
  } else if (count === 1) {
    romanianUnit = "an"
  }

  const quantitySeparator = count >= 20 ? " de " : " "
  return `${count}${quantitySeparator}${romanianUnit}`
}

export const resolveProductWarranty = (
  productAttributes: ProductAttribute[],
  locale: string
): string | null => {
  const warranty = productAttributes.find(
    (attribute) =>
      attribute.definition.key === WARRANTY_DEFINITION_KEY &&
      attribute.definition.input_type === "select"
  )
  const value = warranty?.option?.label.trim()

  return value ? localizeWarrantyDuration(value, locale) : null
}

export const mergeWarrantyIntoProductContentSections = (
  sections: ProductDetailContentSection[],
  warranty: string | null,
  otherSectionTitle: string,
  warrantyLabel: string
): ProductDetailContentSection[] => {
  if (!warranty) {
    return sections
  }

  const warrantyHtml = `<p><strong>${escapeHtml(warrantyLabel)}:</strong> ${escapeHtml(warranty)}</p>`
  const otherSectionIndex = sections.findIndex(
    (section) => section.key === OTHER_SECTION_KEY
  )

  if (otherSectionIndex === -1) {
    return [
      ...sections,
      {
        key: OTHER_SECTION_KEY,
        title: otherSectionTitle,
        html: warrantyHtml,
      },
    ]
  }

  return sections.map((section, index) =>
    index === otherSectionIndex
      ? {
          ...section,
          html: `${section.html}\n${warrantyHtml}`,
        }
      : section
  )
}
