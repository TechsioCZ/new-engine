import type { HttpTypes } from "@medusajs/types"
import { isRecord } from "@techsio/std/object"

import type { CategoryContextImageTile } from "@/components/category/category-context-image-tile-grid"
import { rewriteCategoryMetadataHtml } from "@/components/category/category-html-rewrite"
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

interface BuildCategoryContextImageTilesInput {
  categories: CategoryContextImageTileSource[]
  categoryById?: Map<string, HttpTypes.StoreProductCategory>
}

const resolveCategoryTileImage = ({
  handle,
  label,
  parentCategoryId,
  categoryById,
}: {
  handle?: string | null
  label: string
  parentCategoryId?: string | null
  categoryById?: Map<string, HttpTypes.StoreProductCategory>
}) =>
  resolveCategoryImage({
    ...(categoryById === undefined ? {} : { categoryById }),
    ...(handle === undefined ? {} : { handle }),
    label,
    ...(parentCategoryId === undefined ? {} : { parentCategoryId }),
  })

const buildCategoryContextImageTiles = ({
  categories,
  categoryById,
}: BuildCategoryContextImageTilesInput): CategoryContextImageTile[] => {
  const seenLabels = new Set<string>()
  const tiles: CategoryContextImageTile[] = []

  for (const category of categories) {
    const normalizedLabel = category.label.trim()
    const dedupeKey = normalizedLabel.toLocaleLowerCase("sk")

    if (normalizedLabel !== "" && !seenLabels.has(dedupeKey)) {
      seenLabels.add(dedupeKey)
      const src = resolveCategoryTileImage({
        ...(categoryById === undefined ? {} : { categoryById }),
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

const CATEGORY_DESCRIPTION_PLACEHOLDERS = new Set([
  "Imported from Herbatica XML feed.",
  "Imported from Herbatica category export.",
])

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null

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

interface ResolveCategoryIntroTextInput {
  activeCategory: HttpTypes.StoreProductCategory | null
}

type ResolveCategoryHtmlInput = ResolveCategoryIntroTextInput & {
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>
}

export const resolveCategoryIntroText = ({
  activeCategory,
}: ResolveCategoryIntroTextInput) => {
  const description = activeCategory?.description?.trim()
  if (
    description === undefined ||
    description === "" ||
    CATEGORY_DESCRIPTION_PLACEHOLDERS.has(description)
  ) {
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
  const metadata = isRecord(activeCategory?.metadata)
    ? activeCategory.metadata
    : null
  const html = asString(metadata?.[field])
  if (html === null) {
    return null
  }

  return rewriteCategoryMetadataHtml(html, categoryByHandle)
}

export const resolveCategoryIntroHtml = (input: ResolveCategoryHtmlInput) =>
  resolveCategoryMetadataHtml({ ...input, field: "top_description_html" })

export const resolveCategoryBottomHtml = (input: ResolveCategoryHtmlInput) =>
  resolveCategoryMetadataHtml({ ...input, field: "bottom_description_html" })

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
