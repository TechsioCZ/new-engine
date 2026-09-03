import type {
  IProductModuleService,
  ITranslationModuleService,
  MedusaContainer,
  TranslationDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { PRODUCT_CONTENT_MODULE } from "../modules/product-content"
import type ProductContentModuleService from "../modules/product-content/service"
import { STOREFRONT_TEXT_MARKETS } from "../modules/storefront-text/configuration"
import {
  isCompleteCategoryPublicationTranslation,
  isCompleteProductContentPublicationTranslation,
  isCompleteProductPublicationTranslation,
} from "./catalog-publication-predicate"
import { PRODUCT_CONTENT_SOURCE_LOCALE } from "./product-content"

export const CATALOG_TRANSLATION_ENTITY_KINDS = [
  "product",
  "category",
  "brand",
  "collection",
] as const

export type CatalogTranslationEntityKind =
  (typeof CATALOG_TRANSLATION_ENTITY_KINDS)[number]

export type CatalogMarket = (typeof STOREFRONT_TEXT_MARKETS)[number]["market"]

export const isCatalogTranslationEntityKind = (
  value: unknown
): value is CatalogTranslationEntityKind =>
  typeof value === "string" &&
  CATALOG_TRANSLATION_ENTITY_KINDS.includes(
    value as CatalogTranslationEntityKind
  )

export const isCatalogMarket = (value: unknown): value is CatalogMarket =>
  typeof value === "string" &&
  STOREFRONT_TEXT_MARKETS.some((entry) => entry.market === value)

export type CatalogTranslationProof = Readonly<{
  localeCode: string
  reference: string
  translationId: string
}>

export type CatalogTranslationReadResult =
  | Readonly<{ kind: "found"; proof: CatalogTranslationProof }>
  | Readonly<{ kind: "missing"; localeCode: string }>
  | Readonly<{ kind: "unavailable" }>
  | Readonly<{ causeCode: string; kind: "invalid-response" }>

export type CatalogTranslationBatchReadResult =
  | Readonly<{
      kind: "found"
      localeCode: string
      missingEntityIds: readonly string[]
      proofsByEntityId: ReadonlyMap<string, CatalogTranslationProof>
    }>
  | Readonly<{ kind: "unavailable" }>
  | Readonly<{ causeCode: string; kind: "invalid-response" }>

const REFERENCE_BY_ENTITY_KIND: Readonly<
  Record<CatalogTranslationEntityKind, string>
> = {
  brand: "brand",
  category: "product_category",
  collection: "product_collection",
  product: "product",
}

export const resolveCatalogTranslationEntityKind = (
  reference: string
): CatalogTranslationEntityKind | null =>
  CATALOG_TRANSLATION_ENTITY_KINDS.find(
    (entityKind) => REFERENCE_BY_ENTITY_KIND[entityKind] === reference
  ) ?? null

const REQUIRED_TRANSLATION_FIELD_BY_ENTITY_KIND: Readonly<
  Record<CatalogTranslationEntityKind, "name" | "title">
> = {
  brand: "title",
  category: "name",
  collection: "title",
  product: "title",
}

const VISIBLE_ASCII = /^[\x21-\x7e]+$/

const isIdentifier = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 255 &&
  VISIBLE_ASCII.test(value)

const isTranslationsObject = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasRequiredLocalizedField = (
  translations: Record<string, unknown>,
  entityKind: CatalogTranslationEntityKind
) => {
  const value =
    translations[REQUIRED_TRANSLATION_FIELD_BY_ENTITY_KIND[entityKind]]
  return typeof value === "string" && value.trim().length > 0
}

export const resolveCatalogMarketLocale = (
  market: CatalogMarket
): string | null =>
  STOREFRONT_TEXT_MARKETS.find((entry) => entry.market === market)?.locale ??
  null

export const resolveCatalogLocaleMarket = (
  localeCode: string
): CatalogMarket | null =>
  STOREFRONT_TEXT_MARKETS.find((entry) => entry.locale === localeCode)
    ?.market ?? null

const isTranslationRecord = (
  value: TranslationDTO,
  entityKind: CatalogTranslationEntityKind,
  expectedLocale: string,
  requestedIds: ReadonlySet<string>
) => {
  const translations = value.translations
  return (
    isIdentifier(value.id) &&
    requestedIds.has(value.reference_id) &&
    value.reference === REFERENCE_BY_ENTITY_KIND[entityKind] &&
    value.locale_code === expectedLocale &&
    isTranslationsObject(translations) &&
    hasRequiredLocalizedField(translations, entityKind) &&
    (entityKind !== "category" ||
      isCompleteCategoryPublicationTranslation(value)) &&
    (value.deleted_at === null || value.deleted_at === undefined)
  )
}

const hasCompleteProductPublication = async (
  container: Pick<MedusaContainer, "resolve">,
  entityIds: readonly string[],
  localeCode: string,
  translations: readonly TranslationDTO[]
): Promise<"complete" | "incomplete" | "unavailable"> => {
  try {
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT
    )
    const products = await productService.listProducts(
      { id: [...entityIds] },
      {
        select: ["id", "description", "subtitle"],
        take: entityIds.length + 1,
      }
    )
    const productsById = new Map(
      products.map((product) => [product.id, product])
    )
    const translationsByProductId = new Map(
      translations.map((translation) => [translation.reference_id, translation])
    )
    if (
      products.length !== entityIds.length ||
      productsById.size !== entityIds.length ||
      translationsByProductId.size !== entityIds.length ||
      entityIds.some((entityId) => {
        const product = productsById.get(entityId)
        const translation = translationsByProductId.get(entityId)
        return !(
          product &&
          translation &&
          isCompleteProductPublicationTranslation(product, translation)
        )
      })
    ) {
      return "incomplete"
    }
    if (localeCode === PRODUCT_CONTENT_SOURCE_LOCALE) {
      return "complete"
    }

    const contentService = container.resolve<ProductContentModuleService>(
      PRODUCT_CONTENT_MODULE
    )
    const contents = await contentService.listProductContents(
      { product_id: [...entityIds] },
      { take: entityIds.length + 1 }
    )
    const contentsByProductId = new Map(
      contents.map((content) => [content.product_id, content])
    )
    if (
      contents.length !== entityIds.length ||
      contentsByProductId.size !== entityIds.length
    ) {
      return "incomplete"
    }
    const translationService = container.resolve<ITranslationModuleService>(
      Modules.TRANSLATION
    )
    const contentTranslations = await translationService.listTranslations(
      {
        locale_code: localeCode,
        reference: "product_content",
        reference_id: contents.map(({ id }) => id),
      },
      {
        select: [
          "id",
          "reference",
          "reference_id",
          "locale_code",
          "translations",
          "deleted_at",
        ],
        take: contents.length + 1,
      }
    )
    const contentTranslationsById = new Map<string, TranslationDTO>()
    const requestedContentIds = new Set(contents.map(({ id }) => id))
    for (const translation of contentTranslations) {
      if (
        !(
          isIdentifier(translation.id) &&
          requestedContentIds.has(translation.reference_id)
        ) ||
        translation.reference !== "product_content" ||
        translation.locale_code !== localeCode ||
        !isTranslationsObject(translation.translations) ||
        translation.deleted_at ||
        contentTranslationsById.has(translation.reference_id)
      ) {
        return "incomplete"
      }
      contentTranslationsById.set(translation.reference_id, translation)
    }
    return contents.every((content) => {
      const productTranslation = translationsByProductId.get(content.product_id)
      const contentTranslation = contentTranslationsById.get(content.id)
      return Boolean(
        productTranslation &&
          contentTranslation &&
          isCompleteProductContentPublicationTranslation({
            productContent: content,
            productTranslation,
            translation: contentTranslation,
          })
      )
    })
      ? "complete"
      : "incomplete"
  } catch {
    return "unavailable"
  }
}

