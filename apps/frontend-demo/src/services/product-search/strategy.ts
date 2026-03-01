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

function normalizeCategories(
  category: string | string[] | undefined,
  filters?: ProductFiltersLike
): string[] {
  const fromCategory =
    typeof category === "string"
      ? [category]
      : Array.isArray(category)
        ? category
        : []
  const merged = [...fromCategory, ...(filters?.categories || [])]
  const normalized = merged.map((value) => value.trim()).filter(Boolean)
  return Array.from(new Set(normalized))
}

function isNewestSort(sort?: string): boolean {
  return !sort || sort === "newest" || sort === "-created_at"
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

  if (!isNewestSort(sort)) {
    return false
  }

  return true
}

function shouldUseMeiliCategoryIntersection(params: {
  q?: string
  sort?: string
  category?: string | string[]
  filters?: ProductFiltersLike
}): boolean {
  const { q, sort, category, filters } = params
  const hasQuery = Boolean(q?.trim())
  const categories = normalizeCategories(category, filters)

  if (!hasQuery || categories.length === 0) {
    return false
  }

  if (hasActiveSizeFilter(filters)) {
    return false
  }

  if (!isNewestSort(sort)) {
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

  if (shouldUseMeiliCategoryIntersection({ q: normalizedQuery, sort, category, filters })) {
    return "MEILI_CATEGORY_INTERSECTION"
  }

  if (shouldUseMeiliSearch({ q: normalizedQuery, sort, category, filters })) {
    return "MEILI_ONLY"
  }

  return "DEFAULT_MEDUSA"
}

export function normalizeCategoriesInput(
  category: string | string[] | undefined,
  filters?: ProductFiltersLike
): string[] {
  return normalizeCategories(category, filters)
}

export function normalizeSizes(sizes: string[] | undefined): string[] {
  if (!sizes?.length) {
    return []
  }

  const normalized = sizes.map((size) => size.trim()).filter(Boolean)
  return Array.from(new Set(normalized))
}
