import { randomUUID } from "node:crypto"

import type {
  ILockingModule,
  Logger,
  MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { executeWithLockTimeout } from "../../utils/locking"
import { PAYLOAD_MODULE } from "../payload"
import { SEARCH_PROFILE_MODULE } from "../search-profile"
import { MeilisearchAdminClient } from "./admin-client"
import {
  buildBrandSearchDocument,
  buildCategorySearchDocument,
  buildContentSearchDocument,
  buildProductSearchDocuments,
} from "./documents"
import { isMeilisearchEnabled } from "./env"
import { loadSearchProfiles, SEARCH_INDEX_TYPES } from "./profiles"
import type { SearchIndexType, SearchProfile } from "./profiles"
import { SEARCH_INDEX_SETTINGS } from "./settings"

export type SearchProfileSyncMode = "full" | "normal"

export type SearchProfileSyncStatus =
  | "completed"
  | "skipped_disabled"
  | "skipped_lock_contended"

export interface SearchProfileSyncResult {
  deleted: number
  indexed: number
  mode: SearchProfileSyncMode
  profiles: number
  status: SearchProfileSyncStatus
}

export interface SearchProfileSyncOptions {
  profileKeys?: string[]
}

type SearchSyncTargets = Record<SearchIndexType, string>

interface SearchProfileSyncStateService {
  updateSearchProfiles: (data: Record<string, unknown>) => Promise<unknown>
}

interface DatabaseConnection {
  raw: (query: string, bindings?: unknown[]) => Promise<unknown>
}

interface SearchGraphQuery {
  graph: (options: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    pagination?: {
      order?: Record<string, "ASC" | "DESC">
      skip?: number
      take?: number
    }
  }) => Promise<unknown>
}

interface SearchContentService {
  listPublishedArticles: (options: {
    limit: number
    locale: string
    page: number
  }) => Promise<unknown>
  listPublishedPages: (options: {
    limit: number
    locale: string
    page: number
  }) => Promise<unknown>
}

interface ContentPage {
  docs: Record<string, unknown>[]
  hasNextPage: boolean
}

interface ContentUnavailable {
  reason: string
  status: "unavailable"
}
type ContentPageResult =
  | { page: ContentPage; status: "available" }
  | ContentUnavailable
type ContentIndexResult =
  | { ids: Set<string>; status: "available" }
  | ContentUnavailable

export type SearchSynchronizationErrorCode =
  | "SEARCH_SYNC_DATA_INVALID"
  | "SEARCH_SYNC_PAGE_LIMIT_EXCEEDED"
  | "SEARCH_SYNC_PROFILE_NOT_FOUND"
  | "SEARCH_SYNC_SOURCE_UNAVAILABLE"

export class SearchSynchronizationError extends Error {
  readonly code: SearchSynchronizationErrorCode

  constructor(code: SearchSynchronizationErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = "SearchSynchronizationError"
  }
}

interface ProfileReferenceIds {
  brandIds: Set<string>
  categoryIds: Set<string>
  categoryProductTitles: Map<string, Set<string>>
}

const BATCH_SIZE = 500
const MAX_CONTENT_PAGES_PER_COLLECTION = 10_000
const MAX_ENTITY_PAGES = 10_000
const MAX_TRANSLATION_PAGES_PER_BATCH = 20
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
  "variants.title",
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
const LOCALIZED_SEARCH_FIELDS = [
  "description",
  "handle",
  "name",
  "title",
] as const

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined

const asRecords = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const records: Record<string, unknown>[] = []

  for (const entry of value) {
    if (isRecord(entry)) {
      records.push(entry)
    }
  }

  return records
}

const getId = (record: Record<string, unknown>): string | undefined => {
  const { id } = record

  if (typeof id === "string" && id.trim().length > 0) {
    return id
  }

  if (typeof id === "number" && Number.isFinite(id)) {
    return String(id)
  }

  return undefined
}

const invalidSyncData = (message: string): SearchSynchronizationError =>
  new SearchSynchronizationError("SEARCH_SYNC_DATA_INVALID", message)

