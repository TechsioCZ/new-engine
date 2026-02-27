import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { prefetchLogger } from "@/lib/loggers/prefetch"

type PrefetchLogType = "Root" | "Categories" | "Pages" | "Children" | "Product"

type RunLoggedPrefetchOptions = {
  queryClient: QueryClient
  queryKey: QueryKey
  type: PrefetchLogType
  label: string
  cacheHitLabel?: string
  prefetch: () => Promise<unknown>
}

type CategoryPrefetchLabels = {
  cacheHitLabel: string
  requestLabel: string
}

export function buildCategoryPrefetchLabels(
  categoryIds: string[]
): CategoryPrefetchLabels | null {
  const [firstCategory] = categoryIds
  if (!firstCategory) {
    return null
  }

  const short = firstCategory.slice(-6)
  const requestLabel =
    categoryIds.length === 1 ? short : `${short} +${categoryIds.length - 1}`

  return {
    cacheHitLabel: short,
    requestLabel,
  }
}

export async function runLoggedPrefetch({
  queryClient,
  queryKey,
  type,
  label,
  cacheHitLabel,
  prefetch,
}: RunLoggedPrefetchOptions): Promise<void> {
  const cached = queryClient.getQueryData(queryKey)
  if (cached) {
    prefetchLogger.cacheHit(type, cacheHitLabel ?? label)
    return
  }

  const start = performance.now()
  prefetchLogger.start(type, label)
  await prefetch()
  const duration = performance.now() - start
  prefetchLogger.complete(type, label, duration)
}

