import type { Query } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"

import { BRANDS, MEILISEARCH } from "../"
import { isMeilisearchEnabled } from "../../../modules/meilisearch/env"

export interface SyncMeilisearchBrandsStepInput {
  filters?: Record<string, unknown>
}

export const syncMeilisearchBrandsStep = createStep(
  "sync-meilisearch-brands",
  async ({ filters }: SyncMeilisearchBrandsStepInput, { container }) => {
    if (!isMeilisearchEnabled()) {
      return new StepResponse({
        brands: [],
      })
    }

    const queryService = container.resolve<Query>(
      ContainerRegistrationKeys.QUERY,
    )
    const meilisearchService: MeiliSearchService =
      container.resolve(MEILISEARCH)

    const brandFields = meilisearchService.getFieldsForType(BRANDS)
    const brandIndexes = meilisearchService.getIndexesByType(BRANDS)

    // Fetch ALL brands in batches to avoid pagination corruption
    // (pagination would cause deletion of brands not in the current page)
    const allBrands: Record<string, unknown>[] = []
    let dbOffset = 0
    const dbBatchSize = 1000
    while (true) {
      const { data: batch } = await queryService.graph({
        entity: "brand",
        fields: brandFields,
        filters: {
          deleted_at: null,
          ...filters,
        },
        pagination: {
          skip: dbOffset,
          take: dbBatchSize,
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
          additionalOptions: {
            attributesToRetrieve: ["id"],
          },
          paginationOptions: {
            limit: batchSize,
            offset: searchOffset,
          },
        })

        for (const hit of result.hits) {
          existingBrandIds.add(hit["id"])
        }

        if (result.hits.length < batchSize) {
          break
        }
        searchOffset += batchSize
      }
    }

    const currentBrandIds = new Set(allBrands.map((brand) => brand["id"]))
    const brandsToDelete = [...existingBrandIds].filter(
      (id) => !currentBrandIds.has(id),
    )

    const transformedBrands = allBrands.map((brand) => {
      const handle = typeof brand["handle"] === "string" ? brand["handle"] : ""
      return {
        ...brand,
        handle: `/store/brands/${handle}/products`,
      }
    })

    await Promise.all(
      brandIndexes.map(
        async (index) =>
          await meilisearchService.addDocuments(
            index,
            transformedBrands,
            BRANDS,
            {
              container,
            },
          ),
      ),
    )
    await Promise.all(
      brandIndexes.map(
        async (index) =>
          await meilisearchService.deleteDocuments(index, brandsToDelete),
      ),
    )

    return new StepResponse({
      brands: allBrands,
    })
  },
)
