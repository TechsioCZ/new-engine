import { createPromiseCache } from "@/lib/promise-cache"
import { IDS_CACHE_MAX_ENTRIES, IDS_CACHE_TTL_MS } from "./constants"
import {
  fetchCategoryProductIdsPage,
  fetchMeiliHits,
  fetchVariantProductIdsPage,
} from "./http"
import { collectIdsFromPaginatedSource, dedupeIdsFromHits } from "./id-utils"

const variantSizeIdsCache = createPromiseCache<string[]>({
  maxEntries: IDS_CACHE_MAX_ENTRIES,
  ttlMs: IDS_CACHE_TTL_MS,
})

const meiliQueryIdsCache = createPromiseCache<string[]>({
  maxEntries: IDS_CACHE_MAX_ENTRIES,
  ttlMs: IDS_CACHE_TTL_MS,
})

const categoryIdsCache = createPromiseCache<string[]>({
  maxEntries: IDS_CACHE_MAX_ENTRIES,
  ttlMs: IDS_CACHE_TTL_MS,
})

function getVariantSizeCacheKey(size: string, q?: string): string {
  return `${size.trim()}::${q?.trim() || ""}`
}

function getMeiliQueryCacheKey(query: string): string {
  return query.trim().toLowerCase()
}

function getCategoryCacheKey(params: {
  categories: string[]
  region_id?: string
  country_code: string
}): string {
  const categoryKey = params.categories.map((category) => category.trim()).join(",")
  return `${categoryKey}::${params.region_id || ""}::${params.country_code.trim().toLowerCase()}`
}

async function collectVariantProductIdsForSize(params: {
  size: string
  q?: string
}): Promise<string[]> {
  const { size, q } = params

  return await collectIdsFromPaginatedSource(async (offset, limit) => {
    const page = await fetchVariantProductIdsPage({
      size,
      q,
      limit,
      offset,
    })

    const variants = page.variants || []
    const ids = variants
      .map((variant) => variant.product_id?.trim())
      .filter((id): id is string => Boolean(id))

    return {
      ids,
      itemCount: variants.length,
      totalCount: page.count,
    }
  })
}

async function collectVariantProductIdsForSizeCached(params: {
  size: string
  q?: string
}): Promise<string[]> {
  const { size, q } = params
  const normalizedSize = size.trim()
  const normalizedQuery = q?.trim()
  const cacheKey = getVariantSizeCacheKey(normalizedSize, normalizedQuery)

  return await variantSizeIdsCache.getOrCreate(cacheKey, async () => {
    return await collectVariantProductIdsForSize({
      size: normalizedSize,
      q: normalizedQuery,
    })
  })
}

export async function collectVariantProductIdsForSizes(params: {
  sizes: string[]
  q?: string
}): Promise<string[]> {
  const { sizes, q } = params
  const mergedIds: string[] = []
  const seen = new Set<string>()

  const idsBySize = await Promise.all(
    sizes.map((size) => collectVariantProductIdsForSizeCached({ size, q }))
  )

  for (const ids of idsBySize) {
    for (const id of ids) {
      if (seen.has(id)) {
        continue
      }

      seen.add(id)
      mergedIds.push(id)
    }
  }

  return mergedIds
}

async function collectMeiliProductIdsForQuery(query: string): Promise<string[]> {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return []
  }

  return await collectIdsFromPaginatedSource(async (offset, limit) => {
    const page = await fetchMeiliHits({
      query: normalizedQuery,
      limit,
      offset,
    })
    const hits = page.hits || []

    return {
      ids: dedupeIdsFromHits(hits),
      // totalCount intentionally omitted: estimatedTotalHits can be approximate.
      itemCount: hits.length,
    }
  })
}

export async function collectMeiliProductIdsForQueryCached(
  query: string
): Promise<string[]> {
  const cacheKey = getMeiliQueryCacheKey(query)
  return await meiliQueryIdsCache.getOrCreate(cacheKey, async () => {
    return await collectMeiliProductIdsForQuery(query)
  })
}

async function collectCategoryProductIds(params: {
  categories: string[]
  region_id?: string
  country_code: string
}): Promise<string[]> {
  const { categories, region_id, country_code } = params

  return await collectIdsFromPaginatedSource(async (offset, limit) => {
    const page = await fetchCategoryProductIdsPage({
      categories,
      limit,
      offset,
      region_id,
      country_code,
    })
    const products = page.products || []
    const ids = products
      .map((product) => product.id?.trim())
      .filter((id): id is string => Boolean(id))

    return {
      ids,
      itemCount: products.length,
      totalCount: page.count,
    }
  })
}

export async function collectCategoryProductIdsCached(params: {
  categories: string[]
  region_id?: string
  country_code: string
}): Promise<string[]> {
  const normalizedCategories = Array.from(
    new Set(params.categories.map((category) => category.trim()).filter(Boolean))
  ).sort()

  if (normalizedCategories.length === 0) {
    return []
  }

  const normalizedCountryCode = params.country_code.trim().toLowerCase()
  if (!normalizedCountryCode) {
    return []
  }

  const cacheKey = getCategoryCacheKey({
    categories: normalizedCategories,
    region_id: params.region_id,
    country_code: normalizedCountryCode,
  })

  return await categoryIdsCache.getOrCreate(cacheKey, async () => {
    return await collectCategoryProductIds({
      categories: normalizedCategories,
      region_id: params.region_id,
      country_code: normalizedCountryCode,
    })
  })
}
