import { createHash } from "node:crypto"
import type {
  ILockingModule,
  Logger,
  MedusaContainer,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { MARKET_VARIANT_AUTHORITY_MODULE } from "../market-variant-authority"
import {
  type MarketVariantAuthorityRecord,
  resolveExactMarketVariantAuthority,
} from "../market-variant-authority/contracts"
import type MarketVariantAuthorityModuleService from "../market-variant-authority/service"
import { PAYLOAD_MODULE } from "../payload"
import type PayloadModuleService from "../payload/service"
import { SEARCH_PROFILE_MODULE } from "../search-profile"
import { STOREFRONT_TEXT_MARKETS } from "../storefront-text/configuration"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../storefront-url-assignment/service"
import { parseProductPublicationSnapshot } from "../url-registry-outbox/product-publication-assignment"
import type { UrlRegistryOutboxMarket } from "../url-registry-outbox/types"
import {
  MeilisearchAdminClient,
  MeilisearchSwapIndexError,
} from "./admin-client"
import {
  buildBrandSearchDocument,
  buildCategorySearchDocument,
  buildContentSearchDocument,
  buildProductSearchDocuments,
} from "./documents"
import { isMeilisearchEnabled } from "./env"
import { resolveVerifiedFacetPriceCurrency } from "./profile-currency"
import {
  loadSearchProfiles,
  SEARCH_INDEX_TYPES,
  type SearchIndexType,
  type SearchProfile,
} from "./profiles"
import { SEARCH_INDEX_SETTINGS } from "./settings"
import {
  contentProjectionKey,
  resolveContentProjectionHrefs,
} from "./url-registry-content-projection"

export type SearchProfileSyncMode = "full" | "normal"

export type SearchProfileSyncResult = {
  deleted: number
  indexed: number
  mode: SearchProfileSyncMode
  profiles: number
}

export type SearchProfileSyncOptions = {
  profileKeys?: string[]
}

export type SearchIndexGeneration = Readonly<Record<SearchIndexType, string>>

export type RetainedSearchGeneration = Readonly<{
  active: SearchIndexGeneration
  retained: SearchIndexGeneration
}>

type SearchSyncTargets = Record<SearchIndexType, string>
type SearchIndexDocumentCounts = Record<SearchIndexType, number>
type ContentProjectionResolver = typeof resolveContentProjectionHrefs

type SearchProfileSyncStateService = {
  updateSearchProfiles: (data: Record<string, unknown>) => Promise<unknown>
}

type DatabaseConnection = {
  raw: (query: string, bindings?: unknown[]) => Promise<unknown>
}

type ProfileReferenceIds = {
  brandIds: Set<string>
  categoryIds: Set<string>
  categoryProductTitles: Map<string, string[]>
}

const BATCH_SIZE = 500
// Meilisearch defaults maxTotalHits to 1000. Sync only raises it to the
// current index size so catalog pagination is not capped by app config.
const MEILISEARCH_DEFAULT_MAX_TOTAL_HITS = 1000
const SEARCH_SYNC_LOCK_KEY = "meilisearch-search-profiles-sync"

const PRODUCT_FIELDS = [
  "id",
  "status",
  "title",
  "description",
  "handle",
  "thumbnail",
  "created_at",
  "updated_at",
  "collection_id",
  "metadata",
  "categories.id",
  "categories.name",
  "categories.description",
  "categories.handle",
  "brand.id",
  "brand.title",
  "brand.description",
  "brand.handle",
  "sales_channels.id",
  "variants.id",
  "variants.sku",
  "variants.ean",
  "variants.upc",
  "variants.barcode",
  "variants.metadata",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "variants.prices.price_list_id",
  "variants.prices.min_quantity",
  "variants.prices.max_quantity",
  "variants.prices.price_rules.attribute",
  "variants.prices.price_rules.operator",
  "variants.prices.price_rules.value",
]

const CATEGORY_FIELDS = [
  "id",
  "name",
  "description",
  "handle",
  "is_active",
  "parent_category_id",
]
const BRAND_FIELDS = ["id", "title", "description", "handle"]

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return
  }

  return value as Record<string, unknown>
}

const asRecords = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value
        .map((entry) => asRecord(entry))
        .filter(
          (entry): entry is Record<string, unknown> => entry !== undefined
        )
    : []

const getId = (record: Record<string, unknown>): string | undefined => {
  const id = record.id

  if (typeof id === "string" && id.trim()) {
    return id
  }

  if (typeof id === "number" && Number.isFinite(id)) {
    return String(id)
  }

  return
}

const getRawQueryRows = (result: unknown): Record<string, unknown>[] => {
  if (Array.isArray(result)) {
    return asRecords(result[0] ?? result)
  }

  const record = asRecord(result)

  return asRecords(record?.rows)
}

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    return Number.parseFloat(value)
  }

  return Number.NaN
}

const readProductPopularity = async (
  database: DatabaseConnection,
  profile: SearchProfile
): Promise<Map<string, number>> => {
  const salesChannelClause =
    profile.salesChannelIds.length > 0
      ? "and o.sales_channel_id = any(?::text[])"
      : ""

  const result = await database.raw(
    "select oli.product_id, " +
      "sum(oi.quantity)::float as sold_quantity " +
      "from order_item oi " +
      "join order_line_item oli " +
      "on oli.id = oi.item_id " +
      "and oli.deleted_at is null " +
      'join "order" o ' +
      "on o.id = oi.order_id " +
      "and o.version = oi.version " +
      "where oi.deleted_at is null " +
      "and o.deleted_at is null " +
      "and o.canceled_at is null " +
      "and o.is_draft_order = false " +
      "and oli.product_id is not null " +
      salesChannelClause +
      " group by oli.product_id",

    profile.salesChannelIds.length > 0 ? [profile.salesChannelIds] : []
  )

  const popularity = new Map<string, number>()

  for (const row of getRawQueryRows(result)) {
    const productId = row.product_id
    const soldQuantity = toNumber(row.sold_quantity)

    if (typeof productId === "string" && Number.isFinite(soldQuantity)) {
      popularity.set(productId, Math.max(0, soldQuantity))
    }
  }

  return popularity
}

const productBelongsToProfile = (
  document: Record<string, unknown>,
  profile: SearchProfile
): boolean => {
  if (profile.availability === "in-stock" && document.facet_in_stock !== true) {
    return false
  }

  if (profile.salesChannelIds.length === 0) {
    return true
  }

  const productSalesChannelIds = Array.isArray(document.facet_sales_channel_ids)
    ? document.facet_sales_channel_ids.filter(
        (value): value is string => typeof value === "string"
      )
    : []

  return profile.salesChannelIds.some((id) =>
    productSalesChannelIds.includes(id)
  )
}

const collectCategoryReferences = (
  product: Record<string, unknown>,
  references: ProfileReferenceIds
) => {
  for (const category of asRecords(product.categories)) {
    const id = getId(category)

    if (id) {
      references.categoryIds.add(id)

      const title =
        typeof product.title === "string" ? product.title.trim() : undefined

      if (title) {
        const titles = references.categoryProductTitles.get(id) ?? []

        if (!titles.includes(title) && titles.join(" ").length < 10_000) {
          titles.push(title)
          references.categoryProductTitles.set(id, titles)
        }
      }
    }
  }
}

