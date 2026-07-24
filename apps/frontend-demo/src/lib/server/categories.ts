export interface Category {
  id: string
  name: string
  handle: string
  description?: string
  parent_category_id?: string | null
}

export interface CategoryTreeNode extends Category {
  id: string
  name: string
  handle: string
  description?: string
  parent_category_id?: string | null
  children?: CategoryTreeNode[]
}
