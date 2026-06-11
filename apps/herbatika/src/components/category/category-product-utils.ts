import type { HttpTypes } from "@medusajs/types"

const CATEGORY_NAME_PREFIX_PATTERN = /^>\s*/

export const normalizeCategoryName = (value?: string | null) => {
  if (!value) {
    return "Kategória"
  }

  return value.replace(CATEGORY_NAME_PREFIX_PATTERN, "").trim()
}

export const resolveCategoryRank = (
  category: HttpTypes.StoreProductCategory
) => {
  if (typeof category.rank === "number") {
    return category.rank
  }

  return Number.MAX_SAFE_INTEGER
}
