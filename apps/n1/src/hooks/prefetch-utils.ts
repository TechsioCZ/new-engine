import { prefetchLogger } from "@/lib/loggers/prefetch"

type PrefetchLogType = "Root" | "Categories" | "Pages" | "Children" | "Product"

type RunLoggedPrefetchOptions = {
  type: PrefetchLogType
  label: string
  prefetch: () => Promise<unknown>
}

type CategoryPrefetchLabels = {
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
    requestLabel,
  }
}

export async function runLoggedPrefetch({
  type,
  label,
  prefetch,
}: RunLoggedPrefetchOptions): Promise<void> {
  const start = performance.now()
  prefetchLogger.start(type, label)

  try {
    await prefetch()
    const duration = performance.now() - start
    prefetchLogger.complete(type, label, duration)
  } catch (error) {
    const duration = performance.now() - start
    prefetchLogger.fail(type, label, duration, error)
    throw error
  }
}
