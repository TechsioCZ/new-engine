export type CategoryMetadata = Record<string, unknown> | null

export type RawCategory = {
  id?: string | null
  name?: string | null
  handle?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
  parent_category_id?: string | null
}

export type Category = {
  id: string
  name: string
  handle: string
  description?: string
  metadata?: CategoryMetadata
  parent_category_id?: string | null
  root_category_id?: string | null
}

export type CategoryTreeNode = {
  id: string
  name: string
  handle: string
  description?: string
  metadata?: CategoryMetadata
  children?: CategoryTreeNode[]
  parent_category_id?: string | null
}

export type CategoryRegistry = {
  allCategories: Category[]
  categoryTree: CategoryTreeNode[]
  rootCategories: Category[]
  categoryMapById: Record<string, Category>
  categoryMapByHandle: Record<string, Category>
  leafCategories: Category[]
}

export const emptyCategoryRegistry: CategoryRegistry = {
  allCategories: [],
  categoryTree: [],
  rootCategories: [],
  categoryMapById: {},
  categoryMapByHandle: {},
  leafCategories: [],
}
