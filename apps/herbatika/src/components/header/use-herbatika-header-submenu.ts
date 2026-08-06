"use client"

import type { HttpTypes } from "@medusajs/types"
import type { StaticImageData } from "next/image"

import {
  normalizeCategoryName,
  resolveCategoryRank,
} from "@/components/category/category-product-utils"
import { resolveCategoryImage } from "@/lib/category-images"
import { useCategories } from "@/lib/storefront/categories"
import {
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"

import { HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS } from "./herbatika-header.submenu-data"

interface HerbatikaHeaderSubmenuChildItem {
  id: string
  label: string
  href: string
}

export interface HerbatikaHeaderSubmenuFeaturedItem {
  childItems: HerbatikaHeaderSubmenuChildItem[]
  href: string
  id: string
  label: string
  handle: string
  src?: StaticImageData
}

interface HerbatikaHeaderSubmenuGroup {
  rootHandle: string
  featuredItems: HerbatikaHeaderSubmenuFeaturedItem[]
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

export const useHerbatikaHeaderSubmenu = () => {
  const categoriesQuery = useCategories({
    fields: CATEGORY_TREE_FIELDS,
    limit: CATEGORY_TREE_LIMIT,
    page: 1,
  })

  const categoryById = new Map<string, HttpTypes.StoreProductCategory>()

  for (const category of categoriesQuery.categories) {
    categoryById.set(category.id, category)
  }

  const categoryByHandle = new Map<string, HttpTypes.StoreProductCategory>()

  for (const category of categoriesQuery.categories) {
    if (
      category.handle !== null &&
      category.handle !== undefined &&
      category.handle !== ""
    ) {
      categoryByHandle.set(category.handle, category)
    }
  }

  const childrenByParentId = new Map<string, HttpTypes.StoreProductCategory[]>()

  for (const category of categoriesQuery.categories) {
    const { handle, parent_category_id: parentId } = category
    if (
      typeof parentId !== "string" ||
      parentId === "" ||
      typeof handle !== "string" ||
      handle === ""
    ) {
      continue
    }

    const siblings = childrenByParentId.get(parentId) ?? []
    siblings.push(category)
    childrenByParentId.set(parentId, siblings)
  }

  for (const [parentId, children] of childrenByParentId) {
    childrenByParentId.set(parentId, sortCategories(children))
  }

  const groupsByRootHandle = new Map<string, HerbatikaHeaderSubmenuGroup>(
    HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS.map((rootConfig) => {
      const { rootHandle } = rootConfig
      const rootCategory = categoryByHandle.get(rootHandle) ?? null
      const featuredItems = rootCategory
        ? (childrenByParentId.get(rootCategory.id) ?? []).map((category) => {
            const src = resolveCategoryImage({
              categoryById,
              handle: category.handle,
              label: category.name,
              parentCategoryId: category.parent_category_id,
            })
            return {
              childItems: (childrenByParentId.get(category.id) ?? []).map(
                (child) => ({
                  href:
                    child.handle === null ||
                    child.handle === undefined ||
                    child.handle === ""
                      ? "#"
                      : `/c/${child.handle}`,
                  id: child.id,
                  label: normalizeCategoryName(child.name),
                }),
              ),
              handle: category.handle ?? category.id,
              href:
                category.handle === null ||
                category.handle === undefined ||
                category.handle === ""
                  ? "#"
                  : `/c/${category.handle}`,
              id: category.id,
              label: normalizeCategoryName(category.name),
              ...(src === undefined ? {} : { src }),
            }
          })
        : []

      return [
        rootHandle,
        {
          featuredItems,
          rootHandle,
        },
      ] as const
    }),
  )

  return {
    categoriesQuery,
    groupsByRootHandle,
  }
}
