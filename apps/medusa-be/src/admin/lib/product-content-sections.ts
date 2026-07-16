import type { AdminProduct } from "@medusajs/framework/types"

export type ProductContentSectionKey =
  | "description"
  | "usage"
  | "composition"
  | "warning"
  | "other"

export type ProductContentSectionHtml = Record<ProductContentSectionKey, string>

export type ProductContentSection = {
  key: ProductContentSectionKey
}

export const PRODUCT_CONTENT_SECTIONS: ProductContentSection[] = [
  {
    key: "description",
  },
  {
    key: "usage",
  },
  {
    key: "composition",
  },
  {
    key: "warning",
  },
  {
    key: "other",
  },
]

export const CONTENT_SECTIONS_METADATA_KEY = "content_sections"
export const CONTENT_SECTIONS_MAP_METADATA_KEY = "content_sections_map"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const getMetadataValue = (
  metadata: AdminProduct["metadata"] | undefined,
  key: string
) => (isRecord(metadata) ? metadata[key] : undefined)

const getMetadataRecord = (
  metadata: AdminProduct["metadata"] | undefined,
  key: string
) => {
  const value = getMetadataValue(metadata, key)

  return isRecord(value) ? value : null
}

const getContentSectionsListHtml = (
  metadata: AdminProduct["metadata"] | undefined,
  key: ProductContentSectionKey
) => {
  const value = getMetadataValue(metadata, CONTENT_SECTIONS_METADATA_KEY)

  if (!Array.isArray(value)) {
    return ""
  }

  const section = value.find((item) => {
    const sectionRecord = isRecord(item) ? item : null

    return sectionRecord?.key === key
  })

  if (!isRecord(section)) {
    return ""
  }

  const html = section.html

  return typeof html === "string" ? html : ""
}

const getMetadataSectionHtml = (
  metadata: AdminProduct["metadata"] | undefined,
  key: ProductContentSectionKey
) => {
  const contentSectionsMap = getMetadataRecord(
    metadata,
    CONTENT_SECTIONS_MAP_METADATA_KEY
  )
  const value = contentSectionsMap?.[key]

  if (typeof value === "string") {
    return value
  }

  return getContentSectionsListHtml(metadata, key)
}

const createEmptySectionHtml = () => {
  const sectionsHtml: ProductContentSectionHtml = {
    description: "",
    usage: "",
    composition: "",
    warning: "",
    other: "",
  }

  return sectionsHtml
}

export const getProductSectionHtml = (product?: AdminProduct | null) => {
  const sectionsHtml = createEmptySectionHtml()

  for (const section of PRODUCT_CONTENT_SECTIONS) {
    sectionsHtml[section.key] =
      section.key === "description"
        ? (product?.description ?? "")
        : getMetadataSectionHtml(product?.metadata, section.key)
  }

  return sectionsHtml
}

export const buildContentSections = (sectionsHtml: ProductContentSectionHtml) =>
  PRODUCT_CONTENT_SECTIONS.map(({ key }) => ({
    html: sectionsHtml[key],
    key,
  }))

export const buildContentSectionsMap = (
  metadata: AdminProduct["metadata"] | undefined,
  sectionsHtml: ProductContentSectionHtml
) => {
  const contentSectionsMap: Record<string, string> = {}
  const existingContentSectionsMap = getMetadataRecord(
    metadata,
    CONTENT_SECTIONS_MAP_METADATA_KEY
  )

  if (existingContentSectionsMap) {
    for (const [key, value] of Object.entries(existingContentSectionsMap)) {
      if (typeof value === "string") {
        contentSectionsMap[key] = value
      }
    }
  }

  for (const section of PRODUCT_CONTENT_SECTIONS) {
    contentSectionsMap[section.key] = sectionsHtml[section.key]
  }

  return contentSectionsMap
}

export const getSavedSectionHtml = (
  responseProduct: AdminProduct,
  submittedSectionsHtml: ProductContentSectionHtml
) => {
  const responseHasContentMetadata =
    getMetadataRecord(
      responseProduct.metadata,
      CONTENT_SECTIONS_MAP_METADATA_KEY
    ) !== null ||
    Array.isArray(
      getMetadataValue(responseProduct.metadata, CONTENT_SECTIONS_METADATA_KEY)
    )

  if (responseHasContentMetadata) {
    return getProductSectionHtml(responseProduct)
  }

  return {
    ...submittedSectionsHtml,
    description:
      typeof responseProduct.description === "string"
        ? responseProduct.description
        : submittedSectionsHtml.description,
  }
}