const requireId = (
  record: Record<string, unknown>,
  context: string,
): string => {
  const id = getId(record)

  if (id === undefined) {
    throw invalidSyncData(`${context} must contain a non-empty id`)
  }

  return id
}

const readGraphRecords = (
  result: unknown,
  context: string,
): Record<string, unknown>[] => {
  if (!isRecord(result) || !Array.isArray(result["data"])) {
    throw invalidSyncData(`${context} must return an object with a data array`)
  }

  const records: Record<string, unknown>[] = []

  for (const [index, value] of result["data"].entries()) {
    if (!isRecord(value)) {
      throw invalidSyncData(`${context} data[${index}] must be an object`)
    }

    records.push(value)
  }

  return records
}

const requireRecordArray = (
  record: Record<string, unknown>,
  field: string,
  context: string,
): Record<string, unknown>[] => {
  const value = record[field]

  if (!Array.isArray(value)) {
    throw invalidSyncData(`${context}.${field} must be an array`)
  }

  const records: Record<string, unknown>[] = []

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      throw invalidSyncData(`${context}.${field}[${index}] must be an object`)
    }

    requireId(entry, `${context}.${field}[${index}]`)
    records.push(entry)
  }

  return records
}

const validateProductGraphRecord = (
  record: Record<string, unknown>,
  context: string,
): void => {
  requireId(record, context)

  if (record["status"] !== "published") {
    throw invalidSyncData(`${context}.status must be published`)
  }

  if (typeof record["title"] !== "string") {
    throw invalidSyncData(`${context}.title must be a string`)
  }

  requireRecordArray(record, "categories", context)
  requireRecordArray(record, "sales_channels", context)
  requireRecordArray(record, "variants", context)

  const { brand } = record

  if (brand !== undefined && brand !== null) {
    const brands = Array.isArray(brand) ? brand : [brand]

    for (const [index, entry] of brands.entries()) {
      if (!isRecord(entry)) {
        throw invalidSyncData(`${context}.brand[${index}] must be an object`)
      }

      requireId(entry, `${context}.brand[${index}]`)
    }
  }
}

const readContentPage = (result: unknown, context: string): ContentPage => {
  if (
    !isRecord(result) ||
    !Array.isArray(result["docs"]) ||
    typeof result["hasNextPage"] !== "boolean"
  ) {
    throw invalidSyncData(
      `${context} must return docs as an array and hasNextPage as a boolean`,
    )
  }

  const docs: Record<string, unknown>[] = []

  for (const [index, value] of result["docs"].entries()) {
    if (!isRecord(value)) {
      throw invalidSyncData(`${context} docs[${index}] must be an object`)
    }

    requireId(value, `${context} docs[${index}]`)
    docs.push(value)
  }

  return { docs, hasNextPage: result["hasNextPage"] }
}

const getRawQueryRows = (result: unknown): Record<string, unknown>[] => {
  if (Array.isArray(result)) {
    return asRecords(result[0] ?? result)
  }

  const record = asRecord(result)

  return asRecords(record?.["rows"])
}

const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    return Number(value)
  }

  return Number.NaN
}

const readProductPopularity = async (
  database: DatabaseConnection,
  profile: SearchProfile,
): Promise<Map<string, number>> => {
  const salesChannelClause =
    profile.salesChannelIds.length > 0
      ? "and o.sales_channel_id = any(?::text[])"
      : ""

  const result = await database.raw(
    `select oli.product_id,
      sum(oi.quantity)::float as sold_quantity
      from order_item oi
      join order_line_item oli
      on oli.id = oi.item_id
      and oli.deleted_at is null
      join "order" o
      on o.id = oi.order_id
      and o.version = oi.version
      where oi.deleted_at is null
      and o.deleted_at is null
      and o.canceled_at is null
      and o.is_draft_order = false
      and oli.product_id is not null ${salesChannelClause}
      group by oli.product_id`,
    profile.salesChannelIds.length > 0 ? [profile.salesChannelIds] : [],
  )

  const popularity = new Map<string, number>()

  for (const row of getRawQueryRows(result)) {
    const productId = row["product_id"]
    const soldQuantity = toNumber(row["sold_quantity"])

    if (typeof productId === "string" && Number.isFinite(soldQuantity)) {
      popularity.set(productId, Math.max(0, soldQuantity))
    }
  }

  return popularity
}

