import type { HttpTypes } from "@medusajs/types"
import {
  CATEGORY_LOCALIZED_CONTENT_FIELDS,
  CATEGORY_TRANSLATION_REFERENCE,
  type CategoryLocalizedContentField,
} from "../../utils/localized-category-content"
import { sdk } from "./sdk"

export type CategoryContentTranslationValues = Record<
  CategoryLocalizedContentField,
  string | null
>

export const categoryContentTranslationQueryKeys = {
  detail: (categoryId: string, locale: string) =>
    ["category-content-translation", categoryId, locale] as const,
}

export const getCategoryContentTranslationValues = (
  translation: HttpTypes.AdminTranslation
): CategoryContentTranslationValues =>
  Object.fromEntries(
    CATEGORY_LOCALIZED_CONTENT_FIELDS.map((field) => {
      const value = translation.translations?.[field]
      return [field, typeof value === "string" ? value : null]
    })
  ) as CategoryContentTranslationValues

export const buildCategoryContentTranslationUpdate = ({
  existing,
  values,
}: {
  existing: HttpTypes.AdminTranslation
  values: CategoryContentTranslationValues
}): HttpTypes.AdminBatchTranslations => ({
  update: [
    {
      id: existing.id,
      translations: {
        ...existing.translations,
        ...values,
      },
    },
  ],
})

export const listCategoryContentTranslation = async ({
  categoryId,
  locale,
}: {
  categoryId: string
  locale: string
}): Promise<HttpTypes.AdminTranslation | null> => {
  const { translations } = await sdk.admin.translation.list({
    limit: 2,
    locale_code: locale,
    reference_id: [categoryId],
  })
  const exact = translations.filter(
    (translation) =>
      translation.reference === CATEGORY_TRANSLATION_REFERENCE &&
      translation.reference_id === categoryId &&
      translation.locale_code === locale
  )
  if (exact.length > 1) {
    throw new Error("Ambiguous category translation state")
  }
  return exact[0] ?? null
}

/**
 * Updates rich content on an existing exact category translation. Creation is
 * intentionally not supported here: the native/import workflow must first
 * create the category name/description translation, so this editor can never
 * create a partial record that passes no catalog review.
 */
export const saveCategoryContentTranslation = ({
  existing,
  values,
}: {
  existing: HttpTypes.AdminTranslation
  values: CategoryContentTranslationValues
}) =>
  sdk.admin.translation.batch(
    buildCategoryContentTranslationUpdate({ existing, values })
  )
