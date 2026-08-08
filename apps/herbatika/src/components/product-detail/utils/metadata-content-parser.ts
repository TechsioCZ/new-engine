import { PRODUCT_DETAIL_SECTION_ORDER } from "@/components/product-detail/product-detail.constants"
import type {
  Product,
  ProductDetailContentSection,
} from "@/components/product-detail/product-detail.types"
import { hasRenderableHtmlContent } from "@/components/product-detail/utils/html-sanitizer"
import {
  asRecord,
  asString,
  readRecordProperty,
} from "@/components/product-detail/utils/value-utils"

const SECTION_KEY_WHITESPACE_PATTERN = /\s+/gu
const SECTION_KEY_UNSUPPORTED_CHARS_PATTERN = /[^a-z0-9_-]/gu

const normalizeSectionKey = (value: unknown): string | null => {
  const parsed = asString(value)
  if (parsed === null) {
    return null
  }

  const normalized = parsed
    .toLowerCase()
    .replace(SECTION_KEY_WHITESPACE_PATTERN, "_")
    .replace(SECTION_KEY_UNSUPPORTED_CHARS_PATTERN, "")

  return normalized.length > 0 ? normalized : null
}

const collectSectionHtmlByKey = (sectionsValue: unknown) => {
  const sections = Array.isArray(sectionsValue) ? sectionsValue : []
  const sectionHtmlByKey = new Map<string, string>()
  for (const section of sections) {
    const sectionRecord = asRecord(section)
    if (sectionRecord !== null) {
      const key = normalizeSectionKey(readRecordProperty(sectionRecord, "key"))
      const html = asString(readRecordProperty(sectionRecord, "html"))
      if (key !== null && html !== null && !sectionHtmlByKey.has(key)) {
        sectionHtmlByKey.set(key, html)
      }
    }
  }
  return sectionHtmlByKey
}

export const resolveProductContentSections = (
  product: Product | null,
  sectionTitles: Record<
    (typeof PRODUCT_DETAIL_SECTION_ORDER)[number] | "content",
    string
  >,
): ProductDetailContentSection[] => {
  const metadata = asRecord(product?.metadata)
  const sectionMap = asRecord(
    readRecordProperty(metadata, "content_sections_map"),
  )
  const sectionHtmlByKey = collectSectionHtmlByKey(
    readRecordProperty(metadata, "content_sections"),
  )
  const productDescriptionHtml = asString(product?.description) ?? ""

  return PRODUCT_DETAIL_SECTION_ORDER.flatMap((sectionKey) => {
    const metadataSectionHtml =
      sectionHtmlByKey.get(sectionKey) ??
      asString(sectionMap?.[sectionKey]) ??
      ""
    const html =
      sectionKey === "description" && productDescriptionHtml !== ""
        ? productDescriptionHtml
        : metadataSectionHtml

    return hasRenderableHtmlContent(html)
      ? [
          {
            html,
            key: sectionKey,
            title: sectionTitles[sectionKey] ?? sectionTitles.content,
          },
        ]
      : []
  })
}
