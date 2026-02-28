import { createPromiseCache } from "@/lib/promise-cache"
import { IDS_CACHE_MAX_ENTRIES, IDS_CACHE_TTL_MS } from "./constants"
import { fetchMeiliHits, fetchVariantProductIdsPage } from "./http"
import { collectIdsFromPaginatedSource, dedupeIdsFromHits } from "./id-utils"

const variantSizeIdsCache = createPromiseCache<string[]>({
  maxEntries: IDS_CACHE_MAX_ENTRIES,
  ttlMs: IDS_CACHE_TTL_MS,
})

const meiliQueryIdsCache = createPromiseCache<string[]>({
  maxEntries: IDS_CACHE_MAX_ENTRIES,
  ttlMs: IDS_CACHE_TTL_MS,
})

function getVariantSizeCacheKey(size: string, q?: string): string {
  return `${size.trim()}::${q?.trim() || ""}`
}

function getMeiliQueryCacheKey(query: string): string {
  return query.trim().toLowerCase()
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
