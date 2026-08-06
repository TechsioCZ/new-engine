import type { inferParserType } from "nuqs/server"

import { catalogQueryParsers } from "./catalog-query-state/parsers"
import type { CatalogQueryState as CatalogQueryStateValue } from "./catalog-query-state/parsers"
import type { ProductSortValue as ProductSortValueValue } from "./plp-config"

export { parseCatalogQueryStateFromSearchParams as parsePlpQueryStateFromSearchParams } from "./catalog-query-state/parse"
export { resolveCatalogQueryStatePatch } from "./catalog-query-state/patch"
export { PLP_PAGE_SIZE } from "./plp-config"

export const plpQueryParsers = catalogQueryParsers

export type NuqsPlpQueryState = inferParserType<typeof plpQueryParsers>
export type PlpQueryState = CatalogQueryStateValue
export type ProductSortValue = ProductSortValueValue
