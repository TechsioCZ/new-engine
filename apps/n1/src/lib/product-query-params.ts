import { PRODUCT_LIMIT } from "./constants"

export type ProductQueryParams = {
  category_id?: string[]
  region_id?: string
  country_code?: string
  limit?: number
  offset?: number
  fields?: string
}

type BuilderParams = Omit<Partial<ProductQueryParams>, "category_id"> & {
  page?: number
  category_id?: string[] | string
}

const normalizeCategoryId = (
  categoryId: BuilderParams["category_id"]
): string[] | undefined => {
  if (Array.isArray(categoryId)) {
    return categoryId
  }

  if (typeof categoryId === "string") {
    return [categoryId]
  }

  return undefined
}

export function buildProductQueryParams(
  params: BuilderParams
): ProductQueryParams {
  const { page, limit, offset, category_id, ...rest } = params
  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : PRODUCT_LIMIT
  const resolvedOffset =
    typeof offset === "number"
      ? offset
      : typeof page === "number"
        ? (page - 1) * resolvedLimit
        : undefined
  const normalizedCategoryId = normalizeCategoryId(category_id)

  return {
    ...rest,
    ...(normalizedCategoryId ? { category_id: normalizedCategoryId } : {}),
    limit: resolvedLimit,
    ...(resolvedOffset == null ? {} : { offset: resolvedOffset }),
  }
}