const collectBrandReferences = (
  product: Record<string, unknown>,
  references: ProfileReferenceIds
) => {
  const brands = Array.isArray(product.brand)
    ? asRecords(product.brand)
    : [asRecord(product.brand)].filter(
        (entry): entry is Record<string, unknown> => entry !== undefined
      )

  for (const brand of brands) {
    const id = getId(brand)

    if (id) {
      references.brandIds.add(id)
    }
  }
}

const collectProductReferences = (
  product: Record<string, unknown>,
  references: ProfileReferenceIds
) => {
  collectCategoryReferences(product, references)
  collectBrandReferences(product, references)
}

const fetchGraphBatch = async (
  query: Query,

  options: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    offset: number
  }
): Promise<Record<string, unknown>[]> => {
  const { data } = await query.graph({
    entity: options.entity,
    fields: options.fields,
    filters: options.filters,
    pagination: { take: BATCH_SIZE, skip: options.offset },
  })

  return asRecords(data)
}

const normalizeLocale = (value: string): string =>
  value.trim().toLowerCase().replaceAll("_", "-").split("-")[0] ?? ""

export type LocalizedSearchEntity = "brand" | "product" | "product_category"

const REQUIRED_TRANSLATION_FIELD_BY_ENTITY: Readonly<
  Record<LocalizedSearchEntity, "name" | "title">
> = {
  brand: "title",
  product: "title",
  product_category: "name",
}

const LOCALIZED_FIELDS_BY_ENTITY: Readonly<
  Record<LocalizedSearchEntity, readonly string[]>
> = {
  brand: ["title", "description"],
  product: ["title", "subtitle", "description"],
  product_category: ["name", "description"],
}

const isCatalogSourceLocale = (locale: string): boolean =>
  locale === "default" || normalizeLocale(locale) === "sk"

type ProfilePublicationScope = Readonly<{
  market: UrlRegistryOutboxMarket
  salesChannelId: string
}>

type ProfileCommerceScope = Readonly<{
  currencyCode: string
  regionId: string
}>

type ReferencedPublicationEntity = "brand" | "product_category"

const URL_ASSIGNMENT_KIND_BY_ENTITY: Readonly<
  Record<ReferencedPublicationEntity, "brand" | "category">
> = {
  brand: "brand",
  product_category: "category",
}

const resolveProfilePublicationScope = (
  profile: SearchProfile
): ProfilePublicationScope | undefined => {
  if (profile.locale === "default") {
    return
  }

  const market = STOREFRONT_TEXT_MARKETS.find(
    (candidate) =>
      normalizeLocale(candidate.locale) === normalizeLocale(profile.locale)
  )?.market
  const salesChannelIds = [...new Set(profile.salesChannelIds)]
  if (!(market && salesChannelIds.length === 1)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch profile "${profile.key}" cannot prove exact publication ` +
        `for locale "${profile.locale}": expected one configured market and ` +
        "one Sales Channel."
    )
  }

  return {
    market,
    salesChannelId: salesChannelIds[0] ?? "",
  }
}

const resolveProfileCommerceScope = async (
  query: Query,
  profile: SearchProfile,
  publicationScope: ProfilePublicationScope | undefined
): Promise<ProfileCommerceScope | undefined> => {
  if (!publicationScope) {
    return
  }

  const marketConfiguration = STOREFRONT_TEXT_MARKETS.find(
    (candidate) => candidate.market === publicationScope.market
  )
  if (!marketConfiguration) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch profile "${profile.key}" has no exact commerce market configuration.`
    )
  }

  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code", "metadata", "countries.iso_2"],
  })
  const matchingRegions = asRecords(data).filter((candidateRegion) =>
    asRecords(candidateRegion.countries).some(
      (country) =>
        typeof country.iso_2 === "string" &&
        country.iso_2.toLowerCase() === marketConfiguration.country
    )
  )
  if (matchingRegions.length !== 1) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch profile "${profile.key}" cannot prove one exact commerce ` +
        `region for market "${publicationScope.market}".`
    )
  }

  const region = matchingRegions[0] ?? {}
  const regionId = getId(region)
  const currencyCode =
    typeof region.currency_code === "string"
      ? region.currency_code.trim().toLowerCase()
      : ""
  const metadata = asRecord(region.metadata)
  const countryCodes = asRecords(region.countries).flatMap((country) =>
    typeof country.iso_2 === "string"
      ? [country.iso_2.trim().toLowerCase()]
      : []
  )
  const verifiedCurrencyCode = resolveVerifiedFacetPriceCurrency(
    profile.locale,
    {
      pricingContextCurrencyCode: currencyCode,
      requestedCurrencyCode: currencyCode,
    }
  )
  const exactRegion =
    regionId &&
    currencyCode &&
    verifiedCurrencyCode === currencyCode &&
    countryCodes.length === 1 &&
    countryCodes[0] === marketConfiguration.country &&
    metadata?.market_code === publicationScope.market &&
    metadata.sales_channel_id === publicationScope.salesChannelId
  if (!exactRegion) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch profile "${profile.key}" cannot prove exact region, ` +
        `currency, and Sales Channel authority for market "${publicationScope.market}".`
    )
  }

  return { currencyCode, regionId }
}

