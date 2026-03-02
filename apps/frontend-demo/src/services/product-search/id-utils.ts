import {
  IDS_PAGE_SIZE,
  MAX_COLLECTED_IDS,
  MAX_PAGINATION_ITERATIONS,
} from "./constants"
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

function createAbortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError")
}

export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError()
  }
}

export async function awaitAbortable<TValue>(
  promise: Promise<TValue>,
  signal?: AbortSignal
): Promise<TValue> {
  if (!signal) {
    return await promise
  }

  assertNotAborted(signal)

  return await new Promise<TValue>((resolve, reject) => {
    const onAbort = () => {
      cleanup()
      reject(createAbortError())
    }

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort)
    }

    signal.addEventListener("abort", onAbort, { once: true })

    promise.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (error) => {
        cleanup()
        reject(error)
      }
    )
  })
}

export async function collectIdsFromPaginatedSource(
  fetchPage: (
    offset: number,
    limit: number,
    signal?: AbortSignal
  ) => Promise<PaginatedIdsPageResult>,
  options?: {
    signal?: AbortSignal
    maxCollectedIds?: number
    sourceLabel?: string
  }
): Promise<string[]> {
  const { signal, sourceLabel, maxCollectedIds } = options || {}
  const safeMaxCollectedIds =
    typeof maxCollectedIds === "number" && Number.isFinite(maxCollectedIds)
      ? Math.max(1, Math.trunc(maxCollectedIds))
      : MAX_COLLECTED_IDS
  const normalizedSourceLabel = sourceLabel?.trim() || "unknown-source"

  assertNotAborted(signal)

  const ids: string[] = []
  const seen = new Set<string>()
  let offset = 0
  let iterations = 0

  while (true) {
    assertNotAborted(signal)

    if (iterations >= MAX_PAGINATION_ITERATIONS) {
      throw new Error(
        `[ProductSearch] Pagination exceeded ${MAX_PAGINATION_ITERATIONS} iterations for ${normalizedSourceLabel}.`
      )
    }

    iterations += 1
    const page = await fetchPage(offset, IDS_PAGE_SIZE, signal)
    if (page.itemCount === 0) {
      break
    }

    for (const id of page.ids) {
      if (!id || seen.has(id)) {
        continue
      }

      seen.add(id)

      if (ids.length >= safeMaxCollectedIds) {
        throw new Error(
          `[ProductSearch] Collected IDs exceeded ${safeMaxCollectedIds} for ${normalizedSourceLabel}.`
        )
      }

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
