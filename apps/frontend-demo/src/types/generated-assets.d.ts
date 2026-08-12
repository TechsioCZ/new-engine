declare module "*.jpg" {
  const image: import("next/image").StaticImageData
  export default image
}

declare module "*.webp" {
  const image: import("next/image").StaticImageData
  export default image
}

declare module "@/lib/static-data/categories" {
  import type { Category, CategoryTreeNode } from "@/lib/server/categories"

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

  export type FilteringStats = {
    totalCategoriesBeforeFiltering: number
    totalCategoriesAfterFiltering: number
    categoriesWithDirectProducts: number
    filteredOutCount: number
  }

  export type StaticCategoryData = {
    allCategories: Category[]
    categoryTree: CategoryTreeNode[]
    rootCategories: Category[]
    categoryMap: Record<string, Category>
    leafCategories: LeafCategory[]
    leafParents: LeafParent[]
    generatedAt: string
    filteringStats: FilteringStats
  }

  const data: StaticCategoryData

  export default data
  export const allCategories: Category[]
  export const categoryTree: CategoryTreeNode[]
  export const rootCategories: Category[]
  export const categoryMap: Record<string, Category>
  export const leafCategories: LeafCategory[]
  export const leafParents: LeafParent[]
  export const filteringStats: FilteringStats
}