const productIsPublishedForProfile = (
  record: Record<string, unknown>,
  profile: SearchProfile,
  scope: ProfilePublicationScope
): boolean => {
  let snapshot: ReturnType<typeof parseProductPublicationSnapshot>
  try {
    snapshot = parseProductPublicationSnapshot(record)
  } catch (error) {
    const id = getId(record) ?? "unknown"
    const reason = error instanceof Error ? ` ${error.message}` : ""
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch profile "${profile.key}" cannot validate exact ` +
        `publication for product "${id}".${reason}`
    )
  }

  const assignment = snapshot.assignments[scope.market]
  return (
    assignment?.publicationStatus === "published" &&
    assignment.salesChannelId === scope.salesChannelId
  )
}

const filterProductsByPublication = (
  records: Record<string, unknown>[],
  profile: SearchProfile,
  scope: ProfilePublicationScope | undefined
): Record<string, unknown>[] =>
  scope
    ? records.filter((record) =>
        productIsPublishedForProfile(record, profile, scope)
      )
    : records

type ProfileVariantAuthority = Readonly<{
  approvedVariantIds: ReadonlySet<string>
  authoritySha256?: string
  currencyCode: string
  sourceVersion?: string
  unavailableVariantIds: ReadonlySet<string>
}>

const isUnscopedBasePrice = (price: Record<string, unknown>): boolean =>
  (price.price_list_id === null || price.price_list_id === undefined) &&
  (price.min_quantity === null || price.min_quantity === undefined) &&
  (price.max_quantity === null || price.max_quantity === undefined) &&
  asRecords(price.price_rules).length === 0

export const projectProductForVariantAuthority = (
  record: Record<string, unknown>,
  authority: ProfileVariantAuthority
): Record<string, unknown> => {
  const currencyCode = authority.currencyCode.trim().toLowerCase()
  const variants = asRecords(record.variants)
  const projectedVariants = variants.flatMap((variant) => {
    const variantId = getId(variant)
    if (!variantId) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Meilisearch cannot authorize a variant without an ID."
      )
    }

    const approved = authority.approvedVariantIds.has(variantId)
    const unavailable = authority.unavailableVariantIds.has(variantId)
    if (approved === unavailable) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Meilisearch variant authority is missing or ambiguous for "${variantId}".`
      )
    }
    if (unavailable) {
      return []
    }

    const currencyPrices = asRecords(variant.prices).filter(
      (price) =>
        typeof price.currency_code === "string" &&
        price.currency_code.trim().toLowerCase() === currencyCode
    )
    const exactPrices = currencyPrices.filter(isUnscopedBasePrice)
    if (currencyPrices.length !== 1 || exactPrices.length !== 1) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Meilisearch cannot prove one exact ${currencyCode.toUpperCase()} ` +
          "base price with no competing scoped price for approved variant " +
          `"${variantId}".`
      )
    }

    return [{ ...variant, prices: exactPrices }]
  })
  const metadata = asRecord(record.metadata)
  const { top_offer: _sourceTopOffer, ...projectedMetadata } = metadata ?? {}

  return {
    ...record,
    ...(metadata ? { metadata: projectedMetadata } : {}),
    variants: projectedVariants,
  }
}

const loadProfileVariantAuthority = async (options: {
  commerceScope: ProfileCommerceScope
  products: Record<string, unknown>[]
  publicationScope: ProfilePublicationScope
  service: MarketVariantAuthorityModuleService
}): Promise<ProfileVariantAuthority> => {
  const productIds = options.products
    .map(getId)
    .filter((id): id is string => id !== undefined)
  const expectedVariantCount = options.products.reduce(
    (count, product) => count + asRecords(product.variants).length,
    0
  )
  const records = (await options.service.listMarketVariantAuthorities(
    {
      market_code: options.publicationScope.market,
      product_id: { $in: productIds },
    },
    {
      order: { product_id: "ASC", variant_id: "ASC" },
      take: expectedVariantCount + 1,
    }
  )) as MarketVariantAuthorityRecord[]
  const authorityHashes = new Set(records.map((row) => row.authority_sha256))
  const sourceVersions = new Set(records.map((row) => row.source_version))
  if (
    productIds.length !== options.products.length ||
    (expectedVariantCount === 0 && records.length !== 0) ||
    (expectedVariantCount > 0 &&
      (authorityHashes.size !== 1 || sourceVersions.size !== 1))
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Meilisearch cannot prove one exhaustive variant authority for market " +
        `"${options.publicationScope.market}".`
    )
  }

  const authoritySha256 = [...authorityHashes][0]
  const sourceVersion = [...sourceVersions][0]
  const approvedVariantIds = new Set<string>()
  const unavailableVariantIds = new Set<string>()

  for (const product of options.products) {
    const productId = getId(product)
    const variantIds = asRecords(product.variants)
      .map(getId)
      .filter((id): id is string => id !== undefined)
    if (!productId || variantIds.length === 0) {
      continue
    }
    const resolved = resolveExactMarketVariantAuthority({
      authoritySha256: authoritySha256 ?? "",
      marketCode: options.publicationScope.market,
      productId,
      records: records.filter((row) => row.product_id === productId),
      sourceVersion,
      variantIds,
    })
    for (const variantId of resolved.sellableVariantIds) {
      approvedVariantIds.add(variantId)
    }
    for (const variantId of resolved.unavailableVariantIds) {
      unavailableVariantIds.add(variantId)
    }
  }

  return {
    approvedVariantIds,
    authoritySha256,
    currencyCode: options.commerceScope.currencyCode,
    sourceVersion,
    unavailableVariantIds,
  }
}

const projectProductsForProfileVariants = async (options: {
  commerceScope?: ProfileCommerceScope
  marketVariantAuthorityService?: MarketVariantAuthorityModuleService
  products: Record<string, unknown>[]
  publicationScope?: ProfilePublicationScope
}): Promise<{
  authority?: ProfileVariantAuthority
  products: Record<string, unknown>[]
}> => {
  if (
    !(
      options.publicationScope &&
      options.commerceScope &&
      options.marketVariantAuthorityService
    )
  ) {
    return { products: options.products }
  }

  const authority = await loadProfileVariantAuthority({
    commerceScope: options.commerceScope,
    products: options.products,
    publicationScope: options.publicationScope,
    service: options.marketVariantAuthorityService,
  })
  return {
    authority,
    products: options.products.map((record) =>
      projectProductForVariantAuthority(record, authority)
    ),
  }
}

type ProfileVariantAuthorityIdentity = Readonly<{
  authoritySha256: string
  sourceVersion?: string
}>

const pinProfileVariantAuthorityIdentity = (
  profile: SearchProfile,
  current: ProfileVariantAuthorityIdentity | undefined,
  authority: ProfileVariantAuthority | undefined
): ProfileVariantAuthorityIdentity | undefined => {
  if (!authority?.authoritySha256) {
    return current
  }
  if (
    current &&
    (current.authoritySha256 !== authority.authoritySha256 ||
      current.sourceVersion !== authority.sourceVersion)
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch profile "${profile.key}" received mixed variant ` +
        "authority generations across product batches."
    )
  }
  return {
    authoritySha256: authority.authoritySha256,
    sourceVersion: authority.sourceVersion,
  }
}

const loadPublishedReferenceIds = async (options: {
  entity: ReferencedPublicationEntity
  ids: string[]
  scope: ProfilePublicationScope
  service: StorefrontUrlAssignmentModuleService
}): Promise<Set<string>> => {
  if (options.ids.length === 0) {
    return new Set()
  }

  const entityKind = URL_ASSIGNMENT_KIND_BY_ENTITY[options.entity]
  const requestedIds = new Set(options.ids)
  const records = await options.service.listStorefrontUrlAssignments(
    {
      entity_id: options.ids,
      entity_kind: entityKind,
      market_code: options.scope.market,
      publication_status: "published",
      sales_channel_id: options.scope.salesChannelId,
    },
    { take: options.ids.length + 1 }
  )
  const publishedIds = new Set<string>()

  for (const record of records) {
    const exactRecord =
      requestedIds.has(record.entity_id) &&
      record.entity_kind === entityKind &&
      record.market_code === options.scope.market &&
      record.publication_status === "published" &&
      record.sales_channel_id === options.scope.salesChannelId
    if (!exactRecord || publishedIds.has(record.entity_id)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Meilisearch received an invalid or ambiguous ${entityKind} URL ` +
          `assignment response for market "${options.scope.market}".`
      )
    }
    publishedIds.add(record.entity_id)
  }

  return publishedIds
}

const loadAllPublishedReferenceIds = async (options: {
  entity: ReferencedPublicationEntity
  scope: ProfilePublicationScope
  service: StorefrontUrlAssignmentModuleService
}): Promise<Set<string>> => {
  const entityKind = URL_ASSIGNMENT_KIND_BY_ENTITY[options.entity]
  const publishedIds = new Set<string>()
  let offset = 0

  while (true) {
    const records = await options.service.listStorefrontUrlAssignments(
      {
        entity_kind: entityKind,
        market_code: options.scope.market,
        publication_status: "published",
        sales_channel_id: options.scope.salesChannelId,
      },
      { order: { entity_id: "ASC" }, skip: offset, take: BATCH_SIZE }
    )

    for (const record of records) {
      const exactRecord =
        record.entity_kind === entityKind &&
        record.market_code === options.scope.market &&
        record.publication_status === "published" &&
        record.sales_channel_id === options.scope.salesChannelId
      if (!exactRecord || publishedIds.has(record.entity_id)) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Meilisearch received an invalid or ambiguous ${entityKind} URL ` +
            `assignment response for market "${options.scope.market}".`
        )
      }
      publishedIds.add(record.entity_id)
    }

    offset += records.length
    if (records.length < BATCH_SIZE) {
      break
    }
  }

  return publishedIds
}

