import type { Query } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"

import { BRANDS, MEILISEARCH } from "../"
import { isMeilisearchEnabled } from "../../../modules/meilisearch/env"

interface StringFilterOperators {
  $eq?: string
  $ilike?: string
  $in?: string[]
  $like?: string
  $ne?: string
}

type NullableStringFilter = null | string | StringFilterOperators

type StringFilter = string | StringFilterOperators

interface BrandQueryFilters {
  deleted_at?: Date | null | string
  gpsr_contact_email?: NullableStringFilter
  gpsr_european_reseller_contact_email?: NullableStringFilter
  gpsr_european_reseller_manufacturing_company_name?: NullableStringFilter
  gpsr_european_reseller_postal_address?: NullableStringFilter
  gpsr_manufactured_outside_eu?: boolean
  gpsr_manufacturing_company_name?: NullableStringFilter
  gpsr_postal_address?: NullableStringFilter
  handle?: StringFilter
  id?: StringFilter
  title?: StringFilter
}

export interface SyncMeilisearchBrandsStepInput {
  filters?: BrandQueryFilters
}

const BATCH_SIZE = 1000
const MAX_PAGINATION_BATCHES = 10_000

const brandDocumentSchema = z.looseObject({ id: z.string().min(1) })
type BrandDocument = z.infer<typeof brandDocumentSchema>

const brandQueryResultSchema = z.object({
  data: z.array(brandDocumentSchema),
})
const searchResultSchema = z.object({
  hits: z.array(z.object({ id: z.string().min(1) })),
})

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
  const parsed = brandQueryResultSchema.safeParse(result)
  if (!parsed.success) {
    throw invalidMeilisearchData(`${source} returned invalid brand data`)
  }
  return parsed.data.data
}

const requireSearchHitIds = (result: unknown, index: string): string[] => {
  const parsed = searchResultSchema.safeParse(result)
  if (!parsed.success) {
    throw invalidMeilisearchData(
      `Meilisearch index "${index}" returned invalid hit data`,
    )
  }
  return parsed.data.hits.map((hit) => hit.id)
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
  filters: BrandQueryFilters | undefined
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
