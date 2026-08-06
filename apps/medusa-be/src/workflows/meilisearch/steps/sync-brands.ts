import type { Query } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"
import { isRecord } from "@techsio/std/object"

import { BRANDS, MEILISEARCH } from "../"
import { isMeilisearchEnabled } from "../../../modules/meilisearch/env"

export interface SyncMeilisearchBrandsStepInput {
  filters?: Record<string, unknown>
}

const BATCH_SIZE = 1000
const MAX_PAGINATION_BATCHES = 10_000

type BrandDocument = Record<string, unknown> & { id: string }

const invalidMeilisearchData = (message: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, message)

const requireStringArray = (value: unknown, source: string): string[] => {
  if (!Array.isArray(value)) {
    throw invalidMeilisearchData(`${source} must be an array`)
  }

  const entries: unknown[] = value
  return entries.map((entry) => {
    if (typeof entry !== "string" || entry.length === 0) {
      throw invalidMeilisearchData(`${source} must contain non-empty strings`)
    }

    return entry
  })
}

const requireBrandDocuments = (
  result: unknown,
  source: string,
): BrandDocument[] => {
  if (!isRecord(result) || !Array.isArray(result["data"])) {
    throw invalidMeilisearchData(`${source} returned an invalid data payload`)
  }

  const data: unknown[] = result["data"]
  return data.map((entry) => {
    if (!isRecord(entry)) {
      throw invalidMeilisearchData(`${source} returned a non-object brand`)
    }

    const { id } = entry
    if (typeof id !== "string" || id.length === 0) {
      throw invalidMeilisearchData(`${source} returned a brand without an id`)
    }

    return { ...entry, id }
  })
}

const requireSearchHitIds = (result: unknown, index: string): string[] => {
  if (!isRecord(result) || !Array.isArray(result["hits"])) {
    throw invalidMeilisearchData(
      `Meilisearch index "${index}" returned an invalid hits payload`,
    )
  }

  const hits: unknown[] = result["hits"]
  return hits.map((hit) => {
    if (!isRecord(hit)) {
      throw invalidMeilisearchData(
        `Meilisearch index "${index}" returned a non-object hit`,
      )
    }

    const { id } = hit
    if (typeof id !== "string" || id.length === 0) {
      throw invalidMeilisearchData(
        `Meilisearch index "${index}" returned a hit without an id`,
      )
    }

    return id
  })
}

const fetchAllBrands = async ({
  batchesRemaining = MAX_PAGINATION_BATCHES,
  fields,
  filters,
  offset = 0,
  query,
}: {
  batchesRemaining?: number
  fields: string[]
  filters: Record<string, unknown> | undefined
  offset?: number
  query: Query
}): Promise<BrandDocument[]> => {
  if (batchesRemaining === 0) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Brand query exceeded ${MAX_PAGINATION_BATCHES} batches`,
    )
  }

  const result: unknown = await query.graph({
    entity: "brand",
    fields,
    filters: {
      deleted_at: null,
      ...filters,
    },
    pagination: {
      skip: offset,
      take: BATCH_SIZE,
    },
  })
  const batch = requireBrandDocuments(result, "Brand query")

  if (batch.length < BATCH_SIZE) {
    return batch
  }

  const remainingBrands = await fetchAllBrands({
    batchesRemaining: batchesRemaining - 1,
    fields,
    filters,
    offset: offset + BATCH_SIZE,
    query,
  })

  return [...batch, ...remainingBrands]
}

const fetchIndexBrandIds = async ({
  batchesRemaining = MAX_PAGINATION_BATCHES,
  index,
  meilisearchService,
  offset = 0,
}: {
  batchesRemaining?: number
  index: string
  meilisearchService: MeiliSearchService
  offset?: number
}): Promise<string[]> => {
  if (batchesRemaining === 0) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Meilisearch index "${index}" exceeded ${MAX_PAGINATION_BATCHES} batches`,
    )
  }

  const result: unknown = await meilisearchService.search(index, "", {
    additionalOptions: {
      attributesToRetrieve: ["id"],
    },
    paginationOptions: {
      limit: BATCH_SIZE,
      offset,
    },
  })
  const hitIds = requireSearchHitIds(result, index)

  if (hitIds.length < BATCH_SIZE) {
    return hitIds
  }

  const remainingIds = await fetchIndexBrandIds({
    batchesRemaining: batchesRemaining - 1,
    index,
    meilisearchService,
    offset: offset + BATCH_SIZE,
  })

  return [...hitIds, ...remainingIds]
}

export const syncMeilisearchBrandsStep = createStep(
  "sync-meilisearch-brands",
  async ({ filters }: SyncMeilisearchBrandsStepInput, { container }) => {
    if (!isMeilisearchEnabled()) {
      return new StepResponse({ brands: [] })
    }

    const queryService = container.resolve<Query>(
      ContainerRegistrationKeys.QUERY,
    )
    const meilisearchService =
      container.resolve<MeiliSearchService>(MEILISEARCH)
    const brandFields = requireStringArray(
      meilisearchService.getFieldsForType(BRANDS),
      "Meilisearch brand fields",
    )
    const brandIndexes = requireStringArray(
      meilisearchService.getIndexesByType(BRANDS),
      "Meilisearch brand indexes",
    )
    const [allBrands, existingBrandIdLists] = await Promise.all([
      fetchAllBrands({
        fields: brandFields,
        filters,
        query: queryService,
      }),
      Promise.all(
        brandIndexes.map(
          async (index) =>
            await fetchIndexBrandIds({ index, meilisearchService }),
        ),
      ),
    ])
    const existingBrandIds = new Set(existingBrandIdLists.flat())
    const currentBrandIds = new Set(allBrands.map((brand) => brand.id))
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

    await Promise.all([
      Promise.all(
        brandIndexes.map(
          async (index) =>
            await meilisearchService.addDocuments(
              index,
              transformedBrands,
              BRANDS,
              { container },
            ),
        ),
      ),
      Promise.all(
        brandIndexes.map(
          async (index) =>
            await meilisearchService.deleteDocuments(index, brandsToDelete),
        ),
      ),
    ])

    return new StepResponse({ brands: allBrands })
  },
)