const loadTranslationRows = async (options: {
  entity: LocalizedSearchEntity
  ids: string[]
  locale: string
  query: Query
  sourceLocale: boolean
}): Promise<Record<string, unknown>[] | undefined> => {
  try {
    const result = await options.query.graph({
      entity: "translation",
      fields: [
        "reference",
        "reference_id",
        "locale_code",
        "translations",
        "deleted_at",
      ],
      filters: { reference_id: options.ids },
    })

    return asRecords(result.data)
  } catch (error) {
    if (options.sourceLocale) {
      return
    }

    const reason = error instanceof Error ? ` ${error.message}` : ""
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch cannot index ${options.entity} records for locale "${options.locale}": ` +
        `the exact-translation lookup failed.${reason}`
    )
  }
}

const collectTranslationsById = (
  rows: Record<string, unknown>[],
  locale: string,
  entity: LocalizedSearchEntity,
  sourceLocale: boolean
): {
  invalidOrDuplicateIds: Set<string>
  translationsById: Map<string, Record<string, unknown>>
} => {
  const translationsById = new Map<string, Record<string, unknown>>()
  const invalidOrDuplicateIds = new Set<string>()
  const requiredField = REQUIRED_TRANSLATION_FIELD_BY_ENTITY[entity]

  for (const row of rows) {
    const referenceId = row.reference_id
    const translations = asRecord(row.translations)
    if (
      typeof referenceId !== "string" ||
      typeof row.locale_code !== "string" ||
      normalizeLocale(row.locale_code) !== normalizeLocale(locale) ||
      !translations
    ) {
      continue
    }

    if (sourceLocale) {
      translationsById.set(referenceId, translations)
      continue
    }

    const localizedRequiredField = translations[requiredField]
    const isExactTranslation =
      row.reference === entity &&
      (row.deleted_at === null || row.deleted_at === undefined) &&
      typeof localizedRequiredField === "string" &&
      localizedRequiredField.trim().length > 0

    if (
      !isExactTranslation ||
      translationsById.has(referenceId) ||
      invalidOrDuplicateIds.has(referenceId)
    ) {
      translationsById.delete(referenceId)
      invalidOrDuplicateIds.add(referenceId)
      continue
    }

    translationsById.set(referenceId, translations)
  }

  return { invalidOrDuplicateIds, translationsById }
}

const assertCompleteTranslations = (options: {
  entity: LocalizedSearchEntity
  ids: string[]
  invalidOrDuplicateIds: Set<string>
  locale: string
  translationsById: Map<string, Record<string, unknown>>
}) => {
  const missingIds = options.ids.filter(
    (id) =>
      !options.translationsById.has(id) || options.invalidOrDuplicateIds.has(id)
  )
  if (missingIds.length === 0) {
    return
  }

  const sample = missingIds.slice(0, 5).join(", ")
  const omitted = missingIds.length > 5 ? ", …" : ""
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `Meilisearch cannot index ${options.entity} records for locale "${options.locale}": ` +
      `${missingIds.length}/${options.ids.length} exact translation(s) are ` +
      `missing or invalid (${sample}${omitted}).`
  )
}

const removeSourceLocalizedFields = (
  record: Record<string, unknown>,
  entity: LocalizedSearchEntity
): Record<string, unknown> => {
  const localizedRecord = { ...record }
  for (const field of LOCALIZED_FIELDS_BY_ENTITY[entity]) {
    delete localizedRecord[field]
  }
  return localizedRecord
}

export const applyLocalizedTranslations = async (
  query: Query,
  records: Record<string, unknown>[],
  locale: string,
  entity: LocalizedSearchEntity
): Promise<Record<string, unknown>[]> => {
  const ids = records.map(getId).filter((id): id is string => id !== undefined)
  const sourceLocale = isCatalogSourceLocale(locale)

  if (records.length === 0 || locale === "default") {
    return records
  }

  if (!sourceLocale && ids.length !== records.length) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch cannot index ${entity} records for locale "${locale}": ` +
        `${records.length - ids.length} record(s) have no stable ID.`
    )
  }

  const rows = await loadTranslationRows({
    entity,
    ids,
    locale,
    query,
    sourceLocale,
  })
  if (!rows) {
    return records
  }

  const { invalidOrDuplicateIds, translationsById } = collectTranslationsById(
    rows,
    locale,
    entity,
    sourceLocale
  )

  if (!sourceLocale) {
    assertCompleteTranslations({
      entity,
      ids,
      invalidOrDuplicateIds,
      locale,
      translationsById,
    })
  }

  return records.map((record) => {
    const id = getId(record)
    const translations = id ? translationsById.get(id) : undefined
    const sourceRecord = sourceLocale
      ? record
      : removeSourceLocalizedFields(record, entity)
    const localizedRecord = translations
      ? { ...sourceRecord, ...translations }
      : sourceRecord

    if (Object.hasOwn(record, "handle")) {
      localizedRecord.handle = record.handle
    }

    return localizedRecord
  })
}

const uniqueRecordsById = (
  records: Record<string, unknown>[]
): Record<string, unknown>[] => {
  const seenIds = new Set<string>()
  return records.filter((record) => {
    const id = getId(record)
    if (!(id && seenIds.has(id))) {
      if (id) {
        seenIds.add(id)
      }
      return true
    }
    return false
  })
}