const productBelongsToProfile = (
  document: Record<string, unknown>,
  profile: SearchProfile,
): boolean => {
  if (
    profile.availability === "in-stock" &&
    document["facet_in_stock"] !== true
  ) {
    return false
  }

  if (profile.salesChannelIds.length === 0) {
    return true
  }

  const productSalesChannelIds = new Set(
    Array.isArray(document["facet_sales_channel_ids"])
      ? document["facet_sales_channel_ids"].filter(
          (value): value is string => typeof value === "string",
        )
      : [],
  )

  return profile.salesChannelIds.some((id) => productSalesChannelIds.has(id))
}

const collectCategoryReferences = (
  product: Record<string, unknown>,
  references: ProfileReferenceIds,
) => {
  for (const category of asRecords(product["categories"])) {
    const id = getId(category)

    if (id !== undefined) {
      references.categoryIds.add(id)

      const title =
        typeof product["title"] === "string"
          ? product["title"].trim()
          : undefined

      if (title !== undefined && title.length > 0) {
        const titles =
          references.categoryProductTitles.get(id) ?? new Set<string>()

        if (!titles.has(title) && [...titles].join(" ").length < 10_000) {
          titles.add(title)
          references.categoryProductTitles.set(id, titles)
        }
      }
    }
  }
}

const collectBrandReferences = (
  product: Record<string, unknown>,
  references: ProfileReferenceIds,
) => {
  const brands = Array.isArray(product["brand"])
    ? asRecords(product["brand"])
    : [asRecord(product["brand"])].filter(
        (entry): entry is Record<string, unknown> => entry !== undefined,
      )

  for (const brand of brands) {
    const id = getId(brand)

    if (id !== undefined) {
      references.brandIds.add(id)
    }
  }
}

const collectProductReferences = (
  product: Record<string, unknown>,
  references: ProfileReferenceIds,
) => {
  collectCategoryReferences(product, references)
  collectBrandReferences(product, references)
}

const fetchGraphBatch = async (
  query: SearchGraphQuery,
  options: {
    afterId?: string
    context: string
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  },
): Promise<Record<string, unknown>[]> => {
  const filters = {
    ...options.filters,
    ...(options.afterId === undefined ? {} : { id: { $gt: options.afterId } }),
  }
  const result: unknown = await query.graph({
    entity: options.entity,
    fields: options.fields,
    ...(Object.keys(filters).length === 0 ? {} : { filters }),
    pagination: { order: { id: "ASC" }, take: BATCH_SIZE },
  })
  const records = readGraphRecords(result, options.context)
  const ids = new Set<string>()
  let previousId = options.afterId

  for (const [index, record] of records.entries()) {
    const id = requireId(record, `${options.context} data[${index}]`)

    if (ids.has(id)) {
      throw invalidSyncData(
        `${options.context} returned a duplicate pagination id ${id}`,
      )
    }
    if (previousId !== undefined && id <= previousId) {
      throw invalidSyncData(
        `${options.context} returned out-of-order pagination id ${id} after ${previousId}`,
      )
    }

    ids.add(id)
    previousId = id
  }

  return records
}

const fetchGraphPages = async (
  query: SearchGraphQuery,
  options: {
    context: string
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    maximumPages: number
  },
): Promise<Record<string, unknown>[]> => {
  const seenIds = new Set<string>()

  const fetchPage = async (
    page: number,
    afterId?: string,
  ): Promise<Record<string, unknown>[]> => {
    if (page >= options.maximumPages) {
      throw new SearchSynchronizationError(
        "SEARCH_SYNC_PAGE_LIMIT_EXCEEDED",
        `${options.context} exceeded ${options.maximumPages} pages`,
      )
    }

    const records = await fetchGraphBatch(query, {
      ...(afterId === undefined ? {} : { afterId }),
      context: `${options.context} page ${page + 1}`,
      entity: options.entity,
      fields: options.fields,
      ...(options.filters === undefined ? {} : { filters: options.filters }),
    })

    for (const record of records) {
      const id = requireId(record, `${options.context} page ${page + 1}`)

      if (seenIds.has(id)) {
        throw invalidSyncData(
          `${options.context} returned duplicate pagination id ${id}`,
        )
      }

      seenIds.add(id)
    }

    if (records.length < BATCH_SIZE) {
      return records
    }

    const lastRecord = records.at(-1)

    if (lastRecord === undefined) {
      return records
    }

    const nextRecords = await fetchPage(
      page + 1,
      requireId(lastRecord, `${options.context} page ${page + 1}`),
    )

    return [...records, ...nextRecords]
  }

  return await fetchPage(0)
}

