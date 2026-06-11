import type { inferParserType } from "nuqs/server"
import { parseCatalogQueryStateFromSearchParams } from "./catalog-query-state/parse"
import {
  type CatalogQueryStatePatch as CatalogQueryStatePatchValue,
  type CatalogQueryState as CatalogQueryStateValue,
  catalogQueryParsers,
} from "./catalog-query-state/parsers"
import { resolveCatalogQueryStatePatch as resolveCatalogQueryStatePatchValue } from "./catalog-query-state/patch"
import {
  PLP_PAGE_SIZE as PLP_PAGE_SIZE_VALUE,
  PRODUCT_SORT_OPTIONS as PRODUCT_SORT_OPTIONS_VALUE,
  PRODUCT_SORT_VALUES as PRODUCT_SORT_VALUES_VALUE,
  type ProductSortValue as ProductSortValueValue,
  resolveProductSortOrder as resolveProductSortOrderValue,
} from "./plp-config"

export const PLP_PAGE_SIZE = PLP_PAGE_SIZE_VALUE
export const PRODUCT_SORT_OPTIONS = PRODUCT_SORT_OPTIONS_VALUE
export const PRODUCT_SORT_VALUES = PRODUCT_SORT_VALUES_VALUE
export const resolveCatalogQueryStatePatch = resolveCatalogQueryStatePatchValue
export const resolveProductSortOrder = resolveProductSortOrderValue

export const parsePlpQueryStateFromSearchParams =
  parseCatalogQueryStateFromSearchParams
export const plpQueryParsers = catalogQueryParsers

export type NuqsPlpQueryState = inferParserType<typeof plpQueryParsers>
export type PlpQueryState = CatalogQueryStateValue
export type PlpQueryStatePatch = CatalogQueryStatePatchValue
export type ProductSortValue = ProductSortValueValue
