import { PLP_PAGE_SIZE } from "../plp-config"
import type { CatalogQueryState } from "./parsers"
import { normalizeStatusFilterInput } from "./status-filters"
import { normalizePriceRange, toNonEmptyArray } from "./utils"

interface BuildCatalogProductsParamsInput {
  queryState: CatalogQueryState
  categoryIds?: string[]
  limit?: number
  regionId?: string
  countryCode?: string
  currencyCode?: string
}

export interface CatalogProductsParams {
  q?: string
  page: number
  limit: number
  sort: CatalogQueryState["sort"]
  category_id?: string[]
  status?: string[]
  form?: string[]
  brand?: string[]
  ingredient?: string[]
  price_min?: number
  price_max?: number
  region_id?: string
  country_code?: string
  currency_code?: string
}

export const resolveCatalogPriceBounds = (priceFacet: {
  min: number | null
  max: number | null
}) => {
  if (priceFacet.min === null && priceFacet.max === null) {
    return null
  }

  return {
    max: priceFacet.max ?? priceFacet.min ?? 1,
    min: priceFacet.min ?? 0,
  }
}

export const buildCatalogProductsParams = ({
  queryState,
  categoryIds,
  limit = PLP_PAGE_SIZE,
  regionId,
  countryCode,
  currencyCode,
}: BuildCatalogProductsParamsInput): CatalogProductsParams => {
  const normalizedSearchQuery = queryState.q.trim()
  const normalizedPriceRange = normalizePriceRange(
    queryState.price_min,
    queryState.price_max,
  )

  const categoryIdsValue = toNonEmptyArray(categoryIds ?? [])
  const status = toNonEmptyArray(normalizeStatusFilterInput(queryState.status))
  const form = toNonEmptyArray(queryState.form)
  const brand = toNonEmptyArray(queryState.brand)
  const ingredient = toNonEmptyArray(queryState.ingredient)
  const params: CatalogProductsParams = {
    ...(normalizedSearchQuery ? { q: normalizedSearchQuery } : {}),
    limit,
    page: queryState.page,
    sort: queryState.sort,
    ...(categoryIdsValue === undefined
      ? {}
      : { category_id: categoryIdsValue }),
    ...(status === undefined ? {} : { status }),
    ...(form === undefined ? {} : { form }),
    ...(brand === undefined ? {} : { brand }),
    ...(ingredient === undefined ? {} : { ingredient }),
    ...(normalizedPriceRange.min === undefined
      ? {}
      : { price_min: normalizedPriceRange.min }),
    ...(normalizedPriceRange.max === undefined
      ? {}
      : { price_max: normalizedPriceRange.max }),
  }

  if (typeof regionId === "string" && regionId.length > 0) {
    params.region_id = regionId
  }

  if (typeof countryCode === "string" && countryCode.length > 0) {
    params.country_code = countryCode
  }

  if (typeof currencyCode === "string" && currencyCode.length > 0) {
    params.currency_code = currencyCode
  }

  return params
}

export const resolveCatalogActiveFilterCount = (
  queryState: CatalogQueryState,
): number => {
  const normalizedPriceRange = normalizePriceRange(
    queryState.price_min,
    queryState.price_max,
  )

  return (
    (normalizedPriceRange.min !== undefined ||
    normalizedPriceRange.max !== undefined
      ? 1
      : 0) +
    normalizeStatusFilterInput(queryState.status).length +
    queryState.form.length +
    queryState.brand.length +
    queryState.ingredient.length
  )
}