const normalizeLocale = (value: string): string =>
  value.trim().toLowerCase().replaceAll("_", "-").split("-")[0] ?? ""

const applyLocalizedTranslations = async (
  query: SearchGraphQuery,
  records: Record<string, unknown>[],
  locale: string,
): Promise<Record<string, unknown>[]> => {
  const ids = records.map(getId).filter((id): id is string => id !== undefined)

  if (ids.length === 0 || locale === "default") {
    return records
  }

  const data = await fetchGraphPages(query, {
    context: "translation graph query",
    entity: "translation",
    fields: ["id", "reference_id", "locale_code", "translations"],
    filters: { reference_id: ids },
    maximumPages: MAX_TRANSLATION_PAGES_PER_BATCH,
  })

  const translationsById = new Map<string, Record<string, unknown>>()
  const requestedIds = new Set(ids)

  for (const [index, row] of data.entries()) {
    const referenceId = row["reference_id"]
    const localeCode = row["locale_code"]

    if (
      typeof referenceId !== "string" ||
      referenceId.length === 0 ||
      !requestedIds.has(referenceId)
    ) {
      throw invalidSyncData(
        `translation graph query data[${index}].reference_id must reference a requested record`,
      )
    }

    if (typeof localeCode !== "string" || localeCode.length === 0) {
      throw invalidSyncData(
        `translation graph query data[${index}].locale_code must be a non-empty string`,
      )
    }

    if (normalizeLocale(localeCode) !== normalizeLocale(locale)) {
      continue
    }

    const rawTranslations = row["translations"]

    if (!isRecord(rawTranslations)) {
      throw invalidSyncData(
        `translation graph query data[${index}].translations must be an object`,
      )
    }

    const translations: Record<string, unknown> = {}

    for (const field of LOCALIZED_SEARCH_FIELDS) {
      const value = rawTranslations[field]

      if (value !== undefined && value !== null && typeof value !== "string") {
        throw invalidSyncData(
          `translation graph query data[${index}].translations.${field} must be a string or null`,
        )
      }

      if (value !== undefined) {
        translations[field] = value
      }
    }

    translationsById.set(referenceId, translations)
  }

  return records.map((record) => {
    const id = getId(record)
    const translations = id === undefined ? undefined : translationsById.get(id)

    return translations === undefined ? record : { ...record, ...translations }
  })
}

const deleteStaleDocuments = async (
  client: MeilisearchAdminClient,
  index: string,
  currentIds: Set<string>,
): Promise<number> => {
  const existingIds = await client.getDocumentIds(index)
  const staleIds = existingIds.filter((id) => !currentIds.has(id))

  const deleteBatch = async (offset: number): Promise<void> => {
    if (offset >= staleIds.length) {
      return
    }

    await client.deleteDocuments(
      index,
      staleIds.slice(offset, offset + BATCH_SIZE),
    )
    await deleteBatch(offset + BATCH_SIZE)
  }

  await deleteBatch(0)

  return staleIds.length
}

