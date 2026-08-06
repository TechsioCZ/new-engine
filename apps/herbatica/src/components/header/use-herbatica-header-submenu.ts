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
import { HERBATICA_HEADER_SUBMENU_ROOT_CONFIGS } from "./herbatica-header.submenu-data"

type HerbaticaHeaderSubmenuChildItem = {
  id: string
  label: string
  href: string
}

export type HerbaticaHeaderSubmenuFeaturedItem = {
  childItems: HerbaticaHeaderSubmenuChildItem[]
  href: string
  id: string
  label: string
  handle: string
  src?: StaticImageData
}

type HerbaticaHeaderSubmenuGroup = {
  rootHandle: string
  featuredItems: HerbaticaHeaderSubmenuFeaturedItem[]
}

const sortCategories = (categories: HttpTypes.StoreProductCategory[]) =>
  [...categories].sort((left, right) => {
    const rankDifference =
      resolveCategoryRank(left) - resolveCategoryRank(right)
    if (rankDifference !== 0) {
      return rankDifference
    }

    return normalizeCategoryName(left.name).localeCompare(
      normalizeCategoryName(right.name),
      "sk"
    )
  })

export function useHerbaticaHeaderSubmenu() {
  const categoriesQuery = useCategories({
    page: 1,
    limit: CATEGORY_TREE_LIMIT,
    fields: CATEGORY_TREE_FIELDS,
  })

  const categoryById = new Map<string, HttpTypes.StoreProductCategory>()

  for (const category of categoriesQuery.categories) {
    categoryById.set(category.id, category)
  }

  const categoryByHandle = new Map<string, HttpTypes.StoreProductCategory>()

  for (const category of categoriesQuery.categories) {
    if (category.handle) {
      categoryByHandle.set(category.handle, category)
    }
  }

  const childrenByParentId = new Map<string, HttpTypes.StoreProductCategory[]>()

  for (const category of categoriesQuery.categories) {
    if (!(category.parent_category_id && category.handle)) {
      continue
    }

    const siblings = childrenByParentId.get(category.parent_category_id) ?? []
    siblings.push(category)
    childrenByParentId.set(category.parent_category_id, siblings)
  }

  for (const [parentId, children] of childrenByParentId) {
    childrenByParentId.set(parentId, sortCategories(children))
  }

  const groupsByRootHandle = new Map<string, HerbaticaHeaderSubmenuGroup>(
    HERBATICA_HEADER_SUBMENU_ROOT_CONFIGS.map((rootConfig) => {
      const rootHandle = rootConfig.rootHandle
      const rootCategory = categoryByHandle.get(rootHandle) ?? null
      const featuredItems = rootCategory
        ? (childrenByParentId.get(rootCategory.id) ?? []).map((category) => ({
            id: category.id,
            handle: category.handle ?? category.id,
            label: normalizeCategoryName(category.name),
            src: resolveCategoryImage({
              categoryById,
              handle: category.handle,
              label: category.name,
              parentCategoryId: category.parent_category_id,
            }),
            href: category.handle ? `/c/${category.handle}` : "#",
            childItems: (childrenByParentId.get(category.id) ?? []).map(
              (child) => ({
                id: child.id,
                label: normalizeCategoryName(child.name),
                href: child.handle ? `/c/${child.handle}` : "#",
              })
            ),
          }))
        : []

      return [
        rootHandle,
        {
          rootHandle,
          featuredItems,
        },
      ] as const
    })
  )

  return {
    categoriesQuery,
    groupsByRootHandle,
  }
}
