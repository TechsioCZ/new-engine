import type { HttpTypes } from "@medusajs/types"
import { buildCategoryContextImageTiles } from "@/components/category/category-context-image-tile-grid"
import { rewriteCategoryMetadataHtml } from "@/components/category/category-html-rewrite"
import {
  normalizeCategoryName,
  resolveCategoryRank,
} from "@/components/category/category-product-utils"

const CATEGORY_DESCRIPTION_PLACEHOLDERS = new Set([
  "Imported from Herbatica XML feed.",
  "Imported from Herbatica category export.",
])

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return null
}

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null

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

type ResolveCategoryIntroTextInput = {
  activeCategory: HttpTypes.StoreProductCategory | null
}

type ResolveCategoryHtmlInput = ResolveCategoryIntroTextInput & {
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>
}

export const resolveCategoryIntroText = ({
  activeCategory,
}: ResolveCategoryIntroTextInput) => {
  const description = activeCategory?.description?.trim()
  if (!description || CATEGORY_DESCRIPTION_PLACEHOLDERS.has(description)) {
    return null
  }

  return description
}

const resolveCategoryMetadataHtml = ({
  activeCategory,
  categoryByHandle,
  field,
}: ResolveCategoryHtmlInput & {
  field: "bottom_description_html" | "top_description_html"
}) => {
  const metadata = asRecord(activeCategory?.metadata)
  const html = asString(metadata?.[field])
  if (!html) {
    return null
  }

  return rewriteCategoryMetadataHtml(html, categoryByHandle)
}

export const resolveCategoryIntroHtml = (input: ResolveCategoryHtmlInput) =>
  resolveCategoryMetadataHtml({ ...input, field: "top_description_html" })

export const resolveCategoryBottomHtml = (input: ResolveCategoryHtmlInput) =>
  resolveCategoryMetadataHtml({ ...input, field: "bottom_description_html" })

type ResolveCategoryContextTilesInput = {
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
  if (!activeCategory) {
    return []
  }

  const directChildren = sortCategories(
    categories.filter(
      (category) =>
        category.parent_category_id === activeCategory.id &&
        Boolean(category.handle)
    )
  ).map((category) => ({
    id: category.id,
    label: normalizeCategoryName(category.name),
    href: `/c/${category.handle}`,
    handle: category.handle,
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
        if (!category?.handle) {
          return false
        }

        return category.id !== activeCategory.id
      })
  )
    .slice(0, 8)
    .map((category) => ({
      id: category.id,
      label: normalizeCategoryName(category.name),
      href: `/c/${category.handle}`,
      handle: category.handle,
      parentCategoryId: category.parent_category_id ?? null,
    }))

  return buildCategoryContextImageTiles({
    categories: descendants,
    categoryById,
  })
}