const indexProductDocuments = async (options: {
  client: MeilisearchAdminClient
  index: string
  popularityByProductId: Map<string, number>
  profile: SearchProfile
  query: SearchGraphQuery
}): Promise<{
  ids: Set<string>
  indexed: number
  references: ProfileReferenceIds
}> => {
  const {
    client,
    index: targetIndex,
    popularityByProductId,
    profile,
    query,
  } = options
  const ids = new Set<string>()
  const references: ProfileReferenceIds = {
    brandIds: new Set<string>(),
    categoryIds: new Set<string>(),
    categoryProductTitles: new Map<string, Set<string>>(),
  }

  const buildBatchDocuments = async (
    records: Record<string, unknown>[],
    page: number,
  ): Promise<Record<string, unknown>[]> => {
    for (const [recordIndex, record] of records.entries()) {
      validateProductGraphRecord(
        record,
        `product graph query page ${page + 1} data[${recordIndex}]`,
      )
    }

    const localizedRecords = await applyLocalizedTranslations(
      query,
      records,
      profile.locale,
    )
    const documents: Record<string, unknown>[] = []

    for (const record of localizedRecords) {
      const productId = requireId(record, "localized product")
      const popularity = popularityByProductId.get(productId)
      const productDocuments = buildProductSearchDocuments(
        record,
        popularity === undefined ? undefined : { popularity },
      )

      for (const document of productDocuments) {
        if (productBelongsToProfile(document, profile)) {
          documents.push(document)
        }
      }
    }

    return documents
  }

  const recordBatchDocuments = (documents: Record<string, unknown>[]): void => {
    for (const document of documents) {
      const id = requireId(document, "product search document")

      if (ids.has(id)) {
        throw invalidSyncData(`Duplicate product search document id ${id}`)
      }

      ids.add(id)
      collectProductReferences(document, references)
    }
  }

  const indexPage = async (page: number, afterId?: string): Promise<void> => {
    if (page >= MAX_ENTITY_PAGES) {
      throw new SearchSynchronizationError(
        "SEARCH_SYNC_PAGE_LIMIT_EXCEEDED",
        `product graph query exceeded ${MAX_ENTITY_PAGES} pages`,
      )
    }

    const records = await fetchGraphBatch(query, {
      ...(afterId === undefined ? {} : { afterId }),
      context: `product graph query page ${page + 1}`,
      entity: "product",
      fields: PRODUCT_FIELDS,
      filters: { status: "published" },
    })
    const documents = await buildBatchDocuments(records, page)

    recordBatchDocuments(documents)

    if (documents.length > 0) {
      await client.addDocuments(targetIndex, documents)
    }

    if (records.length < BATCH_SIZE) {
      return
    }

    const lastRecord = records.at(-1)

    if (lastRecord !== undefined) {
      await indexPage(
        page + 1,
        requireId(lastRecord, `product graph query page ${page + 1}`),
      )
    }
  }

  await indexPage(0)

  return { ids, indexed: ids.size, references }
}

const indexReferencedEntities = async (
  query: SearchGraphQuery,
  client: MeilisearchAdminClient,
  options: {
    entity: "brand" | "product_category"
    fields: string[]
    ids: Set<string>
    index: string
    locale: string
    transform: (document: Record<string, unknown>) => Record<string, unknown>
  },
): Promise<Set<string>> => {
  const currentIds = new Set<string>()
  const ids = [...options.ids]

  const indexBatch = async (offset: number): Promise<void> => {
    if (offset >= ids.length) {
      return
    }

    const batchIds = ids.slice(offset, offset + BATCH_SIZE)
    const result: unknown = await query.graph({
      entity: options.entity,
      fields: options.fields,
      filters: {
        id: { $in: batchIds },
        ...(options.entity === "product_category" ? { is_active: true } : {}),
      },
      pagination: { order: { id: "ASC" }, take: BATCH_SIZE },
    })
    const records = readGraphRecords(
      result,
      `${options.entity} graph query batch ${offset / BATCH_SIZE + 1}`,
    )

    if (records.length > batchIds.length) {
      throw invalidSyncData(
        `${options.entity} graph query returned more records than requested`,
      )
    }

    for (const [recordIndex, record] of records.entries()) {
      const id = requireId(record, `${options.entity} data[${recordIndex}]`)

      if (!options.ids.has(id)) {
        throw invalidSyncData(
          `${options.entity} graph query returned unrequested id ${id}`,
        )
      }
    }

    const localizedRecords = await applyLocalizedTranslations(
      query,
      records,
      options.locale,
    )
    const documents = localizedRecords.map(options.transform)

    for (const document of documents) {
      const id = requireId(document, `${options.entity} search document`)

      if (currentIds.has(id)) {
        throw invalidSyncData(
          `Duplicate ${options.entity} search document id ${id}`,
        )
      }

      currentIds.add(id)
    }

    if (documents.length > 0) {
      await client.addDocuments(options.index, documents)
    }

    await indexBatch(offset + BATCH_SIZE)
  }

  await indexBatch(0)

  return currentIds
}

