import type { inferParserType } from "nuqs/server"

import { parseCatalogQueryStateFromSearchParams } from "./catalog-query-state/parse"
import {
  type CatalogQueryState as CatalogQueryStateValue,
  catalogQueryParsers,
} from "./catalog-query-state/parsers"
import { resolveCatalogQueryStatePatch as resolveCatalogQueryStatePatchValue } from "./catalog-query-state/patch"
import {
  PLP_PAGE_SIZE as PLP_PAGE_SIZE_VALUE,
  type ProductSortValue as ProductSortValueValue,
} from "./plp-config"

export const PLP_PAGE_SIZE = PLP_PAGE_SIZE_VALUE
export const resolveCatalogQueryStatePatch = resolveCatalogQueryStatePatchValue

export const parsePlpQueryStateFromSearchParams =
  parseCatalogQueryStateFromSearchParams
export const plpQueryParsers = catalogQueryParsers

export type NuqsPlpQueryState = inferParserType<typeof plpQueryParsers>
export type PlpQueryState = CatalogQueryStateValue
export type ProductSortValue = ProductSortValueValue
