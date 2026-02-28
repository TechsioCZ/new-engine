import { IDS_PAGE_SIZE, MAX_PAGINATION_ITERATIONS } from "./constants"
import type { MeiliSearchProductHit, PaginatedIdsPageResult } from "./types"

export function dedupeIdsFromHits(
  hits: MeiliSearchProductHit[] | undefined
): string[] {
  const ids: string[] = []
  const seen = new Set<string>()

  for (const hit of hits || []) {
    const id = hit.id?.trim()

    if (!id || seen.has(id)) {
      continue
    }

    seen.add(id)
    ids.push(id)
  }

  return ids
}

export function orderProductsByIds<TProduct extends { id?: string }>(
  products: TProduct[],
  ids: string[]
): TProduct[] {
  const byId = new Map<string, TProduct>()

  for (const product of products) {
    if (product.id) {
      byId.set(product.id, product)
    }
  }

  return ids
    .map((id) => byId.get(id))
    .filter((product): product is TProduct => Boolean(product))
}

export function intersectIdsPreservingOrder(
  ids: string[],
  allowedIds: string[]
): string[] {
  const allowed = new Set(allowedIds)
  return ids.filter((id) => allowed.has(id))
}

export async function collectIdsFromPaginatedSource(
  fetchPage: (offset: number, limit: number) => Promise<PaginatedIdsPageResult>
): Promise<string[]> {
  const ids: string[] = []
  const seen = new Set<string>()
  let offset = 0
  let iterations = 0

  while (true) {
    if (iterations >= MAX_PAGINATION_ITERATIONS) {
      console.warn(
        `[ProductSearch] Pagination stopped after ${MAX_PAGINATION_ITERATIONS} iterations; returning partial results.`
      )
      break
    }

    iterations += 1
    const page = await fetchPage(offset, IDS_PAGE_SIZE)
    if (page.itemCount === 0) {
      break
    }

    for (const id of page.ids) {
      if (!id || seen.has(id)) {
        continue
      }

      seen.add(id)
      ids.push(id)
    }

    const nextOffset = offset + page.itemCount
    const totalCount = page.totalCount
    offset = nextOffset

    if (typeof totalCount === "number" && offset >= totalCount) {
      break
    }
  }

  return ids
}
