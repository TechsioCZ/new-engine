import { hiddenCategoryHandles } from "./config"
import {
  type Category,
  type CategoryMetadata,
  type CategoryRegistry,
  type CategoryTreeNode,
  type RawCategory,
  emptyCategoryRegistry,
} from "./types"

type NormalizeCategoryRegistryOptions = {
  hiddenHandles?: readonly string[]
}

const mapRawCategory = (category: RawCategory): Category | null => {
  if (!(category.id && category.name && category.handle)) {
    return null
  }

  return {
    id: category.id,
    name: category.name,
    handle: category.handle,
    description: category.description ?? undefined,
    metadata: category.metadata ?? null,
    parent_category_id: category.parent_category_id ?? null,
    root_category_id: null,
  }
}

const isHiddenInStorefront = (metadata?: CategoryMetadata): boolean =>
  metadata?.hide_in_storefront === true

const shouldHideCategory = (
  category: Category,
  hiddenHandles: ReadonlySet<string>,
  categoryMap: Map<string, Category>
): boolean => {
  const visited = new Set<string>()
  let current: Category | undefined = category

  while (current) {
    if (
      hiddenHandles.has(current.handle) ||
      isHiddenInStorefront(current.metadata)
    ) {
      return true
    }

    if (!current.parent_category_id || visited.has(current.id)) {
      break
    }

    visited.add(current.id)
    current = categoryMap.get(current.parent_category_id)
  }

  return false
}

const resolveRootCategoryId = (
  category: Category,
  categoryMap: Map<string, Category>
): string | null => {
  if (!category.parent_category_id) {
    return null
  }

  const visited = new Set<string>()
  let current: Category | undefined = category

  while (current?.parent_category_id) {
    if (visited.has(current.id)) {
      return null
    }

    visited.add(current.id)
    const parent = categoryMap.get(current.parent_category_id)
    if (!parent) {
      return null
    }

    current = parent
  }

  return current?.id ?? null
}

const buildCategoryTree = (
  category: Category,
  childrenByParentId: Map<string, Category[]>
): CategoryTreeNode => {
  const children = childrenByParentId.get(category.id) ?? []

  return {
    id: category.id,
    name: category.name,
    handle: category.handle,
    description: category.description,
    metadata: category.metadata ?? null,
    parent_category_id: category.parent_category_id ?? null,
    children: children.map((child) =>
      buildCategoryTree(child, childrenByParentId)
    ),
  }
}

export function normalizeCategoryRegistry(
  rawCategories: RawCategory[],
  options?: NormalizeCategoryRegistryOptions
): CategoryRegistry {
  const mappedCategories = rawCategories
    .map(mapRawCategory)
    .filter((category): category is Category => Boolean(category))

  if (!mappedCategories.length) {
    return emptyCategoryRegistry
  }

  const hiddenHandles = new Set(options?.hiddenHandles ?? hiddenCategoryHandles)
  const allCategoryMap = new Map(
    mappedCategories.map((category) => [category.id, category])
  )
  const visibleCategories = mappedCategories.filter(
    (category) => !shouldHideCategory(category, hiddenHandles, allCategoryMap)
  )

  if (!visibleCategories.length) {
    return emptyCategoryRegistry
  }

  const visibleCategoryMap = new Map(
    visibleCategories.map((category) => [category.id, category])
  )

  const categories = visibleCategories.map((category) => ({
    ...category,
    root_category_id: resolveRootCategoryId(category, visibleCategoryMap),
  }))

  const childrenByParentId = new Map<string, Category[]>()
  for (const category of categories) {
    const parentId = category.parent_category_id
    if (!(parentId && visibleCategoryMap.has(parentId))) {
      continue
    }

    const children = childrenByParentId.get(parentId) ?? []
    children.push(category)
    childrenByParentId.set(parentId, children)
  }

  const rootCategories = categories.filter(
    (category) =>
      !(
        category.parent_category_id &&
        visibleCategoryMap.has(category.parent_category_id)
      )
  )

  const categoryTree = rootCategories.map((category) =>
    buildCategoryTree(category, childrenByParentId)
  )

  const leafCategories = categories.filter(
    (category) => (childrenByParentId.get(category.id) ?? []).length === 0
  )

  return {
    allCategories: categories,
    categoryTree,
    rootCategories,
    categoryMapById: Object.fromEntries(
      categories.map((category) => [category.id, category])
    ),
    categoryMapByHandle: Object.fromEntries(
      categories.map((category) => [category.handle, category])
    ),
    leafCategories,
  }
}
