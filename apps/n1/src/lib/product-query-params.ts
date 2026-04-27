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
  let values: string[]
  if (Array.isArray(categoryId)) {
    values = categoryId
  } else if (typeof categoryId === "string") {
    values = [categoryId]
  } else {
    values = []
  }

  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  return normalized.length > 0 ? normalized : undefined
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
