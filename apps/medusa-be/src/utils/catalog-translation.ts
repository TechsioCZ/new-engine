import type {
  ITranslationModuleService,
  MedusaContainer,
  TranslationDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STOREFRONT_TEXT_MARKETS } from "../modules/storefront-text/configuration"

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

export const resolveCatalogMarketLocale = (
  market: CatalogMarket
): string | null =>
  STOREFRONT_TEXT_MARKETS.find((entry) => entry.market === market)?.locale ??
  null

const isTranslationRecord = (
  value: TranslationDTO,
  expectedReference: string,
  expectedLocale: string,
  requestedIds: ReadonlySet<string>
) =>
  isIdentifier(value.id) &&
  requestedIds.has(value.reference_id) &&
  value.reference === expectedReference &&
  value.locale_code === expectedLocale &&
  isTranslationsObject(value.translations) &&
  (value.deleted_at === null || value.deleted_at === undefined)

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
        !isTranslationRecord(translation, reference, localeCode, requestedIds)
    )
  ) {
    return {
      causeCode: "INVALID_CATALOG_TRANSLATION_STATE",
      kind: "invalid-response",
    }
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