const productCompletenessFailure = async (
  container: Pick<MedusaContainer, "resolve">,
  entityKind: CatalogTranslationEntityKind,
  localeCode: string,
  translations: readonly TranslationDTO[]
): Promise<CatalogTranslationBatchReadResult | null> => {
  if (entityKind !== "product" || translations.length === 0) {
    return null
  }
  const completeness = await hasCompleteProductPublication(
    container,
    translations.map((translation) => translation.reference_id),
    localeCode,
    translations
  )
  if (completeness === "unavailable") {
    return { kind: "unavailable" }
  }
  return completeness === "incomplete"
    ? {
        causeCode: "INCOMPLETE_PRODUCT_PUBLICATION_TRANSLATION",
        kind: "invalid-response",
      }
    : null
}

export const readExactCatalogTranslations = async ({
  container,
  entityIds,
  entityKind,
  market,
}: Readonly<{
  container: Pick<MedusaContainer, "resolve">
  entityIds: readonly string[]
  entityKind: CatalogTranslationEntityKind
  market: CatalogMarket
}>): Promise<CatalogTranslationBatchReadResult> => {
  const localeCode = resolveCatalogMarketLocale(market)
  const uniqueEntityIds = [...new Set(entityIds)]
  if (
    !(localeCode && Object.hasOwn(REFERENCE_BY_ENTITY_KIND, entityKind)) ||
    uniqueEntityIds.some((entityId) => !isIdentifier(entityId))
  ) {
    return {
      causeCode: "INVALID_CATALOG_TRANSLATION_REQUEST",
      kind: "invalid-response",
    }
  }

  if (uniqueEntityIds.length === 0) {
    return {
      kind: "found",
      localeCode,
      missingEntityIds: [],
      proofsByEntityId: new Map(),
    }
  }

  const reference = REFERENCE_BY_ENTITY_KIND[entityKind]
  let translations: TranslationDTO[]
  try {
    const service = container.resolve<ITranslationModuleService>(
      Modules.TRANSLATION
    )
    translations = await service.listTranslations(
      {
        locale_code: localeCode,
        reference,
        reference_id: uniqueEntityIds,
      },
      {
        select: [
          "id",
          "reference",
          "reference_id",
          "locale_code",
          "translations",
          "deleted_at",
        ],
        take: uniqueEntityIds.length + 1,
      }
    )
  } catch {
    return { kind: "unavailable" }
  }

  const requestedIds = new Set(uniqueEntityIds)
  if (
    translations.length > uniqueEntityIds.length ||
    translations.some(
      (translation) =>
        !isTranslationRecord(translation, entityKind, localeCode, requestedIds)
    )
  ) {
    return {
      causeCode: "INVALID_CATALOG_TRANSLATION_STATE",
      kind: "invalid-response",
    }
  }

  const completenessFailure = await productCompletenessFailure(
    container,
    entityKind,
    localeCode,
    translations
  )
  if (completenessFailure) {
    return completenessFailure
  }

  const proofsByEntityId = new Map<string, CatalogTranslationProof>()
  for (const translation of translations) {
    if (proofsByEntityId.has(translation.reference_id)) {
      return {
        causeCode: "AMBIGUOUS_CATALOG_TRANSLATION_STATE",
        kind: "invalid-response",
      }
    }
    proofsByEntityId.set(translation.reference_id, {
      localeCode,
      reference,
      translationId: translation.id,
    })
  }

  return {
    kind: "found",
    localeCode,
    missingEntityIds: uniqueEntityIds.filter(
      (entityId) => !proofsByEntityId.has(entityId)
    ),
    proofsByEntityId,
  }
}

export const readExactCatalogTranslation = async (
  input: Readonly<{
    container: Pick<MedusaContainer, "resolve">
    entityId: string
    entityKind: CatalogTranslationEntityKind
    market: CatalogMarket
  }>
): Promise<CatalogTranslationReadResult> => {
  const result = await readExactCatalogTranslations({
    ...input,
    entityIds: [input.entityId],
  })
  if (result.kind !== "found") {
    return result
  }
  const proof = result.proofsByEntityId.get(input.entityId)
  return proof
    ? { kind: "found", proof }
    : { kind: "missing", localeCode: result.localeCode }
}
