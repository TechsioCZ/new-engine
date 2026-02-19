import type { inferParserType } from "nuqs/server";
import {
  catalogQueryParsers,
  parseCatalogQueryStateFromSearchParams,
  resolveCatalogQueryStatePatch,
} from "./catalog-query-state";

export {
  PLP_PAGE_SIZE,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_SORT_VALUES,
  resolveProductSortOrder,
  resolveCatalogQueryStatePatch,
} from "./catalog-query-state";
export type {
  CatalogQueryState as PlpQueryState,
  CatalogQueryStatePatch as PlpQueryStatePatch,
  ProductSortValue,
} from "./catalog-query-state";

export const parsePlpQueryStateFromSearchParams =
  parseCatalogQueryStateFromSearchParams;
export const plpQueryParsers = catalogQueryParsers;

export type NuqsPlpQueryState = inferParserType<typeof plpQueryParsers>;