export const applyLocalizedProductRelations = async (
  query: Query,
  records: Record<string, unknown>[],
  locale: string,
  publication?: {
    scope: ProfilePublicationScope
    service: StorefrontUrlAssignmentModuleService
  }
): Promise<Record<string, unknown>[]> => {
  const categories = uniqueRecordsById(
    records.flatMap((record) => asRecords(record.categories))
  )
  const brands = uniqueRecordsById(
    records.flatMap((record) =>
      Array.isArray(record.brand)
        ? asRecords(record.brand)
        : [asRecord(record.brand)].filter(
            (brand): brand is Record<string, unknown> => brand !== undefined
          )
    )
  )
  const publishedCategoryIds = publication
    ? await loadPublishedReferenceIds({
        entity: "product_category",
        ids: categories
          .map(getId)
          .filter((id): id is string => id !== undefined),
        ...publication,
      })
    : new Set(categories.map(getId).filter((id): id is string => Boolean(id)))
  const publishedBrandIds = publication
    ? await loadPublishedReferenceIds({
        entity: "brand",
        ids: brands.map(getId).filter((id): id is string => id !== undefined),
        ...publication,
      })
    : new Set(brands.map(getId).filter((id): id is string => Boolean(id)))
  const localizedCategories = await applyLocalizedTranslations(
    query,
    categories.filter((category) =>
      publishedCategoryIds.has(getId(category) ?? "")
    ),
    locale,
    "product_category"
  )
  const localizedBrands = await applyLocalizedTranslations(
    query,
    brands.filter((brand) => publishedBrandIds.has(getId(brand) ?? "")),
    locale,
    "brand"
  )
  const categoriesById = new Map(
    localizedCategories.flatMap((category) => {
      const id = getId(category)
      return id ? [[id, category] as const] : []
    })
  )
  const brandsById = new Map(
    localizedBrands.flatMap((brand) => {
      const id = getId(brand)
      return id ? [[id, brand] as const] : []
    })
  )

  return records.map((record) => {
    const categoriesForProduct = asRecords(record.categories)
      .filter((category) => publishedCategoryIds.has(getId(category) ?? ""))
      .map((category) => categoriesById.get(getId(category) ?? "") ?? category)
    const brandRecords = Array.isArray(record.brand)
      ? asRecords(record.brand)
      : [asRecord(record.brand)].filter(
          (brand): brand is Record<string, unknown> => brand !== undefined
        )
    const localizedBrandRecords = brandRecords
      .filter((brand) => publishedBrandIds.has(getId(brand) ?? ""))
      .map((brand) => brandsById.get(getId(brand) ?? "") ?? brand)

    return {
      ...record,
      brand: Array.isArray(record.brand)
        ? localizedBrandRecords
        : localizedBrandRecords[0],
      categories: categoriesForProduct,
    }
  })
}

const deleteStaleDocuments = async (
  client: MeilisearchAdminClient,
  index: string,
  currentIds: Set<string>
): Promise<number> => {
  const staleIds = (await client.getDocumentIds(index)).filter(
    (id) => !currentIds.has(id)
  )

  for (let offset = 0; offset < staleIds.length; offset += BATCH_SIZE) {
    await client.deleteDocuments(
      index,
      staleIds.slice(offset, offset + BATCH_SIZE)
    )
  }

  return staleIds.length
}

const indexProductDocuments = async (options: {
  assignmentService?: StorefrontUrlAssignmentModuleService
  client: MeilisearchAdminClient
  commerceScope?: ProfileCommerceScope
  index: string
  marketVariantAuthorityService?: MarketVariantAuthorityModuleService
  popularityByProductId: Map<string, number>
  profile: SearchProfile
  publicationScope?: ProfilePublicationScope
  query: Query
}): Promise<{
  ids: Set<string>
  indexed: number
  references: ProfileReferenceIds
}> => {
  const { client, index, popularityByProductId, profile, query } = options
  const ids = new Set<string>()

  const references: ProfileReferenceIds = {
    brandIds: new Set<string>(),
    categoryIds: new Set<string>(),
    categoryProductTitles: new Map<string, string[]>(),
  }
  const publicationScope =
    options.publicationScope ?? resolveProfilePublicationScope(profile)
  let profileAuthorityIdentity: ProfileVariantAuthorityIdentity | undefined

  let offset = 0

  while (true) {
    const records = await fetchGraphBatch(query, {
      entity: "product",
      fields: PRODUCT_FIELDS,
      filters: { status: "published" },
      offset,
    })

    if (records.length === 0) {
      break
    }

    const publishedRecords = filterProductsByPublication(
      records,
      profile,
      publicationScope
    )
    const localizedProducts = await applyLocalizedTranslations(
      query,
      publishedRecords,
      profile.locale,
      "product"
    )
    const localizedRecords = await applyLocalizedProductRelations(
      query,
      localizedProducts,
      profile.locale,
      publicationScope && options.assignmentService
        ? { scope: publicationScope, service: options.assignmentService }
        : undefined
    )
    const projection = await projectProductsForProfileVariants({
      commerceScope: options.commerceScope,
      marketVariantAuthorityService: options.marketVariantAuthorityService,
      products: localizedRecords,
      publicationScope,
    })
    profileAuthorityIdentity = pinProfileVariantAuthorityIdentity(
      profile,
      profileAuthorityIdentity,
      projection.authority
    )

    const documents = projection.products
      .flatMap((record) =>
        buildProductSearchDocuments(record, {
          popularity: popularityByProductId.get(getId(record) ?? ""),
        })
      )
      .filter((document) => productBelongsToProfile(document, profile))

    for (const document of documents) {
      const id = getId(document)

      if (id) {
        ids.add(id)
      }

      collectProductReferences(document, references)
    }

    await client.addDocuments(index, documents)

    offset += records.length

    if (records.length < BATCH_SIZE) {
      break
    }
  }

  return { ids, indexed: ids.size, references }
}

