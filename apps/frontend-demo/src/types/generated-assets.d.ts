declare module "*.jpg" {
  import type { StaticImageData } from "next/image"

  const image: StaticImageData
  export default image
}

declare module "*.webp" {
  import type { StaticImageData } from "next/image"

  const image: StaticImageData
  export default image
}

declare module "@/lib/static-data/categories" {
  import type { Category, CategoryTreeNode } from "@/lib/server/categories"

  export interface LeafCategory {
    id: string
    name: string
    handle: string
    parent_category_id: string | null
  }

  export interface LeafParent {
    id: string
    name: string
    handle: string
    children: string[]
    leafs: string[]
  }

  export interface FilteringStats {
    totalCategoriesBeforeFiltering: number
    totalCategoriesAfterFiltering: number
    categoriesWithDirectProducts: number
    filteredOutCount: number
  }

  export interface StaticCategoryData {
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
