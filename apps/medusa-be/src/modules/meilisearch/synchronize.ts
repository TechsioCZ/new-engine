import type {
  ILockingModule,
  Logger,
  MedusaContainer,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PAYLOAD_MODULE } from "../payload"
import type PayloadModuleService from "../payload/service"
import { SEARCH_PROFILE_MODULE } from "../search-profile"
import { MeilisearchAdminClient } from "./admin-client"
import {
  buildBrandSearchDocument,
  buildCategorySearchDocument,
  buildContentSearchDocument,
  buildProductSearchDocuments,
} from "./documents"
import { isMeilisearchEnabled } from "./env"
import {
  loadSearchProfiles,
  SEARCH_INDEX_TYPES,
  type SearchIndexType,
  type SearchProfile,
} from "./profiles"
import { SEARCH_INDEX_SETTINGS } from "./settings"

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

type SearchSyncTargets = Record<SearchIndexType, string>

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
const SEARCH_SYNC_LOCK_KEY = "meilisearch-search-profiles-sync"

const PRODUCT_FIELDS = [
  "id",
  "status",
  "title",
  "description",
  "handle",
  "thumbnail",
  "created_at",
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

const applyLocalizedTranslations = async (
  query: Query,
  records: Record<string, unknown>[],
  locale: string
): Promise<Record<string, unknown>[]> => {
  const ids = records.map(getId).filter((id): id is string => id !== undefined)

  if (ids.length === 0 || locale === "default") {
    return records
  }

  let data: unknown[]

  try {
    const result = await query.graph({
      entity: "translation",
      fields: ["reference_id", "locale_code", "translations"],
      filters: { reference_id: ids },
    })

    data = result.data
  } catch {
    return records
  }

  const translationsById = new Map<string, Record<string, unknown>>()

  for (const row of asRecords(data)) {
    if (
      typeof row.reference_id !== "string" ||
      typeof row.locale_code !== "string" ||
      normalizeLocale(row.locale_code) !== normalizeLocale(locale)
    ) {
      continue
    }

    const translations = asRecord(row.translations)

    if (translations) {
      translationsById.set(row.reference_id, translations)
    }
  }

  return records.map((record) => {
    const id = getId(record)
    const translations = id ? translationsById.get(id) : undefined

    return translations ? { ...record, ...translations } : record
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
  client: MeilisearchAdminClient
  index: string
  popularityByProductId: Map<string, number>
  profile: SearchProfile
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

    const localizedRecords = await applyLocalizedTranslations(
      query,
      records,
      profile.locale
    )

    const documents = localizedRecords
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
    const localizedRecords = await applyLocalizedTranslations(
      query,
      asRecords(data),
      options.locale
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

const indexContentDocuments = async (
  payload: PayloadModuleService | null,
  client: MeilisearchAdminClient,
  profile: SearchProfile,
  index: string
): Promise<Set<string>> => {
  const currentIds = new Set<string>()

  if (!payload) {
    return currentIds
  }

  const indexCollection = async (type: "article" | "page") => {
    let page = 1

    while (true) {
      const result =
        type === "article"
          ? await payload.listPublishedArticles({
              limit: BATCH_SIZE,
              locale: profile.locale,
              page,
            })
          : await payload.listPublishedPages({
              limit: BATCH_SIZE,
              locale: profile.locale,
              page,
            })
      const documents = result.docs.map((document) =>
        buildContentSearchDocument(
          document as Record<string, unknown>,
          type,
          profile.locale
        )
      )

      for (const document of documents) {
        const id = getId(document)

        if (id) {
          currentIds.add(id)
        }
      }

      await client.addDocuments(index, documents)

      if (!result.hasNextPage) {
        break
      }

      page += 1
    }
  }

  await indexCollection("page")
  await indexCollection("article")

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

const finalizeFullSync = async (
  client: MeilisearchAdminClient,
  profile: SearchProfile,
  targets: SearchSyncTargets
) => {
  const completionMarkerId = `search_build_marker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  for (const type of SEARCH_INDEX_TYPES) {
    await client.ensureIndex(profile.indexes[type])
  }

  await client.addDocuments(targets.content, [{ id: completionMarkerId }])
  await client.swapIndexPairs(
    SEARCH_INDEX_TYPES.map((type) => ({
      first: profile.indexes[type],
      second: targets[type],
    })),
    { index: profile.indexes.content, documentId: completionMarkerId }
  )
  await client.deleteDocuments(profile.indexes.content, [completionMarkerId])

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

const syncProfile = async (options: {
  client: MeilisearchAdminClient
  container: MedusaContainer
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
  const targets = createTargets(profile, mode)

  let finalized = false

  try {
    await prepareTargets(client, targets)

    const popularityByProductId = await readProductPopularity(database, profile)

    const products = await indexProductDocuments({
      query,
      client,
      profile,
      index: targets.product,
      popularityByProductId,
    })

    const categoryIds = await indexReferencedEntities(query, client, {
      entity: "product_category",
      fields: CATEGORY_FIELDS,
      ids: products.references.categoryIds,
      index: targets.category,
      locale: profile.locale,

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
      ids: products.references.brandIds,
      index: targets.brand,
      locale: profile.locale,
      transform: buildBrandSearchDocument,
    })

    const contentIds = await indexContentDocuments(
      payload,
      client,
      profile,
      targets.content
    )

    let deleted = 0

    if (mode === "normal") {
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
    } else {
      await finalizeFullSync(client, profile, targets)

      finalized = true
    }

    const indexed =
      products.indexed + categoryIds.size + brandIds.size + contentIds.size

    logger.info(
      `Meilisearch profile ${profile.key} synchronized: mode=${mode}, indexed=${indexed}, deleted=${deleted}`
    )

    return { deleted, indexed }
  } finally {
    if (mode === "full" && !finalized) {
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
  const requestedKeys = options?.profileKeys?.length
    ? new Set(options.profileKeys)
    : undefined
  const profiles = requestedKeys
    ? configuredProfiles.filter((profile) => requestedKeys.has(profile.key))
    : configuredProfiles
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