const indexReferencedEntities = async (
  query: Query,
  client: MeilisearchAdminClient,

  options: {
    entity: "brand" | "product_category"
    fields: string[]
    ids: Set<string>
    index: string
    locale: string
    requireExactIds?: boolean
    transform: (document: Record<string, unknown>) => Record<string, unknown>
  }
): Promise<Set<string>> => {
  const currentIds = new Set<string>()
  const ids = [...options.ids]

  for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
    const batchIds = ids.slice(offset, offset + BATCH_SIZE)
    const { data } = await query.graph({
      entity: options.entity,
      fields: options.fields,
      filters: {
        id: { $in: batchIds },
        ...(options.entity === "product_category" ? { is_active: true } : {}),
      },
    })
    const records = asRecords(data)
    if (options.requireExactIds) {
      const returnedIds = records
        .map(getId)
        .filter((id): id is string => id !== undefined)
      const returnedIdSet = new Set(returnedIds)
      const missingIds = batchIds.filter((id) => !returnedIdSet.has(id))
      if (
        returnedIds.length !== records.length ||
        returnedIdSet.size !== returnedIds.length ||
        missingIds.length > 0 ||
        returnedIds.some((id) => !batchIds.includes(id))
      ) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Meilisearch cannot index the exact published ${options.entity} set ` +
            `for locale "${options.locale}": ${missingIds.length} assigned ` +
            "record(s) are missing or ambiguous."
        )
      }
    }
    const localizedRecords = await applyLocalizedTranslations(
      query,
      records,
      options.locale,
      options.entity
    )
    const documents = localizedRecords.map(options.transform)

    for (const document of documents) {
      const id = getId(document)

      if (id) {
        currentIds.add(id)
      }
    }

    await client.addDocuments(options.index, documents)
  }

  return currentIds
}

const resolvePayloadService = (
  container: MedusaContainer
): PayloadModuleService | null => {
  try {
    return container.resolve<PayloadModuleService>(PAYLOAD_MODULE)
  } catch {
    return null
  }
}

type SearchContentSourceType = "article" | "page"

type ContentProjectionEntry = {
  sourceId: string
  sourceType: SearchContentSourceType
}

const toContentProjectionEntries = (
  documents: Record<string, unknown>[],
  sourceType: SearchContentSourceType
): ContentProjectionEntry[] =>
  documents.flatMap((document) => {
    const sourceId = getId(document)
    return sourceId ? [{ sourceId, sourceType }] : []
  })

const assertCompleteContentProjection = (options: {
  documentCount: number
  entries: ContentProjectionEntry[]
  profile: SearchProfile
  projections: ReadonlyMap<string, string>
  sourceType: SearchContentSourceType
}): void => {
  const { documentCount, entries, profile, projections, sourceType } = options

  if (entries.length !== documentCount) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch profile "${profile.key}" content projection is incomplete because a published ${sourceType} has no stable source ID.`
    )
  }

  const hasEveryProjection = entries.every(({ sourceId, sourceType: type }) =>
    projections.has(contentProjectionKey(type, sourceId))
  )

  if (projections.size !== entries.length || !hasEveryProjection) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch profile "${profile.key}" content projection is incomplete for published ${sourceType} records.`
    )
  }
}

const buildProjectedContentDocuments = (options: {
  documents: Record<string, unknown>[]
  locale: string
  projections: ReadonlyMap<string, string>
  sourceType: SearchContentSourceType
}): Record<string, unknown>[] => {
  const { documents, locale, projections, sourceType } = options

  return documents.flatMap((source) => {
    const sourceId = getId(source)
    const document = buildContentSearchDocument(
      source,
      sourceType,
      locale,
      sourceId
        ? projections.get(contentProjectionKey(sourceType, sourceId))
        : undefined
    )

    return document ? [document] : []
  })
}

type PublishedContentPage = {
  docs: Record<string, unknown>[]
  hasNextPage: boolean
}

const loadPublishedContentPage = async (options: {
  locale: string
  page: number
  payload: PayloadModuleService
  sourceType: SearchContentSourceType
}): Promise<PublishedContentPage> => {
  const { locale, page, payload, sourceType } = options
  const query = { limit: BATCH_SIZE, locale, page }

  const result =
    sourceType === "article"
      ? await payload.listPublishedArticles(query)
      : await payload.listPublishedPages(query)

  return {
    docs: result.docs as Record<string, unknown>[],
    hasNextPage: result.hasNextPage,
  }
}

const indexProjectedContentBatch = async (options: {
  client: MeilisearchAdminClient
  contentProjectionResolver: ContentProjectionResolver
  currentIds: Set<string>
  documents: Record<string, unknown>[]
  index: string
  logger: Logger
  profile: SearchProfile
  requireCompleteProjection: boolean
  sourceType: SearchContentSourceType
}): Promise<void> => {
  const {
    client,
    contentProjectionResolver,
    currentIds,
    documents: sources,
    index,
    logger,
    profile,
    requireCompleteProjection,
    sourceType,
  } = options
  const projectionEntries = toContentProjectionEntries(sources, sourceType)
  const projections = await contentProjectionResolver(
    projectionEntries,
    profile.locale,
    logger
  )

  if (requireCompleteProjection) {
    assertCompleteContentProjection({
      documentCount: sources.length,
      entries: projectionEntries,
      profile,
      projections,
      sourceType,
    })
  }

  const documents = buildProjectedContentDocuments({
    documents: sources,
    locale: profile.locale,
    projections,
    sourceType,
  })
  if (requireCompleteProjection && documents.length !== sources.length) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch profile "${profile.key}" content projection is incomplete or invalid for published ${sourceType} records.`
    )
  }

  for (const document of documents) {
    const id = getId(document)

    if (id) {
      currentIds.add(id)
    }
  }

  await client.addDocuments(index, documents)
}

const indexContentCollection = async (options: {
  client: MeilisearchAdminClient
  contentProjectionResolver: ContentProjectionResolver
  currentIds: Set<string>
  index: string
  logger: Logger
  payload: PayloadModuleService
  profile: SearchProfile
  requireCompleteProjection: boolean
  sourceType: SearchContentSourceType
}): Promise<void> => {
  let page = 1

  while (true) {
    const result = await loadPublishedContentPage({
      locale: options.profile.locale,
      page,
      payload: options.payload,
      sourceType: options.sourceType,
    })

    await indexProjectedContentBatch({
      ...options,
      documents: result.docs,
    })

    if (!result.hasNextPage) {
      return
    }

    page += 1
  }
}

