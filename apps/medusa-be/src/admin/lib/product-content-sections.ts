import type { AdminProduct } from "@medusajs/framework/types"
import { z } from "@medusajs/framework/zod"

export type ProductContentSectionKey =
  | "description"
  | "usage"
  | "composition"
  | "warning"
  | "other"

export type ProductContentSectionHtml = Record<ProductContentSectionKey, string>

export interface ProductContentSection {
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

const contentSectionSchema = z.object({
  html: z.string(),
  key: z.enum(["description", "usage", "composition", "warning", "other"]),
})
const contentSectionsMapSchema = z.record(z.string(), z.string())

const getMetadataValue = (
  metadata: AdminProduct["metadata"] | undefined,
  key: string,
): unknown => metadata?.[key]

const getContentSectionsMap = (
  metadata: AdminProduct["metadata"] | undefined,
) => {
  const result = contentSectionsMapSchema.safeParse(
    getMetadataValue(metadata, CONTENT_SECTIONS_MAP_METADATA_KEY),
  )
  return result.success ? result.data : null
}

const getContentSectionsListHtml = (
  metadata: AdminProduct["metadata"] | undefined,
  key: ProductContentSectionKey,
): string => {
  const value = getMetadataValue(metadata, CONTENT_SECTIONS_METADATA_KEY)

  if (!Array.isArray(value)) {
    return ""
  }

  for (const item of value) {
    const section = contentSectionSchema.safeParse(item)
    if (section.success && section.data.key === key) {
      return section.data.html
    }
  }

  return ""
}

const getMetadataSectionHtml = (
  metadata: AdminProduct["metadata"] | undefined,
  key: ProductContentSectionKey,
): string => {
  const contentSectionsMap = getContentSectionsMap(metadata)
  const value = contentSectionsMap?.[key]

  if (typeof value === "string") {
    return value
  }

  return getContentSectionsListHtml(metadata, key)
}

const createEmptySectionHtml = () => {
  const sectionsHtml: ProductContentSectionHtml = {
    composition: "",
    description: "",
    other: "",
    usage: "",
    warning: "",
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
  sectionsHtml: ProductContentSectionHtml,
) => {
  const contentSectionsMap: Record<string, string> = {}
  const existingContentSectionsMap = getContentSectionsMap(metadata)

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
  submittedSectionsHtml: ProductContentSectionHtml,
) => {
  const responseHasContentMetadata =
    getContentSectionsMap(responseProduct.metadata) !== null ||
    Array.isArray(
      getMetadataValue(responseProduct.metadata, CONTENT_SECTIONS_METADATA_KEY),
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
