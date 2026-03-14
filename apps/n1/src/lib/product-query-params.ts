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

type PaginationInput = Pick<BuilderParams, "page" | "limit" | "offset">

const normalizeInteger = (value: number | undefined): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return
  }

  return Math.floor(value)
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

export function resolveProductPagination({
  page,
  limit,
  offset,
}: PaginationInput): Pick<ProductQueryParams, "limit" | "offset"> {
  const normalizedLimit = normalizeInteger(limit)
  const resolvedLimit =
    typeof normalizedLimit === "number" && normalizedLimit > 0
      ? normalizedLimit
      : PRODUCT_LIMIT

  const normalizedOffset = normalizeInteger(offset)
  if (typeof normalizedOffset === "number") {
    return {
      limit: resolvedLimit,
      offset: Math.max(0, normalizedOffset),
    }
  }

  if (page !== undefined) {
    const normalizedPage = normalizeInteger(page)
    const resolvedPage =
      typeof normalizedPage === "number" && normalizedPage > 0
        ? normalizedPage
        : 1

    return {
      limit: resolvedLimit,
      offset: (resolvedPage - 1) * resolvedLimit,
    }
  }

  return { limit: resolvedLimit }
}

export function buildProductQueryParams(
  params: BuilderParams
): ProductQueryParams {
  const { page, limit, offset, category_id, ...rest } = params
  const { limit: resolvedLimit, offset: resolvedOffset } =
    resolveProductPagination({
      page,
      limit,
      offset,
    })
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
