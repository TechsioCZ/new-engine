"use client";

import type { HttpTypes } from "@medusajs/types";
import {
  createCatalogHooks,
  createCatalogQueryKeys,
  createMedusaCatalogService,
  type CatalogFacets,
  type CatalogListResponse,
} from "@techsio/storefront-data";
import { storefrontCacheConfig } from "./cache";
import {
  PLP_PAGE_SIZE,
  type CatalogProductsParams,
  type CatalogQueryState,
} from "./catalog-query-state";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

export type CatalogProductsInput = CatalogProductsParams & {
  sort?: CatalogQueryState["sort"];
  enabled?: boolean;
};

const EMPTY_CATALOG_FACETS: CatalogFacets = {
  status: [],
  form: [],
  brand: [],
  ingredient: [],
  price: {
    min: null,
    max: null,
  },
};

export const catalogService = createMedusaCatalogService<
  HttpTypes.StoreProduct,
  CatalogProductsInput,
  CatalogFacets
>(storefrontSdk, {
  defaultLimit: PLP_PAGE_SIZE,
  defaultSort: "recommended",
});

export const catalogQueryKeys = createCatalogQueryKeys<CatalogProductsInput>(
  STOREFRONT_QUERY_KEY_NAMESPACE,
);

export const catalogHooks = createCatalogHooks<
  HttpTypes.StoreProduct,
  CatalogProductsInput,
  CatalogProductsInput,
  CatalogFacets
>({
  service: catalogService,
  queryKeys: catalogQueryKeys,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  defaultPageSize: PLP_PAGE_SIZE,
  requireRegion: true,
  fallbackFacets: EMPTY_CATALOG_FACETS,
});

export const {
  useCatalogProducts,
  useSuspenseCatalogProducts,
  usePrefetchCatalogProducts,
  prefetchCatalogProducts,
} = catalogHooks;

export const fetchCatalogProducts = (
  input: CatalogProductsInput,
  signal?: AbortSignal,
) => catalogService.getCatalogProducts(input, signal);

export type CatalogProductsResponse = CatalogListResponse<
  HttpTypes.StoreProduct,
  CatalogFacets
>;
