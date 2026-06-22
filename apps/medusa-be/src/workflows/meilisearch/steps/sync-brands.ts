import type { Query } from "@medusajs/framework"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"
import { isMeilisearchEnabled } from "../../../modules/meilisearch/env"
import { MEILISEARCH, BRANDS } from "../"

export type SyncMeilisearchBrandsStepInput = {
  filters?: Record<string, unknown>
}

export const syncMeilisearchBrandsStep = createStep(
  "sync-meilisearch-brands-step",
  async ({ filters }: SyncMeilisearchBrandsStepInput, { container }) => {
    if (!isMeilisearchEnabled()) {
      return new StepResponse({
        brands: [],
      })
    }

    const queryService = container.resolve<Query>("query")
    const meilisearchService: MeiliSearchService =
      container.resolve(MEILISEARCH)

    const brandFields = await meilisearchService.getFieldsForType(BRANDS)
    const brandIndexes = await meilisearchService.getIndexesByType(BRANDS)

    // Fetch ALL brands in batches to avoid pagination corruption
    // (pagination would cause deletion of brands not in the current page)
    const allBrands: Record<string, unknown>[] = []
    let dbOffset = 0
    const dbBatchSize = 1000
    while (true) {
      const { data: batch } = await queryService.graph({
        entity: "brand",
        fields: brandFields,
        pagination: {
          take: dbBatchSize,
          skip: dbOffset,
        },
        filters: {
          deleted_at: null,
          ...filters,
        },
      })
      allBrands.push(...batch)
      if (batch.length < dbBatchSize) {
        break
      }
      dbOffset += dbBatchSize
    }

    // Fetch all existing brand IDs from all indexes
    const existingBrandIds = new Set<string>()
    for (const index of brandIndexes) {
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
          existingBrandIds.add(hit.id)
        }

        if (result.hits.length < batchSize) {
          break
        }
        searchOffset += batchSize
      }
    }

    const currentBrandIds = new Set(allBrands.map((p) => p.id))
    const brandsToDelete = Array.from(existingBrandIds).filter(
      (id) => !currentBrandIds.has(id)
    )

    const transformedBrands = allBrands.map((brand) => ({
      ...brand,
      handle: `/store/brands/${brand.handle}/products`,
    }))

    await Promise.all(
      brandIndexes.map((index) =>
        meilisearchService.addDocuments(
          index,
          transformedBrands,
          BRANDS,
          {
            container,
          }
        )
      )
    )
    await Promise.all(
      brandIndexes.map((index) =>
        meilisearchService.deleteDocuments(index, brandsToDelete)
      )
    )

    return new StepResponse({
      brands: allBrands,
    })
  }
)
