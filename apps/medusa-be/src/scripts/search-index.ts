import type { ExecArgs, Logger, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"
import { isRecord } from "@techsio/std/object"

import { isMeilisearchEnabled } from "../modules/meilisearch/env"
import { isUnknownArray } from "../utils/guards"

const BATCH_SIZE = 1000

interface SyncEntityConfig {
  entity: "product" | "product_category" | "brand"
  entityType: "products" | "categories" | "brands"
  filters?: Record<string, unknown>
}

interface SyncEntityServices {
  container: ExecArgs["container"]
  logger: Logger
  meilisearchIndexService: MeiliSearchService
  queryService: Query
}

type SyncEntityContext = SyncEntityServices & {
  config: SyncEntityConfig
  fields: string[]
  indexes: string[]
}

interface SyncEntityResult {
  indexed: number
  deleted: number
}

const SYNC_ENTITIES: SyncEntityConfig[] = [
  {
    entity: "product",
    entityType: "products",
    filters: {
      status: "published",
    },
  },
  {
    entity: "product_category",
    entityType: "categories",
    filters: {
      is_active: true,
    },
  },
  {
    entity: "brand",
    entityType: "brands",
  },
]

const resolveRecordId = (record: unknown): string | null => {
  if (!isRecord(record)) {
    return null
  }

  const { id } = record
  if (typeof id === "string" && id.trim() !== "") {
    return id
  }
  if (typeof id === "number" && Number.isFinite(id)) {
    return String(id)
  }

  return null
}

const EMPTY_SYNC_ENTITY_RESULT: SyncEntityResult = {
  deleted: 0,
  indexed: 0,
}

const fetchEntityBatch = async (
  { config, fields, queryService }: SyncEntityContext,
  offset: number,
): Promise<unknown[]> => {
  const { data } = await queryService.graph({
    entity: config.entity,
    fields,
    pagination: {
      skip: offset,
      take: BATCH_SIZE,
    },
    ...(config.filters ? { filters: config.filters } : {}),
  })

  return isUnknownArray(data) ? data : []
}

const indexEntityBatch = async (
  { config, container, indexes, meilisearchIndexService }: SyncEntityContext,
  records: unknown[],
): Promise<void> => {
  await Promise.all(
    indexes.map(async (index) => {
      await meilisearchIndexService.addDocuments(
        index,
        records,
        config.entityType,
        { container },
      )
    }),
  )
}

const addIndexedRecordIds = (
  indexedIds: Set<string>,
  records: unknown[],
): void => {
  for (const record of records) {
    const id = resolveRecordId(record)
    if (id !== null) {
      indexedIds.add(id)
    }
  }
}

// Batch reads stay strictly sequential pagination; the entity count is finite
// and the offset advances on every call, so each recursion terminates.
const indexEntityRecords = async (
  context: SyncEntityContext,
): Promise<Set<string>> => {
  const indexedIds = new Set<string>()
  const indexBatchesFrom = async (offset: number): Promise<Set<string>> => {
    const records = await fetchEntityBatch(context, offset)
    if (records.length === 0) {
      return indexedIds
    }

    await indexEntityBatch(context, records)
    addIndexedRecordIds(indexedIds, records)

    if (records.length < BATCH_SIZE) {
      return indexedIds
    }
    return await indexBatchesFrom(offset + records.length)
  }

  return await indexBatchesFrom(0)
}

const collectOrphanedIdsForIndex = async (
  meilisearchIndexService: MeiliSearchService,
  index: string,
  indexedIds: Set<string>,
): Promise<Set<string>> => {
  const orphanedIds = new Set<string>()
  const collectFrom = async (searchOffset: number): Promise<Set<string>> => {
    const indexedResult = await meilisearchIndexService.search(index, "", {
      additionalOptions: {
        attributesToRetrieve: ["id"],
      },
      paginationOptions: {
        limit: BATCH_SIZE,
        offset: searchOffset,
      },
    })

    const hits = Array.isArray(indexedResult.hits) ? indexedResult.hits : []
    if (hits.length === 0) {
      return orphanedIds
    }

    for (const hit of hits) {
      const id = resolveRecordId(hit)
      if (id !== null && !indexedIds.has(id)) {
        orphanedIds.add(id)
      }
    }

    if (hits.length < BATCH_SIZE) {
      return orphanedIds
    }
    return await collectFrom(searchOffset + hits.length)
  }

  return await collectFrom(0)
}

// Index scans stay sequential to bound Meilisearch load; the index list is
// finite and shrinks on every call.
const collectOrphanedIds = async (
  { indexes, meilisearchIndexService }: SyncEntityContext,
  indexedIds: Set<string>,
): Promise<Set<string>> => {
  const orphanedIds = new Set<string>()
  const collectAcross = async (
    remaining: readonly string[],
  ): Promise<Set<string>> => {
    const [index, ...rest] = remaining
    if (index === undefined) {
      return orphanedIds
    }

    const indexOrphanedIds = await collectOrphanedIdsForIndex(
      meilisearchIndexService,
      index,
      indexedIds,
    )
    for (const id of indexOrphanedIds) {
      orphanedIds.add(id)
    }
    return await collectAcross(rest)
  }

  return await collectAcross(indexes)
}

// Deletions run one bounded batch at a time; the id list shrinks by
// BATCH_SIZE on every call, so the recursion terminates.
const deleteOrphanedIds = async (
  { indexes, meilisearchIndexService }: SyncEntityContext,
  orphanedIds: Set<string>,
): Promise<void> => {
  const deleteBatches = async (
    idsToDelete: readonly string[],
  ): Promise<void> => {
    if (idsToDelete.length === 0) {
      return
    }

    const batch = idsToDelete.slice(0, BATCH_SIZE)
    await Promise.all(
      indexes.map(async (index) => {
        await meilisearchIndexService.deleteDocuments(index, batch)
      }),
    )
    await deleteBatches(idsToDelete.slice(BATCH_SIZE))
  }

  await deleteBatches([...orphanedIds])
}

const syncEntityToMeilisearch = async (
  services: SyncEntityServices & { config: SyncEntityConfig },
): Promise<SyncEntityResult> => {
  const { config, logger, meilisearchIndexService } = services
  const fields = meilisearchIndexService.getFieldsForType(config.entityType)
  const indexes = meilisearchIndexService.getIndexesByType(config.entityType)

  if (indexes.length === 0) {
    logger.info(
      `Skipping ${config.entityType} sync because no MeiliSearch indexes are configured for this type`,
    )
    return EMPTY_SYNC_ENTITY_RESULT
  }

  const context: SyncEntityContext = {
    ...services,
    fields,
    indexes,
  }

  const indexedIds = await indexEntityRecords(context)
  const orphanedIds = await collectOrphanedIds(context, indexedIds)
  if (orphanedIds.size > 0) {
    await deleteOrphanedIds(context, orphanedIds)
  }

  logger.info(
    `Synced ${config.entityType}: indexed=${indexedIds.size}, deleted=${orphanedIds.size}`,
  )

  return {
    deleted: orphanedIds.size,
    indexed: indexedIds.size,
  }
}

// Entities sync one at a time to bound database and Meilisearch load; the
// config list is finite and shrinks on every call.
const syncEntities = async (
  configs: readonly SyncEntityConfig[],
  services: SyncEntityServices,
  totals: SyncEntityResult,
): Promise<SyncEntityResult> => {
  const [config, ...remaining] = configs
  if (config === undefined) {
    return totals
  }

  const result = await syncEntityToMeilisearch({ ...services, config })
  return await syncEntities(remaining, services, {
    deleted: totals.deleted + result.deleted,
    indexed: totals.indexed + result.indexed,
  })
}

export default async function searchIndexScript({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (!isMeilisearchEnabled()) {
    logger.info("Skipping search indexing because Meilisearch is disabled")
    return
  }

  const queryService = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const meilisearchIndexService: MeiliSearchService =
    container.resolve("meilisearch")

  const totals = await syncEntities(
    SYNC_ENTITIES,
    { container, logger, meilisearchIndexService, queryService },
    EMPTY_SYNC_ENTITY_RESULT,
  )

  logger.info(
    `MeiliSearch sync complete: indexed=${totals.indexed}, deleted=${totals.deleted}`,
  )
}
