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

  return
}

export function buildProductQueryParams(
  params: BuilderParams
): ProductQueryParams {
  const { page, limit, offset, category_id, ...rest } = params
  const resolvedLimit =
    typeof limit === "number" && limit > 0 ? limit : PRODUCT_LIMIT
  let resolvedOffset = offset
  if (typeof resolvedOffset !== "number" && typeof page === "number") {
    resolvedOffset = (page - 1) * resolvedLimit
  }
  const normalizedCategoryId = normalizeCategoryId(category_id)

  return {
    ...rest,
    ...(normalizedCategoryId ? { category_id: normalizedCategoryId } : {}),
    limit: resolvedLimit,
    ...(resolvedOffset == null ? {} : { offset: resolvedOffset }),
  }
}

type QueryParamValue =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | null
  | undefined

export function buildQueryString(
  params: Record<string, QueryParamValue>
): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value == null) {
      continue
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        searchParams.append(`${key}[${index}]`, String(item))
      })
      continue
    }

    searchParams.append(key, String(value))
  }

  return searchParams.toString()
}
