export type PrimaryCategory = {
  id?: string | null
  parent_category_id?: string | null
  rank?: number | null
}

export type ProductWithCategories<TCategory extends PrimaryCategory> = {
  categories?: readonly TCategory[] | null
  metadata?: Record<string, unknown> | null
}

const normalizeId = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized || null
}

const resolveCategoryDepth = <TCategory extends PrimaryCategory>(
  category: TCategory,
  categoryById: ReadonlyMap<string, TCategory>
): number => {
  const categoryId = normalizeId(category.id)
  if (!categoryId) {
    return 0
  }

  const visitedIds = new Set([categoryId])
  let current = category
  let depth = 0

  while (true) {
    const parentId = normalizeId(current.parent_category_id)
    if (!parentId || visitedIds.has(parentId)) {
      return depth
    }

    const parent = categoryById.get(parentId)
    if (!parent) {
      return depth
    }

    visitedIds.add(parentId)
    current = parent
    depth += 1
  }
}

const resolveRank = (category: PrimaryCategory): number =>
  typeof category.rank === "number" && Number.isFinite(category.rank)
    ? category.rank
    : Number.POSITIVE_INFINITY

/**
 * Resolve merchandising category without coupling it to the product URL.
 *
 * Explicit metadata wins only when it references one of the product's
 * categories. The fallback is deepest available leaf, then lower rank, then
 * lexicographically lowest stable category ID.
 */
export const resolvePrimaryCategory = <TCategory extends PrimaryCategory>(
  product: ProductWithCategories<TCategory>
): TCategory | null => {
  const categoryById = new Map<string, TCategory>()

  for (const category of product.categories ?? []) {
    const id = normalizeId(category.id)
    if (id && !categoryById.has(id)) {
      categoryById.set(id, category)
    }
  }

  if (categoryById.size === 0) {
    return null
  }

  const explicitId = normalizeId(product.metadata?.primary_category_id)
  if (explicitId) {
    const explicitCategory = categoryById.get(explicitId)
    if (explicitCategory) {
      return explicitCategory
    }
  }

  const parentIds = new Set<string>()
  for (const category of categoryById.values()) {
    const parentId = normalizeId(category.parent_category_id)
    if (parentId && categoryById.has(parentId)) {
      parentIds.add(parentId)
    }
  }

  const allCategories = Array.from(categoryById.values())
  const leafCategories = allCategories.filter((category) => {
    const id = normalizeId(category.id)
    return id ? !parentIds.has(id) : false
  })
  const candidates = leafCategories.length > 0 ? leafCategories : allCategories

  return (
    candidates.sort((left, right) => {
      const depthDifference =
        resolveCategoryDepth(right, categoryById) -
        resolveCategoryDepth(left, categoryById)
      if (depthDifference !== 0) {
        return depthDifference
      }

      const rankDifference = resolveRank(left) - resolveRank(right)
      if (rankDifference !== 0) {
        return rankDifference
      }

      return (normalizeId(left.id) ?? "").localeCompare(
        normalizeId(right.id) ?? ""
      )
    })[0] ?? null
  )
}
