import type {
  ITranslationModuleService,
  MedusaContainer,
  TranslationDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export const CATEGORY_CONTENT_SOURCE_LOCALE = "sk-SK"
export const CATEGORY_TRANSLATION_REFERENCE = "product_category"

export const CATEGORY_LOCALIZED_CONTENT_FIELDS = [
  "top_description_html",
  "bottom_description_html",
  "meta_title",
  "meta_description",
] as const

export type CategoryLocalizedContentField =
  (typeof CATEGORY_LOCALIZED_CONTENT_FIELDS)[number]

export type CategoryLocalizedContent = Readonly<
  Record<CategoryLocalizedContentField, string | null> & {
    source: Readonly<{
      kind: "base-metadata" | "translation"
      locale_code: string
      reference: typeof CATEGORY_TRANSLATION_REFERENCE
      reference_id: string
      translation_id: string | null
    }>
  }
>

export type LocalizedCategoryContentDecoratable = {
  description?: null | string
  id: string
  localized_content?: CategoryLocalizedContent
  metadata?: null | Record<string, unknown>
  name?: string
}

export type DecorateLocalizedCategoryContentResult =
  | Readonly<{ kind: "decorated" }>
  | Readonly<{ causeCode: string; kind: "invalid-response" }>
  | Readonly<{ kind: "unavailable" }>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const normalizeOptionalContent = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null

const readSourceContent = (
  category: LocalizedCategoryContentDecoratable
): CategoryLocalizedContent => {
  const metadata = category.metadata ?? {}
  return {
    bottom_description_html: normalizeOptionalContent(
      metadata.bottom_description_html
    ),
    meta_description: normalizeOptionalContent(metadata.meta_description),
    meta_title: normalizeOptionalContent(metadata.meta_title),
    source: {
      kind: "base-metadata",
      locale_code: CATEGORY_CONTENT_SOURCE_LOCALE,
      reference: CATEGORY_TRANSLATION_REFERENCE,
      reference_id: category.id,
      translation_id: null,
    },
    top_description_html: normalizeOptionalContent(
      metadata.top_description_html
    ),
  }
}

const readTranslatedContent = (
  translation: TranslationDTO
): CategoryLocalizedContent | null => {
  if (!isRecord(translation.translations)) {
    return null
  }

  // Translations carry whichever fields editors filled in; anything absent or
  // non-textual renders as empty rather than blocking the whole catalog.
  const content = {} as Record<CategoryLocalizedContentField, string | null>
  for (const field of CATEGORY_LOCALIZED_CONTENT_FIELDS) {
    content[field] = normalizeOptionalContent(translation.translations[field])
  }

  return {
    ...content,
    source: {
      kind: "translation",
      locale_code: translation.locale_code,
      reference: CATEGORY_TRANSLATION_REFERENCE,
      reference_id: translation.reference_id,
      translation_id: translation.id,
    },
  }
}

const stripSourceRichContent = (
  category: LocalizedCategoryContentDecoratable
) => {
  if (!category.metadata) {
    return
  }
  const metadata = { ...category.metadata }
  for (const field of CATEGORY_LOCALIZED_CONTENT_FIELDS) {
    delete metadata[field]
  }
  category.metadata = metadata
}

const isUsableCategoryContentTranslation = ({
  locale,
  requestedIds,
  translation,
}: {
  locale: string
  requestedIds: ReadonlySet<string>
  translation: TranslationDTO
}) =>
  typeof translation.id === "string" &&
  translation.id.trim().length > 0 &&
  requestedIds.has(translation.reference_id) &&
  translation.reference === CATEGORY_TRANSLATION_REFERENCE &&
  translation.locale_code === locale &&
  (translation.deleted_at === null || translation.deleted_at === undefined) &&
  isRecord(translation.translations)

const indexUsableCategoryContentTranslations = ({
  categoryIds,
  locale,
  translations,
}: {
  categoryIds: readonly string[]
  locale: string
  translations: TranslationDTO[]
}): ReadonlyMap<string, TranslationDTO> => {
  const requestedIds = new Set(categoryIds)
  const translationsByCategoryId = new Map<string, TranslationDTO>()
  for (const translation of translations) {
    if (
      translationsByCategoryId.has(translation.reference_id) ||
      !isUsableCategoryContentTranslation({
        locale,
        requestedIds,
        translation,
      })
    ) {
      continue
    }
    translationsByCategoryId.set(translation.reference_id, translation)
  }
  return translationsByCategoryId
}

const applyTranslatedCategoryContent = (
  category: LocalizedCategoryContentDecoratable,
  translation: TranslationDTO
) => {
  const content = readTranslatedContent(translation)
  if (!(content && isRecord(translation.translations))) {
    return false
  }
  const translatedName = normalizeOptionalContent(translation.translations.name)
  if (translatedName && Object.hasOwn(category, "name")) {
    category.name = translatedName
  }
  if (
    Object.hasOwn(category, "description") &&
    Object.hasOwn(translation.translations, "description")
  ) {
    category.description = normalizeOptionalContent(
      translation.translations.description
    )
  }
  category.localized_content = content
  stripSourceRichContent(category)
  return true
}

export const decorateCategoriesWithLocalizedContent = async (
  container: Pick<MedusaContainer, "resolve">,
  categories: LocalizedCategoryContentDecoratable[],
  locale?: string
): Promise<DecorateLocalizedCategoryContentResult> => {
  if (!locale || locale === CATEGORY_CONTENT_SOURCE_LOCALE) {
    for (const category of categories) {
      category.localized_content = readSourceContent(category)
    }
    return { kind: "decorated" }
  }

  if (categories.length === 0) {
    return { kind: "decorated" }
  }

  const uniqueCategoryIds = [...new Set(categories.map(({ id }) => id))]
  let translations: TranslationDTO[]
  try {
    const service = container.resolve<ITranslationModuleService>(
      Modules.TRANSLATION
    )
    translations = await service.listTranslations(
      {
        locale_code: locale,
        reference: CATEGORY_TRANSLATION_REFERENCE,
        reference_id: uniqueCategoryIds,
      },
      {
        select: [
          "id",
          "locale_code",
          "reference",
          "reference_id",
          "translations",
          "deleted_at",
        ],
        take: uniqueCategoryIds.length + 1,
      }
    )
  } catch {
    return { kind: "unavailable" }
  }

  const translationsByCategoryId = indexUsableCategoryContentTranslations({
    categoryIds: uniqueCategoryIds,
    locale,
    translations,
  })

  // Categories without a usable translation fall back to their source-locale
  // content instead of failing the whole listing.
  for (const category of categories) {
    const translation = translationsByCategoryId.get(category.id)
    if (
      !(translation && applyTranslatedCategoryContent(category, translation))
    ) {
      category.localized_content = readSourceContent(category)
    }
  }

  return { kind: "decorated" }
}

export const sendLocalizedCategoryContentFailure = (
  result: Exclude<
    DecorateLocalizedCategoryContentResult,
    { kind: "decorated" }
  >,
  res: { status: (status: number) => { json: (body: unknown) => unknown } }
) =>
  res.status(503).json({
    code:
      result.kind === "invalid-response"
        ? result.causeCode
        : "LOCALIZED_CATEGORY_CONTENT_UNAVAILABLE",
    message: "Localized category content is unavailable.",
  })
