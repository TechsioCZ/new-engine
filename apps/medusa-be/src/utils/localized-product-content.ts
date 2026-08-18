import type {
  ITranslationModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  buildProductContentMetadata,
  PRODUCT_CONTENT_SOURCE_LOCALE,
  resolveLocalizedProductContent,
} from "./product-content"
import {
  getProductContentService,
  type ProductContentRecord,
  resolveOriginalProductContent,
} from "./product-content-service"

type ProductContentDecoratable = {
  description?: null | string
  id: string
  metadata?: null | Record<string, unknown>
}

type TranslationRecord = {
  locale_code: string
  reference: string
  reference_id: string
  translations: Record<string, unknown>
}

const translationKey = (reference: string, referenceId: string) =>
  `${reference}:${referenceId}`

const FIELD_PREFIX_PATTERN = /^[+*]/

export const requestsLocalizedProductContent = (fields: string[]) =>
  fields.some((field) => {
    const normalized = field.replace(FIELD_PREFIX_PATTERN, "")
    return normalized === "description" || normalized === "metadata"
  })

const listExplicitTranslations = async ({
  container,
  locale,
  referenceIds,
}: {
  container: MedusaContainer
  locale: string
  referenceIds: string[]
}) => {
  if (referenceIds.length === 0) {
    return new Map<string, TranslationRecord>()
  }

  const service = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const translations = (await service.listTranslations(
    {
      locale_code: locale,
      reference_id: referenceIds,
    },
    { take: referenceIds.length }
  )) as TranslationRecord[]

  return new Map(
    translations.map((translation) => [
      translationKey(translation.reference, translation.reference_id),
      translation,
    ])
  )
}

export const decorateProductsWithLocalizedContent = async (
  container: MedusaContainer,
  products: ProductContentDecoratable[],
  locale?: string
) => {
  const uniqueProductIds = [...new Set(products.map(({ id }) => id))]
  if (uniqueProductIds.length === 0) {
    return
  }

  const records = (await getProductContentService(
    container
  ).listProductContents({
    product_id: uniqueProductIds,
  })) as ProductContentRecord[]
  const recordsByProductId = new Map(
    records.map((record) => [record.product_id, record])
  )
  const usesSourceContent = !locale || locale === PRODUCT_CONTENT_SOURCE_LOCALE
  const translationsByReference = usesSourceContent
    ? new Map<string, TranslationRecord>()
    : await listExplicitTranslations({
        container,
        locale,
        referenceIds: [...uniqueProductIds, ...records.map(({ id }) => id)],
      })

  for (const product of products) {
    const record = recordsByProductId.get(product.id)
    const localized = resolveLocalizedProductContent({
      contentTranslations: translationsByReference.get(
        translationKey("product_content", record?.id ?? "")
      )?.translations,
      locale,
      originalContent: resolveOriginalProductContent({
        metadata: product.metadata,
        record,
      }),
      originalDescription: product.description ?? "",
      productTranslations: translationsByReference.get(
        translationKey("product", product.id)
      )?.translations,
    })

    product.description = localized.description
    product.metadata = buildProductContentMetadata(
      product.metadata,
      localized.description,
      localized.content,
      { exposeSourceOnlyMetadata: localized.usesSourceContent }
    )
  }
}
