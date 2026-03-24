export type Category = {
  id: string
  name: string
  handle: string
  description?: string
  parent_category_id: string | null
  root_category_id: string | null
}

export type CategoryTreeNode = {
  id: string
  name: string
  handle: string
  description?: string
  parent_category_id: string | null
  children: CategoryTreeNode[]
}

export type LeafCategory = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
}

export type LeafParent = {
  id: string
  name: string
  handle: string
  children: string[]
  leafs: string[]
}

export type CategoryRegistry = {
  allCategories: Category[]
  rootCategories: Category[]
  categoryTree: CategoryTreeNode[]
  categoryMapById: Record<string, Category>
  categoryMapByHandle: Record<string, Category>
  leafCategories: LeafCategory[]
  leafCategoryIds: string[]
  leafParents: LeafParent[]
  leafParentIds: string[]
}

export const emptyCategoryRegistry: CategoryRegistry = {
  allCategories: [],
  rootCategories: [],
  categoryTree: [],
  categoryMapById: {},
  categoryMapByHandle: {},
  leafCategories: [],
  leafCategoryIds: [],
  leafParents: [],
  leafParentIds: [],
}