const indexContentDocuments = async (options: {
  client: MeilisearchAdminClient
  contentProjectionResolver: ContentProjectionResolver
  index: string
  logger: Logger
  payload: PayloadModuleService | null
  profile: SearchProfile
  requireCompleteProjection: boolean
}): Promise<Set<string>> => {
  const {
    client,
    contentProjectionResolver,
    index,
    logger,
    payload,
    profile,
    requireCompleteProjection,
  } = options
  const currentIds = new Set<string>()

  if (!payload) {
    if (requireCompleteProjection) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Meilisearch profile "${profile.key}" content projection is incomplete because Payload is unavailable.`
      )
    }
    return currentIds
  }

  const collectionOptions = {
    client,
    contentProjectionResolver,
    currentIds,
    index,
    logger,
    payload,
    profile,
    requireCompleteProjection,
  }

  await indexContentCollection({ ...collectionOptions, sourceType: "page" })
  await indexContentCollection({ ...collectionOptions, sourceType: "article" })

  return currentIds
}

const createTargets = (
  profile: SearchProfile,
  mode: SearchProfileSyncMode
): SearchSyncTargets => {
  if (mode === "normal") {
    return profile.indexes
  }

  const suffix = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  return Object.fromEntries(
    Object.entries(profile.indexes).map(([type, index]) => [
      type,
      `${index}__${suffix}`,
    ])
  ) as SearchSyncTargets
}

const prepareTargets = async (
  client: MeilisearchAdminClient,
  targets: SearchSyncTargets
) => {
  for (const type of Object.keys(targets) as SearchIndexType[]) {
    const index = targets[type]

    await client.ensureIndex(index)
    await client.updateSettings(
      index,
      SEARCH_INDEX_SETTINGS[type] as Record<string, unknown>
    )
  }
}

const resolveIndexMaxTotalHits = (documentCount: number): number =>
  Math.max(MEILISEARCH_DEFAULT_MAX_TOTAL_HITS, documentCount)

const updateTargetPaginationTotalHits = async (
  client: MeilisearchAdminClient,
  targets: SearchSyncTargets,
  documentCounts: SearchIndexDocumentCounts
) => {
  for (const type of SEARCH_INDEX_TYPES) {
    await client.updateSettings(targets[type], {
      pagination: {
        maxTotalHits: resolveIndexMaxTotalHits(documentCounts[type]),
      },
    })
  }
}

const validateRetainedSearchGeneration = (
  generation: RetainedSearchGeneration
): string => {
  const expectedTypes = [...SEARCH_INDEX_TYPES].sort()
  const activeTypes = Object.keys(generation.active).sort()
  const retainedTypes = Object.keys(generation.retained).sort()

  if (
    activeTypes.length !== expectedTypes.length ||
    retainedTypes.length !== expectedTypes.length ||
    activeTypes.some((type, index) => type !== expectedTypes[index]) ||
    retainedTypes.some((type, index) => type !== expectedTypes[index])
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Meilisearch rollback requires one exact retained generation for all search index types."
    )
  }

  const allUids = new Set<string>()
  let generationSuffix: string | undefined

  for (const type of SEARCH_INDEX_TYPES) {
    const activeUid = generation.active[type]
    const retainedUid = generation.retained[type]
    const retainedPrefix = `${activeUid}__build_`

    if (
      typeof activeUid !== "string" ||
      activeUid.trim() !== activeUid ||
      !activeUid ||
      typeof retainedUid !== "string" ||
      retainedUid.trim() !== retainedUid ||
      !retainedUid.startsWith(retainedPrefix)
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Meilisearch rollback requires one exact retained generation bound to the active indexes."
      )
    }

    const suffix = retainedUid.slice(retainedPrefix.length)
    if (
      !suffix ||
      (generationSuffix !== undefined && suffix !== generationSuffix)
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Meilisearch rollback requires one exact retained generation bound to the active indexes."
      )
    }

    generationSuffix = suffix
    allUids.add(activeUid)
    allUids.add(retainedUid)
  }

  if (allUids.size !== SEARCH_INDEX_TYPES.length * 2) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Meilisearch rollback requires one exact retained generation with distinct index UIDs."
    )
  }

  if (!generationSuffix) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Meilisearch rollback requires one exact retained generation bound to the active indexes."
    )
  }

  return generationSuffix
}

const deleteMarkerBestEffort = async (
  client: MeilisearchAdminClient,
  index: string,
  markerId: string
): Promise<void> => {
  try {
    await client.deleteDocuments(index, [markerId])
  } catch {
    // Markers are namespaced and excluded from accepted proof document IDs.
  }
}

const rollbackCompletionMarkerId = (generationSuffix: string): string =>
  `search_rollback_marker_${createHash("sha256")
    .update(generationSuffix)
    .digest("hex")
    .slice(0, 24)}`

export const rollbackRetainedSearchGeneration = async (
  client: MeilisearchAdminClient,
  generation: RetainedSearchGeneration
): Promise<void> => {
  const generationSuffix = validateRetainedSearchGeneration(generation)
  const completionMarkerId = rollbackCompletionMarkerId(generationSuffix)

  const activeDocumentIds = await client.getDocumentIds(
    generation.active.content
  )
  if (activeDocumentIds.includes(completionMarkerId)) {
    return
  }

  await client.addDocuments(generation.retained.content, [
    { id: completionMarkerId },
  ])

  try {
    await client.swapIndexPairs(
      SEARCH_INDEX_TYPES.map((type) => ({
        first: generation.active[type],
        second: generation.retained[type],
      })),
      {
        index: generation.active.content,
        documentId: completionMarkerId,
      }
    )
  } catch (error) {
    try {
      const documentIds = await client.getDocumentIds(generation.active.content)
      if (documentIds.includes(completionMarkerId)) {
        return
      }
    } catch {
      // The original swap failure remains authoritative when probing fails.
    }

    try {
      await client.deleteDocuments(generation.retained.content, [
        completionMarkerId,
      ])
    } catch {
      // Preserve the swap failure; the marker is namespaced and harmless.
    }

    throw error
  }
}

export const acceptRetainedSearchGeneration = async (
  client: MeilisearchAdminClient,
  generation: RetainedSearchGeneration
): Promise<void> => {
  const generationSuffix = validateRetainedSearchGeneration(generation)

  for (const type of SEARCH_INDEX_TYPES) {
    await client.deleteIndex(generation.retained[type])
  }

  await client.deleteDocuments(generation.active.content, [
    rollbackCompletionMarkerId(generationSuffix),
  ])
}

const finalizeFullSync = async (
  client: MeilisearchAdminClient,
  profile: SearchProfile,
  targets: SearchSyncTargets,
  options: {
    logger: Logger
    onSwapCommittedOrUncertain: () => void
    retainPreviousGeneration: boolean
  }
) => {
  const completionMarkerId = `search_build_marker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  for (const type of SEARCH_INDEX_TYPES) {
    await client.ensureIndex(profile.indexes[type])
  }

  await client.addDocuments(targets.content, [{ id: completionMarkerId }])
  try {
    await client.swapIndexPairs(
      SEARCH_INDEX_TYPES.map((type) => ({
        first: profile.indexes[type],
        second: targets[type],
      })),
      { index: profile.indexes.content, documentId: completionMarkerId }
    )
  } catch (error) {
    if (
      !(
        error instanceof MeilisearchSwapIndexError &&
        error.definitelyNotCommitted
      )
    ) {
      options.onSwapCommittedOrUncertain()
    }
    throw error
  }
  options.onSwapCommittedOrUncertain()
  await deleteMarkerBestEffort(
    client,
    profile.indexes.content,
    completionMarkerId
  )

  if (options.retainPreviousGeneration) {
    options.logger.info(
      `Meilisearch profile ${profile.key} retained previous full-sync generation: ${Object.values(
        targets
      )
        .sort((left, right) => left.localeCompare(right))
        .join(",")}`
    )
    return
  }

  for (const type of SEARCH_INDEX_TYPES) {
    await client.deleteIndex(targets[type])
  }
}

const cleanupBuildTargets = async (
  client: MeilisearchAdminClient,
  targets: SearchSyncTargets,
  logger: Logger
) => {
  for (const index of Object.values(targets)) {
    try {
      await client.deleteIndex(index)
    } catch (error) {
      logger.warn(
        `Unable to clean temporary Meilisearch index ${index}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

export const syncProfile = async (options: {
  client: MeilisearchAdminClient
  container: MedusaContainer
  contentProjectionResolver?: ContentProjectionResolver
  logger: Logger
  mode: SearchProfileSyncMode
  profile: SearchProfile
}): Promise<{ deleted: number; indexed: number }> => {
  const { client, container, logger, mode, profile } = options
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const database = container.resolve<DatabaseConnection>(
    ContainerRegistrationKeys.PG_CONNECTION
  )
  const payload = resolvePayloadService(container)
  const publicationScope = resolveProfilePublicationScope(profile)
  const usesStagedTargets = mode === "full" || publicationScope !== undefined
  const commerceScope = await resolveProfileCommerceScope(
    query,
    profile,
    publicationScope
  )
  const assignmentService = publicationScope
    ? container.resolve<StorefrontUrlAssignmentModuleService>(
        STOREFRONT_URL_ASSIGNMENT_MODULE
      )
    : undefined
  const marketVariantAuthorityService = publicationScope
    ? container.resolve<MarketVariantAuthorityModuleService>(
        MARKET_VARIANT_AUTHORITY_MODULE
      )
    : undefined
  const targets = createTargets(profile, usesStagedTargets ? "full" : "normal")

  let finalized = false
  let swapCommittedOrUncertain = false

  try {
    await prepareTargets(client, targets)

    const popularityByProductId = await readProductPopularity(database, profile)

    const products = await indexProductDocuments({
      assignmentService,
      query,
      client,
      commerceScope,
      profile,
      index: targets.product,
      marketVariantAuthorityService,
      popularityByProductId,
      publicationScope,
    })

    const exactCategoryIds =
      publicationScope && assignmentService
        ? await loadAllPublishedReferenceIds({
            entity: "product_category",
            scope: publicationScope,
            service: assignmentService,
          })
        : products.references.categoryIds
    const exactBrandIds =
      publicationScope && assignmentService
        ? await loadAllPublishedReferenceIds({
            entity: "brand",
            scope: publicationScope,
            service: assignmentService,
          })
        : products.references.brandIds

    const categoryIds = await indexReferencedEntities(query, client, {
      entity: "product_category",
      fields: CATEGORY_FIELDS,
      ids: exactCategoryIds,
      index: targets.category,
      locale: profile.locale,
      requireExactIds: Boolean(publicationScope),

      transform: (document) => {
        const category = buildCategorySearchDocument(document)
        const id = getId(category)

        if (!id || profile.strict) {
          return category
        }

        const productTitles =
          products.references.categoryProductTitles.get(id) ?? []

        return {
          ...category,
          ...(productTitles.length > 0
            ? { product_titles: productTitles.join(" ").slice(0, 10_000) }
            : {}),
        }
      },
    })

    const brandIds = await indexReferencedEntities(query, client, {
      entity: "brand",
      fields: BRAND_FIELDS,
      ids: exactBrandIds,
      index: targets.brand,
      locale: profile.locale,
      requireExactIds: Boolean(publicationScope),
      transform: buildBrandSearchDocument,
    })

    const contentIds = await indexContentDocuments({
      client,
      contentProjectionResolver:
        options.contentProjectionResolver ?? resolveContentProjectionHrefs,
      index: targets.content,
      logger,
      payload,
      profile,
      requireCompleteProjection: usesStagedTargets,
    })

    let deleted = 0

    if (!usesStagedTargets) {
      deleted += await deleteStaleDocuments(
        client,
        targets.product,
        products.ids
      )
      deleted += await deleteStaleDocuments(
        client,
        targets.category,
        categoryIds
      )
      deleted += await deleteStaleDocuments(client, targets.brand, brandIds)
      deleted += await deleteStaleDocuments(client, targets.content, contentIds)
    }

    await updateTargetPaginationTotalHits(client, targets, {
      product: products.ids.size,
      category: categoryIds.size,
      brand: brandIds.size,
      content: contentIds.size,
    })

    if (usesStagedTargets) {
      await finalizeFullSync(client, profile, targets, {
        logger,
        onSwapCommittedOrUncertain: () => {
          swapCommittedOrUncertain = true
        },
        retainPreviousGeneration: mode === "full",
      })

      finalized = true
    }

    const indexed =
      products.indexed + categoryIds.size + brandIds.size + contentIds.size

    logger.info(
      `Meilisearch profile ${profile.key} synchronized: mode=${mode}, indexed=${indexed}, deleted=${deleted}`
    )

    return { deleted, indexed }
  } finally {
    if (usesStagedTargets && !(finalized || swapCommittedOrUncertain)) {
      await cleanupBuildTargets(client, targets, logger)
    }
  }
}

const updateProfileSyncState = async (options: {
  container: MedusaContainer
  logger: Logger
  profile: SearchProfile
  state: Record<string, unknown>
}) => {
  if (!options.profile.id) {
    return
  }

  try {
    const service = options.container.resolve<SearchProfileSyncStateService>(
      SEARCH_PROFILE_MODULE
    )
    const update = { id: options.profile.id, ...options.state }

    await service.updateSearchProfiles(update)
  } catch (error) {
    options.logger.warn(
      `Unable to record Meilisearch sync state for ${options.profile.key}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

const syncProfileWithStatus = async (options: {
  client: MeilisearchAdminClient
  container: MedusaContainer
  logger: Logger
  mode: SearchProfileSyncMode
  profile: SearchProfile
}): Promise<{ deleted: number; indexed: number }> => {
  const runningState = {
    ...options,
    state: {
      last_sync_status: "running",
      last_sync_mode: options.mode,
      last_sync_started_at: new Date(),
      last_sync_error: null,
    },
  }

  await updateProfileSyncState(runningState)

  try {
    const result = await syncProfile(options)

    const succeededState = {
      ...options,

      state: {
        last_sync_status: "succeeded",
        last_sync_mode: options.mode,
        last_synced_at: new Date(),
        last_sync_error: null,
        last_indexed_count: result.indexed,
        last_deleted_count: result.deleted,
      },
    }

    await updateProfileSyncState(succeededState)

    return result
  } catch (error) {
    const failedState = {
      ...options,
      state: {
        last_sync_status: "failed",
        last_sync_mode: options.mode,
        last_sync_error: error instanceof Error ? error.message : String(error),
      },
    }

    await updateProfileSyncState(failedState)

    throw error
  }
}

export const selectRequestedSearchProfiles = (
  configuredProfiles: readonly SearchProfile[],
  requestedProfileKeys?: readonly string[]
): SearchProfile[] => {
  if (configuredProfiles.length === 0) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Meilisearch synchronization requires at least one configured profile."
    )
  }
  if (requestedProfileKeys === undefined) {
    return [...configuredProfiles]
  }
  if (requestedProfileKeys.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Meilisearch requested profile set must contain at least one exact profile key."
    )
  }
  const requestedKeys = requestedProfileKeys.map((key) => {
    if (typeof key !== "string" || !key || key.trim() !== key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Meilisearch requested profile keys must be nonblank trimmed strings."
      )
    }
    return key
  })
  if (new Set(requestedKeys).size !== requestedKeys.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Meilisearch requested profile keys must be unique."
    )
  }
  const configuredKeys = new Set(configuredProfiles.map(({ key }) => key))
  const missingKeys = requestedKeys
    .filter((key) => !configuredKeys.has(key))
    .sort((left, right) => left.localeCompare(right))
  if (missingKeys.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Meilisearch configured profile keys are missing: ${missingKeys
        .map((key) => `"${key}"`)
        .join(", ")}.`
    )
  }
  const requestedSet = new Set(requestedKeys)
  return configuredProfiles.filter(({ key }) => requestedSet.has(key))
}

const synchronizeUnlocked = async (
  container: MedusaContainer,
  mode: SearchProfileSyncMode,
  options?: SearchProfileSyncOptions
): Promise<SearchProfileSyncResult> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (!isMeilisearchEnabled()) {
    logger.info("Skipping search profile sync because Meilisearch is disabled")

    return { deleted: 0, indexed: 0, mode, profiles: 0 }
  }

  const configuredProfiles = await loadSearchProfiles(container)
  const profiles = selectRequestedSearchProfiles(
    configuredProfiles,
    options?.profileKeys
  )
  const client = new MeilisearchAdminClient()

  let deleted = 0
  let indexed = 0

  for (const profile of profiles) {
    const result = await syncProfileWithStatus({
      client,
      container,
      logger,
      mode,
      profile,
    })

    deleted += result.deleted
    indexed += result.indexed
  }

  return { deleted, indexed, mode, profiles: profiles.length }
}

export const synchronizeSearchProfiles = async (
  container: MedusaContainer,
  mode: SearchProfileSyncMode,
  options?: SearchProfileSyncOptions
): Promise<SearchProfileSyncResult> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const locking = container.resolve<ILockingModule>(Modules.LOCKING)

  try {
    let result: SearchProfileSyncResult = {
      deleted: 0,
      indexed: 0,
      mode,
      profiles: 0,
    }

    await locking.execute(
      SEARCH_SYNC_LOCK_KEY,
      async () => {
        result = await synchronizeUnlocked(container, mode, options)
      },
      { timeout: 1 }
    )

    return result
  } catch (error) {
    if (error instanceof Error && error.message.includes("Timed-out")) {
      logger.info(
        `Skipping ${mode} Meilisearch sync because another instance holds the lock`
      )

      return { deleted: 0, indexed: 0, mode, profiles: 0 }
    }

    throw error
  }
}
