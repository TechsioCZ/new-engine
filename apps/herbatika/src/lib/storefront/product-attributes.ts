import type { ProductAttribute } from "@techsio/storefront-data/product-attributes/types"

import type { ProductDetailContentSection } from "@/components/product-detail/product-detail.types"

const WARRANTY_DEFINITION_KEY = "warranty"
const OTHER_SECTION_KEY = "other"

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")

export const resolveProductWarranty = (
  productAttributes: ProductAttribute[],
): string | null => {
  const warranty = productAttributes.find(
    (attribute) =>
      attribute.definition.key === WARRANTY_DEFINITION_KEY &&
      attribute.definition.input_type === "select",
  )
  const value = warranty?.option?.label.trim()

  return value || null
}

export const mergeWarrantyIntoProductContentSections = (
  sections: ProductDetailContentSection[],
  warranty: string | null,
  otherSectionTitle: string,
): ProductDetailContentSection[] => {
  if (!warranty) {
    return sections
  }

  const warrantyHtml = `<p><strong>Záruka:</strong> ${escapeHtml(warranty)}</p>`
  const otherSectionIndex = sections.findIndex(
    (section) => section.key === OTHER_SECTION_KEY,
  )

  if (otherSectionIndex === -1) {
    return [
      ...sections,
      {
        html: warrantyHtml,
        key: OTHER_SECTION_KEY,
        title: otherSectionTitle,
      },
    ]
  }

  return sections.map((section, index) =>
    index === otherSectionIndex
      ? {
          ...section,
          html: `${section.html}\n${warrantyHtml}`,
        }
      : section,
  )
}
