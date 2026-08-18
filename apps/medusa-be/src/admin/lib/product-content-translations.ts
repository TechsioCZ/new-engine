import type { HttpTypes } from "@medusajs/types"
import { STOREFRONT_TEXT_LOCALES } from "../../modules/storefront-text/configuration"
import type { ProductContentSectionHtml } from "./product-content-sections"
import { sdk } from "./sdk"

export const PRODUCT_CONTENT_REFERENCE = "product_content"
export const PRODUCT_REFERENCE = "product"
export const PRODUCT_CONTENT_SOURCE_LOCALE = "sk-SK"
export const PRODUCT_CONTENT_LOCALES = STOREFRONT_TEXT_LOCALES

export type ProductContentLocale = (typeof PRODUCT_CONTENT_LOCALES)[number]

export type ProductContentTranslationPair = {
  content?: HttpTypes.AdminTranslation
  product?: HttpTypes.AdminTranslation
}

export const productContentTranslationQueryKeys = {
  detail: ({
    contentId,
    locale,
    productId,
  }: {
    contentId: string
    locale: string
    productId: string
  }) => ["product-content-translations", productId, contentId, locale] as const,
}

const asStringTranslations = (translation?: HttpTypes.AdminTranslation) =>
  Object.fromEntries(
    Object.entries(translation?.translations ?? {}).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  )

export const getProductContentTranslationValues = (
  translations: ProductContentTranslationPair
): ProductContentSectionHtml => {
  const productTranslations = asStringTranslations(translations.product)
  const contentTranslations = asStringTranslations(translations.content)

  return {
    composition: contentTranslations.composition ?? "",
    description: productTranslations.description ?? "",
    other: contentTranslations.other ?? "",
    usage: contentTranslations.usage ?? "",
    warning: contentTranslations.warning ?? "",
  }
}

export const buildProductContentTranslationBatch = ({
  contentId,
  existing,
  locale,
  productId,
  values,
}: {
  contentId: string
  existing: ProductContentTranslationPair
  locale: string
  productId: string
  values: ProductContentSectionHtml
}): HttpTypes.AdminBatchTranslations => {
  const create: NonNullable<HttpTypes.AdminBatchTranslations["create"]> = []
  const update: NonNullable<HttpTypes.AdminBatchTranslations["update"]> = []

  const productValues = {
    ...asStringTranslations(existing.product),
    description: values.description,
  }
  const contentValues = {
    ...asStringTranslations(existing.content),
    composition: values.composition,
    other: values.other,
    usage: values.usage,
    warning: values.warning,
  }

  if (existing.product) {
    update.push({ id: existing.product.id, translations: productValues })
  } else {
    create.push({
      locale_code: locale,
      reference: PRODUCT_REFERENCE,
      reference_id: productId,
      translations: productValues,
    })
  }

  if (existing.content) {
    update.push({ id: existing.content.id, translations: contentValues })
  } else {
    create.push({
      locale_code: locale,
      reference: PRODUCT_CONTENT_REFERENCE,
      reference_id: contentId,
      translations: contentValues,
    })
  }

  return { create, update }
}

export const listProductContentTranslations = async ({
  contentId,
  locale,
  productId,
}: {
  contentId: string
  locale: string
  productId: string
}): Promise<ProductContentTranslationPair> => {
  const { translations } = await sdk.admin.translation.list({
    limit: 2,
    locale_code: locale,
    reference_id: [productId, contentId],
  })

  return {
    content: translations.find(
      (translation) => translation.reference === PRODUCT_CONTENT_REFERENCE
    ),
    product: translations.find(
      (translation) => translation.reference === PRODUCT_REFERENCE
    ),
  }
}

export const saveProductContentTranslations = (input: {
  contentId: string
  existing: ProductContentTranslationPair
  locale: string
  productId: string
  values: ProductContentSectionHtml
}) => sdk.admin.translation.batch(buildProductContentTranslationBatch(input))
