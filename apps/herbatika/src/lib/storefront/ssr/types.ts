import type { FindParams, HttpTypes } from "@medusajs/types";
import type { buildCatalogProductsParams } from "../catalog-query-state";

export type RegionListParams = HttpTypes.StoreRegionFilters & {
  fields?: string;
  limit?: number;
  offset?: number;
};

export type CategoryListParams = FindParams & HttpTypes.StoreProductCategoryListParams;
export type ProductListParams = HttpTypes.StoreProductListParams;
export type CatalogListParams = ReturnType<typeof buildCatalogProductsParams>;

export type ProductDetailParams = {
  handle: string;
  region_id?: string;
  country_code?: string;
  province?: string;
  cart_id?: string;
  locale?: string;
  fields?: string;
};

type QueryParamPrimitive = string | number | boolean;
export type QueryParamValue =
  | QueryParamPrimitive
  | null
  | undefined
  | QueryParamPrimitive[]
  | null[]
  | undefined[];

export type QueryInput = Record<string, QueryParamValue>;

export type CatalogStoreResponse = {
  products?: HttpTypes.StoreProduct[];
  count?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  facets?: unknown;
};
