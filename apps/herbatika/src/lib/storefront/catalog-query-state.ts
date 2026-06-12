import {
  buildCatalogProductsParams as buildCatalogProductsParamsValue,
  type CatalogProductsParams as CatalogProductsParamsValue,
  resolveCatalogActiveFilterCount as resolveCatalogActiveFilterCountValue,
  resolveCatalogPriceBounds as resolveCatalogPriceBoundsValue,
} from "./catalog-query-state/params"
import { parseCatalogQueryStateFromSearchParams as parseCatalogQueryStateFromSearchParamsValue } from "./catalog-query-state/parse"

import {
  type CatalogPageResetMode as CatalogPageResetModeValue,
  type CatalogQueryStatePatch as CatalogQueryStatePatchValue,
  type CatalogQueryState as CatalogQueryStateValue,
  catalogQueryParsers as catalogQueryParsersValue,
  type ResolveCatalogQueryStatePatchOptions as ResolveCatalogQueryStatePatchOptionsValue,
  type SearchParamValue as SearchParamValueValue,
} from "./catalog-query-state/parsers"
import { resolveCatalogQueryStatePatch as resolveCatalogQueryStatePatchValue } from "./catalog-query-state/patch"
import {
  PLP_PAGE_SIZE as PLP_PAGE_SIZE_VALUE,
  PRODUCT_SORT_OPTIONS as PRODUCT_SORT_OPTIONS_VALUE,
  PRODUCT_SORT_VALUES as PRODUCT_SORT_VALUES_VALUE,
  type ProductSortValue as ProductSortValueValue,
  resolveProductSortOrder as resolveProductSortOrderValue,
} from "./plp-config"

export const buildCatalogProductsParams = buildCatalogProductsParamsValue
export const catalogQueryParsers = catalogQueryParsersValue
export const parseCatalogQueryStateFromSearchParams =
  parseCatalogQueryStateFromSearchParamsValue
export const PLP_PAGE_SIZE = PLP_PAGE_SIZE_VALUE
export const PRODUCT_SORT_OPTIONS = PRODUCT_SORT_OPTIONS_VALUE
export const PRODUCT_SORT_VALUES = PRODUCT_SORT_VALUES_VALUE
export const resolveCatalogActiveFilterCount =
  resolveCatalogActiveFilterCountValue
export const resolveCatalogPriceBounds = resolveCatalogPriceBoundsValue
export const resolveCatalogQueryStatePatch = resolveCatalogQueryStatePatchValue
export const resolveProductSortOrder = resolveProductSortOrderValue

export type CatalogProductsParams = CatalogProductsParamsValue
export type CatalogPageResetMode = CatalogPageResetModeValue
export type CatalogQueryState = CatalogQueryStateValue
export type CatalogQueryStatePatch = CatalogQueryStatePatchValue
export type ResolveCatalogQueryStatePatchOptions =
  ResolveCatalogQueryStatePatchOptionsValue
export type SearchParamValue = SearchParamValueValue
export type ProductSortValue = ProductSortValueValue
