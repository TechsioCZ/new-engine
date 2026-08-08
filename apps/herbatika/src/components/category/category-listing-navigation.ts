import type { HttpTypes } from "@medusajs/types"

import {
  normalizeCategoryName,
  resolveCategoryRank,
} from "@/components/category/category-product-utils"
import type { HerbatikaBreadcrumbItem } from "@/components/herbatika-breadcrumb"

const resolveBreadcrumbItems = (
  slug: string,
  activeCategory: HttpTypes.StoreProductCategory | null,
  categoryById: Map<string, HttpTypes.StoreProductCategory>,
  homeLabel: string,
) => {
  const items: HerbatikaBreadcrumbItem[] = [
    { href: "/", icon: "token-icon-home", label: homeLabel },
  ]

  if (!activeCategory) {
    items.push({ label: normalizeCategoryName(slug) })
    return items
  }

  const trail: HttpTypes.StoreProductCategory[] = []
  let currentCategory: HttpTypes.StoreProductCategory | null = activeCategory

  while (currentCategory) {
    trail.unshift(currentCategory)

    if (currentCategory.parent_category_id === null) {
      break
    }

    currentCategory =
      categoryById.get(currentCategory.parent_category_id) ?? null
  }

  for (let index = 0; index < trail.length; index += 1) {
    const category = trail[index]
    if (category === undefined) {
      continue
    }
    const label = normalizeCategoryName(category.name)
    const isLast = index === trail.length - 1
    const href =
      isLast || !category.handle ? undefined : `/c/${category.handle}`

    items.push({
      label,
      ...(href === undefined ? {} : { href }),
    })
  }

  return items
}

interface BuildCategoryListingNavigationInput {
  categories: HttpTypes.StoreProductCategory[]
  homeLabel: string
  locale: string
  slug: string
}

export const buildCategoryListingNavigation = ({
  categories,
  homeLabel,
  locale,
  slug,
}: BuildCategoryListingNavigationInput) => {
  const categoryByHandle = new Map<string, HttpTypes.StoreProductCategory>()
  const categoryById = new Map<string, HttpTypes.StoreProductCategory>()

  for (const category of categories) {
    if (category.handle) {
      categoryByHandle.set(category.handle, category)
    }
    categoryById.set(category.id, category)
  }

  const activeCategory = categoryByHandle.get(slug) ?? null
  const topLevelCategories = categories
    .filter(
      (category) =>
        category.parent_category_id === null &&
        category.handle !== undefined &&
        category.handle.length > 0,
    )
    .toSorted((left, right) => {
      const rankDifference =
        resolveCategoryRank(left) - resolveCategoryRank(right)
      if (rankDifference !== 0) {
        return rankDifference
      }

      return normalizeCategoryName(left.name).localeCompare(
        normalizeCategoryName(right.name),
        locale,
      )
    })

  return {
    activeCategory,
    breadcrumbItems: resolveBreadcrumbItems(
      slug,
      activeCategory,
      categoryById,
      homeLabel,
    ),
    categoryByHandle,
    categoryById,
    topLevelCategories,
  }
}
