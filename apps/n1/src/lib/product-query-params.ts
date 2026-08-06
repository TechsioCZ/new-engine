import { PRODUCT_LIMIT, PRODUCT_LIST_FIELDS } from "./constants"

/**
 * Product query parameters (no `page` - only `offset` for cache consistency)
 */
export interface ProductQueryParams {
  category_id?: string[]
  region_id?: string
  country_code?: string
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

export const buildProductQueryParams = (
  params: BuilderParams,
): ProductQueryParams => {
  const { page = 1, limit = PRODUCT_LIMIT, ...rest } = params

  return {
    // Default country code; callers can override it.
    country_code: "cz",
    fields: PRODUCT_LIST_FIELDS,
    ...rest,
    limit,
    offset: (page - 1) * limit,
  }
}

/**
 * Always prefetches page 1
 */
export const buildPrefetchParams = (
  params: Pick<BuilderParams, "category_id" | "region_id" | "country_code">,
): ProductQueryParams =>
  buildProductQueryParams({
    ...params,
    page: 1,
  })

/**
 * Converts query params to URL query string
 * Handles arrays (category_id) with indexed notation
 */
type QueryParamValue =
  | string
  | number
  | boolean
  | (string | number | boolean)[]
  | null
  | undefined

export const buildQueryString = (
  params: Record<string, QueryParamValue>,
): string => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue
    }

    if (Array.isArray(value)) {
      // category_id[0]=xxx&category_id[1]=yyy
      for (const [index, item] of value.entries()) {
        searchParams.append(`${key}[${index}]`, String(item))
      }
    } else {
      searchParams.append(key, String(value))
    }
  }

  return searchParams.toString()
}
