import {
  type Category,
  type CategoryRegistry,
  type CategoryTreeNode,
  emptyCategoryRegistry,
  type LeafCategory,
  type LeafParent,
} from "./types"

type RawCategory = {
  id?: string | null
  name?: string | null
  handle?: string | null
  description?: string | null
  parent_category_id?: string | null
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
    parent_category_id: category.parent_category_id ?? null,
    root_category_id: null,
  }
}

const resolveRootCategoryId = (
  category: Category,
  categoryMapById: Map<string, Category>
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
    const parent = categoryMapById.get(current.parent_category_id)
    if (!parent) {
      return null
    }

    current = parent
  }

  return current?.id ?? null
}

const buildCategoryTree = (
  category: Category,
  childrenByParentId: Record<string, Category[]>
): CategoryTreeNode => ({
  id: category.id,
  name: category.name,
  handle: category.handle,
  description: category.description,
  parent_category_id: category.parent_category_id ?? null,
  children: (childrenByParentId[category.id] ?? []).map((child) =>
    buildCategoryTree(child, childrenByParentId)
  ),
})

export function normalizeCategoryRegistry(
  rawCategories: RawCategory[]
): CategoryRegistry {
  const mappedCategories = rawCategories
    .map(mapRawCategory)
    .filter((category): category is Category => Boolean(category))

  if (!mappedCategories.length) {
    return emptyCategoryRegistry
  }

  const categoryMapByIdMap = new Map(
    mappedCategories.map((category) => [category.id, category])
  )

  const allCategories = mappedCategories.map((category) => ({
    ...category,
    root_category_id: resolveRootCategoryId(category, categoryMapByIdMap),
  }))

  const categoryMapById = Object.fromEntries(
    allCategories.map((category) => [category.id, category])
  )
  const categoryMapByHandle = Object.fromEntries(
    allCategories.map((category) => [category.handle, category])
  )

  const childrenByParentId: Record<string, Category[]> = {}
  for (const category of allCategories) {
    const parentId = category.parent_category_id
    if (!(parentId && categoryMapById[parentId])) {
      continue
    }

    const siblings = childrenByParentId[parentId] ?? []
    siblings.push(category)
    childrenByParentId[parentId] = siblings
  }

  const rootCategories = allCategories.filter(
    (category) =>
      !(
        category.parent_category_id &&
        categoryMapById[category.parent_category_id]
      )
  )

  const categoryTree = rootCategories.map((category) =>
    buildCategoryTree(category, childrenByParentId)
  )

  const leafCategories: LeafCategory[] = []
  const leafParents: LeafParent[] = []

  const visitNode = (node: CategoryTreeNode): string[] => {
    if (node.children.length === 0) {
      leafCategories.push({
        id: node.id,
        name: node.name,
        handle: node.handle,
        parent_category_id: node.parent_category_id ?? null,
      })
      return [node.id]
    }

    const leafIds: string[] = []

    for (const child of node.children) {
      leafIds.push(...visitNode(child))
    }

    if (node.children.some((child) => child.children.length === 0)) {
      leafParents.push({
        id: node.id,
        name: node.name,
        handle: node.handle,
        children: node.children.map((child) => child.id),
        leafs: leafIds,
      })
    }

    return leafIds
  }

  for (const rootNode of categoryTree) {
    visitNode(rootNode)
  }

  return {
    allCategories,
    rootCategories,
    categoryTree,
    categoryMapById,
    categoryMapByHandle,
    leafCategories,
    leafCategoryIds: leafCategories.map((category) => category.id),
    leafParents,
    leafParentIds: leafParents.map((category) => category.id),
  }
}
