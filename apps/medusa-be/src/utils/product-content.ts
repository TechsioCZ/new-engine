export const PRODUCT_CONTENT_TRANSLATABLE_FIELDS = [
  "usage",
  "composition",
  "warning",
  "other",
] as const

export const PRODUCT_CONTENT_SECTION_KEYS = [
  "description",
  ...PRODUCT_CONTENT_TRANSLATABLE_FIELDS,
] as const

export const PRODUCT_CONTENT_SOURCE_LOCALE = "sk-SK"

export type ProductContentField =
  (typeof PRODUCT_CONTENT_TRANSLATABLE_FIELDS)[number]

export type ProductContentValues = Record<ProductContentField, string>

type LocalizedProductContentInput = {
  contentTranslations?: Record<string, unknown>
  locale?: string
  originalContent: ProductContentValues
  originalDescription: string
  productTranslations?: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const asHtml = (value: unknown) => (typeof value === "string" ? value : "")

export const emptyProductContent = (): ProductContentValues => ({
  composition: "",
  other: "",
  usage: "",
  warning: "",
})

export const getLegacyProductContent = (
  metadata: unknown
): ProductContentValues => {
  const values = emptyProductContent()

  if (!isRecord(metadata)) {
    return values
  }

  const sectionMap = isRecord(metadata.content_sections_map)
    ? metadata.content_sections_map
    : {}
  const listValues = new Map<string, string>()

  if (Array.isArray(metadata.content_sections)) {
    for (const section of metadata.content_sections) {
      if (!isRecord(section) || typeof section.key !== "string") {
        continue
      }
      listValues.set(section.key, asHtml(section.html))
    }
  }

  for (const field of PRODUCT_CONTENT_TRANSLATABLE_FIELDS) {
    values[field] = asHtml(sectionMap[field]) || listValues.get(field) || ""
  }

  return values
}

export const resolveLocalizedProductContent = ({
  contentTranslations,
  locale,
  originalContent,
  originalDescription,
  productTranslations,
}: LocalizedProductContentInput) => {
  const usesSourceContent = !locale || locale === PRODUCT_CONTENT_SOURCE_LOCALE

  if (usesSourceContent) {
    return {
      content: originalContent,
      description: originalDescription,
      usesSourceContent: true,
    }
  }

  const content = emptyProductContent()
  for (const field of PRODUCT_CONTENT_TRANSLATABLE_FIELDS) {
    content[field] = asHtml(contentTranslations?.[field])
  }

  return {
    content,
    description: asHtml(productTranslations?.description),
    usesSourceContent: false,
  }
}

const PRODUCT_CONTENT_SECTION_TITLES: Record<
  (typeof PRODUCT_CONTENT_SECTION_KEYS)[number],
  string
> = {
  composition: "Composition",
  description: "Description",
  other: "Other",
  usage: "Usage",
  warning: "Warning",
}

export const buildProductContentMetadata = (
  metadata: unknown,
  description: string,
  content: ProductContentValues,
  { exposeSourceOnlyMetadata }: { exposeSourceOnlyMetadata: boolean }
) => {
  const source = isRecord(metadata) ? metadata : {}
  const contentSectionsMap = {
    description,
    ...content,
  }

  return {
    ...source,
    content_sections: PRODUCT_CONTENT_SECTION_KEYS.map((key) => ({
      html: contentSectionsMap[key],
      key,
      title: PRODUCT_CONTENT_SECTION_TITLES[key],
    })),
    content_sections_map: contentSectionsMap,
    ...(exposeSourceOnlyMetadata ? {} : { short_description: "" }),
  }
}
