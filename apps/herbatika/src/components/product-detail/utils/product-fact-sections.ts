import type { HttpTypes } from "@medusajs/types"
import { PRODUCT_DETAIL_INFORMATION_ORDER } from "@/components/product-detail/product-detail.constants"
import type {
  Product,
  ProductDetailContentSection,
  ProductOfferState,
} from "@/components/product-detail/product-detail.types"
import { normalizeCategoryName } from "@/components/product-detail/utils/metadata-parsers"
import {
  asRecord,
  asString,
} from "@/components/product-detail/utils/value-utils"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import type { Market } from "@/lib/url/types"

const BRAND_SECTION_KEY = "brand"
const OTHER_SECTION_KEY = "other"
const PARAMETERS_SECTION_KEY = "parameters"

const TRAILING_COLON_PATTERN = /:+\s*$/

export type ProductFactLabels = Readonly<{
  brandSectionTitle: string
  brandVisitLabel: string
  categoryLabel: string
  codeLabel: string
  compositionLabel: string
  eanLabel: string
  inciLabel: string
  otherSectionTitle: string
  parametersSectionTitle: string
  storageLabel: string
  volumeLabel: string
}>

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")

type FactRow = Readonly<{ label: string; value: string }>

const renderFactRows = (rows: readonly FactRow[]) =>
  `<table><tbody>${rows
    .map(
      ({ label, value }) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
    )
    .join("")}</tbody></table>`

// Source catalog text properties carry Slovak property names. Only the label is
// mapped to the market locale; the value stays the operator-authored source
// text because no per-locale property value exists in the catalog.
const resolveTextPropertyLabel = (
  name: string,
  labels: ProductFactLabels
): string => {
  const normalized = name
    .replace(TRAILING_COLON_PATTERN, "")
    .trim()
    .toLocaleLowerCase("sk-SK")

  if (normalized === "zloženie") {
    return labels.compositionLabel
  }
  if (normalized === "zloženie (inci)") {
    return labels.inciLabel
  }
  if (normalized === "objem") {
    return labels.volumeLabel
  }
  if (normalized === "skladovanie") {
    return labels.storageLabel
  }

  return name.replace(TRAILING_COLON_PATTERN, "").trim()
}

export const resolveProductTextPropertyRows = (
  product: Product | null,
  labels: ProductFactLabels
): readonly FactRow[] => {
  const metadata = asRecord(product?.metadata)
  const textProperties = Array.isArray(metadata?.text_properties)
    ? metadata.text_properties
    : []

  return textProperties.flatMap((entry) => {
    const record = asRecord(entry)
    const name = asString(record?.name)
    const value = asString(record?.value)

    if (!(name && value)) {
      return []
    }

    return [{ label: resolveTextPropertyLabel(name, labels), value }]
  })
}

const sortInformationSections = (
  sections: readonly ProductDetailContentSection[]
): ProductDetailContentSection[] =>
  [...sections].sort((left, right) => {
    const leftIndex = PRODUCT_DETAIL_INFORMATION_ORDER.indexOf(
      left.key as (typeof PRODUCT_DETAIL_INFORMATION_ORDER)[number]
    )
    const rightIndex = PRODUCT_DETAIL_INFORMATION_ORDER.indexOf(
      right.key as (typeof PRODUCT_DETAIL_INFORMATION_ORDER)[number]
    )

    return (
      (leftIndex === -1 ? PRODUCT_DETAIL_INFORMATION_ORDER.length : leftIndex) -
      (rightIndex === -1 ? PRODUCT_DETAIL_INFORMATION_ORDER.length : rightIndex)
    )
  })

export const mergeProductParametersSection = ({
  categories,
  labels,
  offerState,
  product,
  sections,
}: {
  categories: readonly HttpTypes.StoreProductCategory[]
  labels: ProductFactLabels
  offerState: ProductOfferState
  product: Product | null
  sections: readonly ProductDetailContentSection[]
}): ProductDetailContentSection[] => {
  const rows: FactRow[] = []
  const categoryName = normalizeCategoryName(categories[0]?.name, "")

  if (categoryName) {
    rows.push({ label: labels.categoryLabel, value: categoryName })
  }
  if (offerState.ean) {
    rows.push({ label: labels.eanLabel, value: offerState.ean })
  }
  rows.push(...resolveProductTextPropertyRows(product, labels))

  if (rows.length === 0) {
    return sortInformationSections(sections)
  }

  return sortInformationSections([
    ...sections.filter((section) => section.key !== PARAMETERS_SECTION_KEY),
    {
      html: renderFactRows(rows),
      key: PARAMETERS_SECTION_KEY,
      title: labels.parametersSectionTitle,
    },
  ])
}

export const mergeProductBrandSection = ({
  brandPublicSlugsById,
  labels,
  market,
  product,
  sections,
}: {
  brandPublicSlugsById: Readonly<Record<string, string>>
  labels: ProductFactLabels
  market: Market
  product: Product | null
  sections: readonly ProductDetailContentSection[]
}): ProductDetailContentSection[] => {
  const brand = asRecord(
    (product as (Product & { brand?: unknown }) | null)?.brand
  )
  const brandTitle = asString(brand?.title)

  if (!brandTitle) {
    return sortInformationSections(sections)
  }

  const brandId = asString(brand?.id)
  const brandHref = buildProjectedEntityPath(
    "brand",
    { publicSlug: brandId ? brandPublicSlugsById[brandId] : undefined },
    market
  )
  const brandHeading = `<p><strong>${escapeHtml(brandTitle)}</strong></p>`
  const brandLink = brandHref
    ? `<p><a href="${escapeHtml(brandHref)}">${escapeHtml(labels.brandVisitLabel)}</a></p>`
    : ""

  return sortInformationSections([
    ...sections.filter((section) => section.key !== BRAND_SECTION_KEY),
    {
      html: `${brandHeading}${brandLink}`,
      key: BRAND_SECTION_KEY,
      title: labels.brandSectionTitle,
    },
  ])
}

export const mergeProductCodeIntoOtherSection = ({
  labels,
  offerState,
  sections,
}: {
  labels: ProductFactLabels
  offerState: ProductOfferState
  sections: readonly ProductDetailContentSection[]
}): ProductDetailContentSection[] => {
  if (!offerState.code) {
    return sortInformationSections(sections)
  }

  const codeHtml = `<p><strong>${escapeHtml(labels.codeLabel)}:</strong> ${escapeHtml(offerState.code)}</p>`
  const otherSection = sections.find(
    (section) => section.key === OTHER_SECTION_KEY
  )

  return sortInformationSections([
    ...sections.filter((section) => section.key !== OTHER_SECTION_KEY),
    {
      html: otherSection ? `${otherSection.html}\n${codeHtml}` : codeHtml,
      key: OTHER_SECTION_KEY,
      title: otherSection?.title ?? labels.otherSectionTitle,
    },
  ])
}