const resolvePayloadService = (
  container: MedusaContainer,
): SearchContentService | null => {
  try {
    return container.resolve<SearchContentService>(PAYLOAD_MODULE)
  } catch {
    return null
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const fetchContentPage = async (options: {
  page: number
  payload: SearchContentService
  profile: SearchProfile
  type: "article" | "page"
}): Promise<ContentPageResult> => {
  try {
    const requestOptions = {
      limit: BATCH_SIZE,
      locale: options.profile.locale,
      page: options.page,
    }
    const rawResult: unknown =
      options.type === "article"
        ? await options.payload.listPublishedArticles(requestOptions)
        : await options.payload.listPublishedPages(requestOptions)

    return {
      page: readContentPage(
        rawResult,
        `Payload ${options.type} collection page ${options.page}`,
      ),
      status: "available",
    }
  } catch (error) {
    return {
      reason: `Payload ${options.type} collection unavailable: ${errorMessage(error)}`,
      status: "unavailable",
    }
  }
}

const indexContentDocuments = async (
  payload: SearchContentService | null,
  client: MeilisearchAdminClient,
  profile: SearchProfile,
  index: string,
): Promise<ContentIndexResult> => {
  const currentIds = new Set<string>()

  if (payload === null) {
    return {
      reason: "Payload content service is not registered",
      status: "unavailable",
    }
  }

  const indexCollectionPage = async (
    type: "article" | "page",
    pageNumber: number,
  ): Promise<ContentUnavailable | undefined> => {
    if (pageNumber > MAX_CONTENT_PAGES_PER_COLLECTION) {
      return {
        reason: `Payload ${type} collection exceeded ${MAX_CONTENT_PAGES_PER_COLLECTION} pages`,
        status: "unavailable",
      }
    }

    const result = await fetchContentPage({
      page: pageNumber,
      payload,
      profile,
      type,
    })

    if (result.status === "unavailable") {
      return result
    }

    const documents = result.page.docs.map((document) =>
      buildContentSearchDocument(document, type, profile.locale),
    )

    for (const document of documents) {
      const id = requireId(document, `${type} search document`)

      if (currentIds.has(id)) {
        return {
          reason: `Payload ${type} collection returned duplicate id ${id}`,
          status: "unavailable",
        }
      }

      currentIds.add(id)
    }

    if (documents.length > 0) {
      await client.addDocuments(index, documents)
    }

    return result.page.hasNextPage
      ? await indexCollectionPage(type, pageNumber + 1)
      : undefined
  }

  const pageFailure = await indexCollectionPage("page", 1)

  if (pageFailure !== undefined) {
    return pageFailure
  }

  const articleFailure = await indexCollectionPage("article", 1)

  return articleFailure ?? { ids: currentIds, status: "available" }
}

const createTargets = (
  profile: SearchProfile,
  mode: SearchProfileSyncMode,
): SearchSyncTargets => {
  if (mode === "normal") {
    return profile.indexes
  }

  const suffix = `build_${Date.now()}_${randomUUID().slice(0, 8)}`

  return {
    brand: `${profile.indexes.brand}__${suffix}`,
    category: `${profile.indexes.category}__${suffix}`,
    content: `${profile.indexes.content}__${suffix}`,
    product: `${profile.indexes.product}__${suffix}`,
  }
}

const prepareTargets = async (
  client: MeilisearchAdminClient,
  targets: SearchSyncTargets,
): Promise<void> => {
  await Promise.all(
    SEARCH_INDEX_TYPES.map(async (type) => {
      const index = targets[type]

      await client.ensureIndex(index)
      await client.updateSettings(index, SEARCH_INDEX_SETTINGS[type])
    }),
  )
}

const finalizeFullSync = async (
  client: MeilisearchAdminClient,
  profile: SearchProfile,
  targets: SearchSyncTargets,
): Promise<void> => {
  const completionMarkerId = `search_build_marker_${Date.now()}_${randomUUID().slice(0, 8)}`

  await Promise.all(
    SEARCH_INDEX_TYPES.map(async (type) => {
      await client.ensureIndex(profile.indexes[type])
    }),
  )
  await client.addDocuments(targets.content, [{ id: completionMarkerId }])
  await client.swapIndexPairs(
    SEARCH_INDEX_TYPES.map((type) => ({
      first: profile.indexes[type],
      second: targets[type],
    })),
    { documentId: completionMarkerId, index: profile.indexes.content },
  )
  await client.deleteDocuments(profile.indexes.content, [completionMarkerId])
  await Promise.all(
    SEARCH_INDEX_TYPES.map(async (type) => {
      await client.deleteIndex(targets[type])
    }),
  )
}

const cleanupBuildTargets = async (
  client: MeilisearchAdminClient,
  targets: SearchSyncTargets,
  logger: Logger,
): Promise<void> => {
  await Promise.all(
    Object.values(targets).map(async (index) => {
      try {
        await client.deleteIndex(index)
      } catch (error) {
        logger.warn(
          `Unable to clean temporary Meilisearch index ${index}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }),
  )
}

const syncProfile = async (options: {
  client: MeilisearchAdminClient
  container: MedusaContainer
  logger: Logger
  mode: SearchProfileSyncMode
  profile: SearchProfile
}): Promise<{ deleted: number; indexed: number }> => {
  const { client, container, logger, mode, profile } = options
  const query = container.resolve<SearchGraphQuery>(
    ContainerRegistrationKeys.QUERY,
  )
  const database = container.resolve<DatabaseConnection>(
    ContainerRegistrationKeys.PG_CONNECTION,
  )
  const payload = resolvePayloadService(container)
  const targets = createTargets(profile, mode)

  let finalized = false

  try {
    await prepareTargets(client, targets)

    const popularityByProductId = await readProductPopularity(database, profile)

    const products = await indexProductDocuments({
      client,
      index: targets.product,
      popularityByProductId,
      profile,
      query,
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

        if (id === undefined || profile.strict) {
          return category
        }

        const productTitles = products.references.categoryProductTitles.get(id)
        const joinedTitles = [...(productTitles ?? [])].join(" ")

        return {
          ...category,
          ...(joinedTitles.length > 0
            ? { product_titles: joinedTitles.slice(0, 10_000) }
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

    const content = await indexContentDocuments(
      payload,
      client,
      profile,
      targets.content,
    )

    if (content.status === "unavailable") {
      logger.warn(
        `Skipping authoritative content synchronization for ${profile.key}: ${content.reason}`,
      )

      if (mode === "full") {
        throw new SearchSynchronizationError(
          "SEARCH_SYNC_SOURCE_UNAVAILABLE",
          `Cannot finalize full search sync for ${profile.key}: ${content.reason}`,
        )
      }
    }

    let deleted = 0

    if (mode === "normal") {
      const deletedCounts = await Promise.all([
        deleteStaleDocuments(client, targets.product, products.ids),
        deleteStaleDocuments(client, targets.category, categoryIds),
        deleteStaleDocuments(client, targets.brand, brandIds),
        ...(content.status === "available"
          ? [deleteStaleDocuments(client, targets.content, content.ids)]
          : []),
      ])

      deleted = deletedCounts.reduce((total, count) => total + count, 0)
    } else {
      await finalizeFullSync(client, profile, targets)

      finalized = true
    }

    const indexed =
      products.indexed +
      categoryIds.size +
      brandIds.size +
      (content.status === "available" ? content.ids.size : 0)

    logger.info(
      `Meilisearch profile ${profile.key} synchronized: mode=${mode}, indexed=${
        indexed
      }, deleted=${deleted}`,
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
  if (options.profile.id === undefined || options.profile.id.length === 0) {
    return
  }

  try {
    const service = options.container.resolve<SearchProfileSyncStateService>(
      SEARCH_PROFILE_MODULE,
    )
    const update = { id: options.profile.id, ...options.state }

    await service.updateSearchProfiles(update)
  } catch (error) {
    options.logger.warn(
      `Unable to record Meilisearch sync state for ${options.profile.key}: ${
        error instanceof Error ? error.message : String(error)
      }`,
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
      last_sync_error: null,
      last_sync_mode: options.mode,
      last_sync_started_at: new Date(),
      last_sync_status: "running",
    },
  }

  await updateProfileSyncState(runningState)

  try {
    const result = await syncProfile(options)

    const succeededState = {
      ...options,

      state: {
        last_deleted_count: result.deleted,
        last_indexed_count: result.indexed,
        last_sync_error: null,
        last_sync_mode: options.mode,
        last_sync_status: "succeeded",
        last_synced_at: new Date(),
      },
    }

    await updateProfileSyncState(succeededState)

    return result
  } catch (error) {
    const failedState = {
      ...options,
      state: {
        last_sync_error: error instanceof Error ? error.message : String(error),
        last_sync_mode: options.mode,
        last_sync_status: "failed",
      },
    }

    await updateProfileSyncState(failedState)

    throw error
  }
}

const synchronizeUnlocked = async (
  container: MedusaContainer,
  mode: SearchProfileSyncMode,
  options?: SearchProfileSyncOptions,
): Promise<SearchProfileSyncResult> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (!isMeilisearchEnabled()) {
    logger.info("Skipping search profile sync because Meilisearch is disabled")

    return {
      deleted: 0,
      indexed: 0,
      mode,
      profiles: 0,
      status: "skipped_disabled",
    }
  }

  const requestedKeys =
    options?.profileKeys !== undefined && options.profileKeys.length > 0
      ? new Set(options.profileKeys)
      : undefined
  const configuredProfiles = await loadSearchProfiles(container, {
    fresh: requestedKeys !== undefined,
  })
  const profiles =
    requestedKeys === undefined
      ? configuredProfiles
      : configuredProfiles.filter((profile) => requestedKeys.has(profile.key))
  if (requestedKeys !== undefined && profiles.length !== requestedKeys.size) {
    const foundKeys = new Set(profiles.map((profile) => profile.key))
    const missingKeys = [...requestedKeys].filter((key) => !foundKeys.has(key))
    throw new SearchSynchronizationError(
      "SEARCH_SYNC_PROFILE_NOT_FOUND",
      `Search profiles were not found for synchronization: ${missingKeys.join(", ")}`,
    )
  }
  const client = new MeilisearchAdminClient()

  const syncProfileAt = async (
    profileIndex: number,
    totals: { deleted: number; indexed: number },
  ): Promise<{ deleted: number; indexed: number }> => {
    const profile = profiles[profileIndex]

    if (profile === undefined) {
      return totals
    }

    const result = await syncProfileWithStatus({
      client,
      container,
      logger,
      mode,
      profile,
    })

    return await syncProfileAt(profileIndex + 1, {
      deleted: totals.deleted + result.deleted,
      indexed: totals.indexed + result.indexed,
    })
  }
  const totals = await syncProfileAt(0, { deleted: 0, indexed: 0 })

  return {
    deleted: totals.deleted,
    indexed: totals.indexed,
    mode,
    profiles: profiles.length,
    status: "completed",
  }
}

export const synchronizeSearchProfiles = async (
  container: MedusaContainer,
  mode: SearchProfileSyncMode,
  options?: SearchProfileSyncOptions,
): Promise<SearchProfileSyncResult> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const locking = container.resolve<ILockingModule>(Modules.LOCKING)
  const execution = await executeWithLockTimeout(
    locking,
    SEARCH_SYNC_LOCK_KEY,
    1,
    async () => await synchronizeUnlocked(container, mode, options),
  )

  if (execution.status === "timed_out") {
    logger.info(
      `Skipping ${mode} Meilisearch sync because another instance holds the lock`,
    )
    return {
      deleted: 0,
      indexed: 0,
      mode,
      profiles: 0,
      status: "skipped_lock_contended",
    }
  }

  return execution.value
}
