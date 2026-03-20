import type { Category, CategoryRegistry, CategoryTreeNode } from "./types"

export const getCategoryByHandle = (
  registry: CategoryRegistry,
  handle: string
): Category | undefined => registry.categoryMapByHandle[handle]

export const getCategoryChildren = (
  registry: CategoryRegistry,
  categoryId: string | undefined
): Category[] => {
  if (!categoryId) {
    return []
  }

  return (registry.childCategoryIdsByParentId[categoryId] ?? [])
    .map((childId) => registry.categoryMapById[childId])
    .filter((category): category is Category => Boolean(category))
}

export const getCategoryDescendantIds = (
  registry: CategoryRegistry,
  categoryId: string | undefined,
  options?: { includeSelf?: boolean }
): string[] => {
  if (!categoryId) {
    return []
  }

  const includeSelf = options?.includeSelf ?? true
  const result: string[] = includeSelf ? [categoryId] : []
  const queue = [...(registry.childCategoryIdsByParentId[categoryId] ?? [])]
  const visited = new Set(result)

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!(currentId && !visited.has(currentId))) {
      continue
    }

    visited.add(currentId)
    result.push(currentId)
    queue.push(...(registry.childCategoryIdsByParentId[currentId] ?? []))
  }

  return result
}

export const getRootCategory = (
  registry: CategoryRegistry,
  category: Category | undefined
): Category | undefined => {
  if (!category) {
    return
  }

  if (!category.root_category_id) {
    return category
  }

  return registry.categoryMapById[category.root_category_id] ?? category
}

export const getRootCategoryTree = (
  registry: CategoryRegistry,
  category: Category | undefined
): CategoryTreeNode | undefined => {
  if (!category) {
    return
  }

  return registry.categoryTree.find((node) => node.id === category.id)
}

export const buildCategoryPath = (
  registry: CategoryRegistry,
  category: Category | undefined
): string | null => {
  if (!category) {
    return null
  }

  const path: string[] = []
  const visited = new Set<string>()
  let current: Category | undefined = category

  while (current) {
    path.unshift(current.name)

    if (!(current.parent_category_id && !visited.has(current.id))) {
      break
    }

    visited.add(current.id)
    current = registry.categoryMapById[current.parent_category_id]
  }

  return path.length ? path.join(" > ") : null
}
