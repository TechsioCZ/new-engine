import type {
  ExecArgs,
  Logger,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"

const BATCH_SIZE = 1000

type SyncEntityConfig = {
  entity: "product" | "product_category" | "producer"
  entityType: "products" | "categories" | "producers"
  filters?: Record<string, unknown>
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
    entity: "producer",
    entityType: "producers",
  },
]

const resolveRecordId = (record: unknown): string | undefined => {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return undefined
  }

  const id = (record as { id?: unknown }).id
  if (typeof id === "string" && id.trim()) {
    return id
  }
  if (typeof id === "number" && Number.isFinite(id)) {
    return String(id)
  }

  return undefined
}

const syncEntityToMeilisearch = async ({
  config,
  logger,
  meilisearchIndexService,
  queryService,
}: {
  config: SyncEntityConfig
  logger: Logger
  meilisearchIndexService: MeiliSearchService
  queryService: Query
}): Promise<{
  indexed: number
  deleted: number
}> => {
  const fields = await meilisearchIndexService.getFieldsForType(config.entityType)
  const indexes = await meilisearchIndexService.getIndexesByType(config.entityType)

  if (indexes.length === 0) {
    logger.info(
      `Skipping ${config.entityType} sync because no MeiliSearch indexes are configured for this type`
    )
    return {
      indexed: 0,
      deleted: 0,
    }
  }

  const indexedIds = new Set<string>()
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data } = await queryService.graph({
      entity: config.entity,
      fields,
      pagination: {
        take: BATCH_SIZE,
        skip: offset,
      },
      filters: config.filters,
    })

    const records = Array.isArray(data) ? data : []
    if (records.length === 0) {
      break
    }

    await Promise.all(
      indexes.map((index) => meilisearchIndexService.addDocuments(index, records))
    )

    for (const record of records) {
      const id = resolveRecordId(record)
      if (id) {
        indexedIds.add(id)
      }
    }

    offset += records.length
    if (records.length < BATCH_SIZE) {
      hasMore = false
    }
  }

  const orphanedIds = new Set<string>()

  for (const index of indexes) {
    let searchOffset = 0
    let hasIndexedRows = true

    while (hasIndexedRows) {
      const indexedResult = await meilisearchIndexService.search(index, "", {
        paginationOptions: {
          offset: searchOffset,
          limit: BATCH_SIZE,
        },
        additionalOptions: {
          attributesToRetrieve: ["id"],
        },
      })

      const hits = Array.isArray(indexedResult.hits) ? indexedResult.hits : []
      if (hits.length === 0) {
        hasIndexedRows = false
        break
      }

      for (const hit of hits) {
        const id = resolveRecordId(hit)
        if (!id) {
          continue
        }

        if (!indexedIds.has(id)) {
          orphanedIds.add(id)
        }
      }

      searchOffset += hits.length
      if (hits.length < BATCH_SIZE) {
        hasIndexedRows = false
      }
    }
  }

  if (orphanedIds.size > 0) {
    const idsToDelete = Array.from(orphanedIds)
    for (let cursor = 0; cursor < idsToDelete.length; cursor += BATCH_SIZE) {
      const batch = idsToDelete.slice(cursor, cursor + BATCH_SIZE)
      await Promise.all(
        indexes.map((index) => meilisearchIndexService.deleteDocuments(index, batch))
      )
    }
  }

  logger.info(
    `Synced ${config.entityType}: indexed=${indexedIds.size}, deleted=${orphanedIds.size}`
  )

  return {
    indexed: indexedIds.size,
    deleted: orphanedIds.size,
  }
}

export default async function searchIndexScript({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const queryService = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const meilisearchIndexService: MeiliSearchService =
    container.resolve("meilisearch")

  let totalIndexed = 0
  let totalDeleted = 0

  for (const config of SYNC_ENTITIES) {
    const result = await syncEntityToMeilisearch({
      config,
      logger,
      meilisearchIndexService,
      queryService,
    })
    totalIndexed += result.indexed
    totalDeleted += result.deleted
  }

  logger.info(
    `MeiliSearch sync complete: indexed=${totalIndexed}, deleted=${totalDeleted}`
  )
}
