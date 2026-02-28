export const IDS_PAGE_SIZE = 250
export const IDS_CACHE_TTL_MS = 5 * 60 * 1000
export const IDS_CACHE_MAX_ENTRIES = 200
export const MAX_PAGINATION_ITERATIONS = 1000

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const STORE_FETCH_TIMEOUT_MS = parsePositiveInt(
  process.env.NEXT_PUBLIC_STORE_FETCH_TIMEOUT_MS,
  10_000
)
