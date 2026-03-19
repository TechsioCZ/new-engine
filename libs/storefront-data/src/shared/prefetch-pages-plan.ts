export type PrefetchPagesMode = "priority" | "simple"

export type CreatePrefetchPagesPlanInput = {
  mode?: PrefetchPagesMode
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type PrefetchPagesPlan = {
  immediate: number[]
  medium: number[]
  low: number[]
}

const uniquePages = (pages: readonly number[]): number[] =>
  Array.from(new Set(pages))

const pushPageIfValid = (
  pages: number[],
  page: number | null,
  input: CreatePrefetchPagesPlanInput
) => {
  if (page == null) {
    return
  }
  if (page < 1 || page > input.totalPages) {
    return
  }
  pages.push(page)
}

const createSimplePrefetchPagesPlan = (
  input: CreatePrefetchPagesPlanInput
): PrefetchPagesPlan => {
  const pagesToPrefetch: number[] = []

  pushPageIfValid(
    pagesToPrefetch,
    input.currentPage !== 1 ? 1 : null,
    input
  )
  pushPageIfValid(
    pagesToPrefetch,
    input.hasPrevPage ? input.currentPage - 1 : null,
    input
  )
  pushPageIfValid(
    pagesToPrefetch,
    input.hasPrevPage ? input.currentPage - 2 : null,
    input
  )
  pushPageIfValid(
    pagesToPrefetch,
    input.hasNextPage ? input.currentPage + 1 : null,
    input
  )
  pushPageIfValid(
    pagesToPrefetch,
    input.hasNextPage ? input.currentPage + 2 : null,
    input
  )
  pushPageIfValid(
    pagesToPrefetch,
    input.currentPage !== input.totalPages ? input.totalPages : null,
    input
  )

  return {
    immediate: uniquePages(pagesToPrefetch),
    medium: [],
    low: [],
  }
}

const createPriorityPrefetchPagesPlan = (
  input: CreatePrefetchPagesPlanInput
): PrefetchPagesPlan => {
  const high = input.hasNextPage ? [input.currentPage + 1] : []
  const medium =
    input.hasNextPage && input.currentPage + 2 <= input.totalPages
      ? [input.currentPage + 2]
      : []
  const lowCandidates = [
    input.hasPrevPage ? input.currentPage - 1 : null,
    input.currentPage !== 1 ? 1 : null,
    input.totalPages > 1 && input.currentPage !== input.totalPages
      ? input.totalPages
      : null,
  ].filter((page): page is number => page !== null)

  const immediate = uniquePages(high)
  const immediateSet = new Set(immediate)
  const mediumPages = uniquePages(medium).filter(
    (page) => !immediateSet.has(page)
  )
  const mediumSet = new Set(mediumPages)
  const lowPages = uniquePages(lowCandidates).filter(
    (page) => !(immediateSet.has(page) || mediumSet.has(page))
  )

  return {
    immediate,
    medium: mediumPages,
    low: lowPages,
  }
}

/**
 * Builds a deterministic prefetch plan for paginated product-like screens.
 *
 * - `priority`: immediate next page, then medium and low priority queues
 * - `simple`: all candidate pages in one immediate queue
 */
export const createPrefetchPagesPlan = (
  input: CreatePrefetchPagesPlanInput
): PrefetchPagesPlan => {
  const mode = input.mode ?? "priority"
  if (mode === "simple") {
    return createSimplePrefetchPagesPlan(input)
  }
  return createPriorityPrefetchPagesPlan(input)
}