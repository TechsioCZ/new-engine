import {
  DEFAULT_COUNTRY_CODE,
  PRODUCT_LIMIT,
  PRODUCT_LIST_FIELDS,
} from "./constants"

/**
 * Product query parameters (no `page` - only `offset` for cache consistency)
 */
export type ProductQueryParams = {
  category_id?: string[]
  region_id?: string
  country_code?: string
  q?: string
  limit?: number
  offset?: number
  fields?: string
}

/**
 * Builder params (includes `page` for convenience)
 */
interface BuilderParams extends Partial<ProductQueryParams> {
  page?: number
}

export function buildProductQueryParams(
  params: BuilderParams
): ProductQueryParams {
  const { page = 1, limit = PRODUCT_LIMIT, q, ...rest } = params
  const normalizedQuery = q?.trim()

  return {
    fields: PRODUCT_LIST_FIELDS,
    country_code: DEFAULT_COUNTRY_CODE,
    ...rest,
    ...(normalizedQuery ? { q: normalizedQuery } : {}),
    limit,
    offset: (page - 1) * limit,
  }
}

/**
 * Always prefetches page 1
 */
export function buildPrefetchParams(
  params: Pick<BuilderParams, "category_id" | "region_id" | "country_code">
): ProductQueryParams {
  return buildProductQueryParams({
    ...params,
    page: 1,
  })
}

/**
 * Converts query params to URL query string.
 * Array values are encoded as repeated [] entries: key[]=a&key[]=b
 */
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
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        searchParams.append(`${key}[]`, String(entry))
      })
      continue
    }

    searchParams.append(key, String(value))
  }

  return searchParams.toString()
}
