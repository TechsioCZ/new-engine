import type { FindParams, HttpTypes } from "@medusajs/types"

type CategoryQueryParams = FindParams &
  HttpTypes.StoreProductCategoryListParams & {
    locale?: string
  }

export const DEFAULT_CATEGORY_PAGE_SIZE = 24
export const CATEGORY_TREE_FIELDS =
  "id,name,handle,parent_category_id,rank,description,+metadata"
export const CATEGORY_TREE_LIMIT = 500

export type CategoryListInput = CategoryQueryParams & {
  page?: number
}

export const buildCategoryListParams = (
  input: CategoryListInput
): CategoryQueryParams => {
  const { page, limit, offset, ...rest } = input

  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : DEFAULT_CATEGORY_PAGE_SIZE
  const resolvedPage = typeof page === "number" && page > 0 ? page : 1

  return {
    ...rest,
    limit: resolvedLimit,
    offset:
      typeof offset === "number" ? offset : (resolvedPage - 1) * resolvedLimit,
  }
}
