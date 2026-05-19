import type { Query } from "@medusajs/framework"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"
import { MEILISEARCH, PRODUCERS } from "../"

export type SyncMeilisearchProducersStepInput = {
  filters?: Record<string, unknown>
}

export const syncMeilisearchProducersStep = createStep(
  "sync-meilisearch-producers-step",
  async ({ filters }: SyncMeilisearchProducersStepInput, { container }) => {
    const queryService = container.resolve<Query>("query")
    const meilisearchService: MeiliSearchService =
      container.resolve(MEILISEARCH)

    const producerFields = await meilisearchService.getFieldsForType(PRODUCERS)
    const producerIndexes = await meilisearchService.getIndexesByType(PRODUCERS)

    // Fetch ALL producers in batches to avoid pagination corruption
    // (pagination would cause deletion of producers not in the current page)
    const allProducers: Record<string, unknown>[] = []
    let dbOffset = 0
    const dbBatchSize = 1000
    while (true) {
      const { data: batch } = await queryService.graph({
        entity: "producer",
        fields: producerFields,
        pagination: {
          take: dbBatchSize,
          skip: dbOffset,
        },
        filters: {
          deleted_at: null,
          ...filters,
        },
      })
      allProducers.push(...batch)
      if (batch.length < dbBatchSize) {
        break
      }
      dbOffset += dbBatchSize
    }

    // Fetch all existing producer IDs from all indexes
    const existingProducerIds = new Set<string>()
    for (const index of producerIndexes) {
      let searchOffset = 0
      const batchSize = 1000
      while (true) {
        const result = await meilisearchService.search(index, "", {
          paginationOptions: {
            offset: searchOffset,
            limit: batchSize,
          },
          additionalOptions: {
            attributesToRetrieve: ["id"],
          },
        })

        for (const hit of result.hits) {
          existingProducerIds.add(hit.id)
        }

        if (result.hits.length < batchSize) {
          break
        }
        searchOffset += batchSize
      }
    }

    const currentProducerIds = new Set(allProducers.map((p) => p.id))
    const producersToDelete = Array.from(existingProducerIds).filter(
      (id) => !currentProducerIds.has(id)
    )

    const transformedProducers = allProducers.map((producer) => ({
      ...producer,
      handle: `/store/producers/${producer.handle}/products`,
    }))

    await Promise.all(
      producerIndexes.map((index) =>
        meilisearchService.addDocuments(
          index,
          transformedProducers,
          PRODUCERS,
          {
            container,
          }
        )
      )
    )
    await Promise.all(
      producerIndexes.map((index) =>
        meilisearchService.deleteDocuments(index, producersToDelete)
      )
    )

    return new StepResponse({
      producers: allProducers,
    })
  }
)
