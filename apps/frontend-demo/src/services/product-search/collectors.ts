import { createPromiseCache } from "@/lib/promise-cache"
import { IDS_CACHE_MAX_ENTRIES, IDS_CACHE_TTL_MS } from "./constants"
import {
  fetchCategoryProductIdsPage,
  fetchMeiliHits,
  fetchVariantProductIdsPage,
} from "./http"
import {
  assertNotAborted,
  awaitAbortable,
  collectIdsFromPaginatedSource,
  dedupeIdsFromHits,
} from "./id-utils"

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
  signal?: AbortSignal
}): Promise<string[]> {
  const { size, q, signal } = params

  return await collectIdsFromPaginatedSource(
    async (offset, limit, pageSignal) => {
      const page = await fetchVariantProductIdsPage({
        size,
        q,
        limit,
        offset,
        signal: pageSignal,
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
    },
    {
      signal,
      sourceLabel: `variants:size:${size.toLowerCase()}`,
    }
  )
}

async function collectVariantProductIdsForSizeCached(params: {
  size: string
  q?: string
  signal?: AbortSignal
}): Promise<string[]> {
  const { size, q, signal } = params
  const normalizedSize = size.trim()
  const normalizedQuery = q?.trim()
  const cacheKey = getVariantSizeCacheKey(normalizedSize, normalizedQuery)

  const sharedRequest = variantSizeIdsCache.getOrCreate(cacheKey, async () => {
    return await collectVariantProductIdsForSize({
      size: normalizedSize,
      q: normalizedQuery,
    })
  })

  return await awaitAbortable(sharedRequest, signal)
}

export async function collectVariantProductIdsForSizes(params: {
  sizes: string[]
  q?: string
  signal?: AbortSignal
}): Promise<string[]> {
  const { sizes, q, signal } = params
  const mergedIds: string[] = []
  const seen = new Set<string>()

  assertNotAborted(signal)

  const idsBySize = await Promise.all(
    sizes.map((size) => collectVariantProductIdsForSizeCached({ size, q, signal }))
  )

  for (const ids of idsBySize) {
    assertNotAborted(signal)
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

async function collectMeiliProductIdsForQuery(params: {
  query: string
  signal?: AbortSignal
}): Promise<string[]> {
  const { query, signal } = params
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return []
  }

  return await collectIdsFromPaginatedSource(
    async (offset, limit, pageSignal) => {
      const page = await fetchMeiliHits({
        query: normalizedQuery,
        limit,
        offset,
        signal: pageSignal,
      })
      const hits = page.hits || []

      return {
        ids: dedupeIdsFromHits(hits),
        // totalCount intentionally omitted: estimatedTotalHits can be approximate.
        itemCount: hits.length,
      }
    },
    {
      signal,
      sourceLabel: `meili:query:${normalizedQuery.toLowerCase()}`,
    }
  )
}

export async function collectMeiliProductIdsForQueryCached(
  query: string,
  signal?: AbortSignal
): Promise<string[]> {
  const cacheKey = getMeiliQueryCacheKey(query)
  const sharedRequest = meiliQueryIdsCache.getOrCreate(cacheKey, async () => {
    return await collectMeiliProductIdsForQuery({ query })
  })

  return await awaitAbortable(sharedRequest, signal)
}

async function collectCategoryProductIds(params: {
  categories: string[]
  region_id?: string
  country_code: string
  signal?: AbortSignal
}): Promise<string[]> {
  const { categories, region_id, country_code, signal } = params

  return await collectIdsFromPaginatedSource(
    async (offset, limit, pageSignal) => {
      const page = await fetchCategoryProductIdsPage({
        categories,
        limit,
        offset,
        region_id,
        country_code,
        signal: pageSignal,
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
    },
    {
      signal,
      sourceLabel: `categories:${categories.length}`,
    }
  )
}

export async function collectCategoryProductIdsCached(params: {
  categories: string[]
  region_id?: string
  country_code: string
  signal?: AbortSignal
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

  const sharedRequest = categoryIdsCache.getOrCreate(cacheKey, async () => {
    return await collectCategoryProductIds({
      categories: normalizedCategories,
      region_id: params.region_id,
      country_code: normalizedCountryCode,
    })
  })

  return await awaitAbortable(sharedRequest, params.signal)
}
