import type { ProductFetchStrategy, ProductFiltersLike } from "./types"

function hasActiveCategoryFilter(
  category: string | string[] | undefined,
  filters?: ProductFiltersLike
): boolean {
  if (Array.isArray(category)) {
    return category.length > 0
  }

  if (typeof category === "string") {
    return category.length > 0
  }

  return Boolean(filters?.categories?.length)
}

function hasActiveSizeFilter(filters?: ProductFiltersLike): boolean {
  return Boolean(filters?.sizes?.length)
}

function shouldUseMeiliSearch(params: {
  q?: string
  sort?: string
  category?: string | string[]
  filters?: ProductFiltersLike
}): boolean {
  const { q, sort, category, filters } = params
  const hasQuery = Boolean(q?.trim())

  if (!hasQuery) {
    return false
  }

  if (hasActiveCategoryFilter(category, filters) || hasActiveSizeFilter(filters)) {
    return false
  }

  if (sort && sort !== "newest") {
    return false
  }

  return true
}

function shouldUseVariantSizeFallback(params: {
  filters?: ProductFiltersLike
  category?: string | string[]
}): boolean {
  const { filters, category } = params

  return hasActiveSizeFilter(filters) && !hasActiveCategoryFilter(category, filters)
}

export function selectProductFetchStrategy(params: {
  q?: string
  sort?: string
  category?: string | string[]
  filters?: ProductFiltersLike
}): ProductFetchStrategy {
  const { q, sort, category, filters } = params
  const normalizedQuery = q?.trim()

  if (shouldUseVariantSizeFallback({ filters, category })) {
    return normalizedQuery ? "MEILI_SIZE_INTERSECTION" : "SIZE_ONLY_FALLBACK"
  }

  if (shouldUseMeiliSearch({ q: normalizedQuery, sort, category, filters })) {
    return "MEILI_ONLY"
  }

  return "DEFAULT_MEDUSA"
}

export function normalizeSizes(sizes: string[] | undefined): string[] {
  if (!sizes?.length) {
    return []
  }

  const normalized = sizes.map((size) => size.trim()).filter(Boolean)
  return Array.from(new Set(normalized))
}
