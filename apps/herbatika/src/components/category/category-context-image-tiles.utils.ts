import type { HttpTypes } from "@medusajs/types"

import type { CategoryContextImageTile } from "@/components/category/category-context-image-tile-grid"
import {
  normalizeCategoryName,
  resolveCategoryRank,
} from "@/components/category/category-product-utils"
import { resolveCategoryImage } from "@/lib/category-images"

interface CategoryContextImageTileSource {
  handle?: string | null
  href: string
  id: string
  label: string
  parentCategoryId?: string | null
}

const buildCategoryContextImageTiles = ({
  categories,
  categoryById,
}: {
  categories: CategoryContextImageTileSource[]
  categoryById: Map<string, HttpTypes.StoreProductCategory>
}): CategoryContextImageTile[] => {
  const seenLabels = new Set<string>()
  const tiles: CategoryContextImageTile[] = []

  for (const category of categories) {
    const normalizedLabel = category.label.trim()
    const dedupeKey = normalizedLabel.toLocaleLowerCase("sk")

    if (normalizedLabel !== "" && !seenLabels.has(dedupeKey)) {
      seenLabels.add(dedupeKey)
      const src = resolveCategoryImage({
        categoryById,
        ...(category.handle === undefined ? {} : { handle: category.handle }),
        label: normalizedLabel,
        ...(category.parentCategoryId === undefined
          ? {}
          : { parentCategoryId: category.parentCategoryId }),
      })
      tiles.push({
        href: category.href,
        id: category.id,
        label: normalizedLabel,
        ...(src === undefined ? {} : { src }),
      })
    }
  }

  return tiles
}

const sortCategories = (categories: HttpTypes.StoreProductCategory[]) =>
  categories.toSorted((left, right) => {
    const rankDifference =
      resolveCategoryRank(left) - resolveCategoryRank(right)
    if (rankDifference !== 0) {
      return rankDifference
    }

    return normalizeCategoryName(left.name).localeCompare(
      normalizeCategoryName(right.name),
      "sk",
    )
  })

interface ResolveCategoryContextTilesInput {
  activeCategory: HttpTypes.StoreProductCategory | null
  activeCategoryFilterIds: string[]
  categories: HttpTypes.StoreProductCategory[]
  categoryById: Map<string, HttpTypes.StoreProductCategory>
}

export const resolveCategoryContextImageTiles = ({
  activeCategory,
  activeCategoryFilterIds,
  categories,
  categoryById,
}: ResolveCategoryContextTilesInput) => {
  if (activeCategory === null) {
    return []
  }

  const directChildren = sortCategories(
    categories.filter(
      (category) =>
        category.parent_category_id === activeCategory.id &&
        Boolean(category.handle),
    ),
  ).map((category) => ({
    handle: category.handle,
    href: `/c/${category.handle}`,
    id: category.id,
    label: normalizeCategoryName(category.name),
    parentCategoryId: category.parent_category_id ?? null,
  }))

  if (directChildren.length > 0) {
    return buildCategoryContextImageTiles({
      categories: directChildren,
      categoryById,
    })
  }

  const descendants = sortCategories(
    activeCategoryFilterIds
      .map((categoryId) => categoryById.get(categoryId) ?? null)
      .filter((category): category is HttpTypes.StoreProductCategory => {
        if (typeof category?.handle !== "string" || category.handle === "") {
          return false
        }

        return category.id !== activeCategory.id
      }),
  )
    .slice(0, 8)
    .map((category) => ({
      handle: category.handle,
      href: `/c/${category.handle}`,
      id: category.id,
      label: normalizeCategoryName(category.name),
      parentCategoryId: category.parent_category_id ?? null,
    }))

  return buildCategoryContextImageTiles({
    categories: descendants,
    categoryById,
  })
}
