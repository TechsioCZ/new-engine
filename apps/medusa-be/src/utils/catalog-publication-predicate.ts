import { createHash } from "node:crypto"
import type { TranslationDTO } from "@medusajs/framework/types"
import { PRODUCT_CONTENT_TRANSLATABLE_FIELDS } from "./product-content"
import {
  RO_DEMO_OMISSION_AUTHORITY_KEY,
  verifyRoDemoOmissionAuthority,
} from "./ro-demo-omission-authority"

const CATEGORY_FIELDS = [
  "top_description_html",
  "bottom_description_html",
  "meta_title",
  "meta_description",
] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const nonempty = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0

export const hasRenderableVisibleContent = (value: unknown) => {
  if (typeof value !== "string") {
    return false
  }
  const visible = value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|#160|#x0*a0);/gi, " ")
    .replace(/&[a-z0-9#]+;/gi, "x")
    .replace(/\s+/g, " ")
    .trim()
  return visible.length > 0
}

export const isCompleteCategoryPublicationTranslation = (
  translation: Pick<TranslationDTO, "translations">
) => {
  const value = translation.translations
  return (
    isRecord(value) &&
    nonempty(value.name) &&
    Object.hasOwn(value, "description") &&
    (value.description === null || typeof value.description === "string") &&
    CATEGORY_FIELDS.every(
      (field) =>
        Object.hasOwn(value, field) &&
        (value[field] === null || typeof value[field] === "string")
    )
  )
}

export const isCompleteProductPublicationTranslation = (
  source: Readonly<{ description?: null | string; subtitle?: null | string }>,
  translation: Pick<TranslationDTO, "translations">
) => {
  const value = translation.translations
  if (!(isRecord(value) && nonempty(value.title))) {
    return false
  }
  return (["description", "subtitle"] as const).every((field) => {
    if (!nonempty(source[field])) {
      return true
    }
    return field === "description"
      ? hasRenderableVisibleContent(value[field])
      : nonempty(value[field])
  })
}

export const isCompleteProductContentPublicationTranslation = (input: {
  productContent: Readonly<
    Partial<
      Record<(typeof PRODUCT_CONTENT_TRANSLATABLE_FIELDS)[number], unknown>
    > & {
      id: string
      product_id: string
    }
  >
  productTranslation: Pick<TranslationDTO, "translations">
  secret?: string
  translation: Pick<TranslationDTO, "translations">
}) => {
  const localized = input.translation.translations
  if (!isRecord(localized)) {
    return false
  }
  const requiredSourceFieldsAreTranslated =
    PRODUCT_CONTENT_TRANSLATABLE_FIELDS.every((field) =>
      nonempty(input.productContent[field]) ? nonempty(localized[field]) : true
    )
  if (requiredSourceFieldsAreTranslated) {
    return true
  }
  if (
    !(
      PRODUCT_CONTENT_TRANSLATABLE_FIELDS.every(
        (field) =>
          !Object.hasOwn(localized, field) || localized[field] === ""
      ) &&
      isRecord(input.productTranslation.translations) &&
      hasRenderableVisibleContent(
        input.productTranslation.translations.description
      )
    )
  ) {
    return false
  }
  const roDescriptionSha256 = createHash("sha256")
    .update(input.productTranslation.translations.description as string)
    .digest("hex")
  return Boolean(
    verifyRoDemoOmissionAuthority(
      localized[RO_DEMO_OMISSION_AUTHORITY_KEY],
      {
        productContentId: input.productContent.id,
        productId: input.productContent.product_id,
        roDescriptionSha256,
      },
      input.secret
    )
  )
}
